export const MaintenanceView = {
    template: () => `
        <div class="row g-4">
            <div class="col-md-6">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-accent mb-4"><i class="fas fa-heartbeat"></i> Đồng hồ Sức khỏe & An toàn (Health & Safety Gauges)</h5>
                    <div class="d-flex justify-content-around">
                        <div class="text-center">
                            <h2 id="mHealth" class="val-large text-success">--</h2>
                            <span class="val-label">Điểm Sức khỏe (Health Score)</span>
                        </div>
                        <div class="text-center">
                            <h2 id="mSafety" class="val-large text-info">--</h2>
                            <span class="val-label">Điểm An toàn (Safety Score)</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-accent mb-4"><i class="fas fa-robot"></i> Phân tích AI Dự đoán (Predictive AI Analysis)</h5>
                    <ul id="aiAnalysis" class="list-unstyled text-muted" style="line-height: 2;">
                        <li>Đang thu thập dữ liệu...</li>
                    </ul>
                </div>
            </div>
            
            <!-- Khu vực Kiểm tra phần cứng & Cứu hộ -->
            <div class="col-12 mt-4">
                <div class="glass-panel p-4 border-start border-4 border-warning">
                    <h5 class="text-warning mb-4"><i class="fas fa-toolbox"></i> Chẩn đoán Phần cứng & Phục hồi (Hardware Diagnostics & Recovery)</h5>
                    <div class="d-flex flex-wrap gap-3">
                        <button class="btn btn-outline-warning" onclick="if(confirm('Xác nhận: Hiệu chuẩn lại cảm biến dòng điện ACS712? LƯU Ý: Chỉ thực hiện khi mái che ĐANG ĐỨNG YÊN hoàn toàn!')) App.API.sendCommand('calibrate_current')">
                            <i class="fas fa-balance-scale"></i> Hiệu chuẩn ACS712
                        </button>
                        <button class="btn btn-outline-info" onclick="App.API.sendCommand('test_hardware', '&target=alarm')">
                            <i class="fas fa-bullhorn"></i> Kiểm tra Còi Báo Động (300ms)
                        </button>
                        <button class="btn btn-outline-danger ms-auto fw-bold" onclick="if(confirm('CẢNH BÁO: Khởi động lại hệ thống vi điều khiển ESP32? Mái che sẽ mất điện và bị ngắt lập tức nếu đang chạy.')) App.API.sendCommand('reboot')">
                            <i class="fas fa-power-off"></i> Khởi động lại Mái Che
                        </button>
                        
                        <button class="btn btn-outline-danger fw-bold" onclick="if(confirm('Xác nhận: Khởi động lại mạch Khí Tượng (Weather Node)?')) App.API.sendCommand('weather_reboot')">
                            <i class="fas fa-sync-alt"></i> Reboot Khí Tượng
                        </button>

                        <button class="btn btn-outline-danger fw-bold" onclick="if(confirm('Xác nhận: Khởi động lại mạch Trụ Kính (Pier Node)?')) App.API.sendCommand('pier_reboot')">
                            <i class="fas fa-sync-alt"></i> Reboot Trụ Kính
                        </button>
                        
                        <button class="btn btn-outline-danger fw-bold" onclick="if(confirm('Xác nhận: Khởi động lại mạch Báo Động (Alarm Node)?')) App.API.sendCommand('alarm_reboot')">
                            <i class="fas fa-sync-alt"></i> Reboot Báo Động
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="col-12 mt-4">
                <div class="glass-panel p-4">
                    <h5 class="text-accent mb-4"><i class="fas fa-database"></i> Thống kê Trọn đời (Lifetime Statistics - NVS)</h5>
                    
                    <div class="row text-center mt-3">
                        <div class="col-4 col-md-2 mb-3">
                            <h4 id="stStall" class="text-warning">0</h4><span class="val-label">Kẹt cơ (Stalls)</span>
                        </div>
                        <div class="col-4 col-md-2 mb-3">
                            <h4 id="stOC" class="text-danger">0</h4><span class="val-label">Quá tải (OC)</span>
                        </div>
                        <div class="col-4 col-md-2 mb-3">
                            <h4 id="stRec" class="text-info">0</h4><span class="val-label">Phục hồi (Recoveries)</span>
                        </div>
                        <div class="col-4 col-md-2 mb-3">
                            <h4 id="stSStop" class="text-success">0</h4><span class="val-label">Dừng mềm (SoftStop)</span>
                        </div>
                        <div class="col-4 col-md-2 mb-3">
                            <h4 id="stLrn" class="text-primary">0</h4><span class="val-label">Học OK (Learn OK)</span>
                        </div>
                        <div class="col-4 col-md-2 mb-3">
                            <h4 id="stEn" class="text-warning">0</h4><span class="val-label">Điện (Wh)</span>
                        </div>
                        
                        <div class="col-6 col-md-3 mb-3 border-top border-secondary pt-3">
                            <h4 id="stEmg" class="text-danger">0</h4><span class="val-label">Đóng khẩn cấp</span>
                        </div>
                        <div class="col-6 col-md-3 mb-3 border-top border-secondary pt-3">
                            <h4 id="stBounce" class="text-warning">0</h4><span class="val-label">Nảy công tắc</span>
                        </div>
                        <div class="col-6 col-md-3 mb-3 border-top border-secondary pt-3">
                            <h4 id="stTimeout" class="text-danger">0</h4><span class="val-label">Quá giờ (Timeout)</span>
                        </div>
                        <div class="col-6 col-md-3 mb-3 border-top border-secondary pt-3">
                            <h4 id="stCycles" class="text-success">0</h4><span class="val-label">Tổng chu kỳ</span>
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    `,
    init: () => {},
    update: function(sysData, diagData) {
        if(!diagData.Stats) return;

        document.getElementById('mHealth').innerText = diagData.Health_Score;
        document.getElementById('mSafety').innerText = diagData.Safety_Score;

        document.getElementById('stStall').innerText = diagData.Stats.Stall || 0;
        document.getElementById('stOC').innerText = diagData.Stats.HardOC || 0;
        document.getElementById('stRec').innerText = diagData.Stats.RecoveryCount || 0;
        document.getElementById('stSStop').innerText = diagData.Stats.SoftStop || 0;
        document.getElementById('stLrn').innerText = diagData.Stats.AutoLearnOk || 0;
        document.getElementById('stEn').innerText = diagData.TotalEnergyEstimateWh ? diagData.TotalEnergyEstimateWh.toFixed(2) : 0;
        
        document.getElementById('stEmg').innerText = diagData.Stats.EmergencyClose || 0;
        document.getElementById('stBounce').innerText = diagData.LimitBounceCount || 0;
        document.getElementById('stTimeout').innerText = diagData.Stats.Timeout || 0;
        document.getElementById('stCycles').innerText = diagData.Roof_Cycles || 0;

        // Web-based Predictive Analysis Rules Engine
        let analysis = [];
        if (diagData.MotorTrend === 1) analysis.push("<li class='text-warning'><i class='fas fa-exclamation-triangle'></i> <b>Motor Aging / Friction (Hao mòn Động cơ / Ma sát):</b> Thời gian di chuyển đang có xu hướng tăng dần. Cần kiểm tra mỡ bò thanh răng.</li>");
        if (diagData.CurrentTrend === 1) analysis.push("<li class='text-danger'><i class='fas fa-bolt'></i> <b>Current Increase (Dòng điện Tăng cao):</b> Dòng điện tiêu thụ trung bình đang tăng. Kiểm tra tải trọng mái hoặc hỏng hóc bạc đạn motor.</li>");
        if (diagData.LimitBounceCount > 10) analysis.push("<li class='text-warning'><i class='fas fa-switch'></i> <b>Limit Switch Degradation (Suy giảm Công tắc hành trình):</b> Công tắc hành trình bị nảy (bounce) quá nhiều lần. Nguy cơ hỏng tiếp điểm vật lý.</li>");
        if (diagData.Stats.AutoLearnReject > diagData.Stats.AutoLearnOk) analysis.push("<li class='text-danger'><i class='fas fa-brain'></i> <b>Learning Instability (Học hành trình Mất ổn định):</b> Hành trình di chuyển giật cục, thuật toán Auto-Learn liên tục từ chối cập nhật.</li>");
        
        if (analysis.length === 0) analysis.push("<li class='text-success'><i class='fas fa-check-circle'></i> Hệ thống cơ điện hoạt động trơn tru. Các chỉ số hao mòn nằm trong ngưỡng an toàn.</li>");

        document.getElementById('aiAnalysis').innerHTML = analysis.join("");
    }
};