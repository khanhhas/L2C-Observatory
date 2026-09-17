import { API } from '../api.js';

console.log("ĐÃ TẢI CODE MỚI: BẢN ĐỒ VỆ TINH + HSDC NOWCASTING (CHUẨN HÓA DỮ LIỆU ĐO MƯA) - ĐA LỚP AI"); 

export const DashboardView = {
    envChartInstance: null,
    indoorEnvChartInstance: null,
    speedChartInstance: null,
    dirChartInstance: null,
    rainChartInstance: null,
    rtCurrentChartInstance: null,
    pressureChartInstance: null, 
    pmChartInstance: null, 
    rtChartDataObj: { labels: [], datasets: [{ label: 'Dòng điện thực tế (RAW)', data: [], borderColor: '#38bdf8', tension: 0.2 }] },
    historyInterval: null,
    customMap: null,
    radarTileLayer: null,
    radarLayerGroup: null, 
    aiLayerGroup: null,
    pliLayer: null, 
    vtrLayer: null, 
    vndmsLayer: null, 
    useVndmsTracking: false, 
    usePliTracking: false,
    useVtrTracking: false,
    useRainviewerTracking: true, // [ĐÃ SỬA]: Kích hoạt mặc định (vì OpenMeteo tải sẵn)
    layerControl: null, 
    hsdcLayerGroup: null, 
    _lastHsdcHash: null, 
    hsdcLegend: null, 
    
    compassSectors: [
        "Bắc", "Bắc Đông Bắc", "Đông Bắc", "Đông Đông Bắc", 
        "Đông", "Đông Đông Nam", "Đông Nam", "Nam Đông Nam", 
        "Nam", "Nam Tây Nam", "Tây Nam", "Tây Tây Nam", 
        "Tây", "Tây Tây Bắc", "Tây Bắc", "Bắc Tây Bắc"
    ],

    template: () => `
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
            body.night-vision-mode {
                filter: grayscale(100%) sepia(100%) hue-rotate(315deg) saturate(800%) brightness(0.7) contrast(1.5) !important;
                background-color: #000 !important;
            }
            .leaflet-container { background: #1e1e1e !important; }
            .horizon-box { padding: 4px; border: 1px solid #334155; border-radius: 6px; background: rgba(0,0,0,0.3); }
            .leaflet-pane.leaflet-hsdcPane-pane { z-index: 650 !important; }
            .glass-panel .val-label { font-size: 0.8rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
            .glass-panel h3 { font-size: 1.5rem; margin-top: 0.3rem !important; }
            .glass-panel .small { font-size: 0.75rem; }
        </style>

        <div class="row mb-3 d-none" id="nowcast-alert-banner">
            <div class="col-12">
                <div class="alert-nowcast p-3 rounded text-center">
                    <h4 class="m-0 alert-nowcast-text fw-bold"><i class="fas fa-exclamation-triangle fa-fade"></i> ⚠️ CẢNH BÁO: HỆ THỐNG ĐÃ ÉP ĐÓNG MÁI (MƯA/SÉT/RỦI RO CAO)!</h4>
                </div>
            </div>
        </div>

        <div class="row mb-3">
            <div class="col-12">
                <div class="d-flex flex-wrap gap-2 align-items-center bg-dark p-2 rounded border border-secondary" style="width: fit-content; max-width: 100%;">
                    <span class="text-white small fw-bold ms-2 mb-1 mb-md-0 w-100 w-md-auto text-md-start text-center">TRẠNG THÁI HỆ THỐNG:</span>
                    <div id="node-roof-status" class="badge bg-secondary p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0" style="font-size: 0.85rem; min-width: 160px;">
                        <i class="fas fa-microchip me-2"></i> MẠCH MÁI CHE: CHỜ ĐỢI
                    </div>
                    <div id="node-weather-status" class="badge bg-secondary p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0" style="font-size: 0.85rem; min-width: 160px;">
                        <i class="fas fa-satellite-dish me-2"></i> MẠCH KHÍ TƯỢNG: CHỜ ĐỢI
                    </div>
                    <div id="node-pier-status" class="badge bg-secondary p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0" style="font-size: 0.85rem; min-width: 160px;">
                        <i class="fas fa-crosshairs me-2"></i> MẠCH TRỤ: CHỜ ĐỢI
                    </div>
                    <div id="node-alarm-status" class="badge bg-secondary p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0" style="font-size: 0.85rem; min-width: 160px;">
                        <i class="fas fa-bullhorn me-2"></i> MẠCH BÁO ĐỘNG: CHỜ ĐỢI
                    </div>
                    <div id="node-espnow-status" class="badge bg-secondary p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0" style="font-size: 0.85rem; min-width: 160px;">
                        <i class="fas fa-wifi me-2"></i> KẾT NỐI ESP-NOW: CHỜ ĐỢI
                    </div>
                    <button id="btn-night-vision" class="btn btn-outline-danger ms-md-3 flex-grow-1 flex-md-grow-0 fw-bold" style="font-size: 0.85rem; min-width: 130px;">
                        <i class="fas fa-eye me-1"></i> CHẾ ĐỘ NHÌN ĐÊM
                    </button>
                </div>
            </div>
        </div>
        
        <div class="row mb-3 mt-2">
            <div class="col-12">
                <div class="d-flex flex-wrap justify-content-between align-items-center bg-black bg-opacity-25 p-2 rounded border border-secondary gap-2 mb-2">
                    <h6 class="text-accent m-0 fw-bold"><i class="fas fa-cloud-sun-rain me-2"></i> THÔNG SỐ KHÍ TƯỢNG & MÂY VỆ TINH</h6>
                    <span class="badge bg-primary fs-6 text-wrap text-start" style="line-height: 1.5; max-width: 100%;" id="v-api-pop"><i class="fas fa-cloud-showers-heavy me-1"></i> Tính toán khả năng mưa: Đang tải...</span>
                    <span class="badge bg-secondary fs-6 text-wrap text-start" style="line-height: 1.5; max-width: 100%;" id="v-weather-updated"><i class="fas fa-clock me-1"></i> Đang chờ dữ liệu...</span>
                </div>
            </div>
        </div>

        <div class="row g-3 mb-4 align-items-stretch">
            
            <div class="col-xl-6 col-lg-12 d-flex flex-column gap-3">
                <div class="row g-3">
                    <div class="col-md-4 col-sm-6">
                        <div class="glass-panel p-3 h-100 border-start border-4 border-info d-flex flex-column justify-content-between">
                            <div>
                                <span class="val-label text-light fw-bold">Nhiệt độ 🌡️</span>
                                <h3 class="text-white mb-1"><span id="v-temp" class="text-warning">--</span><span style="font-size:0.5em;color:#e2e8f0">°C</span></h3>
                            </div>
                            <div class="d-flex flex-column text-light small fw-bold border-top border-secondary pt-1 mt-2">
                                <span>PM2.5: <strong id="v-pm25" class="text-info">--</strong></span>
                                <span>PM10: <strong id="v-pm10" class="text-info">--</strong></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 col-sm-6">
                        <div class="glass-panel p-3 h-100 border-start border-4 border-info d-flex flex-column justify-content-between">
                            <div>
                                <span class="val-label text-light fw-bold">Độ Ẩm 💧</span>
                                <h3 class="text-white mb-1"><span id="v-hum" class="text-info">--</span><span style="font-size:0.5em;color:#e2e8f0">%</span></h3>
                            </div>
                            <div class="text-light small fw-bold border-top border-secondary pt-1 mt-2">
                                Sương: <span id="v-dew" class="text-info fw-bold">--</span>°C
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 col-sm-6">
                        <div class="glass-panel p-3 h-100 border-start border-4 border-success d-flex flex-column justify-content-between">
                            <span class="val-label text-light fw-bold">Gió ngoài trời 🌪️</span>
                            <div class="d-flex justify-content-between align-items-center mt-1">
                                <h3 class="text-white mb-0">
                                    <span id="v-wind" class="text-success">--</span><span style="font-size:0.5em;color:#e2e8f0">m/s</span>
                                </h3>
                                <!-- MŨI TÊN GIÓ: PHÓNG TO X2 LẦN -->
                                <div class="d-flex flex-column align-items-end" style="color: var(--accent);">
                                    <svg id="v-wind-arrow" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.5s ease-out; transform: rotate(0deg);">
                                        <line x1="12" y1="22" x2="12" y2="2"></line>
                                        <polyline points="5 9 12 2 19 9"></polyline>
                                    </svg>
                                </div>
                            </div>
                            <div class="d-flex justify-content-between mt-2 text-light small fw-bold border-top border-secondary pt-1">
                                <!-- Giật và GF giữ bên trái, cho GF xuống dòng dưới -->
                                <div class="d-flex flex-column">
                                    <span>Giật: <span id="v-gust" class="text-warning">--</span></span>
                                    <span>GF: <span id="v-gust-factor" class="text-info">--</span></span>
                                </div>
                                <!-- Góc và Hướng chữ đưa sang phải -->
                                <div class="d-flex flex-column text-end">
                                    <span>Góc: <span id="hw-wdir" class="text-white">--°</span></span>
                                    <span id="v-wind-dir-text" class="text-white" style="font-size: 0.75rem;">--</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 col-sm-6">
                        <div class="glass-panel p-3 h-100 border-start border-4" id="cloud-card" style="border-color: #334155;">
                            <span class="val-label text-light fw-bold">Bầu trời 🌌</span>
                            <h3 class="text-white mb-1"><span id="v-cloud">--</span><span style="font-size:0.5em;color:#e2e8f0">°C</span></h3>
                            <div id="v-cloud-desc" class="text-light small fw-bold mt-2 pt-1 border-top border-secondary">Đang đo...</div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 col-sm-6">
                        <div class="glass-panel p-3 h-100 border-start border-4 border-warning d-flex flex-column justify-content-between">
                            <div>
                                <span class="val-label text-light fw-bold">Áp suất 🌫️</span>
                                <div class="d-flex justify-content-between align-items-center mt-1 mb-1">
                                    <h3 class="text-white mb-0"><span id="v-pressure" class="text-warning">--</span><span style="font-size:0.5em;color:#e2e8f0">hPa</span></h3>
                                    <div id="v-press-trend" class="fs-5"></div>
                                </div>
                            </div>
                            <div class="d-flex flex-column flex-wrap text-light small fw-bold border-top border-secondary pt-1">
                                <span>Rủi ro dông: <strong id="v-rain-risk" class="text-danger">--/100</strong></span>
                                <span class="w-100">Tin cậy: <strong id="v-confidence" class="text-info">--%</strong></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 col-sm-6">
                        <div class="glass-panel p-3 h-100 border-start border-4 border-success d-flex flex-column justify-content-between" id="rainCard">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <span class="val-label text-light fw-bold">Mưa 📡</span>
                                    <h3 class="mb-1 text-success text-uppercase" id="v-rain-status" style="font-size:1.1em">ĐANG ĐO...</h3>
                                </div>
                                <span id="v-rain-icon" style="font-size: 1.8em; line-height: 1; filter: drop-shadow(0 0 5px rgba(255,255,255,0.2));">⏳</span>
                            </div>
                            <div class="text-light small fw-bold border-top border-secondary pt-1 mt-2" id="v-rain-desc">--</div>
                        </div>
                    </div>
                </div>

                <div class="glass-panel p-3 border-start border-4" style="border-color:#c084fc;">
                     <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 border-bottom border-secondary pb-2">
                          <span class="val-label text-light fw-bold">MÔI TRƯỜNG TRONG ĐÀI (SHT35) 🏡</span>
                          <span id="v-indoor-updated" class="badge bg-secondary fs-6 text-start"><i class="fas fa-clock me-1"></i> --:--:--</span>
                     </div>
                     <div class="row mt-2">
                        <div class="col-md-4 col-4 border-end border-secondary text-center">
                             <span class="d-block text-light mb-1" style="font-size:0.85em">Nhiệt độ</span>
                             <strong style="color: #d8b4fe; font-size: 1.3em"><span id="v-indoor-temp">--</span>°C</strong>
                        </div>
                        <div class="col-md-4 col-4 border-end border-secondary text-center">
                             <span class="d-block text-light mb-1" style="font-size:0.85em">Độ ẩm</span>
                             <strong style="color: #d8b4fe; font-size: 1.3em"><span id="v-indoor-hum">--</span>%</strong>
                        </div>
                        <div class="col-md-4 col-4 text-center">
                             <span class="d-block text-light mb-1" style="font-size:0.85em">Điểm sương</span>
                             <strong style="color: #d8b4fe; font-size: 1.3em"><span id="v-indoor-dew">--</span>°C</strong>
                        </div>
                     </div>
                     <div class="d-flex flex-wrap justify-content-center gap-3 mt-2 border-top border-secondary pt-2 text-light" style="font-size: 0.8em;">
                        <span>SHT35: <strong id="v-indoor-sensor-status" class="text-success">--</strong></span>
                        <span>Mái: <strong id="v-indoor-roof-status" class="text-success">--</strong></span>
                        <span>LAN: <strong id="v-indoor-network-status" class="text-success">--</strong></span>
                     </div>
                </div>

                <div id="radarBadgeContainer" class="glass-panel p-3 border border-secondary" style="display: block;">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span id="radarTitle" class="fw-bold small text-light"><i class="fas fa-robot text-info me-2"></i>AI CẢNH BÁO MƯA DÔNG</span>
                        <span id="radarRiskBadge" class="badge bg-secondary fs-6">Risk: --/100</span>
                    </div>
                    <div id="radarMessage" class="fw-bold mb-2 text-secondary fs-6"><i class='fas fa-spinner fa-spin me-2'></i>Đang chờ AI phân tích...</div>
                    <div class="d-flex flex-wrap gap-2 pt-2 border-top border-secondary small" id="radarDetails"></div>
                    
                    <h6 class="text-light small fw-bold mt-3 border-top border-secondary pt-2">DỰ BÁO ĐA MỐC (NOWCASTING HORIZONS)</h6>
                    <div class="row g-1 text-center mt-1" id="nowcastHorizons"></div>
                </div>

            </div>

            <div class="col-xl-6 col-lg-12 d-flex flex-column">
                
                <div class="d-flex flex-row flex-grow-1 gap-0 position-relative overflow-hidden h-100" style="min-height: 450px;">
                    
                    <div class="d-flex flex-column" style="width: 55px; min-width: 55px; z-index: 5;">
                        <button id="btnMapWindy" class="btn btn-primary flex-grow-1 d-flex flex-column justify-content-center align-items-center shadow-none border-0 p-1 text-white" style="background-color: #0b5ed7 !important; border-top-left-radius: 12px; border-bottom-left-radius: 0; border-top-right-radius: 0; border-bottom-right-radius: 0; transition: all 0.2s;">
                            <i class="fas fa-cloud fs-5 mb-1"></i>
                            <span class="fw-bold text-wrap text-center" style="font-size: 0.55rem; line-height: 1.1;">MÂY<br>VỆ TINH</span>
                        </button>
                        <button id="btnMapAI" class="btn btn-dark flex-grow-1 d-flex flex-column justify-content-center align-items-center shadow-none border-0 border-top border-secondary p-1 text-secondary" style="background-color: #1a2234 !important; border-radius: 0; transition: all 0.2s;">
                            <i class="fas fa-bullseye fs-5 mb-1"></i>
                            <span class="fw-bold text-wrap text-center" style="font-size: 0.55rem; line-height: 1.1;"><br>RADAR</span>AI
                        </button>
                        <a href="https://zoom.earth/maps/satellite/#view=20.996392,105.758474,10z/place=20.996392,105.758474" target="_blank" id="btnZoomEarth" class="btn btn-dark flex-grow-1 d-flex flex-column justify-content-center align-items-center shadow-none border-0 border-top border-secondary p-1 text-info text-decoration-none" style="background-color: #1a2234 !important; border-top-left-radius: 0; border-bottom-left-radius: 12px; border-top-right-radius: 0; border-bottom-right-radius: 0; transition: all 0.2s;" title="Mở Zoom Earth Mây Đêm">
                            <i class="fas fa-globe-americas fs-5 mb-1"></i>
                            <span class="fw-bold text-wrap text-center" style="font-size: 0.55rem; line-height: 1.1;">ZOOM<br>EARTH</span>
                        </a>
                    </div>

                    <div class="glass-panel p-0 flex-grow-1 position-relative overflow-hidden border border-secondary" style="border-top-left-radius: 0; border-bottom-left-radius: 0; border-top-right-radius: 12px; border-bottom-right-radius: 12px;">
                        <div id="windyContainer" class="w-100 h-100 position-absolute top-0 start-0" style="z-index: 2; transition: opacity 0.3s;">
                            <iframe src="https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=m%2Fs&zoom=9&overlay=satellite&product=ecmwf&level=surface&lat=20.995194&lon=105.756694&detailLat=20.995194&detailLon=105.756694&marker=true" width="100%" height="100%" frameborder="0" scrolling="no"></iframe>
                        </div>

                        <div id="leafletContainer" class="w-100 h-100 position-absolute top-0 start-0 bg-dark" style="z-index: 1; opacity: 0; pointer-events: none; transition: opacity 0.3s;">
                            <div id="customRadarMap" class="w-100 h-100"></div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <div class="row g-4 mb-4">
            <div class="col-xl-4">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-white fw-bold mb-4">ĐIỀU KHIỂN MÁI TRƯỢT 🎮</h5>
                    <div class="d-grid gap-3 mb-4">
                        <button class="btn btn-primary btn-act py-3" onclick="if(confirm('Xác nhận: Bạn có chắc chắn muốn MỞ MÁI CHE không?')) App.API.sendCommand('open')">MỞ MÁI CHE</button>
                        <button class="btn btn-warning btn-act py-3" onclick="App.API.sendCommand('stop')">🛑 DỪNG LẠI</button>
                        <button class="btn btn-danger btn-act py-3" onclick="if(confirm('Xác nhận: Bạn có chắc chắn muốn ĐÓNG MÁI CHE không?')) App.API.sendCommand('close')">ĐÓNG MÁI CHE</button>
                    </div>
                    <div class="p-3 bg-black bg-opacity-25 rounded border border-secondary mb-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="val-label text-light">Dòng điện (Tức thời):</span>
                            <strong class="text-info fs-5"><span id="main-current-val">0</span> / <span id="main-peak-val" class="text-warning fs-6">0</span></strong>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="val-label text-light">Bảo vệ Động cơ:</span>
                            <strong id="main-motor-status" class="badge bg-success">BÌNH THƯỜNG</strong>
                        </div>
                    </div>
                    <div class="d-flex justify-content-between border-top border-secondary pt-3">
                        <span class="val-label text-light">Lệnh đang xử lý:</span>
                        <strong class="text-white" id="hw-ack">--</strong>
                    </div>
                     <div class="d-flex justify-content-between mt-2">
                        <span class="val-label text-light">Vị trí Kính (Mount):</span>
                        <strong class="text-warning" id="hw-mount">ĐANGỌC...</strong>
                    </div>
                    <div class="d-flex justify-content-between mt-2">
                        <span class="val-label text-light">Sưởi Kính (Heater):</span>
                        <strong class="text-success" id="hw-heater-status"><span id="v-heater-pwm">--</span>%</strong>
                    </div>
                    <div class="d-flex justify-content-between mt-2">
                        <span class="val-label text-light">Tình trạng Mái (Roof):</span>
                        <strong class="text-warning" id="hw-roof">ĐANG ĐỌC...</strong>
                    </div>
                     <div class="d-flex justify-content-between mt-2">
                        <span class="val-label text-light">Hành trình (Mở/Đóng):</span>
                        <strong class="text-info"><span id="hw-open-time">--</span>s / <span id="hw-close-time">--</span>s</strong>
                    </div>
                     <div class="d-flex justify-content-between mt-2">
                        <span class="val-label text-light">Mã trạng thái FSM:</span>
                        <strong style="color: #d8b4fe;" id="hw-fsm">--</strong>
                    </div>
                    <div class="text-light small mt-3 d-flex flex-wrap gap-2 align-items-center border-top border-secondary pt-3">
                        <span class="val-label text-light">* Mạng nội bộ:</span>
                        <span>Khí tượng <strong id="net-w">--</strong></span>
                        <span class="text-secondary">|</span>
                        <span>Cơ khí <strong id="net-r">--</strong></span>
                        <span class="text-secondary">|</span>
                        <span>Trụ kính <strong id="net-p">--</strong></span>
                        <span class="text-secondary">|</span>
                        <span>Báo động <strong id="net-a">--</strong></span>
                    </div>
                </div>
            </div>

            <div class="col-xl-8">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-white fw-bold mb-4">Trực quan hóa Dòng điện & Vị trí</h5>
                    <div class="d-flex justify-content-between mb-1">
                        <span class="val-label text-light">Vị trí ước tính</span>
                        <span class="text-white fw-bold fs-5" id="estPct">0%</span>
                    </div>
                    <div class="motion-bar mb-3">
                        <div class="motion-fill" id="estBar" style="width: 0%"></div>
                    </div>
                    <div id="estText" class="text-center text-light fw-bold small mb-4" style="font-family: monospace;">[ ĐÃ ĐÓNG ]</div>
                    <h6 class="text-light fw-bold small">Tiến trình Di chuyển (Timeline)</h6>
                    <div class="d-flex justify-content-between mt-2 mb-4" id="motionTimeline">
                        <div class="fsm-node text-light" id="tl-start">BẮT ĐẦU MỀM</div>
                        <div class="fsm-node text-light" id="tl-fast">TỐC ĐỘ TỐI ĐA</div>
                        <div class="fsm-node text-light" id="tl-slow">GIẢM TỐC</div>
                        <div class="fsm-node text-light" id="tl-stop">DỪNG MỀM/CHẠM CÔNG TẮC</div>
                    </div>
                    <h6 class="text-light fw-bold small mt-4 border-top border-secondary pt-3">Dòng điện Động cơ Thời gian thực (RAW)</h6>
                    <div style="height: 180px;">
                        <canvas id="rtCurrentChart"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-4">
             <div class="col-12">
                <div class="glass-panel p-4">
                    <h5 class="text-white fw-bold mb-4">HÌNH ẢNH TRỰC TIẾP ĐÀI THIÊN VĂN (CAMERA LIVE STREAM) 📹</h5>
                    <div class="row g-3">
                        <div class="col-md-6">
                            <h6 class="text-light small fw-bold mb-2">Camera Trong Đài Thiên Văn 🏠</h6>
                            <div class="bg-black rounded d-flex align-items-center justify-content-center border border-secondary text-light overflow-hidden" style="aspect-ratio: 16/9; width: 100%;">
                                 <iframe src="https://camout.astrovn.org/stream.html?src=camera_trong_dai&mode=mse" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <h6 class="text-light small fw-bold mb-2">Camera Ngoài Đài Thiên Văn 🌳</h6>
                            <div class="bg-black rounded d-flex align-items-center justify-content-center border border-secondary text-light overflow-hidden" style="aspect-ratio: 16/9; width: 100%;">
                                 <iframe src="https://camout.astrovn.org/stream.html?src=camera_ngoai_dai&mode=mse" width="100%" height="100%" frameborder="0" scrolling="no" allowfullscreen></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row g-4 mb-4">
            <div class="col-12">
                <div class="glass-panel p-4">
                    <h5 class="text-white fw-bold mb-3">MÔI TRƯỜNG NGOÀI TRỜI 3 GIỜ QUA 🌡️💧</h5>
                    <div style="height: 250px;"><canvas id="envChart"></canvas></div>
                </div>
            </div>
            
            <div class="col-md-8">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-white fw-bold mb-3">TỐC ĐỘ GIÓ 3 GIỜ QUA 🌪️</h5>
                    <div class="d-flex flex-wrap gap-3 mb-1" style="font-size:0.75em; color:#e2e8f0">
                        <span><span style="color:#34d399">●</span> Ổn định &lt; 1 m/s</span>
                        <span><span style="color:#facc15">●</span> Theo dõi 1–2.5 m/s</span>
                        <span><span style="color:#f59e0b">●</span> Ảnh hưởng 2.5–4 m/s</span>
                        <span><span style="color:#ef4444">●</span> Nên dừng &gt; 4 m/s</span>
                    </div>
                    <div class="d-flex flex-wrap gap-3 mb-2" style="font-size:0.7rem; color:#94a3b8">
                        <span title="Gust Factor: Hệ số đo lường độ nhiễu loạn của không khí"><i class="fas fa-info-circle"></i> Chất lượng Seeing (GF):</span>
                        <span><span style="color:#34d399">GF &lt; 1.5</span> (Êm)</span>
                        <span><span style="color:#facc15">GF 1.5–2.0</span> (Động)</span>
                        <span><span style="color:#ef4444">GF &gt; 2.0</span> (Hỗn loạn)</span>
                    </div>
                    <div style="height: 250px;"><canvas id="speedChart"></canvas></div>
                </div>
            </div>
            
            <div class="col-md-4">
                <div class="glass-panel p-4 h-100 d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="text-white fw-bold mb-0">HƯỚNG GIÓ CHỦ ĐẠO 🧭</h5>
                        <div class="text-end" style="line-height: 1.2;">
                            <span class="d-block text-light" style="font-size: 0.7rem;">Giật Max (3h):</span>
                            <strong class="text-warning fs-5"><span id="st-max-gust-3h">0.0</span> <span style="font-size: 0.5em; color: #94a3b8;">m/s</span></strong>
                            <span class="d-block text-info fw-bold" style="font-size: 0.7rem;" id="st-max-gust-dir-3h">--</span>
                            <span class="d-block fw-bold mt-1" style="font-size: 0.75rem;" id="st-max-gf-3h">--</span>
                        </div>
                    </div>
                    <div class="flex-grow-1" style="min-height: 220px;"><canvas id="dirChart"></canvas></div>
                </div>
            </div>

            <div class="col-12">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-white fw-bold mb-3" style="color:#facc15!important;">BIẾN THIÊN ÁP SUẤT 3 GIỜ QUA (Dự đoán mưa sớm) 🌫️</h5>
                    <div style="height: 200px;"><canvas id="pressureChart"></canvas></div>
                </div>
            </div>
            <div class="col-12">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-white fw-bold mb-3" style="color:#38bdf8!important;">CHỈ SỐ BỤI MỊN (PM) 3 GIỜ QUA 😷</h5>
                    <div style="height: 200px;"><canvas id="pmChart"></canvas></div>
                </div>
            </div>
            
            <div class="col-12">
                 <div class="glass-panel p-4">
                    <h5 class="text-white fw-bold mb-3">TRẠNG THÁI MƯA 6 GIỜ QUA (Mưa: <span id="v-rain-duration" class="text-danger">0</span> phút) 🌧️</h5>
                    <div style="height: 180px;"><canvas id="rainChart"></canvas></div>
                </div>
            </div>
            
            <div class="col-12">
                <div class="glass-panel p-4">
                    <h5 class="text-white fw-bold mb-3">MÔI TRƯỜNG TRONG ĐÀI 3 GIỜ QUA 🏡</h5>
                    <div style="height: 250px;"><canvas id="indoorEnvChart"></canvas></div>
                </div>
            </div>
        </div>

        <div style="height: 80px; width: 100%;"></div>
    `,

    init: function() {
        const btnNight = document.getElementById('btn-night-vision');
        if (btnNight) {
            btnNight.addEventListener('click', () => {
                document.body.classList.toggle('night-vision-mode');
                if (document.body.classList.contains('night-vision-mode')) {
                    btnNight.classList.remove('btn-outline-danger');
                    btnNight.classList.add('btn-danger');
                } else {
                    btnNight.classList.add('btn-outline-danger');
                    btnNight.classList.remove('btn-danger');
                }
            });
        }

        const btnMapWindy = document.getElementById('btnMapWindy');
        const btnMapAI = document.getElementById('btnMapAI');
        const windyContainer = document.getElementById('windyContainer');
        const leafletContainer = document.getElementById('leafletContainer');

        const activeClass = 'btn flex-grow-1 d-flex flex-column justify-content-center align-items-center shadow-none border-0 p-1 text-white';
        const inactiveClass = 'btn flex-grow-1 d-flex flex-column justify-content-center align-items-center shadow-none border-0 border-top border-secondary p-1 text-secondary';

        const resetMapButtons = () => {
            if(btnMapWindy) { btnMapWindy.className = inactiveClass; btnMapWindy.style.backgroundColor = '#1a2234'; }
            if(btnMapAI) { btnMapAI.className = inactiveClass; btnMapAI.style.backgroundColor = '#1a2234'; btnMapAI.querySelector('i').classList.remove('text-danger'); }
        };

        if (btnMapWindy && btnMapAI) {
            btnMapWindy.addEventListener('click', () => {
                resetMapButtons();
                btnMapWindy.className = activeClass;
                btnMapWindy.style.backgroundColor = '#0b5ed7';
                
                windyContainer.style.opacity = '1'; windyContainer.style.pointerEvents = 'auto'; windyContainer.style.zIndex = '2';
                leafletContainer.style.opacity = '0'; leafletContainer.style.pointerEvents = 'none'; leafletContainer.style.zIndex = '1';
            });
            
            btnMapAI.addEventListener('click', () => {
                resetMapButtons();
                btnMapAI.className = activeClass;
                btnMapAI.style.backgroundColor = '#1e293b'; 
                btnMapAI.querySelector('i').classList.add('text-danger'); 
                
                leafletContainer.style.opacity = '1'; leafletContainer.style.pointerEvents = 'auto'; leafletContainer.style.zIndex = '2';
                windyContainer.style.opacity = '0'; windyContainer.style.pointerEvents = 'none'; windyContainer.style.zIndex = '1';
                
                if (this.customMap) {
                    if(this.layerControl && this.layerControl._container) this.layerControl._container.style.display = 'block'; 
                    setTimeout(() => { this.customMap.invalidateSize(); }, 100);
                }
            });
        }

        if (!window.L) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = () => this.initMap();
            document.head.appendChild(script);
        } else {
            this.initMap();
        }

        if(this.rtCurrentChartInstance) this.rtCurrentChartInstance.destroy();
        if(this.envChartInstance) this.envChartInstance.destroy();
        if(this.indoorEnvChartInstance) this.indoorEnvChartInstance.destroy();
        if(this.speedChartInstance) this.speedChartInstance.destroy();
        if(this.dirChartInstance) this.dirChartInstance.destroy();
        if(this.rainChartInstance) this.rainChartInstance.destroy();
        if(this.pressureChartInstance) this.pressureChartInstance.destroy(); 
        if(this.pmChartInstance) this.pmChartInstance.destroy(); 

        const ctxRt = document.getElementById('rtCurrentChart').getContext('2d');
        this.rtCurrentChartInstance = new Chart(ctxRt, {
            type: 'line', data: this.rtChartDataObj,
            options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: {color: '#1e293b'}, ticks: {color: '#e2e8f0'} }, x: { display: false } }, plugins: { legend: {display: false} } }
        });

        const getWindImpactColor = (speed) => {
            speed = Number(speed);
            if (!Number.isFinite(speed) || speed < 1) return '#34d399';
            if (speed < 2.5) return '#facc15';
            if (speed < 4) return '#f59e0b';
            return '#ef4444';
        };

        const createWindImpactGradient = (chart) => {
            const chartArea = chart.chartArea;
            if (!chartArea) return 'rgba(52, 211, 153, 0.22)';
            const gradient = chart.ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.12)');
            gradient.addColorStop(0.3, 'rgba(52, 211, 153, 0.42)');
            gradient.addColorStop(0.52, 'rgba(250, 204, 21, 0.48)');
            gradient.addColorStop(0.75, 'rgba(245, 158, 11, 0.52)');
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.58)');
            return gradient;
        };

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

        this.envChartInstance = new Chart(document.getElementById('envChart').getContext('2d'), {
            type: 'line', data: { labels: [], datasets: [
                { label: 'Nhiệt độ (°C)', data: [], borderColor: '#facc15', backgroundColor: 'transparent', yAxisID: 'y', pointRadius: 1, tension: 0.4, borderWidth: 2 },
                { label: 'Điểm sương (°C)', data: [], borderColor: '#00ff91', backgroundColor: 'transparent', borderDash: [5, 5], yAxisID: 'y', pointRadius: 1, tension: 0.4, borderWidth: 2 },
                { label: 'Độ ẩm (%)', data: [], borderColor: '#00a2ff', backgroundColor: 'rgba(96, 165, 250, 0.1)', fill: true, yAxisID: 'y1', pointRadius: 1, tension: 0.4, borderWidth: 2 }
            ] },
            options: { animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                spanGaps: true, 
                scales: { x: { grid: { color: '#334155' }, ticks: { color: '#e2e8f0' } }, y: { type: 'linear', display: true, position: 'left', grid: { color: '#334155' }, ticks: { color: '#e2e8f0' } }, y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#e2e8f0' }, min: 0, max: 100 } },
                plugins: { legend: { display: true, labels: { color: '#e2e8f0', boxWidth: 15 } } }
            }
        });

        this.indoorEnvChartInstance = new Chart(document.getElementById('indoorEnvChart').getContext('2d'), {
            type: 'line', data: { labels: [], datasets: [
                { label: 'Nhiệt độ trong đài (°C)', data: [], borderColor: '#facc15', backgroundColor: 'transparent', yAxisID: 'y', pointRadius: 1, tension: 0.4, borderWidth: 2 },
                { label: 'Điểm sương trong đài (°C)', data: [], borderColor: '#00ff91', backgroundColor: 'transparent', borderDash: [5, 5], yAxisID: 'y', pointRadius: 1, tension: 0.4, borderWidth: 2 },
                { label: 'Độ ẩm trong đài (%)', data: [], borderColor: '#00a2ff', backgroundColor: 'rgba(96, 165, 250, 0.1)', fill: true, yAxisID: 'y1', pointRadius: 1, tension: 0.4, borderWidth: 2 }
            ] },
            options: { animation: false, responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                spanGaps: true,
                scales: { x: { grid: { color: '#334155' }, ticks: { color: '#e2e8f0' } }, y: { type: 'linear', display: true, position: 'left', grid: { color: '#334155' }, ticks: { color: '#e2e8f0' } }, y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#e2e8f0' }, min: 0, max: 100 } },
                plugins: { legend: { display: true, labels: { color: '#e2e8f0', boxWidth: 15 } } }
            }
        });

        const ctxPress = document.getElementById('pressureChart').getContext('2d');
        this.pressureChartInstance = new Chart(ctxPress, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                animation: false,
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, spanGaps: true,
                scales: {
                    y: { title: {display: false}, grid: {color: '#334155'}, ticks: {color: '#94a3b8'}, suggestedMin: 990, suggestedMax: 1020 },
                    x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 15} }
                },
                plugins: { legend: { display: false } }
            }
        });

        const ctxPm = document.getElementById('pmChart').getContext('2d');
        this.pmChartInstance = new Chart(ctxPm, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                animation: false,
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, spanGaps: true,
                scales: {
                    y: { beginAtZero: true, title: {display: false}, grid: {color: '#334155'}, ticks: {color: '#94a3b8'}, suggestedMax: 50 },
                    x: { grid: { color: '#1e293b' }, ticks: {color: '#94a3b8', maxTicksLimit: 15} }
                },
                plugins: { legend: { labels: {color: '#fff'} } }
            }
        });

        this.speedChartInstance = new Chart(document.getElementById('speedChart').getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Tốc độ gió', data: [], dirs: [], gusts: [], borderColor: '#34d399', backgroundColor: function(context) { return createWindImpactGradient(context.chart); }, fill: true, tension: 0.4, pointRadius: 2, pointBackgroundColor: function(context) { return getWindImpactColor(context.parsed ? context.parsed.y : 0); }, pointBorderColor: '#0f172a', borderWidth: 2, segment: { borderColor: function(context) { return getWindImpactColor(context.p1 && context.p1.parsed ? context.p1.parsed.y : 0); } } }] },
            options: { 
                animation: false, responsive: true, maintainAspectRatio: false, spanGaps: true, 
                scales: { x: { grid: { color: '#334155' }, ticks: { color: '#e2e8f0' } }, y: { grid: { color: '#334155' }, ticks: { color: '#e2e8f0' }, beginAtZero: true } }, 
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let speed = context.parsed.y || 0;
                                let dataIndex = context.dataIndex;
                                let dirs = context.dataset.dirs;
                                let gusts = context.dataset.gusts;
                                
                                let dir = dirs ? dirs[dataIndex] : null;
                                let gust = gusts ? gusts[dataIndex] : 0;
                                let maxVal = Math.max(speed, gust);
                                
                                let gf = (speed > 0.5) ? (maxVal / speed).toFixed(2) : "1.00";
                                let gfColorText = (gf >= 2.0) ? " (Rất Hỗn)" : ((gf >= 1.5) ? " (Hơi Hỗn)" : " (Êm)");
                                
                                let lines = [`Tốc độ gió: ${speed.toFixed(1)} m/s`];
                                lines.push(`Gió giật: ${maxVal.toFixed(1)} m/s`);
                                lines.push(`Hệ số giật (GF): ${gf}${gfColorText}`);
                                
                                if (dir !== null && dir !== undefined) {
                                    let sectors = ["Bắc", "Bắc Đông Bắc", "Đông Bắc", "Đông Đông Bắc", "Đông", "Đông Đông Nam", "Đông Nam", "Nam Đông Nam", "Nam", "Nam Tây Nam", "Tây Nam", "Tây Tây Nam", "Tây", "Tây Tây Bắc", "Tây Bắc", "Bắc Tây Bắc"];
                                    let sIdx = Math.floor(((dir + 11.25) % 360) / 22.5);
                                    lines.push(`Hướng: ${dir}° (${sectors[sIdx] || '--'})`);
                                }
                                return lines;
                            }
                        }
                    }
                } 
            }
        });

        this.dirChartInstance = new Chart(document.getElementById('dirChart').getContext('2d'), {
            type: 'radar',
            data: { labels: ['B', 'BĐB', 'ĐB', 'ĐĐB', 'Đ', 'ĐĐN', 'ĐN', 'NĐN', 'N', 'NTN', 'TN', 'TTN', 'T', 'TTB', 'TB', 'BTB'], datasets: [{ data: Array(16).fill(0), backgroundColor: 'rgba(56, 189, 248, 0.25)', borderColor: '#38bdf8', pointBackgroundColor: '#38bdf8', borderWidth: 2 }] },
            options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { r: { angleLines: { color: '#334155' }, grid: { color: '#334155' }, pointLabels: { color: '#e2e8f0', font: { size: 10, weight: 'bold' } }, ticks: { display: false } } }, plugins: { legend: { display: false } } }
        });

        this.rainChartInstance = new Chart(document.getElementById('rainChart').getContext('2d'), {
            type: 'line',
            data: { labels: [], datasets: [{ label: 'Trạng thái Mưa', data: [], backgroundColor: 'rgba(239, 68, 68, 0.5)', borderColor: '#ef4444', fill: true, stepped: true, pointRadius: 0, borderWidth: 1 }] },
            options: { animation: false, responsive: true, maintainAspectRatio: false, spanGaps: true, scales: { x: { grid: { color: '#334155' }, ticks: { color: '#e2e8f0' } }, y: { grid: { display: false }, ticks: { display: false }, min: 0, max: 1.1 } }, plugins: { legend: { display: false } } }
        });

        if(this.historyInterval) clearInterval(this.historyInterval);
        
        this.loadHistoryData();
        this.historyInterval = setInterval(() => this.loadHistoryData(), 60000);

        this.fetchWeatherAPI();
        setInterval(() => this.fetchWeatherAPI(), 5 * 60 * 1000);
    },

    initMap: function() {
        if (!window.L) return;
        
        if (this.customMap) {
            this.customMap.remove();
            this.customMap = null;
        }

        const lat = 20.995194;
        const lon = 105.756694;
        
        this.customMap = L.map('customRadarMap', { zoomControl: false, attributionControl: false }).setView([lat, lon], 7);
        
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 19
        }).addTo(this.customMap);

        this.customMap.createPane('hsdcPane');
        this.customMap.getPane('hsdcPane').style.zIndex = 650;

        const customIcon = L.divIcon({ 
            html: '<div style="background: #38bdf8; border: 2px solid white; border-radius: 50%; width: 14px; height: 14px; box-shadow: 0 0 10px #38bdf8;"></div>', 
            className: '', 
            iconSize: [14, 14], 
            iconAnchor: [7, 7] 
        });
        L.marker([lat, lon], {icon: customIcon, pane: 'hsdcPane'}).addTo(this.customMap);
        
        this.radarLayerGroup = L.featureGroup().addTo(this.customMap);
        this.radarTileLayer = null;
        this.aiLayerGroup = L.featureGroup().addTo(this.customMap);
        
        this.pliLayer = L.imageOverlay('', [[0,0],[0,0]], { opacity: 0.8, zIndex: 11 });
        this.vtrLayer = L.imageOverlay('', [[0,0],[0,0]], { opacity: 0.8, zIndex: 11 });
        this.vndmsLayer = L.imageOverlay('', [[7.2, 97.0], [25.2, 115.0]], { opacity: 0.75, zIndex: 12 });
        
        this.hsdcLayerGroup = L.featureGroup(); 
        
        // Sắp xếp lại thứ tự khai báo để Leaflet hiển thị đúng từ trên xuống dưới
        const radarOverlays = {
            "Radar Rainviewer": this.radarLayerGroup,
            "Radar Phù Liễn (PLI)": this.pliLayer,
            "Radar Việt Trì (VTR)": this.vtrLayer,
            "Trạm Đo Mưa HSDC": this.hsdcLayerGroup,
            "Radar Quốc gia (VNDMS CMAX)": this.vndmsLayer
        };
        
        this.layerControl = L.control.layers(null, radarOverlays, { collapsed: false }).addTo(this.customMap);
        if(this.layerControl && this.layerControl._container) {
            this.layerControl._container.style.display = 'none'; 
        }

        const legend = L.control({position: 'bottomright'});
        legend.onAdd = function (map) {
            const div = L.DomUtil.create('div', 'info legend');
            div.style.background = 'rgba(15, 23, 42, 0.85)';
            div.style.padding = '10px';
            div.style.borderRadius = '8px';
            div.style.color = 'white';
            div.style.fontSize = '12px';
            div.style.lineHeight = '1.8';
            div.style.border = '1px solid #334155';
            div.innerHTML = `
                <div style="font-weight:bold; margin-bottom:6px; font-size:13px; text-align:center; border-bottom:1px solid #475569; padding-bottom:6px;">CHÚ GIẢI TRẠM ĐO MƯA</div>
                <div style="display:flex; align-items:center;"><span style="display:inline-block; width:14px; height:14px; background:#3b82f6; border-radius:50%; border:1px solid white; margin-right:8px;"></span>Cấp 1: 0 - 20mm (Mưa nhỏ/Không mưa)</div>
                <div style="display:flex; align-items:center;"><span style="display:inline-block; width:14px; height:14px; background:#22c55e; border-radius:50%; border:2px solid white; margin-right:8px;"></span>Cấp 2: 20 - 50mm (Mưa vừa)</div>
                <div style="display:flex; align-items:center;"><span style="display:inline-block; width:14px; height:14px; background:#eab308; border-radius:50%; border:2px solid white; margin-right:8px;"></span>Cấp 3: 50 - 70mm (Mưa to)</div>
                <div style="display:flex; align-items:center;"><span style="display:inline-block; width:14px; height:14px; background:#f97316; border-radius:50%; border:2px solid white; margin-right:8px;"></span>Cấp 4: 70 - 90mm (Mưa rất to)</div>
                <div style="display:flex; align-items:center;"><span style="display:inline-block; width:14px; height:14px; background:#ef4444; border-radius:50%; border:2px solid white; margin-right:8px;"></span>Cấp 5: 90 - 100mm (Đặc biệt to)</div>
                <div style="display:flex; align-items:center;"><span style="display:inline-block; width:14px; height:14px; background:#a855f7; border-radius:50%; border:2px solid white; margin-right:8px;"></span>Cấp 6: >100mm (Mưa cực đoan)</div>
            `;
            return div;
        };
        this.hsdcLegend = legend;

        // Cập nhật trạng thái các layer tracking
        this.customMap.on('overlayadd', (e) => {
            if (e.name === "Trạm Đo Mưa HSDC") {
                this.hsdcLegend.addTo(this.customMap);
            } else if (e.name === "Radar Quốc gia (VNDMS CMAX)") {
                this.useVndmsTracking = true;
            } else if (e.name === "Radar Phù Liễn (PLI)") {
                this.usePliTracking = true;
            } else if (e.name === "Radar Việt Trì (VTR)") {
                this.useVtrTracking = true;
            } else if (e.name === "Radar Rainviewer") {
                this.useRainviewerTracking = true;
            }
        });
        
        this.customMap.on('overlayremove', (e) => {
            if (e.name === "Trạm Đo Mưa HSDC") {
                this.customMap.removeControl(this.hsdcLegend);
            } else if (e.name === "Radar Quốc gia (VNDMS CMAX)") {
                this.useVndmsTracking = false;
            } else if (e.name === "Radar Phù Liễn (PLI)") {
                this.usePliTracking = false;
            } else if (e.name === "Radar Việt Trì (VTR)") {
                this.useVtrTracking = false;
            } else if (e.name === "Radar Rainviewer") {
                this.useRainviewerTracking = false;
            }
        });
    },

    fetchWeatherAPI: async function() {
        try {
            const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=20.995194&longitude=105.756694&hourly=precipitation_probability,precipitation&timezone=Asia%2FBangkok&forecast_hours=2');
            const data = await res.json();
            if(data && data.hourly) {
                let pop = data.hourly.precipitation_probability[0] || 0; 
                let popNext = data.hourly.precipitation_probability[1] || 0; 
                let maxPop = Math.max(pop, popNext);
                
                let rain = data.hourly.precipitation[0] || 0;
                let rainNext = data.hourly.precipitation[1] || 0;
                let maxRain = Math.max(rain, rainNext);
                
                let popBadge = document.getElementById('v-api-pop');
                if (popBadge) {
                    popBadge.innerHTML = `<i class="fas fa-cloud-showers-heavy me-1"></i> Dự đoán mưa sớm: ${maxPop}% có mưa (Tối đa ${maxRain} mm/h)`;
                    if (maxPop > 50 || maxRain > 1.0) {
                        popBadge.className = "badge bg-danger fs-6 text-wrap text-start";
                    } else if (maxPop > 20 || maxRain > 0.1) {
                        popBadge.className = "badge bg-warning text-dark fs-6 text-wrap text-start";
                    } else {
                        popBadge.className = "badge bg-primary fs-6 text-wrap text-start";
                    }
                }
            }
        } catch (e) {
            console.log("Lỗi API Open-Meteo:", e);
        }
    },

    loadHistoryData: async function() {
        try {
            const data = await API.get('history.php?t=' + new Date().getTime());
            if(data.error) return;

            let isDataStale = false;
            if (data.diagnostic && data.diagnostic.last_record_age_sec > 10800) {
                isDataStale = true;
                console.log("Phát hiện mất kết nối quá 3 giờ. Tạm ẩn dữ liệu biểu đồ cũ.");
            }

            let times6h = isDataStale ? [] : (data.times || []); 
            let rains6h = isDataStale ? [] : (data.rains || []);
            let times3h = isDataStale ? [] : (data.times ? data.times.slice(-36) : []); 
            let temps3h = isDataStale ? [] : (data.temps ? data.temps.slice(-36) : []); 
            let hums3h = isDataStale ? [] : (data.hums ? data.hums.slice(-36) : []); 
            let dews3h = isDataStale ? [] : (data.dews ? data.dews.slice(-36) : []); 
            let indoorTemps3h = isDataStale ? [] : (data.indoor_temps ? data.indoor_temps.slice(-36) : []);
            let indoorHums3h = isDataStale ? [] : (data.indoor_hums ? data.indoor_hums.slice(-36) : []);
            let indoorDews3h = isDataStale ? [] : (data.indoor_dews ? data.indoor_dews.slice(-36) : []);
            let speeds3h = isDataStale ? [] : (data.speeds ? data.speeds.slice(-36) : []); 
            let dirs3h = isDataStale ? [] : (data.dirs ? data.dirs.slice(-36) : []);
            
            let gusts3h = isDataStale ? [] : (data.wind_gusts_5m ? data.wind_gusts_5m.slice(-36) : []);
            
            let press3h = isDataStale ? [] : ((data.pressures && data.pressures.length > 0) ? data.pressures.slice(-36) : Array(times3h.length).fill(null)); 
            let pm253h = isDataStale ? [] : ((data.pm25s && data.pm25s.length > 0) ? data.pm25s.slice(-36) : Array(times3h.length).fill(null)); 
            let pm103h = isDataStale ? [] : ((data.pm10s && data.pm10s.length > 0) ? data.pm10s.slice(-36) : Array(times3h.length).fill(null));

            this.envChartInstance.data.labels = times3h;
            this.envChartInstance.data.datasets[0].data = temps3h;
            this.envChartInstance.data.datasets[1].data = dews3h;
            this.envChartInstance.data.datasets[2].data = hums3h;
            this.envChartInstance.update();

            this.indoorEnvChartInstance.data.labels = times3h;
            this.indoorEnvChartInstance.data.datasets[0].data = indoorTemps3h;
            this.indoorEnvChartInstance.data.datasets[1].data = indoorDews3h;
            this.indoorEnvChartInstance.data.datasets[2].data = indoorHums3h;
            this.indoorEnvChartInstance.update();

            this.pressureChartInstance.data.labels = times3h;
            this.pressureChartInstance.data.datasets = [
                { label: 'Áp suất (hPa)', data: press3h, borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', fill: true, pointRadius: 1, tension: 0.4, borderWidth: 2 }
            ];
            this.pressureChartInstance.update();

            this.pmChartInstance.data.labels = times3h;
            this.pmChartInstance.data.datasets = [
                { label: 'PM2.5', data: pm253h, borderColor: '#facc15', backgroundColor: 'rgba(250, 204, 21, 0.1)', fill: true, pointRadius: 1, tension: 0.4, borderWidth: 2 },
                { label: 'PM10', data: pm103h, borderColor: '#38bdf8', backgroundColor: 'transparent', pointRadius: 1, tension: 0.4, borderWidth: 2 }
            ];
            this.pmChartInstance.update();

            this.speedChartInstance.data.labels = times3h; 
            this.speedChartInstance.data.datasets[0].data = speeds3h; 
            this.speedChartInstance.data.datasets[0].dirs = dirs3h;
            this.speedChartInstance.data.datasets[0].gusts = gusts3h;
            this.speedChartInstance.update();
            
            let dirBins = Array(16).fill(0); 
            dirs3h.forEach(deg => { dirBins[Math.round((deg || 0) / 22.5) % 16] += 1; });
            this.dirChartInstance.data.datasets[0].data = dirBins; 
            this.dirChartInstance.update();
            
            let localMaxGust3h = 0;
            let localMaxGustDir = null;
            let localMaxGustSpeedForGF = 0; 
            for (let i = 0; i < times3h.length; i++) {
                let speedVal = speeds3h[i] || 0;
                let gustVal = (gusts3h[i] !== undefined && gusts3h[i] !== null) ? gusts3h[i] : 0;
                let gVal = Math.max(speedVal, gustVal);

                if (gVal >= localMaxGust3h) {
                    localMaxGust3h = gVal;
                    localMaxGustDir = dirs3h[i];
                    localMaxGustSpeedForGF = speedVal; 
                }
            }
            let dirText = "--";
            if (localMaxGustDir !== null && localMaxGustDir !== undefined) {
                let sIdx = Math.floor(((localMaxGustDir + 11.25) % 360) / 22.5);
                dirText = `Hướng: ${localMaxGustDir}° (${this.compassSectors[sIdx] || '--'})`;
            }
            if(document.getElementById('st-max-gust-3h')) document.getElementById('st-max-gust-3h').innerText = localMaxGust3h.toFixed(1);
            if(document.getElementById('st-max-gust-dir-3h')) document.getElementById('st-max-gust-dir-3h').innerText = dirText;
            
            if(document.getElementById('st-max-gf-3h')) {
                let gf3h = (localMaxGustSpeedForGF > 0.5) ? (localMaxGust3h / localMaxGustSpeedForGF).toFixed(2) : "1.00";
                let gfEl = document.getElementById('st-max-gf-3h');
                gfEl.innerText = `GF: ${gf3h}`;
                gfEl.style.color = (gf3h >= 2.0) ? '#ef4444' : ((gf3h >= 1.5) ? '#f59e0b' : '#34d399');
            }
            
            this.rainChartInstance.data.labels = times6h; 
            this.rainChartInstance.data.datasets[0].data = rains6h; 
            this.rainChartInstance.update();
            
            let maxGust = 0;
            let validGusts = (data.wind_gusts_5m || []).filter(n => n !== null);
            let validSpeeds = (data.speeds || []).filter(n => n !== null);
            
            if (validGusts.length > 0) {
                maxGust = Math.max(...validGusts);
            } else if (validSpeeds.length > 0) {
                maxGust = Math.max(...validSpeeds);
            }
            if (maxGust < 0 || !isFinite(maxGust)) maxGust = 0;
            
            if(document.getElementById('st-points')) document.getElementById('st-points').innerText = data.times.length.toLocaleString();
            if(document.getElementById('st-wind')) document.getElementById('st-wind').innerHTML = maxGust.toFixed(1) + '<span style="font-size: 0.4em; color: #94a3b8;">m/s</span>';
            if(document.getElementById('st-rain')) document.getElementById('st-rain').innerHTML = data.rain_duration_minutes + '<span style="font-size: 0.4em;"> phút</span>';

        } catch(e) {
            console.log("Lỗi tải biểu đồ lịch sử:", e);
        }
    },

    update: function(sysData, diagData) {
        const roofStatus = document.getElementById('node-roof-status');
        const weatherStatus = document.getElementById('node-weather-status');
        const espnowStatus = document.getElementById('node-espnow-status');
        const pierStatus = document.getElementById('node-pier-status');
        const alarmStatus = document.getElementById('node-alarm-status');

        if (roofStatus && weatherStatus && espnowStatus) {
            if (sysData && sysData.roof && sysData.roof.online) {
                roofStatus.className = 'badge bg-success p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                roofStatus.innerHTML = '<i class="fas fa-microchip me-2"></i> MẠCH MÁI CHE: ĐÃ KẾT NỐI';
            } else {
                roofStatus.className = 'badge bg-danger p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                roofStatus.innerHTML = '<i class="fas fa-microchip me-2"></i> MẠCH MÁI CHE: MẤT KẾT NỐI';
            }

            if (sysData && sysData.weather && sysData.weather.online) {
                weatherStatus.className = 'badge bg-success p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                weatherStatus.innerHTML = '<i class="fas fa-satellite-dish me-2"></i> MẠCH KHÍ TƯỢNG: ĐÃ KẾT NỐI';
            } else {
                weatherStatus.className = 'badge bg-danger p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                weatherStatus.innerHTML = '<i class="fas fa-satellite-dish me-2"></i> MẠCH KHÍ TƯỢNG: MẤT KẾT NỐI';
            }

            let isEspNowConnected = false;
            if (sysData && sysData.roof && sysData.roof.online && sysData.roof.WeatherConnected) {
                isEspNowConnected = true;
            }

            if (isEspNowConnected) {
                espnowStatus.className = 'badge bg-success p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                espnowStatus.innerHTML = '<i class="fas fa-wifi me-2"></i> ESP-NOW: ĐÃ KẾT NỐI';
            } else {
                espnowStatus.className = 'badge bg-danger p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                espnowStatus.innerHTML = '<i class="fas fa-wifi me-2"></i> ESP-NOW: MẤT KẾT NỐI';
            }
        }

        if (pierStatus) {
            let isPierConnected = (sysData && sysData.roof && sysData.roof.online && sysData.roof.PierConnected); 
            if (isPierConnected) {
                pierStatus.className = 'badge bg-success p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                pierStatus.innerHTML = '<i class="fas fa-crosshairs me-2"></i> MẠCH TRỤ: ĐÃ KẾT NỐI';
            } else {
                pierStatus.className = 'badge bg-danger p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                pierStatus.innerHTML = '<i class="fas fa-crosshairs me-2"></i> MẠCH TRỤ: MẤT KẾT NỐI';
            }
        }

        if (alarmStatus) {
            let isAlarmConnected = false;
            if (diagData && diagData.alarm_uptime !== undefined && diagData.alarm_uptime !== null) {
                isAlarmConnected = true;
            } else if (sysData && sysData.roof && sysData.roof.online && sysData.roof.AlarmConnected) {
                isAlarmConnected = true;
            }

            if (isAlarmConnected) {
                alarmStatus.className = 'badge bg-success p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                alarmStatus.innerHTML = '<i class="fas fa-bullhorn me-2"></i> MẠCH BÁO ĐỘNG: ĐÃ KẾT NỐI';
            } else {
                alarmStatus.className = 'badge bg-danger p-2 d-inline-flex align-items-center justify-content-center flex-grow-1 flex-md-grow-0 text-white';
                alarmStatus.innerHTML = '<i class="fas fa-bullhorn me-2"></i> MẠCH BÁO ĐỘNG: MẤT KẾT NỐI';
            }
        }

        let nowStr = new Date().toLocaleString('vi-VN');

        let radarContainer = document.getElementById('radarBadgeContainer');
        if (radarContainer) {
            let msgEl = document.getElementById('radarMessage');
            let riskBadge = document.getElementById('radarRiskBadge');
            let detailsEl = document.getElementById('radarDetails');
            let horizonsContainer = document.getElementById('nowcastHorizons');

            if (sysData && sysData.RadarAI) {
                let rData = sysData.RadarAI;
                
                let risk = rData.radar_risk_score || 0; 
                let msg = rData.message || "Trời quang";
                let cells = rData.danger_pixels || 0;
                let impact = rData.impact_time_mins !== null ? rData.impact_time_mins : -1;
                let hasLightning = rData.lightning_detected || false;

                if(riskBadge) riskBadge.innerText = `Chỉ số rủi ro: ${risk}/100`;

                if (risk >= 85 || hasLightning) {
                    radarContainer.className = "glass-panel p-3 border border-danger bg-danger bg-opacity-25 animated-flash";
                    if(msgEl) msgEl.className = "fw-bold fs-5 text-danger mb-2";
                    if(riskBadge) riskBadge.className = "badge bg-danger pulse-anim fs-6";
                } else if (risk >= 50) {
                    radarContainer.className = "glass-panel p-3 border border-warning bg-warning bg-opacity-25";
                    if(msgEl) msgEl.className = "fw-bold fs-6 text-warning mb-2";
                    if(riskBadge) riskBadge.className = "badge bg-warning text-dark fs-6";
                } else {
                    radarContainer.className = "glass-panel p-3 border border-success bg-success bg-opacity-10";
                    if(msgEl) msgEl.className = "fw-bold fs-6 text-success mb-2";
                    if(riskBadge) riskBadge.className = "badge bg-success text-white fs-6";
                }

                if(msgEl) msgEl.innerHTML = msg;

                let totalCells = rData.cells ? rData.cells.length : 0;
                let threatCells = rData.danger_pixels || 0;
                let lightningCount = (rData.observed_lightning && rData.observed_lightning.nearby_count) ? rData.observed_lightning.nearby_count : 0;

                let detailsHtml = `<span class="badge bg-secondary"><i class="fas fa-cloud me-1"></i> Tổng mây: ${totalCells} (Đe dọa: ${threatCells})</span>`;
                
                if (impact >= 0) {
                    detailsHtml += `<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i> Va chạm: ~${impact} phút</span>`;
                }
                
                if (hasLightning) {
                    detailsHtml += `<span class="badge bg-danger pulse-anim"><i class="fas fa-bolt me-1"></i> SÉT GẦN ĐÀI: ${lightningCount}</span>`;
                } else {
                    detailsHtml += `<span class="badge bg-success bg-opacity-75" style="border: 1px solid #10b981;"><i class="fas fa-bolt me-1"></i> Sét: An toàn</span>`;
                }
                
                if(detailsEl) detailsEl.innerHTML = detailsHtml;

                if (horizonsContainer && rData.models && rData.models.C) {
                    let hHtml = '';
                    rData.models.C.forEach(h => {
                        let rColor = h.risk_index >= 85 ? 'danger' : (h.risk_index >= 50 ? 'warning' : 'success');
                        let icon = h.predicted_rain ? '<i class="fas fa-cloud-showers-heavy text-danger"></i>' : '<i class="fas fa-sun text-success"></i>';
                        let cColor = h.confidence === 'HIGH' ? 'bg-success' : (h.confidence === 'MODERATE' ? 'bg-warning text-dark' : 'bg-secondary');
                        
                        hHtml += `
                            <div class="col px-1">
                                <div class="horizon-box">
                                    <div class="small fw-bold text-light">${h.horizon_minutes}m</div>
                                    <div class="fs-5 my-1">${icon}</div>
                                    <div class="small text-${rColor} fw-bold">${h.risk_index}</div>
                                    <div class="progress mt-1" style="height: 3px;">
                                        <div class="progress-bar ${cColor}" style="width: 100%"></div>
                                    </div>
                                </div>
                            </div>
                        `;
                    });
                    horizonsContainer.innerHTML = hHtml;
                }

                if (this.customMap && rData.rainviewer_path) {
                    if (this.radarTileLayer) this.radarLayerGroup.removeLayer(this.radarTileLayer);
                    this.radarTileLayer = L.tileLayer(`https://tilecache.rainviewer.com${rData.rainviewer_path}/256/{z}/{x}/{y}/2/1_1.png`, {
                        opacity: 0.65, zIndex: 10, tileSize: 256, maxNativeZoom: 6, maxZoom: 19
                    });
                    this.radarLayerGroup.addLayer(this.radarTileLayer);
                }

                if (rData.models && rData.models.B && rData.models.B.length > 0) {
                    rData.models.B.forEach(hmData => {
                        if (hmData.available && hmData.image_url && hmData.bounds) {
                            if (hmData.station === "PLI" && this.pliLayer) {
                                this.pliLayer.setUrl(hmData.image_url);
                                this.pliLayer.setBounds(hmData.bounds);
                            } else if (hmData.station === "VTR" && this.vtrLayer) {
                                this.vtrLayer.setUrl(hmData.image_url);
                                this.vtrLayer.setBounds(hmData.bounds);
                            }
                        }
                    });
                }

                if (rData.vndms_data && rData.vndms_data.image_url) {
                    this.vndmsLayer.setUrl(rData.vndms_data.image_url);
                }

                if (this.aiLayerGroup && !this.customMap.hasLayer(this.aiLayerGroup)) {
                    this.aiLayerGroup.addTo(this.customMap);
                }
                
                if (this.customMap.hasLayer(this.hsdcLayerGroup)) {
                    this.hsdcLayerGroup.bringToFront();
                }

                this.aiLayerGroup.clearLayers();
                
                // [SỬA ĐỔI]: Cộng dồn danh sách mây từ các trạm đang được tick thay vì chỉ chọn 1 trạm
                let cellsToDraw = [];
                if (this.useVndmsTracking && rData.vndms_data && rData.vndms_data.cells) {
                    cellsToDraw = cellsToDraw.concat(rData.vndms_data.cells);
                }
                if (this.usePliTracking && rData.pli_data && rData.pli_data.cells) {
                    cellsToDraw = cellsToDraw.concat(rData.pli_data.cells);
                }
                if (this.useVtrTracking && rData.vtr_data && rData.vtr_data.cells) {
                    cellsToDraw = cellsToDraw.concat(rData.vtr_data.cells);
                }
                if (this.useRainviewerTracking && rData.cells) {
                    // Rainviewer thường bao phủ rất lớn, ta gom vào nếu có yêu cầu
                    cellsToDraw = cellsToDraw.concat(rData.cells); 
                }
                
                if (cellsToDraw.length > 0) {
                    cellsToDraw.forEach(cell => {
                        if (cell.dist_km <= 300.0) {
                            L.circle([cell.lat, cell.lon], {
                                color: '#ef4444', weight: 1, fillColor: '#ef4444', fillOpacity: 0.3, radius: (cell.radius_km * 1000)
                            }).addTo(this.aiLayerGroup);
                            
                            if (cell.vx !== 0 || cell.vy !== 0) {
                                let dt = 30 / 60.0; 
                                let dLat = cell.vy * dt / 111.32;
                                let dLon = cell.vx * dt / (111.32 * Math.cos(cell.lat * Math.PI / 180));
                                let endLat = cell.lat + dLat;
                                let endLon = cell.lon + dLon;
                                
                                L.polyline([[cell.lat, cell.lon], [endLat, endLon]], {
                                    color: '#facc15', dashArray: '5, 5', weight: 2, opacity: 0.8
                                }).addTo(this.aiLayerGroup);
                                
                                let bearing = Math.atan2(cell.vx, cell.vy) * (180 / Math.PI);
                                let arrowIcon = L.divIcon({
                                    html: `<div style="transform: rotate(${bearing}deg); color: #facc15; font-size: 11px; text-shadow: 0 0 2px #000, 0 0 4px #facc15; display: flex; justify-content: center; align-items: center; line-height: 1;">▲</div>`,
                                    className: '',
                                    iconSize: [12, 12],
                                    iconAnchor: [6, 6]
                                });
                                L.marker([endLat, endLon], {icon: arrowIcon}).addTo(this.aiLayerGroup);
                            }
                        }
                    });
                }

                if (rData.observed_lightning && rData.observed_lightning.strikes) {
                    const lightningIcon = L.divIcon({
                        html: '<i class="fas fa-bolt text-white" style="font-size: 18px; filter: drop-shadow(0 0 2px #000000) drop-shadow(0 0 6px #c084fc);"></i>',
                        className: '', iconSize: [18, 18], iconAnchor: [9, 9]
                    });
                    rData.observed_lightning.strikes.forEach(strike => {
                        L.marker([strike.lat, strike.lng || strike.lon], {icon: lightningIcon}).addTo(this.aiLayerGroup);
                    });
                }

            } else {
                radarContainer.className = "glass-panel p-3 border border-secondary bg-dark bg-opacity-50";
                if(msgEl) {
                    msgEl.className = "fw-bold text-secondary fs-6 mb-2";
                    msgEl.innerHTML = "<i class='fas fa-spinner fa-spin me-2'></i>Đang chờ AI phân tích...";
                }
                if(riskBadge) {
                    riskBadge.className = "badge bg-secondary text-white fs-6";
                    riskBadge.innerText = "Rủi ro: Đang đo";
                }
                let detailsEl = document.getElementById('radarDetails');
                let horizonsContainer = document.getElementById('nowcastHorizons');
                if(detailsEl) detailsEl.innerHTML = "";
                if(horizonsContainer) horizonsContainer.innerHTML = "";
            }
        }

        if (this.customMap && this.hsdcLayerGroup) {
            fetch('hsdc_rain.json?t=' + new Date().getTime())
                .then(res => res.json())
                .then(resData => {
                    let stationsList = resData.data || resData.stations || [];
                    if (stationsList.length > 0) {
                        let currentHsdcHash = JSON.stringify(stationsList);
                        if (this._lastHsdcHash !== currentHsdcHash) {
                            this._lastHsdcHash = currentHsdcHash;
                            this.hsdcLayerGroup.clearLayers();
                            
                            stationsList.forEach(st => {
                                let mLat = parseFloat(st.Lat || st.lat); 
                                let mLng = parseFloat(st.Lng || st.lon); 
                                if (isNaN(mLat) || isNaN(mLng)) return;
                                
                                let hsdc_level = 1;
                                if (st.rain_info && st.rain_info.level) {
                                    hsdc_level = parseInt(st.rain_info.level);
                                } else if (st.level) {
                                    hsdc_level = parseInt(st.level);
                                } else if (st.Icon && st.Icon.match(/level(\d+)/)) {
                                    let match = st.Icon.match(/level(\d+)/);
                                    hsdc_level = parseInt(match[1]);
                                }
                                
                                let color = '#3b82f6'; let rainEst = "0 - 20 mm"; let lbl = "Mưa nhỏ/Không mưa";
                                if (hsdc_level === 1) { color = '#3b82f6'; rainEst = "0 - 20 mm/h"; lbl = "Mưa nhỏ/Không mưa"; }
                                else if (hsdc_level === 2) { color = '#22c55e'; rainEst = "20 - 50 mm/h"; lbl = "Mưa vừa"; }
                                else if (hsdc_level === 3) { color = '#eab308'; rainEst = "50 - 70 mm/h"; lbl = "Mưa to"; }
                                else if (hsdc_level === 4) { color = '#f97316'; rainEst = "70 - 90 mm/h"; lbl = "Mưa rất to"; }
                                else if (hsdc_level === 5) { color = '#ef4444'; rainEst = "90 - 100 mm/h"; lbl = "Mưa đặc biệt to"; }
                                else if (hsdc_level >= 6) { color = '#a855f7'; rainEst = "> 100 mm/h"; lbl = "Mưa cực đoan"; }
                                
                                let textColor = (hsdc_level === 3) ? '#000' : '#fff';
                                let opacity = hsdc_level === 1 ? 0.5 : 1.0; 
                                let border = hsdc_level === 1 ? '1px' : '2px';

                                let markerIcon = L.divIcon({
                                    html: `<div style="background: ${color}; border: ${border} solid white; border-radius: 50%; width: 22px; height: 22px; box-shadow: 0 0 8px ${color}; display:flex; justify-content:center; align-items:center; color:${textColor}; font-weight:bold; font-size:12px; opacity: ${opacity};">${hsdc_level}</div>`,
                                    className: '', iconSize: [22, 22], iconAnchor: [11, 11]
                                });
                                
                                let stationName = st.TenTram || st.name || 'Trạm đo';
                                let popupHtml = `<div style="color: #0f172a; text-align: center; font-family: sans-serif; min-width: 140px; padding: 5px;">
                                    <strong style="font-size: 15px;">Trạm: ${stationName}</strong><br>
                                    <span style="font-size: 14px; color: ${color}; font-weight: bold; text-shadow: 0px 0px 1px rgba(0,0,0,0.5);">${lbl}</span><br>
                                    <span style="font-size: 12px; color: #475569;">Lượng mưa: ${rainEst}</span>
                                </div>`;
                                
                                L.marker([mLat, mLng], {icon: markerIcon, pane: 'hsdcPane'}).bindPopup(popupHtml).addTo(this.hsdcLayerGroup);
                            });
                        }
                    }
                })
                .catch(err => console.log("Lỗi tải hsdc_rain.json cho bản đồ:", err));
            
            if (this.customMap.hasLayer(this.hsdcLayerGroup)) {
                this.hsdcLayerGroup.bringToFront();
            }
        }

        if(sysData.weather) {
            const w = sysData.weather;
            document.getElementById('net-w').innerText = w.online ? '🟢 OK' : '🔴 MẤT KẾT NỐI';

            const weatherUpdatedEl = document.getElementById('v-weather-updated');
            if (w.online) {
                weatherUpdatedEl.className = 'badge bg-success fs-6 text-wrap text-start text-white';
                weatherUpdatedEl.innerHTML = `<i class="fas fa-check-circle me-1"></i> Mới nhất lúc: ${nowStr}`;
                
                document.getElementById('v-temp').innerText = w.Temperature !== null ? w.Temperature.toFixed(1) : '--';
                document.getElementById('v-hum').innerText = w.Humidity !== null ? w.Humidity.toFixed(1) : '--';
                document.getElementById('v-dew').innerText = w.DewPoint !== null ? w.DewPoint.toFixed(1) : '--';
                document.getElementById('v-wind').innerText = w.WindSpeed !== null ? w.WindSpeed.toFixed(1) : '--';
                
                let liveSpeed = w.WindSpeed !== null ? w.WindSpeed : 0;
                let liveGust = w.WindGust5m !== null ? w.WindGust5m : 0;
                liveGust = Math.max(liveSpeed, liveGust); 
                
                if(document.getElementById('v-gust')) document.getElementById('v-gust').innerText = w.WindGust5m !== null ? liveGust.toFixed(1) : '--';
                
                if(document.getElementById('v-gust-factor')) {
                    if (w.WindSpeed !== null && w.WindGust5m !== null) {
                        let gf = (liveSpeed > 0.5) ? (liveGust / liveSpeed).toFixed(2) : "1.00";
                        let gfEl = document.getElementById('v-gust-factor');
                        gfEl.innerText = gf;
                        gfEl.style.color = (gf >= 2.0) ? '#ef4444' : ((gf >= 1.5) ? '#f59e0b' : '#38bdf8');
                    } else {
                        document.getElementById('v-gust-factor').innerText = '--';
                        document.getElementById('v-gust-factor').style.color = '';
                    }
                }

                if (document.getElementById('v-heater-pwm')) {
                    if (w.Temperature !== null && w.DewPoint !== null) {
                        let spread = w.Temperature - w.DewPoint;
                        let heaterPwm = 0;
                        if (spread <= 1.5) heaterPwm = 100;
                        else if (spread <= 3.0) heaterPwm = 59; 
                        else if (spread <= 5.0) heaterPwm = 24; 
                        else heaterPwm = 0;
                        
                        document.getElementById('v-heater-pwm').innerText = heaterPwm;
                        let heaterEl = document.getElementById('hw-heater-status');
                        if (heaterEl) {
                            if (heaterPwm >= 100) heaterEl.className = "text-danger fw-bold";
                            else if (heaterPwm > 0) heaterEl.className = "text-warning fw-bold";
                            else heaterEl.className = "text-success fw-bold";
                        }
                    } else {
                        document.getElementById('v-heater-pwm').innerText = "--";
                    }
                }
                
                let windDeg = w.WindDirection || 0;
                if(document.getElementById('hw-wdir')) document.getElementById('hw-wdir').innerText = windDeg + '°';
                
                let sectorIndex = Math.floor(((windDeg + 11.25) % 360) / 22.5);
                let oppositeIndex = (sectorIndex + 8) % 16;
                if(document.getElementById('v-wind-dir-text')) {
                    document.getElementById('v-wind-dir-text').innerText = (this.compassSectors[sectorIndex] || '--') + ' - ' + (this.compassSectors[oppositeIndex] || '--');
                }
                if(document.getElementById('v-wind-arrow')) {
                    document.getElementById('v-wind-arrow').style.transform = `rotate(${windDeg}deg)`;
                }

                document.getElementById('v-pressure').innerText = w.Pressure !== null ? w.Pressure.toFixed(1) : '--';
                if(document.getElementById('v-pm25')) document.getElementById('v-pm25').innerText = w.PM25 !== null ? w.PM25 : '--';
                if(document.getElementById('v-pm10')) document.getElementById('v-pm10').innerText = w.PM10 !== null ? w.PM10 : '--';
                if(document.getElementById('v-rain-risk')) document.getElementById('v-rain-risk').innerText = w.RainRisk !== null ? w.RainRisk.toFixed(1) + '/100' : '--/100';
                
                let conf = w.Confidence !== null ? w.Confidence : 0;
                let confEl = document.getElementById('v-confidence');
                if (confEl) {
                    confEl.innerText = conf.toFixed(1) + '%';
                    if (conf > 70) confEl.className = 'text-success mt-1 w-100 fw-bold';
                    else if (conf > 40) confEl.className = 'text-warning mt-1 w-100 fw-bold';
                    else confEl.className = 'text-danger mt-1 w-100 fw-bold';
                }
                
                let pTrend = w.PressureTrend || 0;
                let trendIcon = pTrend <= -1.0 ? '<i class="fas fa-arrow-down text-danger pulse-anim"></i>' : (pTrend >= 1.0 ? '<i class="fas fa-arrow-up text-success"></i>' : '<i class="fas fa-arrow-right text-muted"></i>');
                if(document.getElementById('v-press-trend')) document.getElementById('v-press-trend').innerHTML = trendIcon;

                let isRaining = w.IsRaining || w.RainIntensity > 0;
                let isSafe = w.IsSafe;
                let alertBanner = document.getElementById('nowcast-alert-banner');
                
                if (!isSafe && !isRaining && w.online) {
                    if(alertBanner) alertBanner.classList.remove('d-none');
                } else {
                    if(alertBanner) alertBanner.classList.add('d-none');
                }

                let rainCard = document.getElementById('rainCard');
                let rainStatus = document.getElementById('v-rain-status');
                let rainDesc = document.getElementById('v-rain-desc');
                let rainIcon = document.getElementById('v-rain-icon');
                
                if (isRaining) {
                    if(rainStatus) {
                        rainStatus.innerText = "CÓ MƯA!";
                        rainStatus.className = "mt-2 mb-1 text-danger text-uppercase";
                    }
                    if(rainDesc) rainDesc.innerText = "Nguy hiểm - Đóng mái!";
                    if(rainIcon) rainIcon.innerText = "🌧️";
                    if(rainCard) rainCard.style.borderColor = "#ef4444";
                } else {
                    if(rainStatus) {
                        rainStatus.innerText = "KHÔ RÁO";
                        rainStatus.className = "mt-2 mb-1 text-success text-uppercase";
                    }
                    if(rainDesc) rainDesc.innerText = "An toàn cho kính";
                    if(rainIcon) rainIcon.innerText = "☀️";
                    if(rainCard) rainCard.style.borderColor = "#10b981";
                }

                let cloudEl = document.getElementById('v-cloud');
                let cloudDesc = document.getElementById('v-cloud-desc');
                let cloudCard = document.getElementById('cloud-card');

                if (w.CloudTemp == null) {
                    if(cloudEl) { cloudEl.style.color = "#e2e8f0"; cloudEl.innerText = '--'; }
                    if(cloudDesc) { cloudDesc.innerText = "Chưa kết nối cảm biến Mây"; cloudDesc.style.color = "#e2e8f0"; }
                    if(cloudCard) cloudCard.style.borderColor = "#334155";
                } else {
                    if(cloudEl) cloudEl.innerText = w.CloudTemp.toFixed(1);
                    if (w.IsCloudy) {
                        if(cloudEl) cloudEl.style.color = "#ef4444";
                        if(cloudDesc) { cloudDesc.innerText = "Mây dày che kín"; cloudDesc.style.color = "#ef4444"; }
                        if(cloudCard) cloudCard.style.borderColor = "rgba(239, 68, 68, 0.4)";
                    } else {
                        let deltaT = (w.Temperature || 0) - w.CloudTemp;
                        if (deltaT > 18) {
                            if(cloudEl) cloudEl.style.color = "#34d399";
                            if(cloudDesc) { cloudDesc.innerText = "Quang đãng (Chụp tốt)"; cloudDesc.style.color = "#34d399"; }
                            if(cloudCard) cloudCard.style.borderColor = "rgba(52, 211, 153, 0.4)";
                        } else {
                            if(cloudEl) cloudEl.style.color = "#f59e0b";
                            if(cloudDesc) { cloudDesc.innerText = "Có mây mỏng / Sương"; cloudDesc.style.color = "#f59e0b"; }
                            if(cloudCard) cloudCard.style.borderColor = "rgba(245, 158, 11, 0.4)";
                        }
                    }
                }
            } else {
                if(weatherUpdatedEl) {
                    weatherUpdatedEl.className = 'badge bg-danger fs-6 text-wrap text-start text-white';
                    weatherUpdatedEl.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i> Mất kết nối! Dữ liệu cũ.`;
                }
            }
        }

        if(sysData.roof) {
            const indoorOnline = sysData.roof.online && sysData.roof.IndoorTemperature !== null;
            
            const indoorUpdatedEl = document.getElementById('v-indoor-updated');
            if (indoorOnline) {
                if(indoorUpdatedEl) {
                    indoorUpdatedEl.className = 'badge bg-success fs-6 text-wrap text-start text-white';
                    indoorUpdatedEl.innerHTML = `<i class="fas fa-check-circle me-1"></i> Mới nhất lúc: ${nowStr}`;
                }
            } else {
                if(indoorUpdatedEl) {
                    indoorUpdatedEl.className = 'badge bg-danger fs-6 text-wrap text-start text-white';
                    indoorUpdatedEl.innerHTML = `<i class="fas fa-exclamation-triangle me-1"></i> Mất kết nối! Dữ liệu cũ.`;
                }
            }

            const indoorStatusColor = indoorOnline ? 'var(--safe)' : 'var(--danger)';
            if(document.getElementById('v-indoor-sensor-status')) document.getElementById('v-indoor-sensor-status').innerText = indoorOnline ? 'ĐÃ KẾT NỐI' : 'MẤT KẾT NỐI';
            if(document.getElementById('v-indoor-sensor-status')) document.getElementById('v-indoor-sensor-status').style.color = indoorStatusColor;
            if(document.getElementById('v-indoor-roof-status')) document.getElementById('v-indoor-roof-status').innerText = indoorOnline ? 'ĐÃ KẾT NỐI' : 'MẤT KẾT NỐI';
            if(document.getElementById('v-indoor-network-status')) document.getElementById('v-indoor-network-status').innerText = indoorOnline ? 'ỔN ĐỊNH' : 'MẤT KẾT NỐI';
            if(document.getElementById('v-indoor-sensor-status')) document.getElementById('v-indoor-sensor-status').style.color = indoorStatusColor;
            if(document.getElementById('v-indoor-roof-status')) document.getElementById('v-indoor-roof-status').style.color = indoorStatusColor;
            if(document.getElementById('v-indoor-network-status')) document.getElementById('v-indoor-network-status').style.color = indoorStatusColor;
            
            document.getElementById('net-r').innerText = indoorOnline ? '🟢 OK' : '🔴 MẤT KẾT NỐI';

            if(document.getElementById('net-p')) document.getElementById('net-p').innerText = (sysData.roof.online && sysData.roof.PierConnected) ? '🟢 OK' : '🔴 MẤT KẾT NỐI';
            if(document.getElementById('net-a')) document.getElementById('net-a').innerText = (sysData.roof.online && sysData.roof.AlarmConnected) ? '🟢 OK' : '🔴 MẤT KẾT NỐI';

            if (indoorOnline) {
                if(document.getElementById('v-indoor-temp')) document.getElementById('v-indoor-temp').innerText = sysData.roof.IndoorTemperature !== null ? sysData.roof.IndoorTemperature.toFixed(1) : '--';
                if(document.getElementById('v-indoor-hum')) document.getElementById('v-indoor-hum').innerText = sysData.roof.IndoorHumidity !== null ? sysData.roof.IndoorHumidity.toFixed(1) : '--';
                if(document.getElementById('v-indoor-dew')) document.getElementById('v-indoor-dew').innerText = sysData.roof.IndoorDewPoint !== null ? sysData.roof.IndoorDewPoint.toFixed(1) : '--';
                
                if(document.getElementById('hw-ack')) document.getElementById('hw-ack').innerText = sysData.roof.ack_command || "Không có";
                
                const elMount = document.getElementById('hw-mount');
                if(elMount) {
                    if (sysData.roof.MountParked) {
                        elMount.innerText = "Đã vào vị trí an toàn (Park)";
                        elMount.className = "text-success fw-bold";
                    } else {
                        elMount.innerText = "Chưa an toàn / Đang chụp";
                        elMount.className = "text-danger fw-bold";
                    }
                }

                const elRoof = document.getElementById('hw-roof');
                if(elRoof) {
                    if (sysData.roof.RoofClosed) {
                        elRoof.innerText = "Đã Đóng Kín";
                        elRoof.className = "text-success fw-bold";
                    } else if (sysData.roof.RoofOpen) {
                        elRoof.innerText = "Đã Mở Hết";
                        elRoof.className = "text-info fw-bold";
                    } else {
                        elRoof.innerText = "Đang Di Chuyển / Lơ Lửng";
                        elRoof.className = "text-warning fw-bold";
                    }
                }
            }
        }

        if(!diagData || diagData.FSM_State === undefined) return;

        if (diagData.LearnedOpeningTime !== undefined) {
            if(document.getElementById('hw-open-time')) document.getElementById('hw-open-time').innerText = (diagData.LearnedOpeningTime / 1000).toFixed(1);
            if(document.getElementById('hw-close-time')) document.getElementById('hw-close-time').innerText = (diagData.LearnedClosingTime / 1000).toFixed(1);
        }

        let state = diagData.FSM_State; 
        let prof = diagData.CurrentProfile; 
        
        let runTimeSec = diagData.Current_Action_Runtime_Sec || 0;

        let fsmEl = document.getElementById('hw-fsm');
        const FSM_STATES = ["KHỞI ĐỘNG", "ĐANG THIẾT LẬP", "TỰ KIỂM TRA", "SẴN SÀNG", "TRẠNG THÁI NGHỈ", "ĐANG MỞ", "Đã MỞ", "ĐANG ĐÓNG", "ĐÃ ĐÓNG", "CHỜ KÍNH VỀ VỊ TRÍ", "CHỜ THỜI TIẾT", "KHÓA DO MƯA", "KHÓA DO GIÓ", "KHÓA DO ĐỘ ẨM", "KHÓA DO THỜI TIẾT", "MẤT ĐIỆN", "PHỤC HỒI LỖI", "CHẾ ĐỘ AN TOÀN", "CHẾ ĐỘ THỦ CÔNG", "CHẾ ĐỘ TỪ XA", "BẢO TRÌ", "DỪNG KHẨN CẤP", "ĐÓNG KHẨN CẤP", "TRẠNG THÁI LỖI", "ĐANG PHỤC HỒI", "CHỜ MỞ KHÓA", "CHỜ XÁC NHẬN CÔNG TẮC", "CÓ VẬT CẢN"];
        if(state >= 0 && state < FSM_STATES.length && fsmEl) {
            fsmEl.innerText = FSM_STATES[state];
        }

        let pct = 0;
        let animText = "";

        if (state === 6) { 
            pct = 100; animText = "[ ĐÃ MỞ ]"; 
        } else if (state === 8) { 
            pct = 0; animText = "[ ĐÃ ĐÓNG ]";
        } else if (prof === 2) { 
            pct = 50; animText = "<<<<<< ĐANG DÒ TÌM (KHÔNG RÕ VỊ TRÍ) >>>>>>";
        } else if (state === 5) { 
            let total = diagData.LearnedOpeningTime / 1000 || 31.5;
            pct = (runTimeSec / total) * 100;
            if(pct > 99) pct = 99;
            animText = "████████░░ (ĐANG MỞ...)";
        } else if (state === 7) { 
            let total = diagData.LearnedClosingTime / 1000 || 31.5;
            pct = 100 - ((runTimeSec / total) * 100);
            if(pct < 1) pct = 1;
            animText = "░░████████ (ĐANG ĐÓNG...)";
        } else if (state === 26) {
            animText = "|||||||||| (CHỜ XÁC NHẬN)";
            pct = (diagData.MotorDirection === 1) ? 100 : 0;
        }

        if(document.getElementById('estPct')) document.getElementById('estPct').innerText = Math.round(pct) + "%";
        if(document.getElementById('estBar')) document.getElementById('estBar').style.width = pct + "%";
        if(document.getElementById('estText')) document.getElementById('estText').innerText = animText;

        ['tl-start', 'tl-fast', 'tl-slow', 'tl-stop'].forEach(id => {
            let el = document.getElementById(id);
            if(el) el.classList.remove('active');
        });

        let pwm = diagData.CurrentPWM;
        if(state === 5 || state === 7) {
            if(pwm > 0 && pwm < 255 && document.getElementById('tl-start')) document.getElementById('tl-start').classList.add('active');
            if(pwm === 255 && document.getElementById('tl-fast')) document.getElementById('tl-fast').classList.add('active');
            if((pwm === 220 || pwm === 180 || pwm === 120) && document.getElementById('tl-slow')) document.getElementById('tl-slow').classList.add('active');
        }
        if((state === 26 || state === 24) && document.getElementById('tl-stop')) document.getElementById('tl-stop').classList.add('active');

        if(document.getElementById('main-current-val')) document.getElementById('main-current-val').innerText = Math.round(diagData.Filtered_Current || 0);
        if(document.getElementById('main-peak-val')) document.getElementById('main-peak-val').innerText = Math.round(diagData.Peak_Current || 0);

        let motorStatus = document.getElementById('main-motor-status');
        if(motorStatus) {
            if (diagData.Last_Error == 102) {
                motorStatus.innerText = "QUÁ TẢI DÒNG ĐIỆN";
                motorStatus.className = "badge bg-danger text-white";
            } else if (diagData.Last_Error == 105) {
                motorStatus.innerText = "KẸT CƠ KHÍ";
                motorStatus.className = "badge bg-warning text-dark";
            } else {
                motorStatus.innerText = "BÌNH THƯỜNG";
                motorStatus.className = "badge bg-success text-white";
            }
        }

        let now = new Date().toLocaleTimeString('vi-VN');
        this.rtChartDataObj.labels.push(now);
        this.rtChartDataObj.datasets[0].data.push(diagData.Filtered_Current);
        
        if (this.rtChartDataObj.labels.length > 50) { 
            this.rtChartDataObj.labels.shift();
            this.rtChartDataObj.datasets[0].data.shift();
        }
        if(this.rtCurrentChartInstance) this.rtCurrentChartInstance.update();
    }
};