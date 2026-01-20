import * as Actions from './actions.js';

// --- SESSION ---
window.login = Actions.login;
window.logout = Actions.logout;
window.checkSession = Actions.checkSession;

// --- NAV ---
window.navToLobby = Actions.navToLobby;
window.navToUserManager = Actions.navToUserManager;
window.navToAdminDashboard = Actions.navToAdminDashboard;
window.handleLobbyBack = Actions.handleLobbyBack;
window.leaveRoom = Actions.leaveRoom;

// --- ADMIN ---
window.createNewUser = Actions.createNewUser;
window.loadUserList = Actions.loadUserList;
window.openEditModal = Actions.openEditModal;
window.closeEditModal = Actions.closeEditModal;
window.submitEditUser = Actions.submitEditUser;

// --- ROOM ---
window.createRandomRoom = Actions.createRandomRoom;
window.joinRoom = Actions.joinRoom;

// --- GAME ---
window.selectTicket = Actions.selectTicket;
window.unselectTicket = Actions.unselectTicket;
window.confirmSelection = Actions.confirmSelection;
window.signalWait = Actions.signalWait;
window.setPrice = Actions.setPrice;
window.transferHost = Actions.transferHost;
window.hostAction = Actions.hostAction;
window.toggleAutoDraw = Actions.toggleAutoDraw;

window.onload = function() {
    // Kiểm tra session khi vừa vào
    Actions.checkSession();

    // Polling danh sách phòng
    setInterval(() => {
        const lobby = document.getElementById('lobby-screen');
        // Chỉ refresh khi đang ở màn hình Lobby và màn hình không bị ẩn
        if (lobby && !lobby.classList.contains('hidden')) {
            // SỬA LỖI: Thêm .catch() để xử lý Promise
            Actions.refreshRoomList().catch(err => {
                console.warn("Lỗi làm mới danh sách phòng:", err);
            });
        }
    }, 5000);
};