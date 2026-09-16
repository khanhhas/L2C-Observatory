import { DashboardView } from '../views/dashboard.js?v=2';
import { DiagnosticsView } from '../views/diagnostics.js?v=2';
import { MaintenanceView } from '../views/maintenance.js?v=2';
import { EventsView } from '../views/events.js?v=2';
import { ConsoleView } from '../views/console.js?v=2';
import { LearningView } from '../views/learning.js?v=2';
import { CommunicationView } from '../views/communication.js?v=2';

export const Router = {
    currentRoute: '',
    
    // Đăng ký toàn bộ các module giao diện vào đây
    views: {
        'dashboard': DashboardView,
        'diagnostics': DiagnosticsView,
        'maintenance': MaintenanceView,
        'events': EventsView,
        'console': ConsoleView,
        'learning': LearningView,
        'communication': CommunicationView
    },

    navigate: function(route) {
        if (!this.views[route]) {
            console.error(`Route "${route}" không tồn tại hoặc chưa được đăng ký trong Router!`);
            return;
        }
        
        this.currentRoute = route;
        
        // Cập nhật CSS Sidebar (Highlight menu đang chọn)
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        if (typeof event !== 'undefined' && event.currentTarget) {
            event.currentTarget.classList.add('active');
        }

        // Render HTML vỏ của View vào container chính
        document.getElementById('mainContainer').innerHTML = this.views[route].template();
        
        // Đổi tiêu đề phía trên cùng
        document.getElementById('pageTitle').innerText = route.toUpperCase();

        // Chạy hàm khởi tạo của View (vẽ chart rỗng, gán sự kiện)
        if(this.views[route].init) {
            this.views[route].init();
        }
    },

    dispatchUpdate: function(sysData, diagData) {
        // Cập nhật data realtime cho màn hình đang hiển thị
        if (this.views[this.currentRoute] && this.views[this.currentRoute].update) {
            this.views[this.currentRoute].update(sysData, diagData);
        }
    }
};