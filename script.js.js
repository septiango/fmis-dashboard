// ===== FMIS DASHBOARD — SCRIPT DENGAN API INTEGRATION =====

// Konfigurasi
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

// Progress mapping (SAME AS BEFORE)
const PROG_KEY = s => {
  if (!s) return '01';
  const u = s.trim().toUpperCase();
  if (u.startsWith('05') || u.includes('BAP') || u.includes('RILIS')) return '05';
  if (u.startsWith('04') || u.includes('QC')) return '04';
  if (u.startsWith('03') || u.includes('QA')) return '03';
  if (u.startsWith('02') || u.includes('PROGRESS')) return '02';
  return '01';
};

const PROG_PCT = {'01':5,'02':25,'03':55,'04':80,'05':100};
const PROG_CHIP = {'01':'ps1','02':'ps2','03':'ps3','04':'ps4','05':'ps5'};
const PROG_LABEL = {'01':'01. Blank SPK','02':'02. SPK Progress','03':'03. QA','04':'04. QC','05':'05. Rilis BAP'};
const PROG_COLOR = {'01':'#4B5563','02':'#EF4444','03':'#EAB308','04':'#22C55E','05':'#8B5CF6'};

let allData = [];
let filterMode = 'all';
let searchKey = '';
let sortCol = 'No';
let sortDir = 1;

// Parse CSV data (SAME AS BEFORE)
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
      DL: row['DATELINE'] || '-',
      Komit: row['Komitmen 22'] || '-',
      isBacklog: bl === 'Backlog1' || bl === 'Backlog2' || bl === 'Backlog3',
      pk,
    };
  });
}

// LOAD DATA FROM API
async function loadCSVFromAPI() {
  showLoading(true);
  
  try {
    const token = localStorage.getItem('fmis_token');
    if (!token) {
      throw new Error('No auth token');
    }
    
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getData&token=${encodeURIComponent(token)}`);
    const result = await response.json();
    
    if (result.success) {
      allData = parseCSV(result.data);
      renderAll();
      showToast(`✅ ${allData.length} baris dimuat (${new Date(result.lastUpdate).toLocaleString()})`, 'ok');
    } else {
      throw new Error(result.error || 'Failed to load data');
    }
  } catch (error) {
    console.error(error);
    showToast('❌ Gagal mengambil data dari server', 'err');
    allData = [];
    renderAll();
  }
  
  showLoading(false);
}

// Helper function to show toast
function showToast(msg, type = 'ok') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3000);
}

// All other rendering functions remain EXACTLY THE SAME as your original script.js
// (renderAll, renderBarChart, renderDonut, renderAlert, renderTable, etc.)

// Make loadCSVFromAPI available globally
window.loadCSVFromAPI = loadCSVFromAPI;

// Override the original loadCSV to use API
async function loadCSV() {
  await loadCSVFromAPI();
}

// Auto-refresh every 5 minutes
setInterval(() => {
  if (localStorage.getItem('fmis_token')) {
    loadCSVFromAPI();
  }
}, 5 * 60 * 1000);