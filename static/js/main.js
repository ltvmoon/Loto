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
window.deleteUser = Actions.deleteUser; // <--- MỚI: Export hàm xóa

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
window.toggleAutoMode = Actions.toggleAutoMode;

window.onload = function() {
    Actions.checkSession();
    setInterval(() => {
        const lobby = document.getElementById('lobby-screen');
        if (lobby && !lobby.classList.contains('hidden')) {
            // Fix warning promise ignored
            Actions.refreshRoomList().catch(err => console.error(err));
        }
    }, 5000);
};