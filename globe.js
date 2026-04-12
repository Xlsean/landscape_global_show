/**
 * 全球名胜地球仪 - Three.js 核心渲染模块
 */

class GlobeRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.globe = null;
    this.atmosphere = null;
    this.stars = null;
    this.markers = [];
    this.markerMeshes = [];

    // 交互状态
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.targetRotation = { x: 0.2, y: 0 };
    this.currentRotation = { x: 0.2, y: 0 };
    this.autoRotate = true;
    this.autoRotateSpeed = 0.003;
    this.zoom = 1.0;
    this.targetZoom = 1.0;

    // 回调
    this.onMarkerClick = null;
    this.onMarkerHover = null;
    this.onMarkerLeave = null;

    // Raycaster
    this.raycaster = null;
    this.mouse = new THREE.Vector2();
    this.hoveredMarker = null;

    // 纹理
    this.textures = {};

    this.init();
  }

  init() {
    this.setupScene();
    this.setupCamera();
    this.setupRenderer();
    this.setupLights();
    this.createGlobe();
    this.createStarField();
    this.setupRaycaster();
    this.setupEvents();
    this.animate();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0518, 0.02);
  }

  setupCamera() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000);
    this.camera.position.z = 2.8;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
  }

  setupLights() {
    // 强环境光 - 确保地球背面也有足够亮度，不出现白屏/黑屏
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    this.scene.add(ambientLight);

    // 主光源（模拟太阳）- 降低强度避免过曝
    const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    sunLight.position.set(3, 2, 2);
    this.scene.add(sunLight);

    // 蓝色补光（从背面补光，消除全黑阴面）
    const fillLight = new THREE.DirectionalLight(0x8899ff, 1.0);
    fillLight.position.set(-3, -1, -2);
    this.scene.add(fillLight);

    // 蓝色点缀光
    const accentLight = new THREE.PointLight(0x4DB6E5, 0.8, 8);
    accentLight.position.set(-2, 2, -1);
    this.scene.add(accentLight);
  }

  createGlobe() {
    const geometry = new THREE.SphereGeometry(1, 64, 64);

    // 先用程序化纹理作为占位符
    const fallbackCanvas = this.createEarthTexture();
    const fallbackTexture = new THREE.CanvasTexture(fallbackCanvas);

    // 法线贴图模拟地形凹凸
    const bumpCanvas = this.createBumpTexture();
    const bumpTexture = new THREE.CanvasTexture(bumpCanvas);

    const material = new THREE.MeshPhongMaterial({
      map: fallbackTexture,
      bumpMap: bumpTexture,
      bumpScale: 0.008,
      specular: new THREE.Color(0x226699),
      shininess: 15,
      // emissive 保证暗面不会全黑
      emissive: new THREE.Color(0x112233),
      emissiveIntensity: 0.3,
    });

    this.globe = new THREE.Mesh(geometry, material);
    this.globe.rotation.order = 'YXZ';
    this.globe.receiveShadow = true;
    this.scene.add(this.globe);

    // 存储纹理引用
    this.textures.earth = fallbackTexture;

    // 异步加载真实 NASA Blue Marble 地球纹理
    this.loadRealEarthTexture(material, bumpTexture);
  }

  // 加载真实地球纹理（NASA Blue Marble / Natural Earth）
  loadRealEarthTexture(material, bumpTexture) {
    const loader = new THREE.TextureLoader();

    // 使用 NASA Visible Earth 公开图像（通过 CORS 代理 / unpkg CDN）
    // 备选源列表，按优先级排列
    const textureSources = [
      'https://unpkg.com/three-globe@2.30.0/example/img/earth-blue-marble.jpg',
      'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-blue-marble.jpg',
    ];

    // 云层纹理（叠加）
    const cloudSources = [
      'https://unpkg.com/three-globe@2.30.0/example/img/earth-clouds.png',
      'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-clouds.png',
    ];

    // 凹凸/地形纹理
    const bumpSources = [
      'https://unpkg.com/three-globe@2.30.0/example/img/earth-topology.png',
      'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-topology.png',
    ];

    const tryLoad = (sources, index, onSuccess, onAllFail) => {
      if (index >= sources.length) { onAllFail(); return; }
      loader.load(
        sources[index],
        (tex) => onSuccess(tex),
        undefined,
        () => tryLoad(sources, index + 1, onSuccess, onAllFail)
      );
    };

    // 加载主纹理
    tryLoad(textureSources, 0, (earthTex) => {
      earthTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      material.map = earthTex;
      this.textures.earth = earthTex;

      // 加载地形凹凸纹理
      tryLoad(bumpSources, 0, (bumpTex) => {
        bumpTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        material.bumpMap = bumpTex;
        material.bumpScale = 0.015;
        material.needsUpdate = true;
      }, () => { material.needsUpdate = true; });

      // 加载云层，叠加为第二个球体
      tryLoad(cloudSources, 0, (cloudTex) => {
        this.createCloudLayer(cloudTex);
      }, () => {});

    }, () => {
      // 所有真实纹理源均失败，保留程序化纹理
      console.log('Using procedural earth texture (real texture load failed)');
    });
  }

  // 创建云层球体（略大于地球，半透明）
  createCloudLayer(cloudTexture) {
    // 移除旧的云层
    if (this.clouds) {
      this.scene.remove(this.clouds);
      if (this.clouds.geometry) this.clouds.geometry.dispose();
      if (this.clouds.material) this.clouds.material.dispose();
    }

    const cloudGeo = new THREE.SphereGeometry(1.005, 48, 48);
    const cloudMat = new THREE.MeshPhongMaterial({
      map: cloudTexture,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    this.clouds = new THREE.Mesh(cloudGeo, cloudMat);
    this.clouds.rotation.order = 'YXZ';
    this.scene.add(this.clouds);
  }


  // 程序化生成地球纹理
  createEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // 海洋基色
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    oceanGrad.addColorStop(0, '#0d2d5a');
    oceanGrad.addColorStop(0.3, '#0a4a8c');
    oceanGrad.addColorStop(0.7, '#0c5099');
    oceanGrad.addColorStop(1, '#071e40');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // 绘制海洋光影
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 2048;
      const y = Math.random() * 1024;
      const r = Math.random() * 80 + 20;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(30, 120, 200, 0.1)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 绘制大陆轮廓 (简化版地图)
    ctx.fillStyle = '#2d6a2a';

    // 亚洲/欧洲大陆 (简化多边形)
    this.drawContinent(ctx, [
      // 欧洲
      [900, 200], [950, 180], [1050, 190], [1100, 220], [1080, 280],
      [1000, 300], [950, 290], [900, 250],
      // 连接亚洲
      [1100, 220], [1200, 200], [1350, 220], [1500, 180], [1600, 200],
      [1700, 240], [1750, 300], [1700, 380], [1650, 420], [1550, 460],
      [1450, 480], [1350, 500], [1250, 520], [1150, 500], [1100, 460],
      [1050, 420], [980, 380], [950, 340], [900, 310], [880, 260],
    ], '#3a7a35');

    // 非洲
    this.drawContinent(ctx, [
      [1000, 360], [1020, 340], [1060, 360], [1080, 420], [1090, 500],
      [1070, 580], [1050, 650], [1020, 700], [990, 720], [960, 700],
      [940, 650], [930, 580], [940, 500], [960, 420], [980, 380],
    ], '#4a8c40');

    // 北美洲
    this.drawContinent(ctx, [
      [220, 200], [300, 180], [380, 200], [450, 230], [500, 280],
      [520, 350], [500, 420], [470, 480], [430, 520], [380, 540],
      [320, 530], [280, 500], [260, 450], [240, 380], [220, 300],
    ], '#3d8040');

    // 南美洲
    this.drawContinent(ctx, [
      [370, 480], [420, 460], [460, 480], [480, 540], [490, 620],
      [480, 700], [460, 760], [430, 800], [400, 820], [370, 800],
      [350, 740], [340, 660], [350, 580], [360, 520],
    ], '#3a7a35');

    // 澳大利亚
    this.drawContinent(ctx, [
      [1550, 560], [1620, 540], [1700, 560], [1750, 620], [1760, 700],
      [1730, 760], [1680, 790], [1600, 800], [1540, 770], [1510, 700],
      [1520, 620],
    ], '#4a8c40');

    // 南极洲（底部）
    ctx.fillStyle = '#e8f4f8';
    ctx.fillRect(0, 920, 2048, 104);

    // 格陵兰岛
    ctx.fillStyle = '#c8e8f0';
    this.drawContinent(ctx, [
      [620, 140], [680, 120], [740, 140], [760, 190], [740, 240],
      [680, 260], [620, 240], [600, 190],
    ], '#c8e8f0');

    // 增加大陆纹理细节
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * 2048;
      const y = 150 + Math.random() * 700;
      const r = Math.random() * 15 + 3;
      const shade = Math.random() > 0.5 ? 'rgba(80, 160, 70, 0.3)' : 'rgba(50, 100, 40, 0.3)';
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 海岸线高光
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.2)';
    ctx.lineWidth = 1.5;

    // 经纬线
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.06)';
    ctx.lineWidth = 0.5;
    for (let lon = 0; lon < 2048; lon += 2048 / 24) {
      ctx.beginPath();
      ctx.moveTo(lon, 0);
      ctx.lineTo(lon, 1024);
      ctx.stroke();
    }
    for (let lat = 0; lat < 1024; lat += 1024 / 12) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(2048, lat);
      ctx.stroke();
    }

    return canvas;
  }

  drawContinent(ctx, points, color) {
    if (points.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i][0], points[i][1]);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  createBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#888';
    ctx.fillRect(0, 0, 512, 256);

    // 添加噪声效果模拟地形
    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 256;
      const r = Math.random() * 8 + 1;
      const bright = Math.random() > 0.5 ? 200 : 80;
      ctx.fillStyle = `rgb(${bright}, ${bright}, ${bright})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return canvas;
  }

  createAtmosphere() {
    const geometry = new THREE.SphereGeometry(1.12, 32, 32);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        c: { value: 0.15 },
        p: { value: 4.5 },
        glowColor: { value: new THREE.Color(0x6688ff) },
        viewVector: { value: this.camera.position }
      },
      vertexShader: `
        uniform vec3 viewVector;
        uniform float c;
        uniform float p;
        varying float intensity;
        void main() {
          vec3 vNormal = normalize(normalMatrix * normal);
          vec3 vNormel = normalize(normalMatrix * viewVector);
          intensity = pow(c - dot(vNormal, vNormel), p);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        varying float intensity;
        void main() {
          vec3 glow = glowColor * intensity;
          gl_FragColor = vec4(glow, intensity * 0.6);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    this.atmosphere = new THREE.Mesh(geometry, material);
    this.scene.add(this.atmosphere);
  }

  createStarField() {
    const geometry = new THREE.BufferGeometry();
    const count = 3000;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const starColors = [
      [1.0, 0.95, 0.9],   // 白偏黄
      [0.9, 0.9, 1.0],    // 白偏蓝
      [1.0, 0.8, 0.8],    // 白偏粉
      [0.8, 0.9, 1.0],    // 浅蓝
    ];

    for (let i = 0; i < count; i++) {
      const r = 60 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      sizes[i] = Math.random() * 2 + 0.5;

      const c = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i * 3] = c[0];
      colors[i * 3 + 1] = c[1];
      colors[i * 3 + 2] = c[2];
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  // 将经纬度转换为3D坐标
  latLngToVector3(lat, lng, radius = 1.03) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  // 添加花卉标记
  addMarkers(flowersData) {
    // 清除旧标记
    this.markerMeshes.forEach(m => {
      this.globe.remove(m);
      if (m.geometry) m.geometry.dispose();
      if (m.material) m.material.dispose();
    });
    this.markerMeshes = [];
    this.markers = [];

    flowersData.forEach(flower => {
      const { lat, lng } = flower.location;
      const pos = this.latLngToVector3(lat, lng, 1.0);

      // 花形标记
      const markerGroup = this.createFlowerMarker(flower);
      markerGroup.position.copy(pos);

      // 使标记面向外部（法线方向）
      const up = pos.clone().normalize();
      markerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

      markerGroup.userData = { flower };
      this.globe.add(markerGroup);
      this.markerMeshes.push(markerGroup);
      this.markers.push({ mesh: markerGroup, flower, pos });
    });
  }

  createFlowerMarker(flower) {
    const group = new THREE.Group();
    const colorHex = flower.colorHex || '#FFB7C5';

    // 用 Canvas 绘制纯 emoji（无背景圆底，直接贴图）
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.font = '80px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(flower.emoji || '🌸', size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // 正方形平面贴图
    const markerGeo = new THREE.PlaneGeometry(0.10, 0.10);
    const markerMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.y = 0.03;
    group.add(marker);

    // 不可见碰撞体
    const hitGeo = new THREE.CircleGeometry(0.05, 8);
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const hit = new THREE.Mesh(hitGeo, hitMat);
    hit.position.y = 0.03;
    group.add(hit);

    // 光晕环
    const ringGeo = new THREE.RingGeometry(0.040, 0.048, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      transparent: true, opacity: 0.30,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.001;
    group.add(ring);

    group.userData.animOffset = Math.random() * Math.PI * 2;
    group.userData.dot = hit;
    group.userData.ring = ring;
    group.userData.base = marker;

    return group;
  }

  // 高亮标记
  highlightMarker(flower) {
    this.markers.forEach(({ mesh, flower: f }) => {
      const isTarget = f.id === flower.id;
      const dot = mesh.userData.dot;
      const ring = mesh.userData.ring;
      const base = mesh.userData.base;

      if (dot) dot.material.opacity = isTarget ? 1.0 : 0.95;
      if (ring) {
        ring.material.opacity = isTarget ? 0.7 : 0.3;
        ring.scale.setScalar(isTarget ? 1.5 : 1.0);
      }
      if (base) base.scale.setScalar(isTarget ? 1.5 : 1.0);

      mesh.scale.setScalar(isTarget ? 1.5 : 1.0);
    });
  }

  // 旋转地球到指定位置，使花朵转到视图正中央（最小旋转距离）
  rotateToFlower(flower) {
    const { lat, lng } = flower.location;
    const pos = this.latLngToVector3(lat, lng, 1.0).normalize();

    // globe 使用 YXZ 欧拉角：R = Ry(a) * Rx(b)，相机在 +Z 方向。
    // 要让 R * pos = (0,0,1)，即 pos = Rx(-b) * Ry(-a) * (0,0,1)。
    // 展开得：pos.x = -sin(a), pos.y = cos(a)*sin(b), pos.z = cos(a)*cos(b)
    // 我们要求 rotX=b 在 [-PI/2, PI/2]（避免地球翻转），即 cos(b) >= 0。

    let rotY, rotX;
    if (pos.z >= 0) {
      // cos(a) >= 0 的解：a 在 [-PI/2, PI/2]
      rotY = Math.asin(Math.max(-1, Math.min(1, -pos.x)));
      rotX = Math.atan2(pos.y, pos.z);
    } else {
      // cos(a) < 0 的解：除以 -|cos(a)| 翻转使 cos(b) > 0
      const negCosA = -Math.sqrt(Math.max(0, 1 - pos.x * pos.x));
      rotX = Math.atan2(pos.y / negCosA, pos.z / negCosA);
      // rotY 有两个等价值，选离 currentRotation.y 更近的
      const base = Math.asin(Math.max(-1, Math.min(1, -pos.x)));
      const a1 = Math.PI - base;
      const a2 = -Math.PI - base;
      const wrap = v => v - Math.round(v / (2 * Math.PI)) * (2 * Math.PI);
      rotY = Math.abs(wrap(a1 - this.currentRotation.y)) <= Math.abs(wrap(a2 - this.currentRotation.y)) ? a1 : a2;
    }

    // 最小旋转距离：将 rotY 调整到 currentRotation.y 的 ±PI 范围内
    let dy = rotY - this.currentRotation.y;
    dy = dy - Math.round(dy / (2 * Math.PI)) * (2 * Math.PI);
    this.targetRotation.y = this.currentRotation.y + dy;
    this.targetRotation.x = rotX;

    this.autoRotate = false;
  }

  setupRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points.threshold = 0.05;
  }

  setupEvents() {
    const canvas = this.renderer.domElement;

    // 鼠标事件
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('click', this.onMouseClick.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this));

    // 触摸事件
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: true });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: true });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    // 窗口大小调整
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onMouseDown(e) {
    this.isDragging = false;
    this.dragStarted = false;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
    this.mouseDownPos = { x: e.clientX, y: e.clientY };
  }

  onMouseMove(e) {
    const dx = e.clientX - this.previousMousePosition.x;
    const dy = e.clientY - this.previousMousePosition.y;

    // 检测是否在拖拽
    if (this.mouseDownPos) {
      const totalDx = e.clientX - this.mouseDownPos.x;
      const totalDy = e.clientY - this.mouseDownPos.y;
      if (Math.abs(totalDx) > 3 || Math.abs(totalDy) > 3) {
        this.isDragging = true;
        this.autoRotate = false;
      }
    }

    if (this.isDragging) {
      this.targetRotation.y += dx * 0.005;
      this.targetRotation.x += dy * 0.005;
      this.targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotation.x));
    }

    this.previousMousePosition = { x: e.clientX, y: e.clientY };

    // Hover 检测
    this.updateMouse(e);
    this.checkHover();
  }

  onMouseUp(e) {
    this.mouseDownPos = null;
    setTimeout(() => { this.isDragging = false; }, 50);
  }

  onMouseClick(e) {
    if (this.isDragging) return;
    this.updateMouse(e);
    this.checkClick(e);
  }

  onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.12 : -0.12;
    this.targetZoom = Math.max(0.5, Math.min(3.0, this.targetZoom + delta));
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.mouseDownPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.isDragging = false;
    }
  }

  onTouchMove(e) {
    if (e.touches.length === 1) {
      const dx = e.touches[0].clientX - this.previousMousePosition.x;
      const dy = e.touches[0].clientY - this.previousMousePosition.y;

      const totalDx = e.touches[0].clientX - (this.mouseDownPos?.x || 0);
      const totalDy = e.touches[0].clientY - (this.mouseDownPos?.y || 0);
      if (Math.abs(totalDx) > 5 || Math.abs(totalDy) > 5) {
        this.isDragging = true;
        this.autoRotate = false;
      }

      if (this.isDragging) {
        this.targetRotation.y += dx * 0.006;
        this.targetRotation.x += dy * 0.006;
        this.targetRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.targetRotation.x));
      }

      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  onTouchEnd(e) {
    if (!this.isDragging && this.mouseDownPos) {
      // 触摸点击
      const touch = e.changedTouches[0];
      this.updateMouseFromCoords(touch.clientX, touch.clientY);
      this.checkClick({ clientX: touch.clientX, clientY: touch.clientY });
    }
    this.isDragging = false;
    this.mouseDownPos = null;
  }

  onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  updateMouse(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  updateMouseFromCoords(x, y) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
  }

  checkHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const dots = this.markerMeshes.map(g => g.children[1]).filter(Boolean);
    const intersects = this.raycaster.intersectObjects(dots);

    if (intersects.length > 0) {
      const hitDot = intersects[0].object;
      const markerGroup = hitDot.parent;
      const flower = markerGroup.userData.flower;

      if (this.hoveredMarker !== markerGroup) {
        this.hoveredMarker = markerGroup;
        this.renderer.domElement.style.cursor = 'pointer';
        if (this.onMarkerHover) {
          const pos = this.getScreenPosition(markerGroup);
          this.onMarkerHover(flower, pos);
        }
      }
    } else {
      if (this.hoveredMarker) {
        this.hoveredMarker = null;
        this.renderer.domElement.style.cursor = 'default';
        if (this.onMarkerLeave) this.onMarkerLeave();
      }
    }
  }

  checkClick(e) {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const dots = this.markerMeshes.map(g => g.children[1]).filter(Boolean);
    const intersects = this.raycaster.intersectObjects(dots);

    if (intersects.length > 0) {
      const hitDot = intersects[0].object;
      const markerGroup = hitDot.parent;
      const flower = markerGroup.userData.flower;

      if (this.onMarkerClick) {
        const pos = this.getScreenPosition(markerGroup);
        this.onMarkerClick(flower, pos, e);
      }
    }
  }

  // 获取标记在屏幕上的位置
  getScreenPosition(markerGroup) {
    const vector = new THREE.Vector3();
    markerGroup.getWorldPosition(vector);
    vector.project(this.camera);

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;

    return {
      x: (vector.x + 1) / 2 * w,
      y: (-vector.y + 1) / 2 * h
    };
  }

  // 是否正面可见
  isVisible(markerGroup) {
    const worldPos = new THREE.Vector3();
    markerGroup.getWorldPosition(worldPos);
    const cameraDir = worldPos.clone().sub(this.camera.position).normalize();
    const normal = worldPos.clone().normalize();
    return normal.dot(cameraDir.negate()) > 0.1;
  }

  // 动画循环
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    const time = Date.now() * 0.001;
    // 预分配四元数，供标记 billboard 复用
    if (!this._globeWorldQuat) this._globeWorldQuat = new THREE.Quaternion();

    // 平滑旋转
    if (this.autoRotate) {
      this.targetRotation.y += this.autoRotateSpeed;
    }

    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.06;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.06;

    // 应用旋转
    if (this.globe) {
      this.globe.rotation.x = this.currentRotation.x;
      this.globe.rotation.y = this.currentRotation.y;
    }

    // 云层跟随地球旋转，但略快一点形成漂移感
    if (this.clouds) {
      this.clouds.rotation.x = this.currentRotation.x;
      this.clouds.rotation.y = this.currentRotation.y + time * 0.008;
    }

    // 平滑缩放
    this.zoom += (this.targetZoom - this.zoom) * 0.08;
    this.camera.position.z = 2.8 / this.zoom;

    // 星空缓慢旋转
    if (this.stars) {
      this.stars.rotation.y = time * 0.02;
    }

    // 标记动画
    this.markerMeshes.forEach((group, i) => {
      const offset = group.userData.animOffset || 0;
      const pulse = 1 + Math.sin(time * 2.5 + offset) * 0.12;
      const ring = group.userData.ring;
      const dot = group.userData.dot;

      if (ring) {
        ring.scale.setScalar(group === this.hoveredMarker ? 1.8 * pulse : pulse);
        ring.material.opacity = group === this.hoveredMarker ? 0.6 : 0.25 * pulse;
      }
      if (dot) {
        dot.scale.setScalar(group === this.hoveredMarker ? 1.3 : 1.0);
      }

      // Billboard：让标记始终正面朝向相机，任何角度都可见
      // group 是 globe 的子对象，需用相机世界四元数除以 globe 世界四元数
      this.globe.getWorldQuaternion(this._globeWorldQuat);
      group.quaternion.copy(this.camera.quaternion).premultiply(this._globeWorldQuat.invert());
    });

    this.renderer.render(this.scene, this.camera);
  }

  // 设置自动旋转
  setAutoRotate(enabled) {
    this.autoRotate = enabled;
  }

  // 重置视角
  resetView() {
    this.targetRotation = { x: 0.2, y: 0 };
    this.targetZoom = 1.0;
    this.autoRotate = true;
  }
}
