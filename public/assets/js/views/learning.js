import { API } from '../api.js';

export const LearningView = {
    template: () => `
        <div class="row g-4">
            <div class="col-12">
                <div class="glass-panel p-4">
                    <h5 class="text-accent mb-4"><i class="fas fa-brain"></i> Công cụ Tự động Hiệu chuẩn & Học hành trình</h5>
                    <p class="text-light small mb-4">Hệ thống ESP32 tự động nội suy thời gian di chuyển (EMA) sau mỗi chu kỳ để tối ưu hóa quỹ đạo giảm tốc (Cấu hình Chuyển động Thích ứng). Các chu kỳ kẹt ray hoặc sai số >10% (Ngoại lai) sẽ bị thuật toán loại bỏ.</p>
                    
                    <div class="row g-4">
                        <div class="col-md-4 text-center">
                            <div class="p-3 bg-black bg-opacity-25 border border-secondary rounded h-100">
                                <h6 class="text-light text-uppercase mb-3">Thời gian Mở (Đã học)</h6>
                                <h2 id="lrnOpen" class="text-info fw-bold mb-0">--</h2>
                                <span class="text-light small">Mili-giây (ms)</span>
                            </div>
                        </div>
                        <div class="col-md-4 text-center">
                            <div class="p-3 bg-black bg-opacity-25 border border-secondary rounded h-100">
                                <h6 class="text-light text-uppercase mb-3">Thời gian Đóng (Đã học)</h6>
                                <h2 id="lrnClose" class="text-warning fw-bold mb-0">--</h2>
                                <span class="text-light small">Mili-giây (ms)</span>
                            </div>
                        </div>
                        <div class="col-md-4 text-center">
                            <div class="p-3 bg-black bg-opacity-25 border border-secondary rounded h-100">
                                <h6 class="text-light text-uppercase mb-3">Thời gian Trung bình cơ sở</h6>
                                <h2 id="lrnAvg" class="text-success fw-bold mb-0">--</h2>
                                <span class="text-light small">Mili-giây (ms)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-md-6">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-accent mb-4"><i class="fas fa-chart-line"></i> Độ ổn định của Thuật toán học</h5>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-light">Dữ liệu hợp lệ (Được chấp nhận):</span>
                        <span id="lrnOk" class="text-success fw-bold">0</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span class="text-light">Nhiễu / Ngoại lai (Bị loại bỏ):</span>
                        <span id="lrnRej" class="text-danger fw-bold">0</span>
                    </div>
                    <div class="d-flex justify-content-between mb-4 border-bottom border-secondary pb-3">
                        <span class="text-light">Số lần Dò tìm Vị trí (Search Mode):</span>
                        <span id="lrnSearch" class="text-warning fw-bold">0</span>
                    </div>

                    <h6 class="text-light text-uppercase small mb-2">Độ ổn định thuật toán (Điểm số)</h6>
                    <div class="progress mb-2" style="height: 25px; background-color: #1e293b; border: 1px solid #334155;">
                        <div id="lrnBar" class="progress-bar bg-success progress-bar-striped progress-bar-animated" role="progressbar" style="width: 0%; font-weight: bold;">0%</div>
                    </div>
                    <div id="lrnAnalysis" class="text-success small fw-bold text-center mt-2">--</div>
                    
                    <div class="d-flex justify-content-between align-items-center mt-4 border-top border-secondary pt-3">
                        <span class="text-light small">Nếu bị kẹt nhầm dữ liệu, hãy xóa NVS để học lại từ đầu.</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="if(confirm('CẢNH BÁO: Xóa toàn bộ dữ liệu tự học? Hệ thống sẽ mất mốc thời gian.')) App.API.sendCommand('reset_learning')"><i class="fas fa-trash-alt"></i> Đặt lại Dữ liệu học</button>
                    </div>
                </div>
            </div>

            <div class="col-md-6">
                <div class="glass-panel p-4 h-100">
                    <h5 class="text-accent mb-4"><i class="fas fa-sliders-h"></i> Dừng mềm Thích ứng (Ngưỡng Dòng điện)</h5>
                    <p class="text-light small mb-4">Mạch sẽ tự học ngưỡng dòng điện cuối hành trình khi ron cao su bị ép lại, cộng thêm 10% biên độ để kích hoạt dừng mềm (Soft Stop).</p>
                    
                    <div class="d-flex justify-content-between align-items-center p-3 mb-3 bg-black bg-opacity-25 rounded border border-secondary">
                        <span class="text-light">Ngưỡng tự học (Chiều MỞ):</span>
                        <strong id="ssOpen" class="text-info fs-5">-- mA</strong>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center p-3 mb-3 bg-black bg-opacity-25 rounded border border-secondary">
                        <span class="text-light">Ngưỡng tự học (Chiều ĐÓNG):</span>
                        <strong id="ssClose" class="text-warning fs-5">-- mA</strong>
                    </div>
                    
                    <div class="text-light small text-end">* Nếu dữ liệu tự học = 0, mạch sẽ dùng số cứng mặc định (1650 mA).</div>
                </div>
            </div>
            
            <div class="col-12">
                <div class="glass-panel p-4 h-100 border-start border-4 border-info">
                    <h5 class="text-info mb-4"><i class="fas fa-cloud"></i> Tự động Hiệu chuẩn Áp suất Khí quyển (Dự báo ngắn hạn)</h5>
                    <p class="text-light small mb-4">Hệ thống ngầm tự động nội suy và hiệu chuẩn áp suất (QNH) vào những thời điểm trời quang mây tạnh (dựa vào cảm biến MLX và Vệ tinh) để bù trừ độ cao thực tế của trạm.</p>
                    
                    <div class="row g-4">
                        <div class="col-md-6">
                            <div class="d-flex justify-content-between align-items-center p-3 bg-black bg-opacity-25 rounded border border-secondary">
                                <span class="text-light">Hệ số bù hiện tại (Offset):</span>
                                <strong id="calibOffset" class="text-info fs-5">Đang tải...</strong>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="d-flex justify-content-between align-items-center p-3 bg-black bg-opacity-25 rounded border border-secondary">
                                <span class="text-light">Lần hiệu chuẩn cuối:</span>
                                <strong id="calibTime" class="text-warning fs-6">Đang tải...</strong>
                            </div>
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mt-4 border-top border-secondary pt-3">
                        <span class="text-light small">Xóa hệ số bù để hệ thống sử dụng mức bù tĩnh theo độ cao và tự động học lại vào ngày nắng tiếp theo.</span>
                        <button class="btn btn-sm btn-outline-warning fw-bold" onclick="LearningView.resetCalib()">
                            <i class="fas fa-eraser"></i> Đặt lại Hiệu chuẩn Áp suất
                        </button>
                    </div>
                </div>
            </div>
            
        </div>
    `,

    init: function() {
        window.LearningView = this;
        this.fetchCalib(); 
    },

    fetchCalib: async function() {
        try {
            const res = await fetch('api.php?action=get_calib');
            const data = await res.json();
            if(data.status === 'success' && data.data) {
                document.getElementById('calibOffset').innerText = '+' + parseFloat(data.data.offset).toFixed(1) + ' hPa';
                document.getElementById('calibTime').innerText = data.data.last_calib || 'Không rõ';
                document.getElementById('calibTime').className = 'text-warning fs-6';
            } else {
                document.getElementById('calibOffset').innerText = '+' + parseFloat(data.default_offset || 4.2).toFixed(1) + ' hPa (Mặc định)';
                document.getElementById('calibTime').innerText = 'Chưa từng Tự động Hiệu chuẩn';
                document.getElementById('calibTime').className = 'text-muted fs-6';
            }
        } catch(e) {
            console.log('Lỗi tải dữ liệu Auto-Calib:', e);
        }
    },

    resetCalib: async function() {
        if(confirm('Xác nhận: Đặt lại (reset) dữ liệu hiệu chuẩn áp suất (QNH)? Hệ thống sẽ tự động học lại vào lúc trời quang mây.')) {
            try {
                const res = await fetch('api.php?action=reset_calib');
                const data = await res.json();
                alert(data.message || 'Đã đặt lại thành công');
                this.fetchCalib(); 
            } catch(e) {
                alert('Lỗi kết nối khi đặt lại hiệu chuẩn: ' + e);
            }
        }
    },

    update: function(sysData, diagData) {
        if(!diagData.Stats) return;

        document.getElementById('lrnOpen').innerText = diagData.LearnedOpeningTime || '--';
        document.getElementById('lrnClose').innerText = diagData.LearnedClosingTime || '--';
        
        // [FIX P1]: Tính trung bình hành trình
        let lrnAvg = ((diagData.LearnedOpeningTime || 0) + (diagData.LearnedClosingTime || 0)) / 2;
        document.getElementById('lrnAvg').innerText = lrnAvg > 0 ? Math.round(lrnAvg) : '--';

        document.getElementById('ssOpen').innerText = (diagData.AverageEndCurrentOpen ? diagData.AverageEndCurrentOpen.toFixed(1) : '0') + ' mA';
        document.getElementById('ssClose').innerText = (diagData.AverageEndCurrentClose ? diagData.AverageEndCurrentClose.toFixed(1) : '0') + ' mA';

        let ok = diagData.Stats.AutoLearnOk || 0;
        let rej = diagData.Stats.AutoLearnReject || 0;
        document.getElementById('lrnOk').innerText = ok;
        document.getElementById('lrnRej').innerText = rej;
        document.getElementById('lrnSearch').innerText = diagData.SearchModeCounter || 0;

        let total = ok + rej;
        let stability = total === 0 ? 100 : (ok / total) * 100;
        
        let bar = document.getElementById('lrnBar');
        bar.style.width = stability + '%';
        bar.innerText = stability.toFixed(1) + '%';

        let analysis = document.getElementById('lrnAnalysis');
        if (stability >= 90) {
            bar.className = "progress-bar bg-success progress-bar-striped progress-bar-animated";
            analysis.innerText = "✔️ Dữ liệu hành trình rất ổn định.";
            analysis.className = "text-success small fw-bold text-center mt-2";
        } else if (stability >= 70) {
            bar.className = "progress-bar bg-warning progress-bar-striped progress-bar-animated text-dark";
            analysis.innerText = "⚠️ Mái có dấu hiệu chạy giật cục (Bị cản).";
            analysis.className = "text-warning small fw-bold text-center mt-2";
        } else {
            bar.className = "progress-bar bg-danger progress-bar-striped progress-bar-animated";
            analysis.innerText = "❌ Ray trượt quá rít, thuật toán liên tục từ chối cập nhật!";
            analysis.className = "text-danger small fw-bold text-center mt-2";
        }
    }
};