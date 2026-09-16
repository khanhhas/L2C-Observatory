import { API } from '../api.js';

export const ConsoleView = {
    template: () => `
        <div class="row g-4">
            <!-- Cột Các Nút Gọi API -->
            <div class="col-md-5">
                
                <!-- CARD 1: CÁC API SERVER & GIÁM SÁT -->
                <div class="glass-panel p-4 mb-4">
                    <h5 class="text-accent mb-4"><i class="fas fa-server"></i> Máy chủ & Điểm cuối Tích hợp (Server & Integration)</h5>
                    
                    <h6 class="text-light small fw-bold mt-3">Hiệu chuẩn Áp suất (Dự báo ngắn hạn)</h6>
                    <div class="d-grid gap-2 mb-3">
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('get_calib')">
                            <i class="fas fa-search"></i> /api.php?action=get_calib
                        </button>
                        <button class="btn btn-sm btn-outline-warning text-start" onclick="if(confirm('Xác nhận đặt lại (reset) thông số hiệu chuẩn Áp suất? Hệ thống sẽ tự học lại vào lần quang mây tiếp theo.')) ConsoleView.testAPI('reset_calib')">
                            <i class="fas fa-eraser"></i> /api.php?action=reset_calib
                        </button>
                    </div>

                    <h6 class="text-light small fw-bold mt-4">Giám sát Cơ sở dữ liệu & Tác vụ nền (Cronjob)</h6>
                    <div class="d-grid gap-2 mb-3">
                        <button class="btn btn-sm btn-outline-success text-start" onclick="ConsoleView.testAPI('cron_status')">
                            <i class="fas fa-heartbeat"></i> /api.php?action=cron_status
                        </button>
                        <button class="btn btn-sm btn-outline-success text-start" onclick="ConsoleView.testAPI('db_size')">
                            <i class="fas fa-database"></i> /api.php?action=db_size
                        </button>
                    </div>
                </div>

                <!-- CARD 2: CÁC API KHÍ TƯỢNG (WEATHER NODE) -->
                <div class="glass-panel p-4 mb-4">
                    <h5 class="text-accent mb-4"><i class="fas fa-satellite-dish"></i> Điểm cuối Trạm Khí tượng (Weather Node)</h5>
                    
                    <h6 class="text-light small fw-bold mt-3">Chỉ đọc (GET)</h6>
                    <div class="d-grid gap-2 mb-3">
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('weather_health')">
                            <i class="fas fa-heartbeat"></i> /api.php?action=weather_health
                        </button>
                    </div>

                    <h6 class="text-light small fw-bold mt-4">Thực thi (YÊU CẦU XÁC THỰC)</h6>
                    <div class="d-grid gap-2">
                        <button class="btn btn-sm btn-outline-danger text-start" onclick="if(confirm('Xác nhận: Khởi động lại vi điều khiển trạm Khí tượng?')) ConsoleView.testAPI('weather_reboot')">
                            <i class="fas fa-power-off"></i> /api.php?action=weather_reboot
                        </button>
                    </div>
                </div>

                <!-- CARD 3: CÁC API TRỤ KÍNH (PIER NODE) -->
                <div class="glass-panel p-4 mb-4">
                    <h5 class="text-accent mb-4"><i class="fas fa-crosshairs"></i> Điểm cuối Trụ Kính (Pier Node)</h5>
                    
                    <h6 class="text-light small fw-bold mt-3">Chỉ đọc (GET)</h6>
                    <div class="d-grid gap-2 mb-3">
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('pier_health')">
                            <i class="fas fa-heartbeat"></i> /api.php?action=pier_health
                        </button>
                    </div>

                    <!-- Khu vực nhập và đổi kênh WiFi cho Mạch Trụ -->
                    <h6 class="text-light small fw-bold mt-4">Đồng bộ Kênh Wi-Fi ESP-NOW (Trụ Kính)</h6>
                    <div class="input-group input-group-sm mb-3">
                        <span class="input-group-text bg-dark text-light border-secondary" style="border-right: none;"><i class="fas fa-wifi text-warning"></i></span>
                        <input type="number" id="pierWifiChannelInput" class="form-control bg-dark text-light border-secondary" placeholder="Nhập Kênh (1 - 14)" min="1" max="14">
                        <button class="btn btn-outline-warning" type="button" onclick="ConsoleView.changePierChannel()">Thay Đổi</button>
                    </div>

                    <h6 class="text-light small fw-bold mt-4">Thực thi (YÊU CẦU XÁC THỰC)</h6>
                    <div class="d-grid gap-2">
                        <button class="btn btn-sm btn-outline-danger text-start" onclick="if(confirm('Xác nhận: Khởi động lại vi điều khiển Trụ kính?')) ConsoleView.testAPI('pier_reboot')">
                            <i class="fas fa-power-off"></i> /api.php?action=pier_reboot
                        </button>
                    </div>
                </div>

                <!-- CARD 4: CÁC API BÁO ĐỘNG (ALARM NODE) -->
                <div class="glass-panel p-4 mb-4">
                    <h5 class="text-accent mb-4"><i class="fas fa-bullhorn"></i> Điểm cuối Báo Động (Alarm Node)</h5>
                    
                    <h6 class="text-light small fw-bold mt-3">Chỉ đọc (GET)</h6>
                    <div class="d-grid gap-2 mb-3">
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('alarm_health')">
                            <i class="fas fa-heartbeat"></i> /api.php?action=alarm_health
                        </button>
                    </div>

                    <!-- [ĐÃ BỔ SUNG]: Khu vực nhập và đổi kênh WiFi cho Mạch Báo Động -->
                    <h6 class="text-light small fw-bold mt-4">Đồng bộ Kênh Wi-Fi ESP-NOW (Báo Động)</h6>
                    <div class="input-group input-group-sm mb-3">
                        <span class="input-group-text bg-dark text-light border-secondary" style="border-right: none;"><i class="fas fa-wifi text-warning"></i></span>
                        <input type="number" id="alarmWifiChannelInput" class="form-control bg-dark text-light border-secondary" placeholder="Nhập Kênh (1 - 14)" min="1" max="14">
                        <button class="btn btn-outline-warning" type="button" onclick="ConsoleView.changeAlarmChannel()">Thay Đổi</button>
                    </div>

                    <h6 class="text-light small fw-bold mt-4">Thực thi (YÊU CẦU XÁC THỰC)</h6>
                    <div class="d-grid gap-2">
                        <button class="btn btn-sm btn-outline-danger text-start" onclick="if(confirm('Xác nhận: Khởi động lại vi điều khiển Báo động?')) ConsoleView.testAPI('alarm_reboot')">
                            <i class="fas fa-power-off"></i> /api.php?action=alarm_reboot
                        </button>
                    </div>
                </div>

                <!-- CARD 5: CÁC API ĐIỀU KHIỂN CỨNG MÁI CHE -->
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-accent mb-4"><i class="fas fa-terminal"></i> Điểm cuối Bộ điều khiển Mái che (Roof)</h5>
                    
                    <h6 class="text-light small fw-bold mt-3">Chỉ đọc (GET)</h6>
                    <div class="d-grid gap-2 mb-3">
                        <button class="btn btn-sm btn-outline-success text-start fw-bold" onclick="ConsoleView.testAPI('sensordata')">
                            <i class="fas fa-cloud-sun-rain"></i> /api/v1/observingconditions/...
                        </button>
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('status')">
                            <i class="fas fa-arrow-right"></i> /api/v1/roof/status
                        </button>
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('diagnostics')">
                            <i class="fas fa-arrow-right"></i> /api/v1/roof/diagnostics
                        </button>
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('health')">
                            <i class="fas fa-arrow-right"></i> /api/v1/roof/health
                        </button>
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('events')">
                            <i class="fas fa-arrow-right"></i> /api/v1/roof/events
                        </button>
                    </div>

                    <h6 class="text-light small fw-bold mt-4">Đồng bộ Kênh Wi-Fi ESP-NOW</h6>
                    <!-- Khu vực nhập và đổi kênh WiFi -->
                    <div class="input-group input-group-sm mb-3">
                        <span class="input-group-text bg-dark text-light border-secondary" style="border-right: none;"><i class="fas fa-wifi text-warning"></i></span>
                        <input type="number" id="wifiChannelInput" class="form-control bg-dark text-light border-secondary" placeholder="Nhập Kênh (1 - 14)" min="1" max="14">
                        <button class="btn btn-outline-warning" type="button" onclick="ConsoleView.changeChannel()">Thay Đổi</button>
                    </div>

                    <h6 class="text-light small fw-bold mt-4">Thực thi (YÊU CẦU XÁC THỰC)</h6>
                    <div class="d-grid gap-2 mb-3">
                        <button class="btn btn-sm btn-outline-primary text-start" onclick="ConsoleView.testAPI('open')">
                            <i class="fas fa-play"></i> /api/v1/roof/open
                        </button>
                        <button class="btn btn-sm btn-outline-primary text-start" onclick="ConsoleView.testAPI('close')">
                            <i class="fas fa-play"></i> /api/v1/roof/close
                        </button>
                        <button class="btn btn-sm btn-outline-warning text-start" onclick="ConsoleView.testAPI('stop')">
                            <i class="fas fa-stop"></i> /api/v1/roof/stop
                        </button>
                        <button class="btn btn-sm btn-outline-success text-start" onclick="ConsoleView.testAPI('reset_error')">
                            <i class="fas fa-sync"></i> /api/v1/roof/reset_error
                        </button>
                        
                        <button class="btn btn-sm btn-outline-success text-start" onclick="ConsoleView.testAPI('reset_learning')">
                            <i class="fas fa-brain"></i> /api/v1/roof/reset_learning
                        </button>
                        <button class="btn btn-sm btn-outline-success text-start" onclick="ConsoleView.testAPI('clear_logs')">
                            <i class="fas fa-trash"></i> /api/v1/roof/clear_logs
                        </button>
                        <button class="btn btn-sm btn-outline-success text-start" onclick="ConsoleView.testAPI('calibrate_current')">
                            <i class="fas fa-balance-scale"></i> /api/v1/roof/calibrate_current
                        </button>
                        <button class="btn btn-sm btn-outline-info text-start" onclick="ConsoleView.testAPI('test_hardware&target=alarm')">
                            <i class="fas fa-bullhorn"></i> /api/v1/roof/test_hardware?target=alarm
                        </button>
                        <button class="btn btn-sm btn-outline-warning text-start" onclick="ConsoleView.testAPI('set_parameters')">
                            <i class="fas fa-sliders-h"></i> /api/v1/roof/set_parameters
                        </button>
                        <button class="btn btn-sm btn-outline-danger text-start" onclick="if(confirm('Khởi động lại ESP32 mạch Mái che?')) ConsoleView.testAPI('reboot')">
                            <i class="fas fa-power-off"></i> /api/v1/roof/reboot
                        </button>
                    </div>

                    <h6 class="text-danger small fw-bold mt-4">Điều khiển Chép đè Thủ công (NGUY HIỂM - Manual Override)</h6>
                    <div class="d-grid gap-2">
                        <button class="btn btn-sm btn-outline-danger text-start" onclick="ConsoleView.testManual('open')">
                            <i class="fas fa-exclamation-triangle"></i> /manual/open
                        </button>
                        <button class="btn btn-sm btn-outline-danger text-start" onclick="ConsoleView.testManual('close')">
                            <i class="fas fa-exclamation-triangle"></i> /manual/close
                        </button>
                        <button class="btn btn-sm btn-outline-danger text-start" onclick="ConsoleView.testManual('stop')">
                            <i class="fas fa-exclamation-triangle"></i> /manual/stop
                        </button>
                    </div>
                </div>
            </div>

            <!-- Cột Hiển thị Console Output -->
            <div class="col-md-7">
                <div class="glass-panel p-4 h-100 d-flex flex-column" style="min-height: 80vh;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="text-accent m-0"><i class="fas fa-code"></i> Yêu cầu & Phản hồi (Request & Response)</h5>
                        <span id="apiLatency" class="badge bg-secondary">Độ trễ: -- ms</span>
                    </div>
                    
                    <div class="mb-2">
                        <span class="text-light small fw-bold">URL: </span>
                        <code id="reqUrl" class="text-info fs-6">Chưa có Yêu cầu (Request)...</code>
                    </div>

                    <pre id="consoleOutput" class="flex-grow-1 p-3 m-0" style="background: rgba(0,0,0,0.5); border: 1px solid #334155; border-radius: 8px; color: #a78bfa; overflow-y: auto; max-height: 75vh;">
// Nhấn vào một điểm cuối (endpoint) bên trái để thực thi lệnh.
// Dữ liệu JSON / Text sẽ được hiển thị tại đây.
                    </pre>
                </div>
            </div>
        </div>
    `,

    init: function() {
        window.ConsoleView = this;
    },

    update: function() {
        // Console view không tự động cập nhật gì để tránh trôi log của user đang test
    },

    testAPI: async function(action) {
        this.executeRequest(`api.php?action=${action}`);
    },

    changeChannel: async function() {
        const ch = document.getElementById('wifiChannelInput').value;
        if (!ch || ch < 1 || ch > 14) {
            alert("Vui lòng nhập số kênh hợp lệ (từ 1 đến 14)!");
            return;
        }
        if (confirm(`Xác nhận ép Mạch Mái Che khóa cứng vào Kênh Wi-Fi ${ch}? Mạch sẽ khởi động lại ngay lập tức!`)) {
            this.executeRequest(`api.php?action=set_channel&ch=${ch}`);
        }
    },

    // Hàm xử lý gọi API Đổi Kênh cho Mạch Trụ Kính
    changePierChannel: async function() {
        const ch = document.getElementById('pierWifiChannelInput').value;
        if (!ch || ch < 1 || ch > 14) {
            alert("Vui lòng nhập số kênh hợp lệ (từ 1 đến 14) cho Trụ Kính!");
            return;
        }
        if (confirm(`Xác nhận ép Mạch Trụ Kính khóa cứng vào Kênh Wi-Fi ${ch}? Mạch sẽ khởi động lại ngay lập tức!`)) {
            this.executeRequest(`api.php?action=pier_set_channel&ch=${ch}`);
        }
    },

    // [ĐÃ BỔ SUNG]: Hàm xử lý gọi API Đổi Kênh cho Mạch Báo Động
    changeAlarmChannel: async function() {
        const ch = document.getElementById('alarmWifiChannelInput').value;
        if (!ch || ch < 1 || ch > 14) {
            alert("Vui lòng nhập số kênh hợp lệ (từ 1 đến 14) cho Báo Động!");
            return;
        }
        if (confirm(`Xác nhận ép Mạch Báo Động khóa cứng vào Kênh Wi-Fi ${ch}? Mạch sẽ khởi động lại ngay lập tức!`)) {
            this.executeRequest(`api.php?action=alarm_set_channel&ch=${ch}`);
        }
    },

    testManual: async function(action) {
        if(!confirm("CẢNH BÁO: Lệnh Chép đè Thủ công (Manual Override) sẽ bóc bỏ toàn bộ khối an toàn FSM. Tiếp tục?")) return;
        this.executeRequest(`api.php?action=manual_${action}`); 
    },

    executeRequest: async function(url) {
        document.getElementById('reqUrl').innerText = "GET /" + url;
        document.getElementById('consoleOutput').innerText = "Đang tải (Fetching)...\nĐang chờ máy chủ phản hồi...";
        document.getElementById('apiLatency').innerText = "Độ trễ: -- ms";
        document.getElementById('apiLatency').className = "badge bg-secondary";

        const start = performance.now();
        
        try {
            const data = await API.get(url);
            const latency = Math.round(performance.now() - start);
            
            document.getElementById('apiLatency').innerText = `Độ trễ: ${latency} ms`;
            if (latency < 200) document.getElementById('apiLatency').className = "badge bg-success";
            else if (latency < 1000) document.getElementById('apiLatency').className = "badge bg-warning text-dark";
            else document.getElementById('apiLatency').className = "badge bg-danger";

            document.getElementById('consoleOutput').innerText = JSON.stringify(data, null, 4);

        } catch(e) {
            const latency = Math.round(performance.now() - start);
            document.getElementById('apiLatency').innerText = `Độ trễ: ${latency} ms`;
            document.getElementById('apiLatency').className = "badge bg-danger";
            document.getElementById('consoleOutput').innerText = "LỖI HTTP / XÁC THỰC THẤT BẠI (HTTP ERROR / AUTH FAILED):\n\n" + e.message;
        }
    }
};