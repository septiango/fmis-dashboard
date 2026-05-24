// ===== TAMBAHAN UNTUK API INTEGRATION =====
// Tambahkan ini di BOTTOM file script.js Anda

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyMr8yFPUbJ8qK0bKDk23t9URwmUdwFK5aeE_wa0Xwki-a0SI80iLDAwTCAp3gVwQ8NFw/exec';

async function loadCSVFromAPI() {
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'flex';
  
  try {
    const token = localStorage.getItem('fmis_token');
    if (!token) throw new Error('No auth token');
    
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getData&token=${encodeURIComponent(token)}`);
    const result = await response.json();
    
    if (result.success) {
      allData = parseCSV(result.data);
      renderAll();
      const updateEl = document.getElementById('topbar-update');
      if (updateEl) updateEl.textContent = `⟳ Update Terakhir: ${new Date().toLocaleString()} WIB`;
      showToast(`✅ ${allData.length} baris dimuat`, 'ok');
    } else {
      throw new Error(result.error || 'Failed to load data');
    }
  } catch (error) {
    console.error(error);
    showToast('❌ Gagal mengambil data dari server', 'err');
    allData = [];
    renderAll();
  }
  
  if (loading) loading.style.display = 'none';
}

function showToast(msg, type = 'ok') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

window.loadCSVFromAPI = loadCSVFromAPI;

// Auto-refresh setiap 10 menit (lebih hemat request)
setInterval(() => {
  if (localStorage.getItem('fmis_token')) {
    loadCSVFromAPI();
  }
}, 10 * 60 * 1000);
