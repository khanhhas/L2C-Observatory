import { API } from '../api.js';

export const CommunicationView = {
    template: () => `
        <div id="communicationView" class="row g-4">
            <!-- BẢNG MA TRẬN HẠ TẦNG (INFRASTRUCTURE MATRIX) -->
            <div class="col-12">
                <div class="glass-panel p-4 h-100">
                    <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                        <h5 class="text-accent m-0"><i class="fas fa-network-wired"></i> Giám sát Hạ tầng Thiết bị (Infrastructure Matrix)</h5>
                        <span id="apiLatency" class="badge bg-secondary fs-6">Độ trễ API: -- ms</span>
                    </div>
                    
                    <div class="row g-3" id="node-container">
                        <!-- Card Mái Che -->
                        <div class="col-md-6 col-xl-3">
                            <div class="p-3 bg-black bg-opacity-25 border border-secondary rounded h-100 node-card" id="node-roof">
                                <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2 mb-2 node-header">
                                    <strong class="text-light fs-6">🏠 Mái Che (.220)</strong>
                                    <span class="badge offline bg-secondary">Offline</span>
                                </div>
                                <div class="node-body small text-light" style="line-height: 2;">
                                    <div class="d-flex justify-content-between"><span>Hoạt động:</span> <strong id="roof-uptime">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Nguyên nhân Reset:</span> <strong id="roof-reset">--</strong></div>
                                    <div class="d-flex justify-content-between border-top border-secondary mt-1 pt-1"><span>RAM Trống:</span> <strong id="roof-ram">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Nhiệt độ Lõi:</span> <strong id="roof-temp">--</strong></div>
                                    <div class="d-flex justify-content-between border-top border-secondary mt-1 pt-1"><span>Cường độ WiFi:</span> <strong id="roof-rssi">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Rớt ESP-NOW:</span> <strong id="roof-drop">--</strong></div>
                                </div>
                            </div>
                        </div>

                        <!-- Card Khí Tượng -->
                        <div class="col-md-6 col-xl-3">
                            <div class="p-3 bg-black bg-opacity-25 border border-secondary rounded h-100 node-card" id="node-weather">
                                <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2 mb-2 node-header">
                                    <strong class="text-light fs-6">⛈️ Khí Tượng (.221)</strong>
                                    <span class="badge offline bg-secondary">Offline</span>
                                </div>
                                <div class="node-body small text-light" style="line-height: 2;">
                                    <div class="d-flex justify-content-between"><span>Hoạt động:</span> <strong id="weather-uptime">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Nguyên nhân Reset:</span> <strong id="weather-reset">--</strong></div>
                                    <div class="d-flex justify-content-between border-top border-secondary mt-1 pt-1"><span>RAM Trống:</span> <strong id="weather-ram">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Nhiệt độ Lõi:</span> <strong id="weather-temp">--</strong></div>
                                    <div class="d-flex justify-content-between border-top border-secondary mt-1 pt-1"><span>Cường độ WiFi:</span> <strong id="weather-rssi">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Rớt ESP-NOW:</span> <strong id="weather-drop">--</strong></div>
                                </div>
                            </div>
                        </div>

                        <!-- Card Trụ Kính -->
                        <div class="col-md-6 col-xl-3">
                            <div class="p-3 bg-black bg-opacity-25 border border-secondary rounded h-100 node-card" id="node-pier">
                                <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2 mb-2 node-header">
                                    <strong class="text-light fs-6">🔭 Trụ Kính (.222)</strong>
                                    <span class="badge offline bg-secondary">Offline</span>
                                </div>
                                <div class="node-body small text-light" style="line-height: 2;">
                                    <div class="d-flex justify-content-between"><span>Hoạt động:</span> <strong id="pier-uptime">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Nguyên nhân Reset:</span> <strong id="pier-reset">--</strong></div>
                                    <div class="d-flex justify-content-between border-top border-secondary mt-1 pt-1"><span>RAM Trống:</span> <strong id="pier-ram">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Nhiệt độ Lõi:</span> <strong id="pier-temp">--</strong></div>
                                    <div class="d-flex justify-content-between border-top border-secondary mt-1 pt-1"><span>Cường độ WiFi:</span> <strong id="pier-rssi">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Rớt ESP-NOW:</span> <strong id="pier-drop">--</strong></div>
                                </div>
                            </div>
                        </div>

                        <!-- Card Báo Động -->
                        <div class="col-md-6 col-xl-3">
                            <div class="p-3 bg-black bg-opacity-25 border border-secondary rounded h-100 node-card" id="node-alarm">
                                <div class="d-flex justify-content-between align-items-center border-bottom border-secondary pb-2 mb-2 node-header">
                                    <strong class="text-light fs-6">🚨 Báo Động (.223)</strong>
                                    <span class="badge offline bg-secondary">Offline</span>
                                </div>
                                <div class="node-body small text-light" style="line-height: 2;">
                                    <div class="d-flex justify-content-between"><span>Hoạt động:</span> <strong id="alarm-uptime">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Nguyên nhân Reset:</span> <strong id="alarm-reset">--</strong></div>
                                    <div class="d-flex justify-content-between border-top border-secondary mt-1 pt-1"><span>RAM Trống:</span> <strong id="alarm-ram">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Nhiệt độ Lõi:</span> <strong id="alarm-temp">--</strong></div>
                                    <div class="d-flex justify-content-between border-top border-secondary mt-1 pt-1"><span>Cường độ WiFi:</span> <strong id="alarm-rssi">--</strong></div>
                                    <div class="d-flex justify-content-between"><span>Rớt ESP-NOW:</span> <strong id="alarm-drop">--</strong></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    init: function() {
        this.update();
        if (this.timer) clearInterval(this.timer);
        // Tự động làm mới dữ liệu mỗi 2 giây
        this.timer = setInterval(() => this.update(), 2000);
    },

    destroy: function() {
        if (this.timer) clearInterval(this.timer);
    },

    formatUptime: function(seconds) {
        if (seconds === undefined || seconds === null) return "--";
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (d > 0) return `${d} ngày ${h} giờ`;
        if (h > 0) return `${h} giờ ${m} phút`;
        if (m > 0) return `${m} phút`;
        return `${Math.floor(seconds)} giây`;
    },

    getRssiColorClass: function(rssi) {
        if (rssi === undefined || rssi === null) return '';
        if (rssi < -85) return 'text-danger fw-bold';
        if (rssi < -70) return 'text-warning fw-bold text-dark bg-warning px-1 rounded';
        return 'text-success fw-bold';
    },

    getTempColorClass: function(temp) {
        if (temp === undefined || temp === null) return '';
        if (temp > 75) return 'text-danger fw-bold pulse-anim bg-danger bg-opacity-25 px-1 rounded';
        if (temp > 65) return 'text-warning fw-bold text-dark bg-warning px-1 rounded';
        return 'text-success fw-bold';
    },

    getRamColorClass: function(ramKB) {
        if (ramKB === undefined || ramKB === null) return '';
        if (ramKB < 50) return 'text-danger fw-bold pulse-anim bg-danger bg-opacity-25 px-1 rounded'; // Nguy cơ tràn RAM
        return 'text-info fw-bold';
    },

    renderNodeData: function(nodeId, isOnline, data) {
        const cardHeader = document.querySelector(`#node-${nodeId} .node-header .badge`);
        if (isOnline && data) {
            cardHeader.className = "badge bg-success text-white online";
            cardHeader.textContent = "Online";

            document.getElementById(`${nodeId}-uptime`).textContent = this.formatUptime(data.uptime);
            document.getElementById(`${nodeId}-reset`).textContent = data.reset_reason || '--';
            
            const ramEl = document.getElementById(`${nodeId}-ram`);
            ramEl.textContent = data.ram !== undefined ? `${data.ram.toFixed(1)} KB` : '--';
            ramEl.className = this.getRamColorClass(data.ram);
            
            const tempEl = document.getElementById(`${nodeId}-temp`);
            tempEl.textContent = data.temp !== undefined ? `${data.temp.toFixed(1)} °C` : '--';
            tempEl.className = this.getTempColorClass(data.temp);

            const rssiEl = document.getElementById(`${nodeId}-rssi`);
            rssiEl.textContent = data.rssi !== undefined ? `${data.rssi} dBm (CH${data.channel || '-'})` : '--';
            rssiEl.className = this.getRssiColorClass(data.rssi);

            const dropEl = document.getElementById(`${nodeId}-drop`);
            dropEl.textContent = data.drop_count !== undefined ? data.drop_count : '--';
            if (data.drop_count > 100) dropEl.className = 'text-danger fw-bold';
            else if (data.drop_count > 10) dropEl.className = 'text-warning fw-bold text-dark bg-warning px-1 rounded';
            else dropEl.className = 'text-light fw-bold';
        } else {
            cardHeader.className = "badge bg-danger text-white offline";
            cardHeader.textContent = "Offline";

            document.getElementById(`${nodeId}-uptime`).textContent = '--';
            document.getElementById(`${nodeId}-reset`).textContent = '--';
            document.getElementById(`${nodeId}-ram`).textContent = '--';
            document.getElementById(`${nodeId}-ram`).className = '';
            document.getElementById(`${nodeId}-temp`).textContent = '--';
            document.getElementById(`${nodeId}-temp`).className = '';
            document.getElementById(`${nodeId}-rssi`).textContent = '--';
            document.getElementById(`${nodeId}-rssi`).className = '';
            document.getElementById(`${nodeId}-drop`).textContent = '--';
            document.getElementById(`${nodeId}-drop`).className = '';
        }
    },

    update: async function() {
        // Tránh lỗi khi tab bị ẩn
        if (!document.getElementById('communicationView')) return;
        
        const start = performance.now();
        try {
            // Gọi song song 4 API độc lập để lấy dữ liệu sức khỏe của cả 4 mạch ESP32
            const [roofRes, weatherRes, pierRes, alarmRes] = await Promise.allSettled([
                API.get('api.php?action=diagnostics'),
                API.get('api.php?action=weather_health'),
                API.get('api.php?action=pier_health'),
                API.get('api.php?action=alarm_health')
            ]);

            const latency = Math.round(performance.now() - start);
            document.getElementById('apiLatency').innerText = `Độ trễ API: ${latency} ms`;
            if (latency < 200) document.getElementById('apiLatency').className = "badge bg-success fs-6";
            else if (latency < 1000) document.getElementById('apiLatency').className = "badge bg-warning text-dark fs-6";
            else document.getElementById('apiLatency').className = "badge bg-danger fs-6";

            // Cập nhật giao diện Mạch Mái Che (Diagnostics JSON)
            if (roofRes.status === 'fulfilled' && roofRes.value) {
                const d = roofRes.value;
                this.renderNodeData('roof', true, {
                    uptime: d.Uptime_Sec,
                    reset_reason: d.Reset_Reason,
                    ram: d.Free_Heap_KB,
                    temp: d.Core_Temp_C,
                    rssi: d.WiFi_RSSI,
                    channel: d.WiFi_Channel,
                    drop_count: d.ESP_NOW_Drop_Count
                });
            } else {
                this.renderNodeData('roof', false);
            }

            // Cập nhật giao diện Mạch Khí Tượng
            if (weatherRes.status === 'fulfilled' && weatherRes.value && weatherRes.value.status === 'success') {
                const d = weatherRes.value;
                this.renderNodeData('weather', true, {
                    uptime: d.uptime_sec,
                    reset_reason: d.reset_reason,
                    ram: d.free_heap_kb,
                    temp: d.core_temp_c,
                    rssi: d.wifi_rssi,
                    channel: d.wifi_channel,
                    drop_count: d.esp_now_drop_rate
                });
            } else {
                this.renderNodeData('weather', false);
            }

            // Cập nhật giao diện Mạch Trụ Kính
            if (pierRes.status === 'fulfilled' && pierRes.value && pierRes.value.status === 'success') {
                const d = pierRes.value;
                this.renderNodeData('pier', true, {
                    uptime: d.uptime_sec,
                    reset_reason: d.reset_reason,
                    ram: d.free_heap_kb,
                    temp: d.core_temp_c,
                    rssi: d.wifi_rssi,
                    channel: d.wifi_channel,
                    drop_count: d.esp_now_drop_rate
                });
            } else {
                this.renderNodeData('pier', false);
            }

            // Cập nhật giao diện Mạch Báo Động
            if (alarmRes.status === 'fulfilled' && alarmRes.value && alarmRes.value.status === 'success') {
                const d = alarmRes.value;
                this.renderNodeData('alarm', true, {
                    uptime: d.uptime_sec,
                    reset_reason: d.reset_reason,
                    ram: d.free_heap_kb,
                    temp: d.core_temp_c,
                    rssi: d.wifi_rssi,
                    channel: d.wifi_channel,
                    drop_count: d.esp_now_drop_rate
                });
            } else {
                this.renderNodeData('alarm', false);
            }

        } catch (e) {
            console.error("Lỗi cập nhật Ma trận Hạ tầng:", e);
        }
    }
};