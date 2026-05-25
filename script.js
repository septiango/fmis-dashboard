// ===== FMIS DASHBOARD — SCRIPT LENGKAP DENGAN API INTEGRATION =====

// ── Progress mapping ──────────────────────────────────────────────────────
const PROG_KEY = s => {
  if (!s) return '01';
  const u = s.trim().toUpperCase();
  if (u.startsWith('05') || u.includes('BAP') || u.includes('RILIS')) return '05';
  if (u.startsWith('04') || u.includes('QC')) return '04';
  if (u.startsWith('03') || u.includes('QA')) return '03';
  if (u.startsWith('02') || u.includes('PROGRESS')) return '02';
  return '01';
};
const PROG_PCT   = {'01':5,'02':25,'03':55,'04':80,'05':100};
const PROG_CHIP  = {'01':'ps1','02':'ps2','03':'ps3','04':'ps4','05':'ps5'};
const PROG_LABEL = {'01':'01. Blank SPK','02':'02. SPK Progress','03':'03. QA','04':'04. QC','05':'05. Rilis BAP'};
const PROG_COLOR = {'01':'#4B5563','02':'#EF4444','03':'#EAB308','04':'#22C55E','05':'#8B5CF6'};

// ── State ─────────────────────────────────────────────────────────────────
let allData    = [];
let filterMode = 'all'; // Menyimpan mode: 'all', 'backlog', 'bukan', atau kode progress ('01'-'05')
let searchKey  = '';
let sortCol    = 'No';
let sortDir    = 1;

// ── Helper functions untuk merapikan tanggal ──────────────────────────────
function formatNumericDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    
    return `${d}-${m}-${y}`; // Hasil akhir singkat: 12-05-2026
  } catch (e) {
    return dateStr;
  }
}

// ── CSV Parser ────────────────────────────────────────────────────────────
function parseCSV(rows) {
  return rows.map((row, idx) => {
    const bl = row['Backlog'] || '';
    const luas = parseFloat(row['Luas']) || 0;
    const hari = parseInt(row['Hari']) || 0;
    const pk = PROG_KEY(row['Progress Status']);
    
    return {
      No: idx + 1,
      Backlog: bl,
      KeyID: row['KeyID'] || '',
      TYPE: row['TYPE'] || '-',
      Luas: luas,
      Act: row['Activity Description'] || '-',
      Comp: row['Completion'] || '-',
      Hari: hari,
      SPK: row['SPK'] || '-',
      PS: row['Progress Status'] || '-',
      SPV: row['SPV'] || '-',
      COOR: row['COOR'] || '-',
      ProgPct: parseFloat(row['Prog(%)']) || 0,
      QCPct: parseFloat(row['QC(%)']) || 0,
      DL: formatNumericDate(row['DATELINE']), // Tanggal otomatis dipotong singkat disini
      Komit: row['Komitmen 22'] || '-',
      isBacklog: bl === 'Backlog1' || bl === 'Backlog2' || bl === 'Backlog3',
      pk,
    };
  });
}

// ── Helper UI ─────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const f1 = n => (Math.round(n * 10) / 10).toFixed(1).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pct = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';

function showLoading(v) { 
  const el = $('loading');
  if (el) el.style.display = v ? 'flex' : 'none';
}

// ── Render All ────────────────────────────────────────────────────────────
function renderAll() {
  const bl = allData.filter(r => r.isBacklog);
  const bk = allData.filter(r => !r.isBacklog);
  const blH = bl.reduce((s, r) => s + r.Luas, 0);
  const bkH = bk.reduce((s, r) => s + r.Luas, 0);
  const gtH = blH + bkH;

  // KPI Cards
  if ($('v-bl-ha')) $('v-bl-ha').innerHTML = `${f1(blH)} <span class="unit">ha</span>`;
  if ($('v-bl-ct')) $('v-bl-ct').textContent = `${bl.length} petak`;
  if ($('v-bl-pct')) $('v-bl-pct').textContent = `${pct(blH, gtH)}% dari total`;

  if ($('v-bk-ha')) $('v-bk-ha').innerHTML = `${f1(bkH)} <span class="unit">ha</span>`;
  if ($('v-bk-ct')) $('v-bk-ct').textContent = `${bk.length} petak`;
  if ($('v-bk-pct')) $('v-bk-pct').textContent = `${pct(bkH, gtH)}% dari total`;

  if ($('v-tot-ha')) $('v-tot-ha').innerHTML = `${f1(gtH)} <span class="unit">ha</span>`;
  if ($('v-tot-ct')) $('v-tot-ct').textContent = `${allData.length} petak total`;
  if ($('v-tot-badge')) $('v-tot-badge').textContent = `${bl.length} BL, ${bk.length} BK`;

  renderGtArc(blH, bkH, gtH);

  // Proporsi bar
  const blPct = gtH > 0 ? (blH / gtH) * 100 : 0;
  if ($('ov-fill')) $('ov-fill').style.width = blPct + '%';
  if ($('ov-legend')) {
    $('ov-legend').innerHTML = `
      <span class="ov-leg-item"><span class="ov-dot" style="background:#EF4444"></span>Backlog: ${f1(blH)} ha (${blPct.toFixed(1)}%)</span>
      <span class="ov-leg-item"><span class="ov-dot" style="background:#10B981"></span>Bukan BL: ${f1(bkH)} ha (${(100 - blPct).toFixed(1)}%)</span>`;
  }

  // Kategori KPI Backlog 1, 2, 3
  ['Backlog1', 'Backlog2', 'Backlog3'].forEach((cat, i) => {
    const idx = i + 1;
    const rows = bl.filter(r => r.Backlog === cat);
    const ha = rows.reduce((s, r) => s + r.Luas, 0);
    if ($(`v-b${idx}-ha`)) $(`v-b${idx}-ha`).innerHTML = `${f1(ha)}<span class="unit-sm"> ha</span>`;
    if ($(`v-b${idx}-ct`)) $(`v-b${idx}-ct`).textContent = `${rows.length} petak`;
    if ($(`v-b${idx}-pct`)) $(`v-b${idx}-pct`).textContent = `${pct(ha, blH)}% backlog`;
  });

  // Charts
  renderBarChart('coor-chart', 'COOR');
  renderBarChart('spv-chart', 'SPV');

  // Ringkasan Cepat
  if ($('rk-total-ha')) $('rk-total-ha').textContent = f1(gtH) + ' ha';
  if ($('rk-total-pk')) $('rk-total-pk').textContent = allData.length;
  if ($('rk-bl-pk')) $('rk-bl-pk').textContent = bl.length;
  if ($('rk-bk-pk')) $('rk-bk-pk').textContent = bk.length;

  // Donut & Legend
  renderDonut();

  // Alert
  renderAlert(bl, bk, gtH, blH);

  // Table Utama
  renderTable();

  // Update topbar time
  const now = new Date();
  const opts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  if ($('topbar-update')) $('topbar-update').textContent = '⟳ Update Terakhir: ' + now.toLocaleDateString('id-ID', opts) + ' WIB';
}

// ── Grand Total pie arc ─────────────────────────────────────────────────────
function renderGtArc(blH, bkH, gtH) {
  if (!gtH) return;
  const cx = 50, cy = 50, r = 38;
  const blAngle = (blH / gtH) * 360;

  function arcPath(startDeg, endDeg) {
    const s = (startDeg - 90) * Math.PI / 180;
    const e = (endDeg - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const blEl = document.getElementById('gt-arc-bl');
  const bkEl = document.getElementById('gt-arc-bk');
  if (blEl) blEl.setAttribute('d', arcPath(0, blAngle));
  if (bkEl) bkEl.setAttribute('d', arcPath(blAngle, 360));
}

// ── Stacked bar chart ─────────────────────────────────────────────────────
function renderBarChart(elId, groupKey) {
  const map = {};
  allData.forEach(r => {
    const name = (r[groupKey] || '-').toUpperCase().trim();
    if (!map[name]) map[name] = { '01': 0, '02': 0, '03': 0, '04': 0, '05': 0, total: 0 };
    map[name][r.pk] += r.Luas;
    map[name].total += r.Luas;
  });
  const arr = Object.entries(map).map(([k, v]) => ({ name: k, ...v })).sort((a, b) => b.total - a.total);
  const maxT = Math.max(...arr.map(a => a.total), 1);
  const container = document.getElementById(elId);
  if (!container) return;
  
  container.innerHTML = arr.length ? arr.map(item => {
    const segs = ['01', '02', '03', '04', '05'].map(k => {
      const v = item[k] || 0;
      if (!v) return '';
      const w = (v / maxT * 100).toFixed(1);
      const lbl = parseFloat(w) > 7 ? f1(v) : '';
      return `<div class="bar-seg s${k.slice(1)}" style="width:${w}%" title="${PROG_LABEL[k]}: ${f1(v)} ha">${lbl}</div>`;
    }).join('');
    return `<div class="bar-row">
      <div class="bar-name" title="${item.name}">${item.name}</div>
      <div class="bar-track">${segs}</div>
      <div class="bar-total">${f1(item.total)} ha</div>
    </div>`;
  }).join('') : '<div class="no-data">Tidak ada data</div>';
}

// ── Progress Status Donut dengan Fitur Filter Klik ────────────────────────
function renderDonut() {
  const statusMap = {};
  allData.forEach(r => {
    if (!statusMap[r.pk]) statusMap[r.pk] = 0;
    statusMap[r.pk] += r.Luas;
  });

  const total = Object.values(statusMap).reduce((s, v) => s + v, 0);
  if (!total) return;

  const cx = 60, cy = 60, r = 45, strokeW = 18;
  const circ = 2 * Math.PI * r;
  const svg = document.getElementById('donut-svg');
  if (!svg) return;
  
  svg.querySelectorAll('.donut-seg').forEach(el => el.remove());

  const order = ['01', '02', '03', '04', '05'];
  const segments = order.filter(k => statusMap[k]).map(k => ({
    key: k, val: statusMap[k], pct: statusMap[k] / total
  }));

  let cumulOffset = circ * 0.25;
  const legend = document.getElementById('donut-legend');
  if (legend) legend.innerHTML = '';

  segments.forEach(seg => {
    const dash = seg.pct * circ;
    const gap = circ - dash;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'donut-seg');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', PROG_COLOR[seg.key]);
    circle.setAttribute('stroke-width', strokeW);
    circle.setAttribute('stroke-dasharray', `${dash} ${gap}`);
    circle.setAttribute('stroke-dashoffset', cumulOffset);
    circle.setAttribute('stroke-linecap', 'butt');
    
    // Klik pada busur Donut Chart untuk memfilter progress status
    circle.style.cursor = 'pointer';
    circle.addEventListener('click', () => {
      filterMode = seg.key;
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      renderTable();
    });

    svg.appendChild(circle);
    cumulOffset -= dash;

    const pctStr = (seg.pct * 100).toFixed(1);
    const haStr = f1(seg.val);
    if (legend) {
      legend.innerHTML += `<div class="donut-row donut-row-clickable" data-status="${seg.key}" style="cursor:pointer;">
        <div class="donut-dot" style="background:${PROG_COLOR[seg.key]}"></div>
        <span>${PROG_LABEL[seg.key]}</span>
        <span class="donut-row-val">${haStr} ha (${pctStr}%)</span>
      </div>`;
    }
  });

  // Klik pada baris list legenda teks untuk memfilter progress status
  if (legend) {
    legend.querySelectorAll('.donut-row-clickable').forEach(row => {
      row.addEventListener('click', (e) => {
        filterMode = e.currentTarget.dataset.status;
        document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        renderTable();
      });
    });
  }
}

// ── Alert & Insight ───────────────────────────────────────────────────────
function renderAlert(bl, bk, gtH, blH) {
  const overdue = allData.filter(r => r.Hari < 0);
  const avgOverdue = overdue.length ? Math.round(overdue.reduce((s, r) => s + Math.abs(r.Hari), 0) / overdue.length) : 0;
  if ($('alert-avg-hari')) $('alert-avg-hari').textContent = avgOverdue || '—';

  const alerts = [];

  const coorMap = {};
  bl.forEach(r => {
    const c = r.COOR || '-';
    if (!coorMap[c]) coorMap[c] = 0;
    coorMap[c] += r.Luas;
  });
  const topCoor = Object.entries(coorMap).sort((a, b) => b[1] - a[1])[0];
  if (topCoor) alerts.push({ cls: 'red', icon: '🔴', text: `Backlog tertinggi: COOR ${topCoor[0]} (${f1(topCoor[1])} ha)` });

  const spvMap = {};
  bl.forEach(r => {
    const s = r.SPV || '-';
    if (!spvMap[s]) spvMap[s] = 0;
    spvMap[s] += r.Luas;
  });
  const topSpv = Object.entries(spvMap).sort((a, b) => b[1] - a[1])[0];
  if (topSpv) alerts.push({ cls: 'yellow', icon: '🟡', text: `SPV dengan tunggakan terbesar: ${topSpv[0]} (${f1(topSpv[1])} ha)` });

  const severeOverdue = allData.filter(r => r.Hari < -14).length;
  if (severeOverdue > 0) alerts.push({ cls: 'orange', icon: '🟠', text: `${severeOverdue} petak dengan status overdue (hari < −14)` });

  const blPct = gtH > 0 ? ((blH / gtH) * 100).toFixed(1) : 0;
  alerts.push({ cls: 'red', icon: '🔴', text: `${blPct}% dari total area masih backlog` });

  if ($('alert-list')) {
    $('alert-list').innerHTML = alerts.map(a => `
      <div class="alert-item">
        <div class="alert-dot ${a.cls}">${a.icon}</div>
        <span>${a.text}</span>
      </div>`).join('');
  }
}

// ── Table Render & Filter Logic ───────────────────────────────────────────
function renderTable() {
  let rows = [...allData];

  // Eksekusi filter berdasarkan mode tab ataupun pilihan status donut chart
  if (filterMode === 'backlog') {
    rows = rows.filter(r => r.isBacklog);
  } else if (filterMode === 'bukan') {
    rows = rows.filter(r => !r.isBacklog);
  } else if (['01', '02', '03', '04', '05'].includes(filterMode)) {
    rows = rows.filter(r => r.pk === filterMode); // Filter berdasarkan status '01', '02' dsb.
  }

  // Saring berdasarkan keyword input pencarian
  if (searchKey) {
    const q = searchKey.toLowerCase();
    rows = rows.filter(r =>
      r.KeyID.toLowerCase().includes(q) ||
      r.Act.toLowerCase().includes(q) ||
      r.SPV.toLowerCase().includes(q) ||
      r.COOR.toLowerCase().includes(q) ||
      r.Backlog.toLowerCase().includes(q)
    );
  }

  // Pengurutan (Sorting) Kolom
  rows.sort((a, b) => {
    let va = a[sortCol], vb = b[sortCol];
    if (['No', 'Luas', 'Hari'].includes(sortCol)) {
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
      return (va - vb) * sortDir;
    }
    return String(va || '').localeCompare(String(vb || '')) * sortDir;
  });

  if ($('row-count')) $('row-count').textContent = `${rows.length} baris ditampilkan`;

  if (!rows.length) {
    if ($('tbl-body')) $('tbl-body').innerHTML = `<tr><td colspan="11"><div class="no-data">🔍 Tidak ada data</div></td></tr>`;
    return;
  }

  if ($('tbl-body')) {
    $('tbl-body').innerHTML = rows.map(r => {
      const isbl = r.isBacklog;
      const rowCls = isbl ? 'row-bl' : 'row-bk';
      const blBadge = {
        Backlog1: 'bl1 tbl-badge', Backlog2: 'bl2 tbl-badge', Backlog3: 'bl3 tbl-badge', Bukan_Backlog: 'blk tbl-badge'
      }[r.Backlog] || 'blk tbl-badge';
      const blLabel = { Backlog1: 'BL-1', Backlog2: 'BL-2', Backlog3: 'BL-3', Bukan_Backlog: 'NON-BL' }[r.Backlog] || 'NON-BL';
      const psCls = `ps-chip ${PROG_CHIP[r.pk]}`;
      const psLbl = PROG_LABEL[r.pk];

      const hariVal = r.Hari;
      const hariCls = hariVal < 0 ? 'hari-neg' : (hariVal > 0 ? 'hari-pos' : 'hari-zero');
      const hariStr = hariVal < 0 ? `${hariVal}` : (hariVal > 0 ? `+${hariVal}` : '0');

      const komitCls = r.Komit === 'Terkejar' ? 'komit-y' : (r.Komit === 'Tidak Terkejar' ? 'komit-n' : '');
      const komitStr = r.Komit === 'Terkejar' ? '✔' : (r.Komit === 'Tidak Terkejar' ? '✘' : '-');

      return `<tr class="${rowCls}">
        <td style="color:var(--text3);font-size:10px;text-align:center">${r.No}</td>
        <td><span class="${blBadge}">${blLabel}</span></td>
        <td class="keyid-cell">${r.KeyID}</td>
        <td class="luas-cell">${f1(r.Luas)}</td>
        <td style="max-width:130px;overflow:hidden;text-overflow:ellipsis;font-size:11px" title="${r.Act}">${r.Act}</td>
        <td><span class="${psCls}">${psLbl}</span></td>
        <td class="${hariCls}" style="text-align:right">${hariStr}</td>
        <td style="font-size:11px">${r.SPV}</td>
        <td style="font-size:11px;font-weight:700">${r.COOR}</td>
        <td style="font-size:10px;color:var(--text2)">${r.DL}</td>
        <td style="text-align:center"><span class="${komitCls}">${komitStr}</span></td>
      </tr>`;
    }).join('');
  }

  // Pasang ulang trigger sort pada header kolom table
  document.querySelectorAll('.main-tbl th[data-col]').forEach(th => {
    th.onclick = () => {
      const c = th.dataset.col;
      if (sortCol === c) sortDir *= -1;
      else { sortCol = c; sortDir = 1; }
      document.querySelectorAll('.main-tbl th').forEach(t => {
        t.classList.remove('sorted');
        const arr = t.querySelector('.sort-arr');
        if (arr) arr.remove();
      });
      th.classList.add('sorted');
      const sp = document.createElement('span');
      sp.className = 'sort-arr';
      sp.textContent = sortDir === 1 ? '▲' : '▼';
      th.appendChild(sp);
      renderTable();
    };
  });
}

// ── Fetch Data dari Apps Script API ───────────────────────────────────────
async function loadCSVFromAPI() {
  showLoading(true);
  
  try {
    const token = localStorage.getItem('fmis_token');
    if (!token) throw new Error('No auth token');
    
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getData&token=${encodeURIComponent(token)}`);
    const result = await response.json();
    
    if (result.success) {
      allData = parseCSV(result.data);
      renderAll();
      showToastMsg(`✅ ${allData.length} baris dimuat`, 'ok');
    } else {
      throw new Error(result.error || 'Failed to load data');
    }
  } catch (error) {
    console.error(error);
    showToastMsg('❌ Gagal mengambil data dari server', 'err');
    allData = [];
    renderAll();
  }
  
  showLoading(false);
}

function showToastMsg(msg, type = 'ok') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

window.loadCSVFromAPI = loadCSVFromAPI;

// Auto-refresh data otomatis dari server setiap 10 menit
setInterval(() => {
  if (localStorage.getItem('fmis_token')) {
    loadCSVFromAPI();
  }
}, 10 * 60 * 1000);


// ── INISIALISASI EVENT LISTENERS KONTROL UTAMA ────────────────────────────
function initDashboardControls() {
  // 1. Handler Real-time Input Kotak Pencarian
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchKey = e.target.value;
      renderTable();
    });
  }

  // 2. Handler Navigasi Tab Utama Atas (Semua, Backlog, Bukan BL)
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      
      filterMode = e.currentTarget.dataset.f; // Nilai 'all', 'backlog', atau 'bukan'
      renderTable();
    });
  });
}

// Jalankan inisialisasi kontrol dashboard setelah DOM siap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboardControls);
} else {
  initDashboardControls();
}
