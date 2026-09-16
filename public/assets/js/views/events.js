import { API } from '../api.js';

export const EventsView = {
    logsData: [],
    isPaused: false,

    template: () => `
        <div class="row g-4">
            <div class="col-12">
                <div class="glass-panel p-4 h-100">
                    <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                        <h5 class="text-accent m-0"><i class="fas fa-list-alt"></i> Nhật ký Sự kiện Hệ thống (System Event Logs)</h5>
                        
                        <!-- Thanh công cụ (Toolbar) -->
                        <div class="d-flex gap-2 align-items-center">
                            <input type="text" id="logSearch" class="form-control form-control-sm bg-dark text-white border-secondary" placeholder="Tìm kiếm nhật ký..." onkeyup="EventsView.renderTable()">
                            
                            <select id="logSeverity" class="form-select form-select-sm bg-dark text-white border-secondary" onchange="EventsView.renderTable()">
                                <option value="ALL">Tất cả (All)</option>
                                <option value="0">THÔNG TIN (Xanh lá)</option>
                                <option value="1">CẢNH BÁO (Vàng)</option>
                                <option value="2">NGHIÊM TRỌNG (Đỏ)</option>
                            </select>

                            <div class="form-check form-switch ms-2">
                                <input class="form-check-input" type="checkbox" id="pauseScroll" onchange="EventsView.togglePause()">
                                <label class="form-check-label text-muted small" for="pauseScroll">Tạm dừng</label>
                            </div>

                            <button class="btn btn-sm btn-outline-info ms-2" onclick="EventsView.exportCSV()"><i class="fas fa-file-csv"></i> CSV</button>
                            <button class="btn btn-sm btn-outline-info" onclick="EventsView.exportJSON()"><i class="fas fa-file-code"></i> JSON</button>
                            <!-- [ĐÃ BỔ SUNG]: Nút bấm Gọi API Xóa Nhật ký (Clear Logs) -->
                            <button class="btn btn-sm btn-outline-danger ms-2" onclick="if(confirm('CẢNH BÁO: Xóa vĩnh viễn toàn bộ Nhật ký Sự kiện (Event Logs) trong bộ nhớ ESP32?')) App.API.sendCommand('clear_logs')"><i class="fas fa-trash-alt"></i> Xóa</button>
                        </div>
                    </div>

                    <!-- Bảng Log -->
                    <div class="table-responsive" style="max-height: 65vh; overflow-y: auto;" id="tableContainer">
                        <table class="table table-dark table-hover table-glass mb-0" style="font-family: monospace; font-size: 0.9em;">
                            <thead style="position: sticky; top: 0; z-index: 1;">
                                <tr>
                                    <th>Thời gian (NTP Time)</th>
                                    <th>Sự kiện (Event)</th>
                                    <th>Mức độ (Severity)</th>
                                    <th>Dòng điện (Raw)</th>
                                    <th>Băm xung (PWM)</th>
                                    <th>Mã Trạng thái (FSM Code)</th>
                                </tr>
                            </thead>
                            <tbody id="logTableBody">
                                <tr><td colspan="6" class="text-center text-muted">Đang tải dữ liệu...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    `,

    init: function() {
        window.EventsView = this;
        this.fetchLogs();
    },

    update: function(sysData, diagData) {
        if(App.Router.currentRoute === 'events' && !this.isPaused) {
            this.fetchLogs();
        }
    },

    togglePause: function() {
        this.isPaused = document.getElementById('pauseScroll').checked;
    },

    fetchLogs: async function() {
        try {
            const data = await API.get('api.php?action=events');
            if (data && data.logs) {
                this.logsData = data.logs.reverse();
                this.renderTable();
            }
        } catch(e) {
            console.error("Lỗi tải Nhật ký Sự kiện", e);
        }
    },

    formatTime: function(ts) {
        if (ts > 1000000000000) { 
            return new Date(ts).toLocaleString('vi-VN'); 
        } else {
            return (ts / 1000).toFixed(1) + "s (Thời gian hoạt động)";
        }
    },

    renderTable: function() {
        const tbody = document.getElementById('logTableBody');
        if (!tbody) return;

        const searchText = (document.getElementById('logSearch').value || '').toLowerCase();
        const sevFilter = document.getElementById('logSeverity').value;

        let html = '';
        let rowCount = 0;

        this.logsData.forEach(log => {
            if (sevFilter !== 'ALL' && log.sev.toString() !== sevFilter) return;

            let eventName = log.event || "KHÔNG RÕ (UNKNOWN)";
            if (searchText !== '' && !eventName.toLowerCase().includes(searchText)) return;

            let rowClass = 'log-row-info';
            let sevText = '<span class="badge bg-success">THÔNG TIN</span>';
            if (log.sev === 1) { rowClass = 'log-row-warn'; sevText = '<span class="badge bg-warning text-dark">CẢNH BÁO</span>'; }
            if (log.sev === 2) { rowClass = 'log-row-crit'; sevText = '<span class="badge bg-danger">NGHIÊM TRỌNG</span>'; }

            let timeStr = this.formatTime(log.ts);

            html += `
                <tr class="${rowClass}">
                    <td>${timeStr}</td>
                    <td style="font-weight: bold;">${eventName}</td>
                    <td>${sevText}</td>
                    <td>${log.cur || 0}</td>
                    <td>${log.pwm || 0}</td>
                    <td>${log.state || 0}</td>
                </tr>
            `;
            rowCount++;
        });

        if (rowCount === 0) html = '<tr><td colspan="6" class="text-center text-muted">Không tìm thấy sự kiện nào khớp với bộ lọc.</td></tr>';
        
        tbody.innerHTML = html;
    },

    exportCSV: function() {
        if(this.logsData.length === 0) return;
        let csvContent = "data:text/csv;charset=utf-8,Thoi_gian,Su_kien,Muc_do,Dong_dien,PWM,Ma_trang_thai_FSM\n";
        this.logsData.forEach(log => {
            let timeStr = this.formatTime(log.ts).replace(/,/g, ''); 
            csvContent += `${timeStr},${log.event},${log.sev},${log.cur},${log.pwm},${log.state}\n`;
        });
        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "l2c_events_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    exportJSON: function() {
        if(this.logsData.length === 0) return;
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.logsData, null, 2));
        let link = document.createElement("a");
        link.setAttribute("href", dataStr);
        link.setAttribute("download", "l2c_events_export.json");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};