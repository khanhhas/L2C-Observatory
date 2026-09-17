<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lịch sử Sức khỏe Hệ thống (System Health)</title>
  
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/hammerjs@2.0.8"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@1.2.1/dist/chartjs-plugin-zoom.min.js"></script>
  
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" type="text/css" href="https://npmcdn.com/flatpickr/dist/themes/dark.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://npmcdn.com/flatpickr/dist/l10n/vn.js"></script>

  <style>
    :root {
      --bg: #0f172a; --panel: #1e293b; --text: #f8fafc; --muted: #94a3b8;
      --accent: #38bdf8; --danger: #ef4444; --safe: #10b981; 
    }
    body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 20px; }
    .container { max-width: 1400px; margin: 0 auto; }
    
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 15px; margin-bottom: 25px; }
    .header h1 { margin: 0; font-size: 1.6em; color: var(--accent); }
    .btn-back { background: #334155; color: #fff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; border: 1px solid #475569; transition: 0.2s; }
    .btn-back:hover { background: #475569; }

    .filter-bar { background: var(--panel); padding: 20px; border-radius: 12px; display: flex; gap: 20px; align-items: center; margin-bottom: 25px; border: 1px solid #334155; flex-wrap: wrap; }
    .input-group { display: flex; flex-direction: column; gap: 5px; }
    .input-group label { font-size: 0.85em; color: var(--muted); text-transform: uppercase; }
    .input-group input { background: #0f172a; border: 1px solid #475569; color: #fff; padding: 10px; border-radius: 6px; cursor: pointer; text-align: center; width: 150px; font-weight: bold;}
    .btn-filter { background: var(--accent); color: #000; border: none; padding: 10px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 18px; transition: 0.2s;}
    .btn-filter:hover { background: #0ea5e9; }

    .grid-visuals-full { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px; }
    .visual-card { background: var(--panel); border: 1px solid #334155; border-radius: 16px; padding: 20px; display: flex; flex-direction: column;}
    .card-title { font-size: 0.85em; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; font-weight: bold; }

    /* Legend Color Boxes */
    .color-box { display: inline-block; width: 12px; height: 12px; margin-right: 5px; border-radius: 3px; }
    .c-roof { background: #38bdf8; }
    .c-weather { background: #10b981; }
    .c-pier { background: #facc15; }
    .c-alarm { background: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗄️ LỊCH SỬ SỨC KHỎE HỆ THỐNG (SYSTEM HEALTH)</h1>
      <a href="index.html" class="btn-back">⬅ Quay lại Bảng điều khiển</a>
    </div>

    <div class="filter-bar">
      <div class="input-group">
        <label>TỪ NGÀY & GIỜ (24H)</label>
        <input type="text" id="startDate" placeholder="Chọn thời gian...">
      </div>
      <div class="input-group">
        <label>ĐẾN NGÀY & GIỜ (24H)</label>
        <input type="text" id="endDate" placeholder="Chọn thời gian...">
      </div>
      <button class="btn-filter" onclick="loadHealthData()">TRÍCH XUẤT DỮ LIỆU</button>
      
      <div class="ms-auto d-flex gap-3 align-items-center" style="font-size: 0.85em; color: #e2e8f0; margin-left: auto;">
         <span><span class="color-box c-roof"></span>Mái Che</span>
         <span><span class="color-box c-weather"></span>Khí Tượng</span>
         <span><span class="color-box c-pier"></span>Trụ Kính</span>
         <span><span class="color-box c-alarm"></span>Báo Động</span>
      </div>
    </div>

    <div class="grid-visuals-full">
      <div class="visual-card">
        <div class="card-title text-white">1. NHIỆT ĐỘ LÕI CHIP (CORE TEMPERATURE) 🌡️</div>
        <div style="flex-grow:1; position:relative; min-height:250px;">
          <canvas id="tempChart"></canvas>
        </div>
      </div>
    </div>

    <div class="grid-visuals-full">
      <div class="visual-card">
        <div class="card-title text-white">2. BỘ NHỚ TRỐNG (FREE RAM / HEAP) 💾</div>
        <div style="flex-grow:1; position:relative; min-height:250px;">
          <canvas id="ramChart"></canvas>
        </div>
      </div>
    </div>

    <div class="grid-visuals-full">
      <div class="visual-card">
        <div class="card-title text-white">3. ĐỘ LỢI SÓNG WI-FI (RSSI) 📶</div>
        <div style="flex-grow:1; position:relative; min-height:250px;">
          <canvas id="rssiChart"></canvas>
        </div>
      </div>
    </div>

    <div class="grid-visuals-full">
      <div class="visual-card">
        <div class="card-title text-white">4. TỶ LỆ RỚT GÓI TIN ESP-NOW (DROP RATE) 📡</div>
        <div style="flex-grow:1; position:relative; min-height:200px;">
          <canvas id="dropChart"></canvas>
        </div>
      </div>
    </div>

    <div class="grid-visuals-full">
      <div class="visual-card">
        <div class="card-title text-white">5. THỜI GIAN HOẠT ĐỘNG LIÊN TỤC (UPTIME TRONG GIỜ) ⏳</div>
        <div style="flex-grow:1; position:relative; min-height:200px;">
          <canvas id="uptimeChart"></canvas>
        </div>
      </div>
    </div>

  </div>

  <script>
    let now = new Date();
    let yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    flatpickr("#startDate", { enableTime: true, time_24hr: true, dateFormat: "Y-m-d H:i", locale: "vn", defaultDate: yesterday });
    flatpickr("#endDate", { enableTime: true, time_24hr: true, dateFormat: "Y-m-d H:i", locale: "vn", defaultDate: now });

    let tempChart, ramChart, rssiChart, dropChart, uptimeChart;
    const colors = { roof: '#38bdf8', weather: '#10b981', pier: '#facc15', alarm: '#ef4444' };
    
    const zoomOptions = {
        zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'x' },
        pan: { enabled: true, mode: 'x' }
    };

    function createChart(ctxId, titleY) {
        return new Chart(document.getElementById(ctxId).getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: { 
                animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, spanGaps: true,
                scales: { 
                    y: { title: {display: true, text: titleY, color: '#94a3b8'}, grid: {color: '#334155'}, ticks: {color: '#94a3b8'} },
                    x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 20} }
                },
                plugins: { legend: { display: false }, zoom: zoomOptions }
            }
        });
    }

    function initCharts() {
        tempChart = createChart('tempChart', 'Nhiệt độ (°C)');
        ramChart = createChart('ramChart', 'RAM Trống (KB)');
        rssiChart = createChart('rssiChart', 'Độ lợi sóng (dBm)');
        dropChart = createChart('dropChart', 'Lần rớt mạng');
        uptimeChart = createChart('uptimeChart', 'Số Giờ Liên tục');
    }

    function generateDatasets(dataObj, field) {
        return [
            { label: 'Mái Che', data: dataObj.sys_roof[field], borderColor: colors.roof, backgroundColor: 'transparent', pointRadius: 0, tension: 0.2, borderWidth: 2 },
            { label: 'Khí Tượng', data: dataObj.sys_weather[field], borderColor: colors.weather, backgroundColor: 'transparent', pointRadius: 0, tension: 0.2, borderWidth: 2 },
            { label: 'Trụ Kính', data: dataObj.sys_pier[field], borderColor: colors.pier, backgroundColor: 'transparent', pointRadius: 0, tension: 0.2, borderWidth: 2 },
            { label: 'Báo Động', data: dataObj.sys_alarm[field], borderColor: colors.alarm, backgroundColor: 'transparent', pointRadius: 0, tension: 0.2, borderWidth: 2 }
        ];
    }

    function loadHealthData() {
        let start = document.getElementById('startDate').value + ':00';
        let end = document.getElementById('endDate').value + ':59';

        fetch(`api_history.php?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
        .then(response => response.json())
        .then(data => {
            if(data.error) { alert("Lỗi truy xuất: " + data.error); return; }

            let labels = data.times;

            tempChart.data.labels = labels;
            tempChart.data.datasets = generateDatasets(data, 'temp');
            tempChart.update();

            ramChart.data.labels = labels;
            ramChart.data.datasets = generateDatasets(data, 'ram');
            ramChart.update();

            rssiChart.data.labels = labels;
            rssiChart.data.datasets = generateDatasets(data, 'rssi');
            rssiChart.update();

            dropChart.data.labels = labels;
            dropChart.data.datasets = generateDatasets(data, 'drop');
            // Cấu hình lại để Drop Rate hiển thị dạng Stepped Line cho dễ theo dõi số tích lũy
            dropChart.data.datasets.forEach(ds => { ds.stepped = true; ds.borderWidth = 1.5; });
            dropChart.update();

            uptimeChart.data.labels = labels;
            uptimeChart.data.datasets = generateDatasets(data, 'uptime');
            uptimeChart.data.datasets.forEach(ds => { ds.fill = true; ds.backgroundColor = ds.borderColor + '20'; }); // Thêm fill nhạt
            uptimeChart.update();
        })
        .catch(err => { console.error("Lỗi mạng:", err); });
    }

    window.onload = () => {
        initCharts();
        loadHealthData();
    };
  </script>
</body>
</html>