import {state} from './state.js';
import {connectWS} from './ws.js';
import * as UI from './ui.js';

// --- 1. SESSION & NAV ---
export function checkSession() {
    const storedUser = localStorage.getItem('loto_user');
    const storedRole = localStorage.getItem('loto_role');

    if (storedUser && storedRole) {
        state.currentUser = storedUser;
        state.userRole = storedRole;

        // Ưu tiên: Kiểm tra xem có phòng đang chơi dở không
        const savedRoom = localStorage.getItem('loto_current_room');

        if (savedRoom) {
            joinRoom(savedRoom);
        } else {
            // Phân hướng theo Role
            if (state.userRole === 'admin') {
                navToAdminDashboard();
                const welcome = document.getElementById('welcome-admin');
                if (welcome) welcome.innerText = `Xin chào, ${state.currentUser}`;
            } else {
                navToLobby();
            }
        }
    } else {
        showScreen('login-screen');
    }
}

export function logout() {
    // Nếu đang trong phòng thì gửi lệnh Rời Phòng trước
    if (state.currentRoomId && state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify({
            cmd: "LEAVE_ROOM",
            username: state.currentUser,
            room_id: state.currentRoomId
        }));
    }
    localStorage.clear();
    window.location.reload();
}

function showScreen(screenId) {
    const screens = ['login-screen', 'admin-dashboard', 'admin-user-manager', 'lobby-screen', 'game-grid'];
    screens.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
}

export function navToAdminDashboard() {
    showScreen('admin-dashboard');
}

export function navToUserManager() {
    showScreen('admin-user-manager');
    // FIX: "Promise returned is ignored" - Thêm catch lỗi
    loadUserList().catch(console.error);
}

export function navToLobby() {
    showScreen('lobby-screen');
    const el = document.getElementById('lobby-username');
    if (el) el.innerText = state.currentUser;
    // FIX: "Promise returned is ignored" - Thêm catch lỗi
    refreshRoomList().catch(console.error);
}

export function handleLobbyBack() {
    if (state.userRole === 'admin') navToAdminDashboard();
    else logout();
}

export function leaveRoom() {
    if (state.ws) {
        state.ws.send(JSON.stringify({
            cmd: "LEAVE_ROOM",
            username: state.currentUser,
            room_id: state.currentRoomId
        }));
        state.ws.close();
    }
    localStorage.removeItem('loto_current_room');

    UI.softResetGame();
    navToLobby();
}

// --- 2. LOGIN ---
export async function login(userArg, passArg, roomArg) {
    let username = (typeof userArg === 'string') ? userArg : document.getElementById('username').value.trim();
    let password = (typeof passArg === 'string') ? passArg : document.getElementById('password').value.trim();
    const roomId = (typeof roomArg === 'string') ? roomArg : "101";

    if (!username || !password) return alert("Vui lòng nhập Tên và Mật khẩu!");

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username, password})
        });
        if (!res.ok) {
            const err = await res.text();
            if (res.status === 422) return alert("Lỗi dữ liệu (422).");
            return alert("Lỗi: " + err);
        }
        const data = await res.json();
        if (data.status === 'ok') {
            localStorage.setItem('loto_user', data.username);
            localStorage.setItem('loto_role', data.role);
            localStorage.setItem('loto_balance', data.balance);
            state.currentUser = data.username;
            state.userRole = data.role;
            state.currentRoomId = roomId;

            if (data.role === 'admin') navToAdminDashboard();
            else navToLobby();

            if (typeof roomArg === 'string') connectWS();
        }
    } catch (e) {
        alert("Lỗi kết nối!");
        console.error(e);
    }
}

// --- 3. ADMIN MANAGER ---
export async function loadUserList() {
    const tbody = document.getElementById('user-list-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Đang tải...</td></tr>';

    try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
            const users = await res.json();
            tbody.innerHTML = "";
            users.forEach(u => {
                const isSelf = u.username === state.currentUser;
                const deleteBtn = isSelf
                    ? `<span style="color:#ccc; font-size:0.8em;">(Bạn)</span>`
                    : `<button class="btn" style="background: #e74c3c; padding: 5px 10px; font-size: 0.8em; margin-left: 5px;" onclick="deleteUser('${u.username}')">🗑️ Xóa</button>`;

                tbody.innerHTML += `
                    <tr>
                        <td style="padding:10px; font-weight:bold;">${u.username}</td>
                        <td style="padding:10px;">
                            <span style="background:${u.role === 'admin' ? '#ffeeba' : '#e8f8f5'}; padding:3px 8px; border-radius:10px; font-size:0.9em;">
                                ${u.role.toUpperCase()}
                            </span>
                        </td>
                        <td style="padding:10px; color:#27ae60; font-weight:bold;">
                            ${new Intl.NumberFormat('vi-VN').format(u.balance)}
                        </td>
                        <td style="padding:10px; text-align: center;">
                            <button class="btn" style="background: #3498db; padding: 5px 10px; font-size: 0.8em;" onclick="openEditModal('${u.username}', ${u.balance})">✏️ Sửa</button>
                            ${deleteBtn}
                        </td>
                    </tr>
                `;
            });
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:red; text-align:center;">Lỗi tải!</td></tr>';
    }
}

export async function deleteUser(targetUser) {
    if (!confirm(`⚠️ CẢNH BÁO!\n\nBạn có chắc chắn muốn xóa user "${targetUser}"?\nHành động này không thể hoàn tác!`)) return;

    try {
        const res = await fetch('/api/admin/delete_user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({target_username: targetUser, admin_username: state.currentUser})
        });
        const data = await res.json();
        if (data.status === 'ok') {
            alert("✅ Đã xóa thành công!");
            await loadUserList(); // FIX: Thêm await
        } else {
            alert("❌ Lỗi: " + data.message);
        }
    } catch (e) {
        alert("Lỗi kết nối!");
        console.error(e);
    }
}

export function openEditModal(username, currentBalance) {
    const modal = document.getElementById('edit-user-modal');
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const span = document.getElementById('edit-target-username');
    span.innerText = username;
    span.dataset.rawUser = username;

    document.getElementById('edit-new-balance').value = currentBalance;
    document.getElementById('edit-new-password').value = "";
}

export function closeEditModal() {
    const modal = document.getElementById('edit-user-modal');
    modal.classList.add('hidden');
    modal.style.display = 'none';
}

export async function submitEditUser() {
    const targetUser = document.getElementById('edit-target-username').dataset.rawUser;
    const newPass = document.getElementById('edit-new-password').value.trim();
    const newBalInput = document.getElementById('edit-new-balance').value;

    let finalBalance = null;
    if (newBalInput !== "") finalBalance = parseInt(newBalInput);

    const payload = {
        target_username: targetUser,
        admin_username: state.currentUser,
        new_balance: finalBalance,
        new_password: newPass || null
    };

    try {
        const res = await fetch('/api/admin/update_user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'ok') {
            alert("✅ Cập nhật thành công!");
            closeEditModal();
            await loadUserList(); // FIX: Thêm await
        } else {
            alert("❌ " + data.message);
        }
    } catch (e) {
        alert("Lỗi kết nối!");
    }
}

export async function createNewUser() {
    const u = document.getElementById('new-username').value.trim();
    const p = document.getElementById('new-password').value.trim();
    const r = document.getElementById('new-role').value;
    const balInput = document.getElementById('new-initial-balance').value;
    const bal = balInput ? parseInt(balInput) : 0;

    if (!u || !p) return alert("Thiếu tên hoặc mật khẩu!");

    try {
        const res = await fetch('/api/admin/create_user', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: u, password: p, role: r, balance: bal, creator: state.currentUser
            })
        });
        const data = await res.json();
        if (data.status === 'ok') {
            alert("✅ Tạo thành công!");
            document.getElementById('new-username').value = "";
            document.getElementById('new-password').value = "";
            document.getElementById('new-initial-balance').value = "";
            await loadUserList(); // FIX: Thêm await
        } else {
            alert("❌ " + data.message);
        }
    } catch (e) {
        alert("Lỗi kết nối!");
    }
}

// --- 4. ROOM & GAME ---
export async function refreshRoomList() {
    const container = document.getElementById('room-list');
    if (!container) return;
    try {
        const res = await fetch('/api/rooms');
        if (!res.ok) return;
        const rooms = await res.json();
        state.availableRooms = rooms;
        if (rooms.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;">Chưa có phòng nào.</div>';
            return;
        }
        container.innerHTML = "";
        rooms.forEach(room => {
            const div = document.createElement('div');
            const isFull = room.count >= 16;
            div.className = `room-item ${isFull ? 'full' : ''}`;
            div.onclick = () => {
                if (!isFull) joinRoom(room.id);
            };
            div.innerHTML = `<div><span class="room-id">🚪 ${room.id}</span> <span style="font-size:0.8em">Host: ${room.host || '-'}</span></div><div class="room-count">👤 ${room.count}/16</div>`;
            container.appendChild(div);
        });
    } catch (e) {
        console.error(e);
    }
}

export function createRandomRoom() {
    let newId;
    let attempts = 0;
    do {
        newId = Math.floor(Math.random() * 900) + 100;
        attempts++;
        // FIX: "Comparison r.id == newId may cause unexpected type coercion"
        // r.id là string (từ server), newId là number -> convert newId sang string để so sánh ===
    } while (state.availableRooms.find(r => r.id === newId.toString()) && attempts < 100);

    joinRoom(newId.toString());
}

export function joinRoom(roomId) {
    if (!state.currentUser) return alert("Chưa đăng nhập!");
    state.currentRoomId = roomId;

    localStorage.setItem('loto_current_room', roomId);

    document.getElementById('display-name').innerText = state.currentUser;
    document.getElementById('display-room-id').innerText = roomId;
    document.getElementById('avatar-char').innerText = state.currentUser.charAt(0).toUpperCase();
    showScreen('game-grid');
    UI.initMasterBoard();

    // FIX: "Promise returned from fetchAndInitTickets is ignored"
    fetchAndInitTickets().catch(console.error);

    connectWS();
}

async function fetchAndInitTickets() {
    const res = await fetch('/api/tickets');
    const tickets = await res.json();
    const poolGrid = document.getElementById('pool-grid');
    if (!poolGrid) return;
    poolGrid.innerHTML = "";
    state.ticketDataMap = {};

    tickets.forEach(ticket => {
        state.ticketDataMap[ticket.id] = ticket;

        // Tạo thẻ bao ngoài (Thumb)
        const thumb = document.createElement('div');
        thumb.className = 'ticket-thumb';
        thumb.id = `pool-ticket-${ticket.id}`;
        thumb.style.borderColor = ticket.color;

        // --- BẮT ĐẦU FIX: Dùng DOM thay vì innerHTML để tránh warning onerror ---

        // 1. Tạo thẻ Ảnh (Image)
        const img = document.createElement('img');
        img.src = `/images/ticket-${ticket.id}.png`;
        img.className = 'ticket-img';
        img.alt = `Vé ${ticket.id}`;

        // Xử lý sự kiện lỗi ảnh bằng hàm (Clean Code)
        img.onerror = function () {
            this.style.display = 'none';       // Ẩn ảnh lỗi
            fallbackDiv.style.display = 'block'; // Hiện số vé thay thế
        };

        // 2. Tạo thẻ Text thay thế (Fallback Div) - Mặc định ẩn
        const fallbackDiv = document.createElement('div');
        fallbackDiv.innerText = `#${ticket.id}`;
        fallbackDiv.style.display = 'none';
        fallbackDiv.style.fontWeight = 'bold';
        fallbackDiv.style.fontSize = '1.2em';
        fallbackDiv.style.color = ticket.color;

        // 3. Tạo thẻ Tên người sở hữu (Owner Name)
        const ownerDiv = document.createElement('div');
        ownerDiv.className = 'owner-name';
        // Set style trực tiếp (hoặc dùng cssText cho gọn)
        ownerDiv.style.cssText = "position:absolute; bottom:0; width:100%; text-align:center; font-size:0.7em; background:rgba(255,255,255,0.9); font-weight:bold; padding:2px; display:none;";

        // Gắn các thẻ con vào thumb
        thumb.appendChild(img);
        thumb.appendChild(fallbackDiv);
        thumb.appendChild(ownerDiv);

        // --- KẾT THÚC FIX ---

        thumb.onclick = () => selectTicket(ticket.id);
        poolGrid.appendChild(thumb);
    });
}

// EXPORT GAME FUNCTIONS
export function selectTicket(ticketId) {
    if (state.isConfirmed) return alert("Đã chốt vé!");
    if (state.myTicketIds.length >= 2) return alert("Max 2 vé!");
    if (state.myTicketIds.includes(ticketId)) return;
    state.ws.send(JSON.stringify({
        cmd: "SELECT_TICKET",
        ticket_id: ticketId,
        username: state.currentUser,
        room_id: state.currentRoomId
    }));
}

export function unselectTicket(event, ticketId) {
    if (event) event.stopPropagation();
    if (state.isConfirmed) return alert("Đã chốt vé!");
    state.ws.send(JSON.stringify({
        cmd: "UNSELECT_TICKET",
        ticket_id: ticketId,
        username: state.currentUser,
        room_id: state.currentRoomId
    }));
}

export function confirmSelection() {
    if (state.myTicketIds.length === 0) return alert("Chọn vé đi!");
    state.ws.send(JSON.stringify({cmd: "CONFIRM_TICKET", username: state.currentUser, room_id: state.currentRoomId}));
    state.isConfirmed = true;
    UI.toggleViewMode();
}

export function setPrice() {
    const p = document.getElementById('host-price-input').value;
    state.ws.send(JSON.stringify({
        cmd: "SET_PRICE",
        price: parseInt(p),
        username: state.currentUser,
        room_id: state.currentRoomId
    }));
}

export function transferHost() {
    const target = document.getElementById('transfer-target').value;
    if (target) state.ws.send(JSON.stringify({
        cmd: "TRANSFER_HOST",
        target: target,
        username: state.currentUser,
        room_id: state.currentRoomId
    }));
}

export function hostAction(action) {
    state.ws.send(JSON.stringify({cmd: action, username: state.currentUser, room_id: state.currentRoomId}));
}

export function signalWait() {
    state.ws.send(JSON.stringify({cmd: "SIGNAL_WAIT", username: state.currentUser, room_id: state.currentRoomId}));
}

export function toggleAutoDraw() {
    const intervalInput = document.getElementById('auto-interval');
    if (!state.isAutoDrawing) {
        if (!state.hasGameStartedOnce) {
            const uniquePlayers = new Set(Object.values(state.ticketOwners));
            const numPlayers = uniquePlayers.size;
            const numSpectators = state.onlineUsers.length - numPlayers;
            const msg = `SẴN SÀNG CHƯA?\n\n✅ Đã chọn vé: ${numPlayers} người\n⏳ Chưa chọn vé: ${numSpectators} người\n\nẤn OK để bắt đầu ngay!`;
            if (!confirm(msg)) return;
        }
        const secs = parseInt(intervalInput.value) || 3;
        state.ws.send(JSON.stringify({
            cmd: "START_AUTO_DRAW",
            interval: secs,
            username: state.currentUser,
            room_id: state.currentRoomId
        }));
    } else {
        state.ws.send(JSON.stringify({
            cmd: "STOP_AUTO_DRAW",
            username: state.currentUser,
            room_id: state.currentRoomId
        }));
    }
}

// FIX: Export hàm toggleAutoMode để main.js có thể gắn vào window
// UI.handleAutoModeToggle đã được import ở trên
export function toggleAutoMode(checkbox) {
    UI.handleAutoModeToggle(checkbox.checked);
}