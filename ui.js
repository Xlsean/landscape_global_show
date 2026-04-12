/**
 * 全球名胜地球仪 - UI 交互模块
 */

class LandscapeUI {
  constructor(globeRenderer) {
    this.globe = globeRenderer;
    this.flowers = LANDSCAPES_DATA;
    this.filteredFlowers = [...this.flowers];
    this.selectedFlower = null;

    this.uploadedImages = new Map();
    // 从 localStorage 恢复已上传的图片
    try {
      const saved = JSON.parse(localStorage.getItem('landscape_images') || '{}');
      Object.entries(saved).forEach(([id, dataUrl]) => this.uploadedImages.set(id, dataUrl));
    } catch(e) {}
    this.localImages = new Map();
    this._preloadLocalImages();

    // 打卡状态（从 localStorage 恢复）
    this.checkedSet = new Set(JSON.parse(localStorage.getItem('landscape_checked') || '[]'));

    this.filters = {
      search: '',
      region: '全部',
      month: null,
      category: '全部类型',
      country: '全部',
    };

    this.initSearch();
    this.initFilters();
    this.initFlowerList();
    this.initDetailCard();
    this.initTooltip();
    this.initSidePanel();
    this.initStatsBar();
    this.initBottomActions();
    this.updateCheckinProgress();

    this.globe.onMarkerClick = (flower, pos, e) => this.onMarkerClick(flower, pos, e);
    this.globe.onMarkerHover = (flower, pos) => this.onMarkerHover(flower, pos);
    this.globe.onMarkerLeave = () => this.onMarkerLeave();

    this.applyFilters();
  }

  // 打卡功能
  toggleCheckin(landscapeId) {
    if (this.checkedSet.has(landscapeId)) {
      this.checkedSet.delete(landscapeId);
    } else {
      this.checkedSet.add(landscapeId);
    }
    localStorage.setItem('landscape_checked', JSON.stringify([...this.checkedSet]));
    this.updateCheckinProgress();
    // 更新当前卡片按钮状态
    const btn = document.getElementById('checkin-btn-' + landscapeId);
    if (btn) {
      const isChecked = this.checkedSet.has(landscapeId);
      btn.classList.toggle('checked', isChecked);
      btn.innerHTML = isChecked ? '✅ 已打卡' : '📌 打卡';
    }
  }

  updateCheckinProgress() {
    const count = this.checkedSet.size;
    const total = this.flowers.length;
    const el = document.getElementById('checkin-count');
    const bar = document.getElementById('checkin-bar');
    if (el) el.textContent = count;
    if (bar) bar.style.width = (count / total * 100) + '%';
  }

  // 本地图片
  _preloadLocalImages() {
    const extensions = ['jpg', 'webp', 'png', 'jpeg'];
    const names = [...new Set(this.flowers.map(f => f.name))];
    names.forEach(name => this._tryLoadLocalImage(name, extensions, 0));
  }

  _tryLoadLocalImage(name, extensions, idx) {
    if (idx >= extensions.length) return;
    const path = `landscapes/${name}.${extensions[idx]}`;
    const img = new Image();
    img.onload = () => {
      this.localImages.set(name, path);
      this._updateDetailImageIfNeeded(name, path);
    };
    img.onerror = () => this._tryLoadLocalImage(name, extensions, idx + 1);
    img.src = path;
  }

  _updateDetailImageIfNeeded(flowerName, localPath) {
    if (!this.selectedFlower || this.selectedFlower.name !== flowerName) return;
    const flowerId = this.selectedFlower.id;
    if (this.uploadedImages.has(flowerId)) return;
    const imgEl = document.getElementById(`detail-img-${flowerId}`);
    const placeholder = document.getElementById(`detail-img-placeholder-${flowerId}`);
    if (imgEl) {
      imgEl.src = localPath;
      imgEl.classList.add('loaded');
      if (placeholder) placeholder.style.display = 'none';
    }
  }

  // 搜索
  initSearch() {
    this.searchInput = document.getElementById('search-input');
    this.searchClear = document.querySelector('.search-clear');
    this.searchInput.addEventListener('input', (e) => {
      this.filters.search = e.target.value.trim();
      this.searchClear.style.display = this.filters.search ? 'flex' : 'none';
      this.applyFilters();
    });
    this.searchClear.addEventListener('click', () => {
      this.searchInput.value = '';
      this.filters.search = '';
      this.searchClear.style.display = 'none';
      this.applyFilters();
    });
  }

  // 筛选
  initFilters() {
    const regionContainer = document.getElementById('region-filters');
    if (regionContainer) {
      REGIONS.forEach(region => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip' + (region === '全部' ? ' active' : '');
        chip.textContent = region;
        chip.dataset.value = region;
        chip.addEventListener('click', () => {
          this.filters.region = region;
          regionContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.value === region));
          this.applyFilters();
        });
        regionContainer.appendChild(chip);
      });
    }

    const monthContainer = document.getElementById('month-filters');
    if (monthContainer) {
      const allMonthChip = document.createElement('button');
      allMonthChip.className = 'month-chip active';
      allMonthChip.textContent = '全年';
      allMonthChip.style.gridColumn = 'span 2';
      allMonthChip.dataset.value = 'all';
      allMonthChip.addEventListener('click', () => {
        this.filters.month = null;
        monthContainer.querySelectorAll('.month-chip').forEach(c => c.classList.remove('active'));
        allMonthChip.classList.add('active');
        this.applyFilters();
      });
      monthContainer.appendChild(allMonthChip);

      MONTHS_CN.forEach((month, i) => {
        const chip = document.createElement('button');
        chip.className = 'month-chip';
        chip.textContent = month;
        chip.dataset.value = i + 1;
        chip.addEventListener('click', () => {
          this.filters.month = i + 1;
          monthContainer.querySelectorAll('.month-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.applyFilters();
        });
        monthContainer.appendChild(chip);
      });
    }

    // 类型筛选
    const categoryContainer = document.getElementById('category-filters');
    if (categoryContainer) {
      CATEGORIES.forEach(cat => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip' + (cat === '全部类型' ? ' active' : '');
        chip.textContent = cat;
        chip.dataset.value = cat;
        chip.addEventListener('click', () => {
          this.filters.category = cat;
          categoryContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.value === cat));
          this.applyFilters();
        });
        categoryContainer.appendChild(chip);
      });
    }

    const countryToggle = document.getElementById('country-toggle');
    const countryWrap = document.getElementById('country-filters-wrap');
    const countryContainer = document.getElementById('country-filters');
    if (countryToggle && countryWrap) {
      countryToggle.addEventListener('click', () => {
        const collapsed = countryWrap.classList.toggle('collapsed');
        countryToggle.querySelector('.toggle-arrow').textContent = collapsed ? '▼' : '▲';
      });
    }
    if (countryContainer) {
      const countries = [...new Set(this.flowers.map(f => f.country))].sort((a, b) => a.localeCompare(b, 'zh'));
      const allChip = document.createElement('button');
      allChip.className = 'filter-chip active';
      allChip.textContent = '全部';
      allChip.dataset.value = '全部';
      allChip.addEventListener('click', () => {
        this.filters.country = '全部';
        countryContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.value === '全部'));
        this.applyFilters();
      });
      countryContainer.appendChild(allChip);
      countries.forEach(country => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip country-chip';
        chip.textContent = country;
        chip.dataset.value = country;
        chip.addEventListener('click', () => {
          this.filters.country = country;
          countryContainer.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.value === country));
          this.applyFilters();
        });
        countryContainer.appendChild(chip);
      });
    }
  }

  applyFilters() {
    const { search, region, month, category, country } = this.filters;
    this.filteredFlowers = this.flowers.filter(flower => {
      if (search) {
        const keyword = search.toLowerCase();
        if (!flower.name.toLowerCase().includes(keyword) &&
            !flower.nameEn.toLowerCase().includes(keyword) &&
            !flower.country.toLowerCase().includes(keyword) &&
            !flower.brief.toLowerCase().includes(keyword)) return false;
      }
      if (region !== '全部' && flower.region !== region) return false;
      if (month && !flower.visitMonths.includes(month)) return false;
      if (category && category !== '全部类型' && flower.type !== category) return false;
      if (country && country !== '全部' && flower.country !== country) return false;
      return true;
    });
    this.renderFlowerList();
    this.updateGlobeMarkers();
    this.updateStats();
  }

  // 列表
  initFlowerList() { this.flowerListContainer = document.getElementById('flowers-list'); }

  renderFlowerList() {
    const container = this.flowerListContainer;
    if (!container) return;
    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'flowers-list-header';
    header.textContent = `找到 ${this.filteredFlowers.length} 处名胜`;
    container.appendChild(header);

    if (this.filteredFlowers.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-state fade-in';
      empty.innerHTML = `<div class="emoji">🔍</div><p>没有找到匹配的景点<br>尝试调整搜索条件</p>`;
      container.appendChild(empty);
      return;
    }

    this.filteredFlowers.forEach(flower => {
      const item = document.createElement('div');
      item.className = 'flower-list-item fade-in';
      item.dataset.id = flower.id;
      if (this.selectedFlower?.id === flower.id) item.classList.add('active');
      const colorStyle = `background: ${flower.colorHex || '#42A5F5'}33; border: 2px solid ${flower.colorHex || '#42A5F5'}66;`;
      const checkedMark = this.checkedSet.has(flower.id) ? ' ✅' : '';
      item.innerHTML = `
        <div class="flower-emoji-badge" style="${colorStyle}">${flower.emoji || '🏛️'}</div>
        <div class="flower-list-info">
          <div class="flower-list-name">${flower.name}${checkedMark}</div>
          <div class="flower-list-meta">${flower.country} · ${flower.type}</div>
        </div>
        <div class="bloom-indicator" style="background: ${flower.colorHex || '#42A5F5'};"></div>
      `;
      item.addEventListener('click', () => this.selectFlower(flower));
      container.appendChild(item);
    });
  }

  // 选择景点
  selectFlower(flower, pos) {
    this.selectedFlower = flower;
    document.querySelectorAll('.flower-list-item').forEach(item => item.classList.toggle('active', item.dataset.id === flower.id));
    this.globe.rotateToFlower(flower);
    this.globe.highlightMarker(flower);
    if (!pos) {
      setTimeout(() => {
        const marker = this.globe.markers.find(m => m.flower.id === flower.id);
        if (marker && this.globe.isVisible(marker.mesh)) {
          this.showFlowerDetail(flower, this.globe.getScreenPosition(marker.mesh));
        } else {
          this.showFlowerDetailCenter(flower);
        }
      }, 600);
    } else {
      this.showFlowerDetail(flower, pos);
    }
  }

  // 图片加载失败时自动尝试从英文维基获取
  handleImageError(imgEl, flowerId, nameEn) {
    if (imgEl.dataset.retried) {
      imgEl.style.display = 'none';
      const ph = document.getElementById(`detail-img-placeholder-${flowerId}`);
      if (ph) ph.style.display = 'flex';
      return;
    }
    imgEl.dataset.retried = '1';
    const searchName = encodeURIComponent(nameEn);
    fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${searchName}&prop=pageimages&format=json&pithumbsize=640&pilicense=any&redirects=1&origin=*`)
      .then(r => r.json())
      .then(data => {
        const pages = data?.query?.pages || {};
        for (const pid in pages) {
          if (pages[pid]?.thumbnail?.source) {
            imgEl.src = pages[pid].thumbnail.source;
            return;
          }
        }
        imgEl.style.display = 'none';
        const ph = document.getElementById(`detail-img-placeholder-${flowerId}`);
        if (ph) ph.style.display = 'flex';
      })
      .catch(() => {
        imgEl.style.display = 'none';
        const ph = document.getElementById(`detail-img-placeholder-${flowerId}`);
        if (ph) ph.style.display = 'flex';
      });
  }

  // 图片上传（持久化到 localStorage）
  handleImageUpload(flowerId, input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.uploadedImages.set(flowerId, dataUrl);
      // 持久化
      try {
        const saved = JSON.parse(localStorage.getItem('landscape_images') || '{}');
        saved[flowerId] = dataUrl;
        localStorage.setItem('landscape_images', JSON.stringify(saved));
      } catch(ex) { /* localStorage 可能满 */ }
      const imgEl = document.getElementById(`detail-img-${flowerId}`);
      const placeholder = document.getElementById(`detail-img-placeholder-${flowerId}`);
      if (imgEl) { imgEl.src = dataUrl; imgEl.classList.add('loaded'); if (placeholder) placeholder.style.display = 'none'; }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  // 详情卡
  initDetailCard() {
    this.detailCard = document.getElementById('flower-detail');
  }

  showFlowerDetail(flower, pos) {
    const card = this.detailCard;
    if (!card) return;
    this.renderDetailCard(flower);
    const cardW = 340, cardH = 500, padding = 16;
    const screenW = window.innerWidth, screenH = window.innerHeight;
    const panelWidth = document.getElementById('side-panel')?.classList.contains('collapsed') ? 40 : 320;
    const availW = screenW - panelWidth - padding * 2;
    let x = pos ? pos.x + 20 : availW / 2;
    let y = pos ? pos.y - cardH / 2 : screenH / 2 - cardH / 2;
    if (x + cardW > availW) x = pos ? pos.x - cardW - 20 : availW / 2 - cardW / 2;
    if (x < padding) x = padding;
    if (y < 80) y = 80;
    if (y + cardH > screenH - padding) y = screenH - cardH - padding;
    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.style.right = 'auto';
    card.style.bottom = 'auto';
    card.classList.add('visible');
  }

  showFlowerDetailCenter(flower) {
    const screenW = window.innerWidth, screenH = window.innerHeight;
    const panelWidth = document.getElementById('side-panel')?.classList.contains('collapsed') ? 40 : 320;
    this.showFlowerDetail(flower, { x: (screenW - panelWidth) / 2 - 170, y: screenH / 2 - 200 });
  }

  hideFlowerDetail() {
    if (this.detailCard) this.detailCard.classList.remove('visible');
    this.selectedFlower = null;
    this.globe.markerMeshes.forEach(mesh => {
      mesh.scale.setScalar(1.0);
      if (mesh.userData.ring) mesh.userData.ring.scale.setScalar(1.0);
    });
    document.querySelectorAll('.flower-list-item').forEach(item => item.classList.remove('active'));
  }

  renderDetailCard(flower) {
    const card = this.detailCard;
    if (!card) return;

    const uploadedSrc = this.uploadedImages.get(flower.id);
    const localSrc = this.localImages.get(flower.name);
    const imgSrc = uploadedSrc || localSrc || flower.wikiImage || '';
    const isLocal = !!(uploadedSrc || localSrc);
    const nameEnEsc = flower.nameEn.replace(/'/g, "\\'");
    const needAutoFetch = !imgSrc;
    const imageHTML = `
      <div class="detail-image-wrap" id="detail-img-wrap-${flower.id}">
        <img class="detail-image${isLocal ? ' loaded' : ''}${needAutoFetch ? '' : ''}"
             id="detail-img-${flower.id}" src="${imgSrc || ''}" alt="${flower.name}"
             onerror="window._landscapeUI.handleImageError(this,'${flower.id}','${nameEnEsc}')"
             ${!isLocal && imgSrc ? `onload="this.classList.add('loaded')"` : ''}
             ${needAutoFetch ? 'style="display:none"' : ''} />
        <div class="detail-image-loading" id="detail-img-placeholder-${flower.id}" ${needAutoFetch ? '' : 'style="display:none"'}>🏛️</div>
        <div class="detail-image-actions">
          ${flower.wikiUrl ? `<a class="detail-image-link" href="${flower.wikiUrl}" target="_blank" rel="noopener">📖 百科链接</a>` : ''}
          <label class="upload-btn" title="上传本地图片">
            📷 上传图片
            <input type="file" accept="image/*" style="display:none"
              onchange="window._landscapeUI.handleImageUpload('${flower.id}', this)">
          </label>
        </div>
      </div>`;

    const isChecked = this.checkedSet.has(flower.id);

    card.innerHTML = `
      <div class="detail-header">
        <div class="detail-emoji">${flower.emoji || '🏛️'}</div>
        <div class="detail-name">${flower.name}</div>
        <div class="detail-name-en">${flower.nameEn}</div>
        <div class="detail-badges">
          <span class="detail-badge badge-country">📍 ${flower.country}</span>
          <span class="detail-badge badge-season">🗓 ${flower.bestSeason}</span>
          <span class="detail-badge badge-category">🏷 ${flower.type}</span>
        </div>
        <button class="detail-close" onclick="document.getElementById('flower-detail').classList.remove('visible')">✕</button>
      </div>
      ${imageHTML}
      <div class="detail-body">
        <div class="detail-section">
          <div class="detail-section-title">🏛️ 景点介绍</div>
          <div class="detail-section-content">${flower.brief}</div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">📅 最佳旅行时间</div>
          <div class="detail-section-content">${flower.bestTime}</div>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">🗺 游览指南</div>
          <div class="detail-section-content">${flower.travelGuide}</div>
        </div>
        <button class="checkin-btn ${isChecked ? 'checked' : ''}" id="checkin-btn-${flower.id}"
          onclick="window._landscapeUI.toggleCheckin('${flower.id}')">
          ${isChecked ? '✅ 已打卡' : '📌 打卡'}
        </button>
      </div>
    `;

    // 如果没有预设图片，自动通过 Wikipedia API 获取
    if (needAutoFetch) {
      this.handleImageError(
        document.getElementById(`detail-img-${flower.id}`),
        flower.id,
        flower.nameEn
      );
    }
  }

  // Tooltip
  initTooltip() { this.tooltip = document.getElementById('tooltip'); }
  showTooltip(flower, pos) {
    if (!this.tooltip) return;
    this.tooltip.innerHTML = `
      <div class="tooltip-name">${flower.emoji || '🏛️'} ${flower.name}</div>
      <div class="tooltip-info">${flower.country} · ${flower.type}</div>
    `;
    this.tooltip.style.left = (pos.x + 12) + 'px';
    this.tooltip.style.top = (pos.y - 40) + 'px';
    this.tooltip.classList.add('visible');
  }
  hideTooltip() { if (this.tooltip) this.tooltip.classList.remove('visible'); }

  // 侧边面板
  initSidePanel() {
    const panel = document.getElementById('side-panel');
    const toggle = document.getElementById('panel-toggle');
    const icon = document.getElementById('panel-toggle-icon');
    if (toggle && panel) {
      toggle.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        if (icon) icon.textContent = panel.classList.contains('collapsed') ? '◀' : '▶';
      });
    }
  }

  // 统计
  initStatsBar() { this.updateStats(); }
  updateStats() {
    const fc = document.getElementById('stat-flowers');
    const rc = document.getElementById('stat-regions');
    const cc = document.getElementById('stat-countries');
    if (fc) fc.textContent = `🏛️ ${this.filteredFlowers.length} 处名胜`;
    if (rc) { const r = new Set(this.filteredFlowers.map(f => f.region)); rc.textContent = `🌍 ${r.size} 个大区`; }
    if (cc) { const c = new Set(this.filteredFlowers.map(f => f.country)); cc.textContent = `📍 ${c.size} 个国家`; }
  }

  // 底部按钮
  initBottomActions() {
    const resetBtn = document.getElementById('btn-reset');
    const autoBtn = document.getElementById('btn-auto-rotate');
    if (resetBtn) resetBtn.addEventListener('click', () => { this.globe.resetView(); this.hideFlowerDetail(); });
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        const isAuto = this.globe.autoRotate;
        this.globe.setAutoRotate(!isAuto);
        autoBtn.classList.toggle('active', !isAuto);
        autoBtn.textContent = !isAuto ? '⏸ 暂停旋转' : '▶ 自动旋转';
      });
    }
  }

  updateGlobeMarkers() { this.globe.addMarkers(this.filteredFlowers); }
  onMarkerClick(flower, pos, e) { this.selectFlower(flower, pos); }
  onMarkerHover(flower, pos) { this.showTooltip(flower, pos); }
  onMarkerLeave() { this.hideTooltip(); }
  jumpToRandom() {
    if (this.filteredFlowers.length === 0) return;
    this.selectFlower(this.filteredFlowers[Math.floor(Math.random() * this.filteredFlowers.length)]);
  }
}

// ============================================================
// 加载管理
// ============================================================

class LoadingManager {
  constructor() {
    this.loadingEl = document.getElementById('loading');
    this.loadingBar = document.querySelector('.loading-bar');
    this.loadingText = document.querySelector('.loading-text');
    this.progress = 0;
  }
  setProgress(value, text) {
    this.progress = value;
    if (this.loadingBar) this.loadingBar.style.width = value + '%';
    if (text && this.loadingText) this.loadingText.textContent = text;
  }
  hide() { if (this.loadingEl) this.loadingEl.classList.add('hidden'); }
}

// ============================================================
// 平面世界地图视图
// ============================================================

class WorldMapView {
  constructor(landscapeUI) {
    this.flowerUI = landscapeUI;
    this.canvas = document.getElementById('world-map-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.flowers = LANDSCAPES_DATA;
    this.filteredFlowers = [...this.flowers];
    this.hoveredFlower = null;
    this.mapImage = null;
    this.mapReady = false;
    this.padding = { top: 10, bottom: 10, left: 10, right: 10 };
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this._isPanning = false;
    this._panStart = { x: 0, y: 0 };

    if (this.canvas) {
      this.resize();
      this.loadMapImage();
      this.setupEvents();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    const container = document.getElementById('map-container');
    if (!container || !this.canvas) return;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
    this.canvas.style.width = container.clientWidth + 'px';
    this.canvas.style.height = container.clientHeight + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.mapReady) this.render();
  }

  loadMapImage() {
    const sources = [
      'https://unpkg.com/three-globe@2.30.0/example/img/earth-blue-marble.jpg',
      'https://cdn.jsdelivr.net/npm/three-globe@2.30.0/example/img/earth-blue-marble.jpg',
    ];
    const tryLoad = (sources, index) => {
      if (index >= sources.length) { this.mapReady = true; this.render(); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { this.mapImage = img; this.mapReady = true; this.render(); };
      img.onerror = () => tryLoad(sources, index + 1);
      img.src = sources[index];
    };
    tryLoad(sources, 0);
    this.mapReady = true;
    this.loadGeoJSON();
  }

  loadGeoJSON() {
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(data => { this.topoData = data; this.render(); })
      .catch(() => this.render());
  }

  project(lng, lat) {
    const w = this.canvas.width, h = this.canvas.height, p = this.padding;
    const mapW = w - p.left - p.right, mapH = h - p.top - p.bottom;
    const bx = p.left + ((lng + 180) / 360) * mapW;
    const by = p.top + ((90 - lat) / 180) * mapH;
    const cx = w / 2, cy = h / 2;
    return { x: cx + (bx - cx) * this.scale + this.offsetX, y: cy + (by - cy) * this.scale + this.offsetY };
  }

  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width, h = this.canvas.height;
    if (w === 0 || h === 0) return;
    const p = this.padding;
    const mapW = w - p.left - p.right, mapH = h - p.top - p.bottom;

    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#0d1b2a');
    bg.addColorStop(0.5, '#1a2e45');
    bg.addColorStop(1, '#0d1b2a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (this.mapImage) {
      ctx.save();
      const cx = w / 2, cy = h / 2;
      ctx.translate(cx + this.offsetX, cy + this.offsetY);
      ctx.scale(this.scale, this.scale);
      ctx.translate(-cx, -cy);
      ctx.drawImage(this.mapImage, p.left, p.top, mapW, mapH);
      ctx.fillStyle = 'rgba(10, 20, 40, 0.2)';
      ctx.fillRect(p.left, p.top, mapW, mapH);
      ctx.restore();
    } else if (this.topoData) {
      this.drawTopoMap(ctx);
    }

    if (this.topoData && typeof topojson !== 'undefined') {
      this.drawCountryBorders(ctx);
      this.drawCheckedCountries(ctx);
    }

    ctx.strokeStyle = 'rgba(129, 194, 238, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.left, p.top, mapW, mapH);
    this.drawGrid(ctx);
    this.drawFlowerMarkers(ctx);
  }

  // 绘制已打卡国家的浅金色遮罩
  drawCheckedCountries(ctx) {
    if (!this.topoData || typeof topojson === 'undefined') return;
    const checkedCodes = new Set();
    this.flowerUI.checkedSet.forEach(id => {
      const lm = this.flowers.find(f => f.id === id);
      if (lm && lm.countryCode) checkedCodes.add(lm.countryCode);
    });
    if (checkedCodes.size === 0) return;

    const objectKey = this.topoData.objects.countries ? 'countries' : Object.keys(this.topoData.objects)[0];
    const geojson = topojson.feature(this.topoData, this.topoData.objects[objectKey]);
    const p = this.padding;
    const w = this.canvas.width, h = this.canvas.height;
    const mapW = w - p.left - p.right, mapH = h - p.top - p.bottom;

    ctx.save();
    ctx.beginPath();
    ctx.rect(p.left, p.top, mapW, mapH);
    ctx.clip();

    geojson.features.forEach(feature => {
      const fid = String(feature.id || feature.properties?.iso_n3 || '');
      if (!checkedCodes.has(fid)) return;
      const geom = feature.geometry;
      if (!geom) return;
      const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
      polygons.forEach(polygon => {
        polygon.forEach(ring => {
          if (ring.length < 3) return;
          ctx.beginPath();
          const first = this.project(ring[0][0], ring[0][1]);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < ring.length; i++) {
            const pt = this.project(ring[i][0], ring[i][1]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      });
    });
    ctx.restore();
  }

  drawCountryBorders(ctx) {
    const p = this.padding;
    const w = this.canvas.width, h = this.canvas.height;
    const mapW = w - p.left - p.right, mapH = h - p.top - p.bottom;
    const objectKey = this.topoData.objects.countries ? 'countries' : Object.keys(this.topoData.objects)[0];
    const geojson = topojson.feature(this.topoData, this.topoData.objects[objectKey]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.left, p.top, mapW, mapH);
    ctx.clip();
    geojson.features.forEach(feature => {
      const geom = feature.geometry;
      if (!geom) return;
      const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
      polygons.forEach(polygon => {
        polygon.forEach(ring => {
          if (ring.length < 3) return;
          ctx.beginPath();
          const first = this.project(ring[0][0], ring[0][1]);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < ring.length; i++) {
            const pt = this.project(ring[i][0], ring[i][1]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(200, 220, 255, 0.25)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
        });
      });
    });
    ctx.restore();
  }

  drawTopoMap(ctx) {
    if (!this.topoData || typeof topojson === 'undefined') return;
    const w = this.canvas.width, h = this.canvas.height, p = this.padding;
    const mapW = w - p.left - p.right, mapH = h - p.top - p.bottom;
    const oceanGrad = ctx.createLinearGradient(p.left, p.top, p.left, p.top + mapH);
    oceanGrad.addColorStop(0, '#0a2540');
    oceanGrad.addColorStop(0.5, '#0e3a5f');
    oceanGrad.addColorStop(1, '#071d30');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(p.left, p.top, mapW, mapH);

    const objectKey = this.topoData.objects.countries ? 'countries' : Object.keys(this.topoData.objects)[0];
    const geojson = topojson.feature(this.topoData, this.topoData.objects[objectKey]);
    const landColors = ['#2d5a27', '#336b2e', '#3a7a35', '#2f6630', '#3d7038'];
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.left, p.top, mapW, mapH);
    ctx.clip();
    geojson.features.forEach((feature, idx) => {
      const geom = feature.geometry;
      if (!geom) return;
      const polygons = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
      polygons.forEach(polygon => {
        polygon.forEach(ring => {
          if (ring.length < 3) return;
          ctx.beginPath();
          const first = this.project(ring[0][0], ring[0][1]);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < ring.length; i++) { const pt = this.project(ring[i][0], ring[i][1]); ctx.lineTo(pt.x, pt.y); }
          ctx.closePath();
          ctx.fillStyle = landColors[idx % landColors.length];
          ctx.fill();
          ctx.strokeStyle = 'rgba(100, 180, 100, 0.3)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        });
      });
    });
    ctx.restore();
  }

  drawGrid(ctx) {
    const p = this.padding, w = this.canvas.width, h = this.canvas.height;
    ctx.strokeStyle = 'rgba(129, 194, 238, 0.08)';
    ctx.lineWidth = 0.5;
    for (let lat = -60; lat <= 80; lat += 30) {
      const pt = this.project(0, lat);
      ctx.beginPath(); ctx.moveTo(p.left, pt.y); ctx.lineTo(w - p.right, pt.y); ctx.stroke();
      if (lat === 0) { ctx.strokeStyle = 'rgba(129, 194, 238, 0.2)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.left, pt.y); ctx.lineTo(w - p.right, pt.y); ctx.stroke(); ctx.strokeStyle = 'rgba(129, 194, 238, 0.08)'; ctx.lineWidth = 0.5; }
    }
    for (let lng = -150; lng <= 180; lng += 30) { const pt = this.project(lng, 0); ctx.beginPath(); ctx.moveTo(pt.x, p.top); ctx.lineTo(pt.x, h - p.bottom); ctx.stroke(); }
  }

  drawFlowerMarkers(ctx) {
    const flowers = this.filteredFlowers;
    const iconSize = Math.max(14, Math.min(28, 18 * this.scale));
    const hitRadius = Math.max(10, 14 * this.scale);
    flowers.forEach(flower => {
      const pt = this.project(flower.location.lng, flower.location.lat);
      const isHovered = this.hoveredFlower?.id === flower.id;
      const size = isHovered ? iconSize * 1.4 : iconSize;
      ctx.save();
      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (isHovered) { ctx.shadowColor = 'rgba(255,255,255,0.9)'; ctx.shadowBlur = 8; }
      ctx.fillText(flower.emoji || '🏛️', pt.x, pt.y);
      ctx.restore();
      flower._lastPtX = pt.x; flower._lastPtY = pt.y; flower._hitR = hitRadius;
      if (isHovered) {
        const label = flower.name;
        ctx.font = `bold ${Math.max(11, 12 * this.scale)}px "Nunito", sans-serif`;
        const tw = ctx.measureText(label).width;
        const lx = pt.x + size * 0.7, ly = pt.y - size * 0.4;
        const pad = 5, rh = 18, rr = 5;
        ctx.save();
        ctx.fillStyle = 'rgba(20, 8, 40, 0.88)';
        ctx.beginPath();
        ctx.moveTo(lx - pad + rr, ly - rh / 2); ctx.lineTo(lx + tw + pad - rr, ly - rh / 2);
        ctx.quadraticCurveTo(lx + tw + pad, ly - rh / 2, lx + tw + pad, ly - rh / 2 + rr);
        ctx.lineTo(lx + tw + pad, ly + rh / 2 - rr);
        ctx.quadraticCurveTo(lx + tw + pad, ly + rh / 2, lx + tw + pad - rr, ly + rh / 2);
        ctx.lineTo(lx - pad + rr, ly + rh / 2);
        ctx.quadraticCurveTo(lx - pad, ly + rh / 2, lx - pad, ly + rh / 2 - rr);
        ctx.lineTo(lx - pad, ly - rh / 2 + rr);
        ctx.quadraticCurveTo(lx - pad, ly - rh / 2, lx - pad + rr, ly - rh / 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#B3E5FC'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, lx, ly);
        ctx.restore();
      }
    });
  }

  setupEvents() {
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
      const delta = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const newScale = Math.max(1, Math.min(12, this.scale * delta));
      const ratio = newScale / this.scale;
      this.offsetX = mx - cx - (mx - cx - this.offsetX) * ratio;
      this.offsetY = my - cy - (my - cy - this.offsetY) * ratio;
      this.scale = newScale;
      this._clampOffset(); this.render();
    }, { passive: false });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this._isPanning = true;
      this._panStart = { x: e.clientX, y: e.clientY };
      this._panOffsetStart = { x: this.offsetX, y: this.offsetY };
      this.canvas.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (this._isPanning) {
        this.offsetX = this._panOffsetStart.x + e.clientX - this._panStart.x;
        this.offsetY = this._panOffsetStart.y + e.clientY - this._panStart.y;
        this._clampOffset(); this.render(); return;
      }
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.handleMouseMove(mx, my, e);
    });

    window.addEventListener('mouseup', () => { if (this._isPanning) { this._isPanning = false; this.canvas.style.cursor = 'crosshair'; } });

    this.canvas.addEventListener('click', (e) => {
      if (Math.abs(e.clientX - this._panStart?.x) > 4 || Math.abs(e.clientY - this._panStart?.y) > 4) return;
      const rect = this.canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.handleClick(mx, my, e);
    });

    this.canvas.addEventListener('mouseleave', () => {
      if (!this._isPanning) { this.hoveredFlower = null; this.render(); this.flowerUI.hideTooltip(); }
    });

    let lastTouchDist = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        lastTouchDist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
      }
    }, { passive: true });
    this.canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(e.touches[1].clientX - e.touches[0].clientX, e.touches[1].clientY - e.touches[0].clientY);
        const mid = { x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
        const rect = this.canvas.getBoundingClientRect();
        const mx = (mid.x - rect.left) * (this.canvas.width / rect.width);
        const my = (mid.y - rect.top) * (this.canvas.height / rect.height);
        const cx = this.canvas.width / 2, cy = this.canvas.height / 2;
        const newScale = Math.max(1, Math.min(12, this.scale * dist / lastTouchDist));
        const ratio = newScale / this.scale;
        this.offsetX = mx - cx - (mx - cx - this.offsetX) * ratio;
        this.offsetY = my - cy - (my - cy - this.offsetY) * ratio;
        this.scale = newScale;
        this._clampOffset(); this.render();
        lastTouchDist = dist;
      }
    }, { passive: false });
  }

  _clampOffset() {
    const w = this.canvas.width, h = this.canvas.height;
    const maxX = (this.scale - 1) * w / 2, maxY = (this.scale - 1) * h / 2;
    this.offsetX = Math.max(-maxX, Math.min(maxX, this.offsetX));
    this.offsetY = Math.max(-maxY, Math.min(maxY, this.offsetY));
  }

  findFlowerAtPoint(mx, my) {
    let closest = null, minDist = Infinity;
    const baseRadius = Math.max(12, 16 * this.scale);
    this.filteredFlowers.forEach(flower => {
      const pt = this.project(flower.location.lng, flower.location.lat);
      const d = Math.hypot(pt.x - mx, pt.y - my);
      if (d < baseRadius && d < minDist) { minDist = d; closest = flower; }
    });
    return closest;
  }

  handleMouseMove(mx, my, e) {
    const flower = this.findFlowerAtPoint(mx, my);
    const prev = this.hoveredFlower;
    this.hoveredFlower = flower;
    if (flower) { this.canvas.style.cursor = 'pointer'; this.flowerUI.showTooltip(flower, { x: e.clientX, y: e.clientY }); }
    else { this.canvas.style.cursor = 'crosshair'; this.flowerUI.hideTooltip(); }
    if (flower?.id !== prev?.id) this.render();
  }

  handleClick(mx, my, e) {
    const flower = this.findFlowerAtPoint(mx, my);
    if (flower) {
      this.flowerUI.showFlowerDetailCenter(flower);
      this.flowerUI.selectedFlower = flower;
      document.querySelectorAll('.flower-list-item').forEach(item => item.classList.toggle('active', item.dataset.id === flower.id));
    }
  }

  updateFlowers(flowers) { this.filteredFlowers = flowers; this.render(); }
}
