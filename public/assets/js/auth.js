export const Auth = {
    role: "ADMIN", 

    init: function() {
        this.unlockUI();
    },

    logout: function() {
        alert("Phiên đăng nhập được quản lý bởi Cloudflare Zero Trust. Nếu bạn muốn đăng xuất thực sự, vui lòng đóng trình duyệt.");
        window.location.reload(); 
    },

    unlockUI: function() {
        const roleBadge = document.getElementById('authRoleBadge');
        if (roleBadge) {
            roleBadge.innerText = "Vai trò: " + this.role;
            roleBadge.style.color = '#ef4444';
        }
    }
};