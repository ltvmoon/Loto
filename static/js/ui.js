import { state } from './state.js';
import * as Actions from './actions.js'; // Để gọi unselectTicket từ HTML được tạo ra

export function log(text) {
    const p = document.createElement('p');
    p.innerText = text;
    document.getElementById('log-area').prepend(p);
}

export function updateDisplay(current, history) {
    document.getElementById('current-ball').innerText = current;
    if (history && history.length > 0) {
        const reversed = [...history].reverse();
        const recent5 = reversed.slice(1, 6);
        document.getElementById('recent-history-list').innerText = recent5.length > 0 ? recent5.join(" - ") : "Mới bắt đầu";
        updateMasterBoard(history);
    }
}

function updateMasterBoard(history) {
    document.querySelectorAll('.mb-cell').forEach(c => c.className = 'mb-cell');
    history.forEach((num, index) => {
        const cell = document.getElementById(`mb-${num}`);
        if (cell) {
            cell.classList.add('active');
            if (index === history.length - 1) cell.classList.add('latest');
        }
    });
    document.getElementById('stat-drawn').innerText = history.length;
    document.getElementById('stat-remain').innerText = 90 - history.length;
}

export function initMasterBoard() {
    const grid = document.getElementById('master-grid');
    grid.innerHTML = "";
    for (let i = 1; i <= 90; i++) {
        const cell = document.createElement('div');
        cell.className = 'mb-cell';
        cell.id = `mb-${i}`;
        cell.innerText = i;
        grid.appendChild(cell);
    }
}

export function updateUserListUI() {
    const container = document.getElementById('participants-list');
    container.innerHTML = "";
    document.getElementById('user-count').innerText = state.onlineUsers.length;

    const activePlayers = new Set(Object.values(state.ticketOwners));
    const gameRunning = document.getElementById('stat-drawn').innerText !== "0";

    state.onlineUsers.forEach(u => {
        const div = document.createElement('div');
        div.className = 'p-item';
        let roleTag = "";
        if (u === state.currentHost) roleTag = '<span class="p-host">👑 Host</span>';
        else if (activePlayers.has(u)) roleTag = '<span class="p-player">🎫 Chơi</span>';
        else if (gameRunning) roleTag = '<span class="p-spectator">👓 Khán giả</span>';
        else roleTag = '<span style="color:#999;font-size:0.8em">Đang chọn...</span>';

        div.innerHTML = `<span>${u} ${u === state.currentUser ? '(Bạn)' : ''}</span> ${roleTag}`;
        container.appendChild(div);
    });

    if (state.isHost) updateHostTransferDropdown();
}

export function updateHostTransferDropdown() {
    const select = document.getElementById('transfer-target');
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Chọn --</option>';
    state.onlineUsers.forEach(u => {
        if (u !== state.currentUser) {
            const opt = document.createElement('option');
            opt.value = u; opt.innerText = u;
            select.appendChild(opt);
        }
    });
    if (state.onlineUsers.includes(currentVal)) select.value = currentVal;
}

export function checkHostStatus(hostName) {
    const panel = document.getElementById('host-panel');
    if (hostName === state.currentUser) {
        state.isHost = true;
        panel.classList.remove('hidden');
        document.getElementById('display-name').innerText = state.currentUser + " 👑";
        updateHostTransferDropdown();
    } else {
        state.isHost = false;
        panel.classList.add('hidden');
        document.getElementById('display-name').innerText = state.currentUser;
    }
}

export function updateEconomicUI(price, totalTickets) {
    state.currentTicketPrice = price;
    state.totalSoldTickets = totalTickets;
    const pot = price * totalTickets;
    document.getElementById('current-price-display').innerText = new Intl.NumberFormat('vi-VN').format(price);
    document.getElementById('current-pot-display').innerText = new Intl.NumberFormat('vi-VN').format(pot);
}

export function updateAutoDrawUI(status) {
    const btn = document.getElementById('btn-auto-draw');
    const intervalInput = document.getElementById('auto-interval');
    const btnReset = document.getElementById('btn-reset-game');
    state.isAutoDrawing = status;

    if (status) {
        btn.innerHTML = "⏸ DỪNG"; btn.className = "btn btn-stop"; intervalInput.disabled = true;
        btnReset.disabled = true; btnReset.classList.add('btn-disabled');
    } else {
        btn.innerHTML = "▶ QUAY"; btn.className = "btn btn-draw"; intervalInput.disabled = false;
        btnReset.disabled = false; btnReset.classList.remove('btn-disabled');
    }
}

export function updateWaitLeaderboard() {
    const container = document.getElementById('wait-leaderboard');
    container.innerHTML = "";
    const entries = Object.entries(state.waitingMap);
    if (entries.length === 0) {
        container.innerHTML = `<div style="color:#aaa;text-align:center;">Trống</div>`;
        return;
    }
    entries.sort((a, b) => b[1] - a[1]);
    entries.forEach(([name, count]) => {
        const div = document.createElement('div');
        div.className = 'wait-item';
        div.innerHTML = `<span>👤 ${name}</span> <span class="wait-badge">Đang chờ: ${count} hàng</span>`;
        container.appendChild(div);
    });
}

export function addStatusLog(username, statusText, type) {
    const area = document.getElementById('win-status-area');
    while (area.children.length >= 5) { area.removeChild(area.lastChild); }
    const div = document.createElement('div');
    div.className = `status-card st-${type}`;
    const time = new Date().toLocaleTimeString('vi-VN', { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    div.innerHTML = `<span><span style="text-transform:uppercase">${username}</span>: <span>${statusText}</span></span><span class="st-time">${time}</span>`;
    area.prepend(div);
    if (type === 'checking') {
        setTimeout(() => {
            div.style.transition = "opacity 0.5s ease"; div.style.opacity = "0";
            setTimeout(() => { if (div.parentNode) div.remove(); }, 500);
        }, 1000);
    }
}

export function setGameDisabled(isDisabled) {
    const btnWait = document.getElementById('btn-wait');
    const drawWrapper = document.getElementById('draw-controls-wrapper');
    if (isDisabled) {
        if (btnWait) btnWait.classList.add('game-disabled');
        if (drawWrapper) drawWrapper.classList.add('game-disabled');
    } else {
        if (btnWait) btnWait.classList.remove('game-disabled');
        if (drawWrapper) drawWrapper.classList.remove('game-disabled');
    }
}

export function updateTicketStatus(ticketId, owner) {
    const poolThumb = document.getElementById(`pool-ticket-${ticketId}`);
    const myContainer = document.getElementById('my-tickets-container');
    const existingMyTicket = document.getElementById(`my-ticket-${ticketId}`);

    if (poolThumb) {
        poolThumb.classList.remove('taken', 'selected');
        const l = poolThumb.querySelector('.owner-name');
        if (l) { l.innerText = ""; l.style.display = 'none'; }
    }

    if (owner === state.currentUser) {
        if (!state.myTicketIds.includes(ticketId)) state.myTicketIds.push(ticketId);
        if (poolThumb) poolThumb.classList.add('selected');
        if (!existingMyTicket) {
            const ticketDOM = renderMyTicketDOM(ticketId);
            myContainer.appendChild(ticketDOM);
        }
        if (!state.isConfirmed) updateConfirmedUI(false);
    } else {
        if (existingMyTicket) existingMyTicket.remove();
        const idx = state.myTicketIds.indexOf(ticketId);
        if (idx > -1) state.myTicketIds.splice(idx, 1);
        if (owner && poolThumb) {
            poolThumb.classList.add('taken');
            const l = poolThumb.querySelector('.owner-name');
            if (l) { l.innerText = owner; l.style.display = 'block'; }
        }
    }
    document.getElementById('ticket-count').innerText = state.myTicketIds.length;
    toggleViewMode();
}

function renderMyTicketDOM(ticketId) {
    const ticketData = state.ticketDataMap[ticketId];
    if (!ticketData) return null;
    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'ticket-detail';
    ticketDiv.id = `my-ticket-${ticketId}`;
    ticketDiv.style.borderColor = ticketData.color;
    const header = document.createElement('div');
    header.className = 'ticket-header';
    header.style.backgroundColor = ticketData.color;
    // Quan trọng: onclick gọi unselectTicket
    header.innerHTML = `<span>#${ticketId}</span><span class="btn-return-ticket" style="cursor:pointer" onclick="unselectTicket(event, ${ticketId})">✖ TRẢ VÉ</span>`;
    ticketDiv.appendChild(header);

    ticketData.rows.forEach(rowCells => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowCells.forEach(cellValue => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (cellValue !== null) {
                cell.innerText = cellValue;
                cell.dataset.value = cellValue;
                cell.onclick = (e) => {
                    e.stopPropagation();
                    cell.classList.toggle('marked');
                    cell.style.backgroundColor = cell.classList.contains('marked') ? ticketData.color : "";
                };
            }
            rowDiv.appendChild(cell);
        });
        ticketDiv.appendChild(rowDiv);
    });
    return ticketDiv;
}

export function updateConfirmedUI(status) {
    state.isConfirmed = status;
    const btn = document.querySelector('#confirm-section button');
    const returnBtns = document.querySelectorAll('.btn-return-ticket');
    if (status) {
        if (btn) { btn.innerHTML = "🔒 ĐÃ CHỐT"; btn.className = "btn btn-disabled"; btn.onclick = null; }
        returnBtns.forEach(b => b.style.display = 'none');
    } else {
        if (btn) { btn.innerHTML = "✅ XÁC NHẬN"; btn.className = "btn btn-success"; btn.onclick = Actions.confirmSelection; }
        returnBtns.forEach(b => b.style.display = 'inline');
    }
    toggleViewMode();
}

export function toggleViewMode() {
    const pool = document.getElementById('pool-area');
    const conf = document.getElementById('confirm-section');
    const btnWait = document.getElementById('btn-wait');
    if (state.myTicketIds.length === 0) {
        pool.classList.remove('hidden'); conf.classList.add('hidden'); btnWait.classList.add('hidden');
    } else if (!state.isConfirmed) {
        pool.classList.remove('hidden'); conf.classList.remove('hidden'); btnWait.classList.add('hidden');
    } else {
        pool.classList.add('hidden'); conf.classList.remove('hidden'); btnWait.classList.remove('hidden');
    }
}

export function speakNumber(num) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(`Số ${num}`);
        u.lang = 'vi-VN';
        window.speechSynthesis.speak(u);
    }
}

export function highlightMyNumbers(num) {
    document.querySelectorAll('.ticket-detail .cell').forEach(cell => {
        if (parseInt(cell.dataset.value) === num) cell.classList.add('highlight');
    });
}

export function softResetGame() {
    state.hasGameStartedOnce = false;
    state.myTicketIds = [];
    state.isConfirmed = false;
    state.ticketOwners = {};
    document.getElementById('my-tickets-container').innerHTML = "";
    updateConfirmedUI(false);
    document.querySelectorAll('.ticket-thumb').forEach(t => {
        t.classList.remove('taken', 'selected');
        const l = t.querySelector('.owner-name');
        if (l) { l.innerText = ""; l.style.display = 'none'; }
    });
    initMasterBoard();
    document.getElementById('stat-drawn').innerText = "0";
    document.getElementById('stat-remain').innerText = "90";
    document.getElementById('current-ball').innerText = "--";
    document.getElementById('recent-history-list').innerText = "...";
    state.waitingMap = {};
    updateWaitLeaderboard();
    document.getElementById('win-status-area').innerHTML = "";
    setGameDisabled(false);
    updateEconomicUI(state.currentTicketPrice, 0);
}