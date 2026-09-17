export const DiagnosticsView = {
    FSM_STATES: [
        "KHỞI ĐỘNG", "ĐANG THIẾT LẬP", "TỰ KIỂM TRA", "SẴN SÀNG", "TRẠNG THÁI NGHỈ", 
        "ĐANG MỞ", "ĐÃ MỞ", "ĐANG ĐÓNG", "ĐÃ ĐÓNG", "CHỜ KÍNH VỀ VỊ TRÍ", 
        "CHỜ THỜI TIẾT", "KHÓA DO MƯA", "KHÓA DO GIÓ", "KHÓA DO ĐỘ ẨM", "KHÓA DO THỜI TIẾT", 
        "MẤT ĐIỆN", "PHỤC HỒI LỖI", "CHẾ ĐỘ AN TOÀN", "CHẾ ĐỘ THỦ CÔNG", "CHẾ ĐỘ TỪ XA", 
        "BẢO TRÌ", "DỪNG KHẨN CẤP", "ĐÓNG KHẨN CẤP", "TRẠNG THÁI LỖI", "ĐANG PHỤC HỒI",
        "CHỜ MỞ KHÓA", "CHỜ XÁC NHẬN CÔNG TẮC", "CÓ VẬT CẢN"
    ],

    template: () => `
        <div class="row g-4 mb-4">
            <!-- FSM Visualizer -->
            <div class="col-12">
                <div class="glass-panel p-4">
                    <h5 class="text-accent mb-4"><i class="fas fa-project-diagram"></i> Máy trạng thái Hệ thống (FSM Visualizer)</h5>
                    <div class="d-flex flex-wrap gap-2 justify-content-center" id="fsmFullFlow">
                        <!-- JS sẽ render các block FSM vào đây -->
                    </div>
                    <div class="text-center mt-4 border-top border-secondary pt-3">
                        <span class="text-light text-uppercase fw-bold">Trạng thái hiện tại (Current State): </span>
                        <strong id="fsmCurrentCode" class="text-info fs-5">--</strong>
                    </div>
                </div>
            </div>

            <!-- Safety Dashboard -->
            <div class="col-md-6">
                <div class="glass-panel p-4 h-100 border-start border-4 border-warning">
                    <h5 class="text-warning mb-4"><i class="fas fa-shield-alt"></i> Bảng theo dõi An toàn Ưu tiên</h5>
                    <div class="p-3 bg-black bg-opacity-25 border border-secondary rounded text-center mb-4">
                        <h6 class="text-light text-uppercase mb-2 fw-bold">Mức độ khóa an toàn cao nhất</h6>
                        <h3 id="diagSafetyLevel" class="mb-0 text-success">L0_NONE (AN TOÀN)</h3>
                    </div>
                    <ul class="list-unstyled text-light small fw-bold" style="line-height: 2.5;">
                        <li class="d-flex justify-content-between border-bottom border-secondary">
                            <span><i id="iRain" class="fas fa-check-circle text-success me-2"></i> Cảm biến Mưa & Mây:</span> 
                            <strong id="sfRain" class="text-white">An toàn</strong>
                        </li>
                        <li class="d-flex justify-content-between border-bottom border-secondary">
                            <span><i id="iWind" class="fas fa-check-circle text-success me-2"></i> Cảm biến Gió:</span> 
                            <strong id="sfWind" class="text-white">An toàn</strong>
                        </li>
                        <li class="d-flex justify-content-between border-bottom border-secondary">
                            <span><i id="iWea" class="fas fa-check-circle text-success me-2"></i> Trạm Khí tượng:</span> 
                            <strong id="sfWea" class="text-white">Kết nối tốt</strong>
                        </li>
                        <li class="d-flex justify-content-between">
                            <span><i id="iMount" class="fas fa-check-circle text-success me-2"></i> Vị trí Kính (Mount):</span> 
                            <strong id="sfMount" class="text-white">Đã vào vị trí an toàn (Park)</strong>
                        </li>
                    </ul>
                </div>
            </div>

            <!-- Sensor Matrix -->
            <div class="col-md-6">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-accent mb-4"><i class="fas fa-satellite-dish"></i> Ma trận Cảm biến (Modbus RTU)</h5>
                    <div class="table-responsive">
                        <table class="table table-dark table-hover table-glass mb-0" style="font-size: 0.85em;">
                            <thead>
                                <tr>
                                    <th>Kênh đo</th>
                                    <th class="text-center">Lỗi tín hiệu (CRC/Timeout)</th>
                                    <th class="text-end">Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody id="sensorMatrixBody">
                                <tr><td colspan="3" class="text-center text-light">Đang đợi dữ liệu từ trạm khí tượng...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- Raw JSON -->
            <div class="col-12">
                <div class="glass-panel p-4">
                    <h5 class="text-light mb-3 fw-bold"><i class="fas fa-code"></i> Dữ liệu Chẩn đoán Gốc (Cây JSON)</h5>
                    <button class="btn btn-sm btn-outline-info mb-3" onclick="DiagnosticsView.downloadJSON()">Xuất dữ liệu JSON</button>
                    <pre id="jsonViewer" class="p-3 bg-black bg-opacity-50 border border-secondary rounded m-0" style="color: #a78bfa; height: 30vh; overflow-y: auto;"></pre>
                </div>
            </div>
        </div>
    `,

    init: function() {
        window.DiagnosticsView = this;
        this.renderFSMBoxes();
    },

    renderFSMBoxes: function() {
        let html = '';
        this.FSM_STATES.forEach((state, idx) => {
            html += `<div class="fsm-node" id="fsm-box-${idx}">${state}</div>`;
        });
        document.getElementById('fsmFullFlow').innerHTML = html;
    },

    update: function(sysData, diagData) {
        // Cập nhật FSM Highlighting
        let currentStateIdx = diagData.FSM_State;
        if(currentStateIdx !== undefined) {
            document.querySelectorAll('.fsm-node').forEach(el => el.classList.remove('active', 'bg-danger'));
            let activeBox = document.getElementById(`fsm-box-${currentStateIdx}`);
            if (activeBox) {
                if (currentStateIdx === 23 || currentStateIdx === 17) {
                    activeBox.classList.add('active', 'bg-danger', 'border-danger'); // LỖI / CHẾ ĐỘ AN TOÀN
                } else {
                    activeBox.classList.add('active');
                }
            }
            document.getElementById('fsmCurrentCode').innerText = this.FSM_STATES[currentStateIdx] + ` [${currentStateIdx}]`;
        }

        // Cập nhật Safety Dashboard
        if(sysData.weather && sysData.roof) {
            const w = sysData.weather;
            const r = sysData.roof;
            
            // [FIX P2]: Xử lý Mưa và Mây
            if(w.IsRaining || w.IsCloudy) {
                document.getElementById('sfRain').innerText = w.IsRaining ? "CÓ MƯA" : "MÂY DÀY";
                document.getElementById('sfRain').className = "text-danger fw-bold";
                document.getElementById('iRain').className = "fas fa-times-circle text-danger me-2";
            } else {
                document.getElementById('sfRain').innerText = "Quang đãng / Khô ráo";
                document.getElementById('sfRain').className = "text-white";
                document.getElementById('iRain').className = "fas fa-check-circle text-success me-2";
            }

            // Xử lý Gió
            if(w.WindSpeed > 20.0) { // Giả định gió > 20m/s là nguy hiểm
                document.getElementById('sfWind').innerText = "GIÓ LỚN";
                document.getElementById('sfWind').className = "text-danger fw-bold";
                document.getElementById('iWind').className = "fas fa-times-circle text-danger me-2";
            } else {
                document.getElementById('sfWind').innerText = "An toàn";
                document.getElementById('sfWind').className = "text-white";
                document.getElementById('iWind').className = "fas fa-check-circle text-success me-2";
            }

            // Xử lý Trạm Khí Tượng
            if(!w.online) {
                document.getElementById('sfWea').innerText = "MẤT KẾT NỐI ESP-NOW";
                document.getElementById('sfWea').className = "text-danger fw-bold";
                document.getElementById('iWea').className = "fas fa-times-circle text-danger me-2";
                document.getElementById('diagSafetyLevel').innerText = "L5_MẤT_KẾT_NỐI_THỜI_TIẾT";
                document.getElementById('diagSafetyLevel').className = "mb-0 text-danger";
            } else {
                document.getElementById('sfWea').innerText = "Kết nối tốt";
                document.getElementById('sfWea').className = "text-white";
                document.getElementById('iWea').className = "fas fa-check-circle text-success me-2";
            }

            // Xử lý Mount
            if(!r.MountParked) {
                document.getElementById('sfMount').innerText = "CHƯA VÀO VỊ TRÍ AN TOÀN";
                document.getElementById('sfMount').className = "text-warning fw-bold";
                document.getElementById('iMount').className = "fas fa-exclamation-triangle text-warning me-2";
            } else {
                document.getElementById('sfMount').innerText = "Đã vào vị trí an toàn (Park)";
                document.getElementById('sfMount').className = "text-white";
                document.getElementById('iMount').className = "fas fa-check-circle text-success me-2";
            }

            // [FIX P2]: Phản ánh đúng trạng thái an toàn tổng hợp
            if(!w.IsSafe || !w.online || !r.MountParked) {
                 if(!w.online) document.getElementById('diagSafetyLevel').innerText = "L5_MẤT_KẾT_NỐI_THỜI_TIẾT";
                 else if(w.IsRaining || w.IsCloudy) document.getElementById('diagSafetyLevel').innerText = "L2_THỜI_TIẾT_XẤU";
                 else if(!r.MountParked) document.getElementById('diagSafetyLevel').innerText = "L6_MẤT_KẾT_NỐI_KÍNH";
                 document.getElementById('diagSafetyLevel').className = "mb-0 text-danger";
            } else {
                 document.getElementById('diagSafetyLevel').innerText = "L0_NONE (AN TOÀN)";
                 document.getElementById('diagSafetyLevel').className = "mb-0 text-success";
            }
            
            // Xử lý Sensor Matrix
            if(w.SensorHealth) {
                let tbody = document.getElementById('sensorMatrixBody');
                let html = '';
                
                // [U03] Map BỔ SUNG Cảm biến Hướng gió để khớp với ESP32 Firmware
                const modules = [
                    { ids: ['Env6in1', 'WeatherStation', 'WindSpeed', 'OutdoorClimate'], name: 'Khí tượng 6-in-1 (Nhiệt, Ẩm, Áp suất, Bụi)' },
                    { ids: ['WindDirection'], name: 'Cảm biến Hướng gió' }, // Đã map đúng key ESP32 gửi lên
                    { ids: ['HeatedRain', 'RainSensor', 'RainRate'], name: 'Cảm biến Mưa (Có sưởi)' },
                    { ids: ['CloudSensor', 'MLX90614'], name: 'Cảm biến Bầu trời (MLX)' }
                ];

                modules.forEach(m => {
                    let healthData = null;
                    // Quét các key có thể có từ ESP32 trả về
                    for (let key of m.ids) {
                        if (w.SensorHealth[key]) {
                            healthData = w.SensorHealth[key];
                            break;
                        }
                    }

                    if(healthData) {
                        let isOk = healthData.Online;
                        let badgeCls = isOk ? 'bg-success' : 'bg-danger';
                        let badgeTxt = isOk ? 'ĐÃ KẾT NỐI' : 'MẤT KẾT NỐI';
                        html += `<tr>
                            <td class="text-light"><strong>${m.name}</strong></td>
                            <td class="text-center"><span class="text-danger fw-bold">${healthData.CRCError || 0}</span> / <span class="text-warning fw-bold">${healthData.Timeout || 0}</span></td>
                            <td class="text-end"><span class="badge ${badgeCls}">${badgeTxt}</span></td>
                        </tr>`;
                    }
                });
                
                if(html !== '') tbody.innerHTML = html;
                else tbody.innerHTML = '<tr><td colspan="3" class="text-center text-light">Đang đợi dữ liệu từ trạm khí tượng...</td></tr>';
            }
        }

        // Cập nhật Raw JSON
        document.getElementById('jsonViewer').innerText = JSON.stringify(diagData, null, 4);
    },

    downloadJSON: function() {
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(document.getElementById('jsonViewer').innerText);
        let dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", "diagnostics_export.json");
        dlAnchorElem.click();
    }
};