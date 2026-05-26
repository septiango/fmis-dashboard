// ... (Script awal sama) ...

async function loadCSVFromAPI() {
  showLoading(true);
  try {
    const token = localStorage.getItem('fmis_token');
    // Request ke action 'getData' yang mengembalikan data Dashboard & data YTD
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getData&token=${encodeURIComponent(token)}`);
    const result = await response.json();
    
    if (result.success) {
      // 1. Render Dashboard MTD
      allData = parseCSV(result.data);
      renderAll();

      // 2. Render Data YTD (Jika ada di result.ytdData)
      if(result.ytdData) {
         updateYtdUI(result.ytdData);
      }
      
      showToastMsg(`✅ Data Sinkron`, 'ok');
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    showToastMsg('❌ Koneksi Bermasalah', 'err');
  }
  showLoading(false);
}

function updateYtdUI(data) {
  // Ambil baris terakhir 'YTD'
  const ytdTotal = data.find(r => r.Periode === 'YTD') || { Fertilizer: 0, Weeding: 0, Total: 0 };
  
  document.getElementById('ytd-fert').innerHTML = `${f1(ytdTotal.Fertilizer)} <span class="unit">Ha</span>`;
  document.getElementById('ytd-weed').innerHTML = `${f1(ytdTotal.Weeding)} <span class="unit">Ha</span>`;
  document.getElementById('ytd-total').innerHTML = `${f1(ytdTotal.Total)} <span class="unit">Ha</span>`;

  // Catatan: Logic untuk menggambar ulang SVG bisa ditambahkan di sini secara dinamis
}

// ... (Sisanya sama) ...
