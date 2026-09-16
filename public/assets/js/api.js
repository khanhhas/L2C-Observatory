import { Auth } from './auth.js';

export const API = {
    latency: 0,
    
    get: async function(url) {
        const start = performance.now();
        // Nhổ rễ khái niệm Headers và Token
        const res = await fetch(url, {
            credentials: 'same-origin'
        });
        
        this.latency = Math.round(performance.now() - start);

        if (res.status === 401 || res.status === 403) {
            Auth.logout();
            throw new Error("Từ chối truy cập bởi Cloudflare hoặc Cổng kết nối");
        }
        return await res.json();
    },

    // [ĐÃ BỔ SUNG]: Tham số extraParams
    sendCommand: async function(action, extraParams = '') {
        if (Auth.role !== 'ADMIN') {
            alert("Lỗi: Chỉ ADMIN mới được cấp quyền gửi lệnh điều khiển!");
            return;
        }
        try {
            const res = await fetch(`api.php?action=${action}${extraParams}`, {
                credentials: 'same-origin'
            });
            const data = await res.json();
            
            if (res.status === 401 || (data && data.status === "error")) {
                alert(data.message || "Lỗi xác thực: Máy chủ từ chối lệnh.");
            } else {
                alert(data.message || "Đã gửi lệnh thành công.");
            }
        } catch (e) {
            alert("Lỗi kết nối khi gửi lệnh: " + e.message);
        }
    }
};