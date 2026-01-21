import { state } from './state.js';
import * as UI from './ui.js';

export function connectWS() {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    state.ws = new WebSocket(`${proto}://${window.location.host}/ws`);

    state.ws.onopen = () => {
        state.ws.send(JSON.stringify({ cmd: "JOIN", username: state.currentUser, room_id: state.currentRoomId }));
    };

    state.ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.room_id && msg.room_id !== state.currentRoomId) return;

        if (msg.type === 'SYNC_STATE') {
            UI.softResetGame();
            document.getElementById('log-area').innerHTML = "";
            if (msg.logs) msg.logs.forEach(txt => UI.log(txt));
            state.onlineUsers = msg.users || [];

            if (msg.numbers.length > 0) {
                UI.updateDisplay(msg.numbers[msg.numbers.length - 1], msg.numbers);
                // Nếu ván đang chạy khi mới vào -> đánh dấu đã start để không hiện popup
                state.hasGameStartedOnce = true;
                if (Object.keys(msg.owners).length > 0 && !Object.values(msg.owners).includes(state.currentUser)) {
                    // console.log("Khán giả");
                }
            }
            state.ticketOwners = msg.owners;
            for (const [tid, owner] of Object.entries(msg.owners)) UI.updateTicketStatus(parseInt(tid), owner);
            state.waitingMap = msg.waiters || {};
            UI.updateWaitLeaderboard();
            state.currentHost = msg.host;
            UI.checkHostStatus(msg.host);
            UI.updateUserListUI();
            UI.setGameDisabled(msg.is_game_over);
            UI.updateEconomicUI(msg.ticket_price, Object.keys(msg.owners).length);
        }
        else if (msg.type === 'USER_JOINED') {
            if (msg.username === state.currentUser) return;

            if (!state.onlineUsers.includes(msg.username)) state.onlineUsers.push(msg.username);
            UI.updateUserListUI();
            UI.log(msg.message);
        }
        else if (msg.type === 'USER_LEFT') {
            const idx = state.onlineUsers.indexOf(msg.username);
            if (idx > -1) state.onlineUsers.splice(idx, 1);
            for (const [tid, owner] of Object.entries(state.ticketOwners)) { if (owner === msg.username) delete state.ticketOwners[tid]; }
            UI.updateUserListUI();
            UI.log(`🚪 ${msg.username} đã thoát.`);
        }
        else if (msg.type === 'HOST_CHANGED') {
            state.currentHost = msg.username;
            UI.checkHostStatus(msg.username);
            UI.updateUserListUI();
            if (msg.message) UI.log(msg.message);
        }
        else if (msg.type === 'TICKET_TAKEN') {
            state.ticketOwners[msg.ticket_id] = msg.owner;
            UI.updateTicketStatus(msg.ticket_id, msg.owner);
            state.totalSoldTickets++;
            UI.updateEconomicUI(state.currentTicketPrice, state.totalSoldTickets);
            UI.updateUserListUI();
        }
        else if (msg.type === 'TICKET_FREED') {
            delete state.ticketOwners[msg.ticket_id];
            UI.updateTicketStatus(msg.ticket_id, null);
            state.totalSoldTickets--;
            UI.updateEconomicUI(state.currentTicketPrice, state.totalSoldTickets);
            UI.updateUserListUI();
        }
        else if (msg.type === 'ERROR') alert("❌ " + msg.message);
        else if (msg.type === 'USER_CONFIRMED') {
            if (msg.username === state.currentUser) UI.updateConfirmedUI(true);
            UI.log(msg.message);
        }
        else if (msg.type === 'NEW_NUMBER') {
            UI.updateDisplay(msg.value, msg.history);
            UI.speakNumber(msg.value);
            UI.highlightMyNumbers(msg.value);
        }
        else if (msg.type === 'USER_WAITING') {
            state.waitingMap[msg.username] = msg.count;
            UI.updateWaitLeaderboard();
            UI.addStatusLog(msg.username, `ĐANG CHỜ (${msg.count} hàng)`, "checking");
        }
        else if (msg.type === 'WINNER') {
            UI.updateAutoDrawUI(false);
            // --- CẬP NHẬT MỚI: XÓA BẢNG CHỜ ---
            state.waitingMap = {}; // Xóa dữ liệu chờ trong bộ nhớ
            UI.updateWaitLeaderboard(); // Cập nhật lại giao diện (sẽ trở thành Trống)
            // ----------------------------------
            UI.addStatusLog("🏆", msg.message, "win");
            alert("Chiến thắng: " + msg.message);
            UI.setGameDisabled(true);
            UI.log(msg.message);
        }
        else if (msg.type === 'AUTO_DRAW_STARTED') {
            state.hasGameStartedOnce = true; // QUAN TRỌNG: Xác nhận game đã chạy thành công
            UI.updateAutoDrawUI(true);
            UI.log(msg.message);
            if (msg.interval) {
                state.currentInterval = msg.interval;
            }
            UI.updateUserListUI();
        }
        else if (msg.type === 'AUTO_DRAW_STOPPED') {
            UI.updateAutoDrawUI(false);
            UI.log(msg.message);
        }
        else if (msg.type === 'GAME_RESET') {
            alert(msg.message);
            UI.softResetGame();
            UI.log(msg.message);
            UI.updateUserListUI();
        }
        else if (msg.type === 'BALANCE_UPDATE') {
            if (msg.username === state.currentUser) {
                document.getElementById('display-balance').innerText = new Intl.NumberFormat('vi-VN').format(msg.balance);
            }
        }
        else if (msg.type === 'PRICE_UPDATED') {
            UI.updateEconomicUI(msg.price, state.totalSoldTickets);
            UI.log(msg.message);
        }
    };
}