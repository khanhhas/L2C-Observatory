import { Auth } from './auth.js?v=2';
import { API } from './api.js?v=2';
import { Router } from './core/router.js?v=2';

export const AppInit = {
    Auth: Auth,
    API: API,
    Router: Router,
    SysData: {},
    DiagData: {},
    isPolling: false,

    start: function() {
        // 1. Khởi động đồng hồ hệ thống
        setInterval(() => {
            let clockEl = document.getElementById('sysClock');
            if (clockEl) clockEl.innerText = new Date().toLocaleTimeString('vi-VN');
        }, 1000);

        // 2. Cập nhật giao diện (Role Badge Admin)
        try { Auth.init(); } catch (e) { console.warn(e); }
        
        // [THÊM MỚI]: Khởi tạo tính năng thu gọn / mở rộng Sidebar toàn cục cho mọi trang
        this.initSidebarToggle();

        // 3. KHỞI ĐỘNG VÒNG LẶP LẤY DỮ LIỆU TRƯỚC TIÊN
        this.startPolling();

        // 4. Ép nạp trang Dashboard với độ trễ 300ms
        setTimeout(() => {
            try {
                Router.navigate('dashboard');
            } catch (err) {
                console.error("Lỗi tự động nạp Dashboard:", err);
            }
        }, 300);
    },

    // [THÊM MỚI]: Hàm điều khiển nút Toggle Sidebar chạy chung cho mọi giao diện
    initSidebarToggle: function() {
        window.addEventListener('DOMContentLoaded', () => setupToggle());
        // Dự phòng nếu DOM đã sẵn sàng
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setupToggle();
        }

        function setupToggle() {
            const sidebar = document.querySelector('.glass-sidebar');
            const headerDiv = document.querySelector('.sidebar-header .d-flex') || document.querySelector('.sidebar-header');
            
            if (sidebar && headerDiv && !document.getElementById('sidebar-toggle-btn')) {
                const toggleBtn = document.createElement('button');
                toggleBtn.id = 'sidebar-toggle-btn';
                toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
                toggleBtn.title = 'Thu gọn / Mở rộng menu';
                headerDiv.appendChild(toggleBtn);

                // [THÊM MỚI]: Tự động trích xuất Text từ menu để làm Tooltip
                const navLinks = sidebar.querySelectorAll('.nav-link');
                navLinks.forEach(link => {
                    let clone = link.cloneNode(true);
                    // Xóa icon và badge để lấy chữ thuần túy
                    let icon = clone.querySelector('i');
                    if (icon) icon.remove();
                    let badges = clone.querySelectorAll('.badge, span');
                    badges.forEach(b => b.remove());
                    
                    let textContent = clone.textContent.replace(/[\n\r]+|[\s]{2,}/g, ' ').trim();
                    if (textContent) {
                        // Gắn vào thuộc tính data-tooltip để CSS đọc và làm nhãn nổi
                        link.setAttribute('data-tooltip', textContent);
                    }
                });

                // Khôi phục trạng thái từ localStorage
                if (localStorage.getItem('l2c_sidebar_collapsed') === '1') {
                    sidebar.classList.add('sidebar-collapsed');
                }

                toggleBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    sidebar.classList.toggle('sidebar-collapsed');
                    const isCollapsed = sidebar.classList.contains('sidebar-collapsed');
                    localStorage.setItem('l2c_sidebar_collapsed', isCollapsed ? '1' : '0');

                    // Kích hoạt resize sự kiện để các biểu đồ/bản đồ tự động co giãn theo khung mới
                    setTimeout(() => {
                        window.dispatchEvent(new Event('resize'));
                    }, 300);
                });
            }
        }
    },

    startPolling: function() {
        setInterval(async () => {
            if (this.isPolling) return;
            
            this.isPolling = true; 
            try {
                // Gộp luồng: Chờ chùm Diagnostic chạy xong mới gọi Sensor
                const diagRes = await API.get('api.php?action=diagnostics');
                if (diagRes) this.DiagData = diagRes;

                const statRes = await API.get('api.php?action=sensordata');
                if (statRes) this.SysData = statRes;

                let badge = document.getElementById('connStatus');
                if (badge) {
                    badge.className = "badge bg-success mb-2 w-100";
                    badge.innerText = `Đã kết nối (Ping: ${API.latency}ms)`;
                }

                Router.dispatchUpdate(this.SysData, this.DiagData);

            } catch (error) {
                let badge = document.getElementById('connStatus');
                if (badge) {
                    badge.className = "badge bg-danger mb-2 w-100 pulse-anim";
                    badge.innerText = "Mất kết nối / Quá thời gian";
                }
                console.error("Lỗi lấy dữ liệu:", error);
            } finally {
                this.isPolling = false; 
            }
        }, 2500); 
    }
};