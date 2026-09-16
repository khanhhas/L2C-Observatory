<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lịch sử Khí hậu Đài Thiên Văn</title>
  
  <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
  
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css">
  <link rel="stylesheet" type="text/css" href="https://npmcdn.com/flatpickr/dist/themes/dark.css">
  <script src="https://cdn.jsdelivr.net/npm/flatpickr"></script>
  <script src="https://npmcdn.com/flatpickr/dist/l10n/vn.js"></script>
  <!-- Hammer.js hỗ trợ kéo thả và cảm ứng trên điện thoại -->
  <script src="https://cdn.jsdelivr.net/npm/hammerjs@2.0.8"></script>
  <!-- Plugin Zoom cho Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@1.2.1/dist/chartjs-plugin-zoom.min.js"></script>

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
    .wind-impact-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; margin: -4px 0 10px; color: var(--muted); font-size: 0.7em; }
    .wind-impact-key { display: inline-flex; align-items: center; gap: 5px; }
    .wind-impact-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 7px currentColor; }
    .wind-impact-safe { color: #34d399; }
    .wind-impact-watch { color: #facc15; }
    .wind-impact-affected { color: #f59e0b; }
    .wind-impact-unsafe { color: #ef4444; }

    /* Thanh công cụ Lọc ngày tháng */
    .filter-bar { background: var(--panel); padding: 20px; border-radius: 12px; display: flex; gap: 20px; align-items: center; margin-bottom: 25px; border: 1px solid #334155; flex-wrap: wrap; }
    .input-group { display: flex; flex-direction: column; gap: 5px; }
    .input-group label { font-size: 0.85em; color: var(--muted); text-transform: uppercase; }
    .input-group input { background: #0f172a; border: 1px solid #475569; color: #fff; padding: 10px; border-radius: 6px; cursor: pointer; text-align: center; width: 150px; font-weight: bold;}
    .btn-filter { background: var(--accent); color: #000; border: none; padding: 10px 30px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 18px; transition: 0.2s;}
    .btn-filter:hover { background: #0ea5e9; }

    /* Box Thống kê tổng quan */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px; }
    .stat-card { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); padding: 20px; border-radius: 12px; text-align: center; }
    .stat-val { font-size: 2em; font-weight: bold; color: var(--accent); margin-top: 10px; }

    /* CSS MỚI CHO TURBULENCE BAND BADGES */
    .wind-badge { background: #0f172a; padding: 10px 15px; border-radius: 8px; border: 1px solid #334155; font-size: 0.85em; text-align: center;}
    .wind-badges-container { display: flex; gap: 15px; margin-bottom: 15px; }

    /* Quy hoạch Layout biểu đồ */
    .grid-visuals-top { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px; }
    .grid-visuals-split { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
    .grid-visuals-mid { display: grid; grid-template-columns: 2.5fr 1fr; gap: 20px; margin-bottom: 20px; }
    .grid-visuals-bot { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 20px; }

    .visual-card { background: var(--panel); border: 1px solid #334155; border-radius: 16px; padding: 20px; display: flex; flex-direction: column;}
    .card-title { font-size: 0.85em; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; font-weight: bold; }

    @media (max-width: 1024px) {
      .grid-visuals-split, .grid-visuals-mid { grid-template-columns: 1fr; }
      .wind-badges-container { flex-direction: column; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🗄️ TRUNG TÂM DỮ LIỆU KHÍ HẬU (L2C)</h1>
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
      <button class="btn-filter" onclick="loadHistoryData()">TRÍCH XUẤT DỮ LIỆU</button>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div style="color: var(--muted); font-size: 0.9em; text-transform: uppercase;">Tổng điểm dữ liệu</div>
        <div class="stat-val" id="st-points" style="color: #fff;">0</div>
      </div>
      <div class="stat-card">
        <div style="color: var(--muted); font-size: 0.9em; text-transform: uppercase;">Gió giật mạnh nhất</div>
        <div class="stat-val" id="st-wind">0.0<span style="font-size: 0.4em; color: #94a3b8;">m/s</span></div>
      </div>
      <div class="stat-card" style="background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2);">
        <div style="color: var(--danger); font-size: 0.9em; text-transform: uppercase;">Tổng thời gian Mưa</div>
        <div class="stat-val" id="st-rain" style="color: var(--danger);">0<span style="font-size: 0.4em;"> phút</span></div>
      </div>
    </div>

    <!-- MÔI TRƯỜNG NGOÀI TRỜI (FULL NGANG) -->
    <div class="grid-visuals-top">
      <div class="visual-card">
        <div class="card-title" style="color:#fff;">MÔI TRƯỜNG NGOÀI TRỜI (NHIỆT / ẨM / ĐIỂM SƯƠNG) 🌡️💧</div>
        <div style="flex-grow:1; position:relative; min-height:250px;">
          <canvas id="envChart"></canvas>
        </div>
      </div>
    </div>

    <!-- ÁP SUẤT RỘNG FULL CHIỀU NGANG -->
    <div class="grid-visuals-bot">
        <div class="visual-card">
            <div class="card-title" style="color:#facc15;">BIẾN THIÊN ÁP SUẤT (NOWCASTING) 🌫️</div>
            <div style="flex-grow:1; position:relative; min-height:200px;">
                <canvas id="pressureChart"></canvas>
            </div>
        </div>
    </div>

    <!-- BỤI MỊN RỘNG FULL CHIỀU NGANG -->
    <div class="grid-visuals-bot">
        <div class="visual-card">
            <div class="card-title" style="color:#38bdf8;">CHỈ SỐ BỤI MỊN (PM2.5 / PM10) 😷</div>
            <div style="flex-grow:1; position:relative; min-height:200px;">
                <canvas id="pmChart"></canvas>
            </div>
        </div>
    </div>

    <!-- TỐC ĐỘ GIÓ VÀ HƯỚNG GIÓ CHỦ ĐẠO -->
    <div class="grid-visuals-mid">
      <div class="visual-card">
        <div class="card-title" style="color:#fff;">BIẾN THIÊN TỐC ĐỘ GIÓ 🌪️</div>
        <div class="wind-impact-legend">
          <span class="wind-impact-key"><span class="wind-impact-dot wind-impact-safe"></span>Ổn định &lt; 1 m/s</span>
          <span class="wind-impact-key"><span class="wind-impact-dot wind-impact-watch"></span>Theo dõi 1–2,5 m/s</span>
          <span class="wind-impact-key"><span class="wind-impact-dot wind-impact-affected"></span>Ảnh hưởng 2,5–4 m/s</span>
          <span class="wind-impact-key"><span class="wind-impact-dot wind-impact-unsafe"></span>Nên dừng &gt; 4 m/s</span>
        </div>
        <div style="flex-grow:1; position:relative; min-height:250px;">
          <canvas id="speedChart"></canvas>
        </div>
      </div>

      <div class="visual-card">
        <div class="card-title" style="color:#fff;">TẦN SUẤT HƯỚNG GIÓ (WIND ROSE) 🧭</div>
        <div style="flex-grow:1; position:relative; min-height:250px;">
          <canvas id="dirChart"></canvas>
        </div>
      </div>
    </div>

    <!-- [ĐÃ THAY THẾ]: TURBULENCE BAND THAY CHO WIND GUSTS CŨ -->
    <div class="grid-visuals-bot">
      <div class="visual-card" style="border-color: rgba(56, 189, 248, 0.4);">
        <div class="card-title" style="color:#fff;">ĐỘNG LỰC HỌC GIÓ & CHẤT LƯỢNG SEEING (TURBULENCE BAND) 🌪️</div>
        
        <div class="wind-badges-container">
            <div class="wind-badge">
                <div style="color: var(--muted); margin-bottom: 5px;">Gió giật Max (Kỳ chọn)</div>
                <strong style="color: var(--danger); font-size: 1.5em;"><span id="st-max-gust">0.0</span> m/s</strong>
            </div>
            <div class="wind-badge">
                <div style="color: var(--muted); margin-bottom: 5px;">Độ nhiễu loạn (Max GF)</div>
                <strong style="color: #facc15; font-size: 1.5em;" id="st-max-gf">1.00</strong>
            </div>
            <div class="wind-badge">
                <div style="color: var(--muted); margin-bottom: 5px;">Hướng Gió Chủ Đạo</div>
                <strong style="color: var(--accent); font-size: 1.2em; display: block; margin-top: 5px;" id="st-dom-dir">--</strong>
            </div>
            <div class="wind-badge" style="flex-grow: 1; text-align: left; background: transparent; border: none;">
                <div style="color: var(--muted); font-size: 0.85em; line-height: 1.6;">
                    * <strong>Dải băng nhiễu loạn:</strong> Là khoảng tô màu giữa Gió nền (Xanh) và Gió giật (Đỏ).<br>
                    * Dải băng càng <strong>HẸP</strong>: Không khí tĩnh, Gió chảy tầng $\rightarrow$ Guiding mượt.<br>
                    * Dải băng càng <strong>RỘNG</strong>: Không khí cuộn xoáy (GF > 1.5) $\rightarrow$ Seeing nát, sao rung.
                </div>
            </div>
        </div>

        <div style="flex-grow:1; position:relative; min-height:250px;">
          <canvas id="windBandChart"></canvas>
        </div>
      </div>
    </div>
    
    <!-- TRẠNG THÁI MƯA -->
    <div class="grid-visuals-bot">
      <div class="visual-card">
        <div class="card-title" style="color:#fff;">BIỂU ĐỒ TRẠNG THÁI MƯA 🌧️</div>
        <div style="flex-grow:1; position:relative; min-height:180px;">
          <canvas id="rainChart"></canvas>
        </div>
      </div>
    </div>

    <!-- MÔI TRƯỜNG TRONG ĐÀI (SHT35) NẰM Ở DƯỚI CÙNG -->
    <div class="grid-visuals-bot">
      <div class="visual-card">
        <div class="card-title" style="color:#fff;">MÔI TRƯỜNG TRONG ĐÀI (SHT35) 🏡</div>
        <div style="flex-grow:1; position:relative; min-height:250px;">
          <canvas id="indoorEnvChart"></canvas>
        </div>
      </div>
    </div>

    <!-- LỊCH SỬ ĐỘ TIN CẬY VÀ RỦI RO -->
    <div class="grid-visuals-split">
      <div class="visual-card">
        <div class="card-title" style="color:#fff;">RỦI RO MƯA DÔNG & ĐỘ TIN CẬY CẢM BIẾN 🛡️</div>
        <div style="flex-grow:1; position:relative; min-height:200px;">
          <canvas id="riskConfChart"></canvas>
        </div>
      </div>

      <div class="visual-card">
        <div class="card-title" style="color:#fff;">TRẠNG THÁI KẾT NỐI (ONLINE STATUS) 📡</div>
        <div style="flex-grow:1; position:relative; min-height:200px;">
          <canvas id="onlineChart"></canvas>
        </div>
      </div>
    </div>

  </div>

  <script>
    // --- KHỞI TẠO BỘ CHỌN THỜI GIAN FLATPICKR ---
    let now = new Date();
    let yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    const flatpickrConfig = {
        enableTime: true,
        time_24hr: true, 
        dateFormat: "Y-m-d H:i",
        locale: "vn" 
    };

    flatpickr("#startDate", { ...flatpickrConfig, defaultDate: yesterday });
    flatpickr("#endDate", { ...flatpickrConfig, defaultDate: now });

    // --- KHỞI TẠO CÁC BIỂU ĐỒ ---
    let envChart, speedChart, dirChart, rainChart, pressureChart, pmChart, indoorEnvChart; 
    let windBandChart, riskConfChart, onlineChart; // Đã đổi gustChart thành windBandChart

    function getWindImpactColor(speed) {
      speed = Number(speed);
      if (!Number.isFinite(speed)) return '#34d399';
      if (speed < 1) return '#34d399';
      if (speed < 2.5) return '#facc15';
      if (speed < 4) return '#f59e0b';
      return '#ef4444';
    }

    function getWindImpactLabel(speed) {
      speed = Number(speed);
      if (!Number.isFinite(speed)) return 'Chưa có dữ liệu gió';
      if (speed < 1) return 'Ổn định cho chụp ảnh';
      if (speed < 2.5) return 'Cần theo dõi khi phơi sáng dài';
      if (speed < 4) return 'Ảnh hưởng đến độ ổn định ảnh';
      return 'Nên dừng chụp ảnh';
    }

    function createWindImpactGradient(chart) {
      const chartArea = chart.chartArea;
      if (!chartArea) return 'rgba(52, 211, 153, 0.22)';

      const gradient = chart.ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
      gradient.addColorStop(0.3, 'rgba(52, 211, 153, 0.42)');
      gradient.addColorStop(0.52, 'rgba(250, 204, 21, 0.48)');
      gradient.addColorStop(0.75, 'rgba(245, 158, 11, 0.52)');
      gradient.addColorStop(1, 'rgba(239, 68, 68, 0.58)');
      return gradient;
    }

    const windImpactZones = {
      id: 'windImpactZones',
      beforeDraw: function(chart) {
        const chartArea = chart.chartArea;
        const scale = chart.scales.y;
        if (!chartArea || !scale) return;

        const zones = [
          { min: 0, max: 1, color: 'rgba(16, 185, 129, 0.08)' },
          { min: 1, max: 2.5, color: 'rgba(250, 204, 21, 0.08)' },
          { min: 2.5, max: 4, color: 'rgba(245, 158, 11, 0.1)' },
          { min: 4, max: Infinity, color: 'rgba(239, 68, 68, 0.12)' }
        ];

        chart.ctx.save();
        chart.ctx.beginPath();
        chart.ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
        chart.ctx.clip();

        zones.forEach(function(zone) {
          const min = Math.max(zone.min, scale.min);
          const max = Math.min(zone.max, scale.max);
          if (min >= max) return;

          const top = scale.getPixelForValue(max);
          const bottom = scale.getPixelForValue(min);
          chart.ctx.fillStyle = zone.color;
          chart.ctx.fillRect(chartArea.left, top, chartArea.right - chartArea.left, bottom - top);
        });

        chart.ctx.restore();
      }
    };

    function initCharts() {
      const zoomOptions = {
          zoom: {
              wheel: { enabled: true }, // Cho phép lăn chuột để zoom
              pinch: { enabled: true }, // Cho phép chụm 2 ngón tay trên điện thoại
              mode: 'x', // Chỉ zoom theo chiều ngang (thời gian)
          },
          pan: {
              enabled: true,
              mode: 'x', // Bấm giữ chuột trái để kéo biểu đồ sang 2 bên
          }
      };
 

      // 1. MÔI TRƯỜNG NGOÀI TRỜI
      const ctxEnv = document.getElementById('envChart').getContext('2d');
      envChart = new Chart(ctxEnv, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { 
            animation: false,
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            spanGaps: true, 
            scales: { 
                y: { type: 'linear', display: true, position: 'left', title: {display: true, text: 'Nhiệt độ (°C)', color: '#94a3b8'}, grid: { color: '#334155' }, ticks: {color: '#94a3b8'} },
                y1: { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Độ ẩm (%)', color: '#60a5fa'}, grid: {drawOnChartArea: false}, ticks: {color: '#60a5fa'}, min: 0, max: 100 },
                x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 20} }
            },
            plugins: { 
                legend: { labels: {color: '#fff'} },
                zoom: zoomOptions 
            }
        }
      });

      // 2. BIỂU ĐỒ ÁP SUẤT
      const ctxPress = document.getElementById('pressureChart').getContext('2d');
      pressureChart = new Chart(ctxPress, {
          type: 'line',
          data: { labels: [], datasets: [] },
          options: {
              animation: false,
              responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, spanGaps: true,
              scales: {
                  y: { title: {display: true, text: 'Áp suất (hPa)', color: '#facc15'}, grid: {color: '#334155'}, ticks: {color: '#94a3b8'}, suggestedMin: 990, suggestedMax: 1020 },
                  x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 15} }
              },
            plugins: { 
                legend: { labels: {color: '#fff'} },
                zoom: zoomOptions 
            }
          }
      });

      // 3. BIỂU ĐỒ BỤI MỊN
      const ctxPm = document.getElementById('pmChart').getContext('2d');
      pmChart = new Chart(ctxPm, {
          type: 'line',
          data: { labels: [], datasets: [] },
          options: {
              animation: false,
              responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, spanGaps: true,
              scales: {
                  y: { beginAtZero: true, title: {display: true, text: 'Nồng độ (µg/m3)', color: '#38bdf8'}, grid: {color: '#334155'}, ticks: {color: '#94a3b8'}, suggestedMax: 50 },
                  x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 15} }
              },
            plugins: { 
                legend: { labels: {color: '#fff'} },
                zoom: zoomOptions 
            }
          }
      });

      // 4. BIỂU ĐỒ GIÓ
      const ctxSpeed = document.getElementById('speedChart').getContext('2d');
      speedChart = new Chart(ctxSpeed, {
        type: 'line',
        data: { labels: [], datasets: [] },
        plugins: [windImpactZones],
        options: { 
            animation: false,
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            spanGaps: true, 
            scales: { 
                y: { beginAtZero: true, title: {display: true, text: 'Tốc độ gió (m/s)', color: '#34d399'}, grid: { color: '#334155' }, ticks: {color: '#94a3b8'} },
                x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 20} }
            },
            plugins: {
              legend: { labels: {color: '#fff'} },
              zoom: zoomOptions,
              tooltip: { callbacks: { label: function(context) { const speed = Number(context.parsed ? context.parsed.y : 0) || 0; return 'Tốc độ gió: ' + speed.toFixed(1) + ' m/s — ' + getWindImpactLabel(speed); } } }
            }
        }
      });

      // 5. [NÂNG CẤP]: HOA GIÓ (WIND ROSE - RADAR)
      const ctxDir = document.getElementById('dirChart').getContext('2d');
      dirChart = new Chart(ctxDir, {
        type: 'radar',
        data: {
          labels: ['B', 'BĐB', 'ĐB', 'ĐĐB', 'Đ', 'ĐĐN', 'ĐN', 'NĐN', 'N', 'NTN', 'TN', 'TTN', 'T', 'TTB', 'TB', 'BTB'],
          datasets: [{ 
              data: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], 
              backgroundColor: 'rgba(56, 189, 248, 0.3)',
              borderColor: '#38bdf8',
              pointBackgroundColor: '#38bdf8',
              pointBorderColor: '#fff',
              borderWidth: 2 
          }]
        },
        options: { 
            animation: false, responsive: true, maintainAspectRatio: false, 
            scales: { 
                r: { 
                    ticks: { display: false }, 
                    grid: { color: '#334155' }, 
                    angleLines: { color: '#334155' }, 
                    pointLabels: { color: '#e2e8f0', font: { size: 10, weight: 'bold' } } 
                } 
            }, 
            plugins: { 
                legend: { display: false },
                tooltip: { callbacks: { label: function(context) { return ` Tần suất: ${context.raw} lần đo`; } } }
            } 
        }
      });

      // 6. BIỂU ĐỒ MƯA
      const ctxRain = document.getElementById('rainChart').getContext('2d');
      rainChart = new Chart(ctxRain, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { 
            animation: false,
            responsive: true, maintainAspectRatio: false, 
            spanGaps: true, 
            scales: { x: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', maxTicksLimit: 20 } }, y: { grid: { display: false }, ticks: { display: false }, min: 0, max: 1.1 } }, 
            plugins: { 
                legend: { labels: {color: '#fff'} },
                zoom: zoomOptions 
            } 
        }
      });

      // 7. BIỂU ĐỒ MÔI TRƯỜNG TRONG ĐÀI (SHT35)
      const ctxIndoor = document.getElementById('indoorEnvChart').getContext('2d');
      indoorEnvChart = new Chart(ctxIndoor, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { 
            animation: false,
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            spanGaps: true, 
            scales: { 
                y: { type: 'linear', display: true, position: 'left', title: {display: true, text: 'Nhiệt độ (°C)', color: '#94a3b8'}, grid: { color: '#334155' }, ticks: {color: '#94a3b8'} },
                y1: { type: 'linear', display: true, position: 'right', title: {display: true, text: 'Độ ẩm (%)', color: '#00a2ff'}, grid: {drawOnChartArea: false}, ticks: {color: '#00a2ff'}, min: 0, max: 100 },
                x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 20} }
            },
            plugins: { 
                legend: { labels: {color: '#fff'} },
                zoom: zoomOptions 
            }
        }
      });

      // 8. [ĐÃ BỔ SUNG]: DẢI BĂNG NHIỄU LOẠN (TURBULENCE BAND)
      const ctxWindBand = document.getElementById('windBandChart').getContext('2d');
      windBandChart = new Chart(ctxWindBand, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { 
            animation: false, responsive: true, maintainAspectRatio: false, 
            interaction: { mode: 'index', intersect: false }, spanGaps: true, 
            scales: { 
                y: { beginAtZero: true, title: {display: true, text: 'Tốc độ (m/s)', color: '#94a3b8'}, grid: { color: '#334155' }, ticks: {color: '#e2e8f0'} },
                x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 20} }
            },
            plugins: {
              legend: { labels: {color: '#fff'} },
              zoom: zoomOptions,
              tooltip: { 
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  titleColor: '#38bdf8',
                  bodyFont: { size: 13 },
                  callbacks: { 
                      label: function(context) { 
                          if (context.datasetIndex === 0) return null; 
                          
                          let dataIndex = context.dataIndex;
                          let speed = Number(windBandChart.data.datasets[0].data[dataIndex]) || 0;
                          let gust = Number(windBandChart.data.datasets[1].data[dataIndex]) || 0;
                          let maxVal = Math.max(speed, gust);

                          let gf = (speed > 0.5) ? (maxVal / speed).toFixed(2) : "1.00";
                          let gfStatus = (gf >= 2.0) ? "🔴 Rất hỗn loạn" : ((gf >= 1.5) ? "🟡 Hơi rung" : "🟢 Êm");

                          return [
                              `🌬️ Gió nền: ${speed.toFixed(1)} m/s`,
                              `💥 Gió giật (Gust): ${maxVal.toFixed(1)} m/s`,
                              `〰️ Nhiễu loạn (GF): ${gf} - ${gfStatus}`
                          ]; 
                      } 
                  } 
              }
            }
        }
      });

      // 9. BIỂU ĐỒ ĐỘ TIN CẬY VÀ RỦI RO
      const ctxRiskConf = document.getElementById('riskConfChart').getContext('2d');
      riskConfChart = new Chart(ctxRiskConf, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { 
            animation: false,
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            spanGaps: true, 
            scales: { 
                y: { beginAtZero: true, max: 100, grid: { color: '#334155' }, ticks: {color: '#94a3b8'} },
                x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 15} }
            },
            plugins: { 
                legend: { labels: {color: '#fff'} },
                zoom: zoomOptions 
            } 
        }
      });

      // 10. BIỂU ĐỒ TRẠNG THÁI ONLINE
      const ctxOnline = document.getElementById('onlineChart').getContext('2d');
      onlineChart = new Chart(ctxOnline, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: { 
            animation: false,
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            spanGaps: true, 
            scales: { 
                y: { min: -0.1, max: 1.1, grid: { color: '#334155' }, ticks: {color: '#94a3b8', callback: function(value) { return value == 1 ? 'Online' : (value == 0 ? 'Offline' : ''); } } },
                x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 15} }
            },
            plugins: { 
                legend: { labels: {color: '#fff'} },
                zoom: zoomOptions 
            } 
        }
      });
    }

    function loadHistoryData() {
      let start = document.getElementById('startDate').value + ':00';
      let end = document.getElementById('endDate').value + ':59';

      fetch(`api_history.php?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
        .then(response => response.json())
        .then(data => {
            if(data.error) {
                alert("Lỗi truy xuất: " + data.error);
                return;
            }

            document.getElementById('st-points').innerText = data.times.length.toLocaleString();
            
            // Tìm Gió giật mạnh nhất toàn cục
            let maxGust = 0;
            if (data.wind_gusts_5m && data.wind_gusts_5m.length > 0) {
                maxGust = Math.max(...data.wind_gusts_5m.filter(n => n !== null));
            } else if (data.speeds && data.speeds.length > 0) {
                maxGust = Math.max(...data.speeds.filter(n => n !== null));
            }
            if (maxGust < 0 || !isFinite(maxGust)) maxGust = 0;
            
            document.getElementById('st-wind').innerHTML = maxGust.toFixed(1) + '<span style="font-size: 0.4em; color: #94a3b8;">m/s</span>';
            document.getElementById('st-rain').innerHTML = data.rain_duration_minutes + '<span style="font-size: 0.4em;"> phút</span>';

            // [NÂNG CẤP]: Tính toán thông số cho Turbulence Band và Hoa Gió (16 hướng)
            let localMaxGust = 0;
            let localMaxGustSpeedForGF = 0;
            let dirBins = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]; // 16 hướng Radar
            
            for (let i = 0; i < data.times.length; i++) {
                let speedVal = data.speeds[i] || 0;
                let gustVal = (data.wind_gusts_5m && data.wind_gusts_5m[i] !== null) ? data.wind_gusts_5m[i] : 0;
                let gVal = Math.max(speedVal, gustVal);

                if (gVal >= localMaxGust) {
                    localMaxGust = gVal;
                    localMaxGustSpeedForGF = speedVal;
                }

                if (data.dirs && data.dirs[i] !== null) {
                    // Chia 360 độ cho 16 phần (mỗi phần 22.5 độ)
                    dirBins[Math.round(data.dirs[i] / 22.5) % 16] += 1; 
                }
            }

            let maxCount = 0; let domDirIndex = 0;
            for(let i=0; i<16; i++) { 
                if(dirBins[i] > maxCount) { maxCount = dirBins[i]; domDirIndex = i; } 
            }
            const compass16 = ["Bắc", "Bắc Đông Bắc", "Đông Bắc", "Đông Đông Bắc", "Đông", "Đông Đông Nam", "Đông Nam", "Nam Đông Nam", "Nam", "Nam Tây Nam", "Tây Nam", "Tây Tây Nam", "Tây", "Tây Tây Bắc", "Tây Bắc", "Bắc Tây Bắc"];
            let gfPeriod = (localMaxGustSpeedForGF > 0.5) ? (localMaxGust / localMaxGustSpeedForGF).toFixed(2) : "1.00";
            
            let elMaxGust = document.getElementById('st-max-gust');
            if(elMaxGust) elMaxGust.innerText = localMaxGust.toFixed(1);
            
            let elMaxGf = document.getElementById('st-max-gf');
            if(elMaxGf) {
                elMaxGf.innerText = gfPeriod;
                elMaxGf.style.color = (gfPeriod >= 2.0) ? '#ef4444' : ((gfPeriod >= 1.5) ? '#f59e0b' : '#34d399');
            }
            
            let elDomDir = document.getElementById('st-dom-dir');
            if(elDomDir) elDomDir.innerText = maxCount > 0 ? compass16[domDirIndex] : "--";

            // 1. Môi trường ngoài trời
            envChart.data.labels = data.times;
            envChart.data.datasets = [
                { label: 'Nhiệt độ (°C)', data: data.temps, borderColor: '#facc15', backgroundColor: 'transparent', yAxisID: 'y', pointRadius: 0, tension: 0.2, borderWidth: 2 },
                { label: 'Điểm sương (°C)', data: data.dews, borderColor: '#00ff91', backgroundColor: 'transparent', borderDash: [5, 5], yAxisID: 'y', pointRadius: 0, tension: 0.2, borderWidth: 2 },
                { label: 'Độ ẩm (%)', data: data.hums, borderColor: '#00a2ff', backgroundColor: 'rgba(96, 165, 250, 0.1)', fill: true, yAxisID: 'y1', pointRadius: 0, tension: 0.2, borderWidth: 2 }
            ];
            envChart.update();

            // 2. Biến thiên Áp suất
            pressureChart.data.labels = data.times;
            pressureChart.data.datasets = [
                { label: 'Áp suất (hPa)', data: data.pressures, borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', fill: true, pointRadius: 0, tension: 0.4, borderWidth: 2 }
            ];
            pressureChart.update();

            // 3. Chỉ số Bụi mịn
            pmChart.data.labels = data.times;
            pmChart.data.datasets = [
                { label: 'PM2.5', data: data.pm25s, borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', fill: true, pointRadius: 0, tension: 0.2, borderWidth: 2 },
                { label: 'PM10', data: data.pm10s, borderColor: '#38bdf8', backgroundColor: 'transparent', pointRadius: 0, tension: 0.2, borderWidth: 2 }
            ];
            pmChart.update();

            // 4. Tốc độ Gió
            speedChart.data.labels = data.times;
            speedChart.data.datasets = [
                { label: 'Tốc độ gió', data: data.speeds, borderColor: '#34d399', backgroundColor: function(context) { return createWindImpactGradient(context.chart); }, fill: true, pointRadius: 2, pointBackgroundColor: function(context) { return getWindImpactColor(context.parsed ? context.parsed.y : 0); }, pointBorderColor: '#0f172a', tension: 0.4, borderWidth: 2, segment: { borderColor: function(context) { return getWindImpactColor(context.p1 && context.p1.parsed ? context.p1.parsed.y : 0); } } }
            ];
            speedChart.update();

            // 5. [NÂNG CẤP]: Hoa gió (Wind Rose - Radar Area)
            dirChart.data.datasets[0].data = dirBins;
            dirChart.update();

            // 6. Trạng thái Mưa
            rainChart.data.labels = data.times;
            rainChart.data.datasets = [
                { label: 'Trạng thái Mưa', data: data.rains, backgroundColor: 'rgba(239, 68, 68, 0.5)', borderColor: '#ef4444', fill: true, stepped: true, pointRadius: 0, borderWidth: 1 }
            ];
            rainChart.update();

            // 7. Môi trường trong đài SHT35 
            indoorEnvChart.data.labels = data.times;
            indoorEnvChart.data.datasets = [
                { label: 'Nhiệt độ trong đài (°C)', data: data.indoor_temps, borderColor: '#facc15', backgroundColor: 'transparent', yAxisID: 'y', pointRadius: 0, tension: 0.2, borderWidth: 2 },
                { label: 'Điểm sương trong đài (°C)', data: data.indoor_dews, borderColor: '#00ff91', backgroundColor: 'transparent', borderDash: [5, 5], yAxisID: 'y', pointRadius: 0, tension: 0.2, borderWidth: 2 },
                { label: 'Độ ẩm trong đài (%)', data: data.indoor_hums, borderColor: '#00a2ff', backgroundColor: 'rgba(167, 139, 250, 0.1)', fill: true, yAxisID: 'y1', pointRadius: 0, tension: 0.2, borderWidth: 2 }
            ];
            indoorEnvChart.update();

            // 8. [NÂNG CẤP]: Cập nhật Dải băng nhiễu loạn (Turbulence Band)
            if(typeof windBandChart !== 'undefined') {
                windBandChart.data.labels = data.times;
                windBandChart.data.datasets = [
                    { 
                        label: 'Gió nền (Base)', 
                        data: data.speeds, 
                        borderColor: '#34d399', 
                        borderWidth: 2, pointRadius: 0, tension: 0.4 
                    },
                    { 
                        label: 'Biên độ Giật (Gusts Area)', 
                        data: data.wind_gusts_5m, 
                        borderColor: 'rgba(239, 68, 68, 0.8)', 
                        backgroundColor: 'rgba(239, 68, 68, 0.25)', 
                        borderWidth: 1, pointRadius: 2, pointBackgroundColor: '#ef4444',
                        fill: '-1', tension: 0.4 
                    }
                ];
                windBandChart.update();
            }

            // 9. Biểu đồ Rủi ro và Tin cậy
            riskConfChart.data.labels = data.times;
            riskConfChart.data.datasets = [
                { label: 'Rủi ro Mưa/Dông (%)', data: data.rain_risks, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.2)', fill: true, pointRadius: 0, tension: 0.3, borderWidth: 2 },
                { label: 'Độ tin cậy Cảm biến (%)', data: data.confidences, borderColor: '#38bdf8', backgroundColor: 'transparent', pointRadius: 0, tension: 0.3, borderWidth: 2 }
            ];
            riskConfChart.update();

            // 10. Biểu đồ Online Status
            onlineChart.data.labels = data.times;
            onlineChart.data.datasets = [
                { label: 'Mạch Khí Tượng', data: data.weather_onlines, borderColor: '#10b981', backgroundColor: 'transparent', stepped: true, pointRadius: 0, borderWidth: 2 },
                { label: 'Mạch Mái Che', data: data.roof_onlines, borderColor: '#38bdf8', backgroundColor: 'transparent', stepped: true, borderDash: [5, 5], pointRadius: 0, borderWidth: 2 }
            ];
            onlineChart.update();
        })
        .catch(err => { console.error("Lỗi mạng:", err); });
    }

    window.onload = () => {
        initCharts();
        loadHistoryData();
    };
  </script>
</body>
</html>