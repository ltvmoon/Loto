import { state } from './state.js';
import * as Actions from './actions.js';

export function log(text) {
    const p = document.createElement('p');
    p.innerText = text;
    const logArea = document.getElementById('log-area');
    if (logArea) logArea.prepend(p);
}

export function updateDisplay(current, history) {
    // FIX: Convert number to string
    const currentBall = document.getElementById('current-ball');
    if (currentBall) currentBall.innerText = current.toString();

    if (history && history.length > 0) {
        const reversed = [...history].reverse();
        const recent5 = reversed.slice(1, 6);
        const historyList = document.getElementById('recent-history-list');
        if (historyList) {
            historyList.innerText = recent5.length > 0 ? recent5.join(" - ") : "Mới bắt đầu";
        }
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
    // FIX: Convert number to string
    const statDrawn = document.getElementById('stat-drawn');
    const statRemain = document.getElementById('stat-remain');
    if (statDrawn) statDrawn.innerText = history.length.toString();
    if (statRemain) statRemain.innerText = (90 - history.length).toString();
}

export function initMasterBoard() {
    const grid = document.getElementById('master-grid');
    if (!grid) return;
    grid.innerHTML = "";
    for (let i = 1; i <= 90; i++) {
        const cell = document.createElement('div');
        cell.className = 'mb-cell';
        cell.id = `mb-${i}`;
        // FIX: Convert number to string
        cell.innerText = i.toString();
        grid.appendChild(cell);
    }
}

export function updateUserListUI() {
    const container = document.getElementById('participants-list');
    if (!container) return;
    container.innerHTML = "";

    // FIX: Convert number to string
    const userCount = document.getElementById('user-count');
    if (userCount) userCount.innerText = state.onlineUsers.length.toString();

    const activePlayers = new Set(Object.values(state.ticketOwners));
    const statDrawn = document.getElementById('stat-drawn');
    const gameRunning = statDrawn && statDrawn.innerText !== "0";

    state.onlineUsers.forEach(u => {
        const div = document.createElement('div');
        div.className = 'p-item';

        // FIX: "Variable initializer is redundant"
        let roleTag;
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
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Chọn --</option>';
    state.onlineUsers.forEach(u => {
        if (u !== state.currentUser) {
            const opt = document.createElement('option');
            opt.value = u;
            opt.innerText = u;
            select.appendChild(opt);
        }
    });
    if (state.onlineUsers.includes(currentVal)) select.value = currentVal;
}

export function checkHostStatus(hostName) {
    const panel = document.getElementById('host-panel');
    const nameDisplay = document.getElementById('display-name');
    if (!panel || !nameDisplay) return;

    if (hostName === state.currentUser) {
        state.isHost = true;
        panel.classList.remove('hidden');
        nameDisplay.innerText = state.currentUser + " 👑";
        updateHostTransferDropdown();
    } else {
        state.isHost = false;
        panel.classList.add('hidden');
        nameDisplay.innerText = state.currentUser;
    }
}

export function updateEconomicUI(price, totalTickets) {
    state.currentTicketPrice = price;
    state.totalSoldTickets = totalTickets;
    const pot = price * totalTickets;
    // Intl format returns string -> OK
    const priceDisplay = document.getElementById('current-price-display');
    const potDisplay = document.getElementById('current-pot-display');
    if (priceDisplay) priceDisplay.innerText = new Intl.NumberFormat('vi-VN').format(price);
    if (potDisplay) potDisplay.innerText = new Intl.NumberFormat('vi-VN').format(pot);
}

export function updateAutoDrawUI(status) {
    const btn = document.getElementById('btn-auto-draw');
    const intervalInput = document.getElementById('auto-interval');
    const btnReset = document.getElementById('btn-reset-game');
    state.isAutoDrawing = status;

    if (!btn || !intervalInput || !btnReset) return;

    if (status) {
        btn.innerHTML = "⏸ DỪNG";
        btn.className = "btn btn-stop";
        intervalInput.disabled = true;
        btnReset.disabled = true;
        btnReset.classList.add('btn-disabled');
    } else {
        btn.innerHTML = "▶ QUAY";
        btn.className = "btn btn-draw";
        intervalInput.disabled = false;
        btnReset.disabled = false;
        btnReset.classList.remove('btn-disabled');
    }
}

export function updateWaitLeaderboard() {
    const container = document.getElementById('wait-leaderboard');
    if (!container) return;
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
    if (!area) return;
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
            if (ticketDOM && myContainer) myContainer.appendChild(ticketDOM);
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
    const countEl = document.getElementById('ticket-count');
    // FIX: Convert number to string
    if (countEl) countEl.innerText = state.myTicketIds.length.toString();
    toggleViewMode();
}

function renderMyTicketDOM(ticketId) {
    const ticketData = state.ticketDataMap[ticketId];
    if (!ticketData) return null;

    const ticketDiv = document.createElement('div');
    ticketDiv.className = 'ticket-detail';
    ticketDiv.id = `my-ticket-${ticketId}`;
    ticketDiv.style.borderColor = ticketData.color;

    // FIX: "Deprecated symbol used" - Thay thế innerHTML chứa inline 'event' bằng createElement
    const header = document.createElement('div');
    header.className = 'ticket-header';
    header.style.backgroundColor = ticketData.color;

    // Tạo span ID vé
    const spanId = document.createElement('span');
    spanId.innerText = `#${ticketId}`;

    // Tạo nút Trả vé bằng DOM API để tránh dùng 'event' trong chuỗi HTML
    const btnReturn = document.createElement('span');
    btnReturn.className = 'btn-return-ticket';
    btnReturn.style.cursor = 'pointer';
    btnReturn.innerText = '✖ TRẢ VÉ';
    // Gán trực tiếp hàm onclick, không dùng inline string
    btnReturn.onclick = (e) => Actions.unselectTicket(e, ticketId);

    header.appendChild(spanId);
    header.appendChild(btnReturn);
    ticketDiv.appendChild(header);

    ticketData.rows.forEach(rowCells => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        rowCells.forEach(cellValue => {
            const cell = document.createElement('div');
            cell.className = 'cell';
            if (cellValue !== null) {
                // FIX: Convert number to string for innerText and dataset
                cell.innerText = cellValue.toString();
                cell.dataset.value = cellValue.toString();

                cell.onclick = (e) => {
                    e.stopPropagation();
                    cell.classList.toggle('marked');

                    // FIX: "Local variable ticketColor is redundant" - Inline trực tiếp
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
    if (!pool || !conf || !btnWait) return;

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
        u.rate = 1.6;
        window.speechSynthesis.speak(u);
    }
}

export function handleAutoModeToggle(isChecked) {
    state.isAutoMode = isChecked;
    const label = document.getElementById('mode-label');

    if (state.isAutoMode) {
        if(label) label.innerText = "Auto (Tự tô)";
        label.style.color = "#27ae60";
    } else {
        if(label) label.innerText = "Manual (Tự chọn)";
        label.style.color = "#7f8c8d";
    }

    const drawnCells = document.querySelectorAll('.mb-cell.active');
    const drawnNumbers = Array.from(drawnCells).map(el => parseInt(el.id.replace('mb-', '')));

    document.querySelectorAll('.ticket-detail .cell').forEach(cell => {
        const val = parseInt(cell.dataset.value);
        if (drawnNumbers.includes(val)) {
            // FIX: "Local variable ticketColor is redundant" - Inline vào logic
            if (state.isAutoMode) {
                cell.classList.add('marked');
                cell.style.backgroundColor = cell.closest('.ticket-detail').style.borderColor;
            } else {
                cell.classList.remove('marked');
                cell.style.backgroundColor = "";
            }
        }
    });
}

export function highlightMyNumbers(num) {
    document.querySelectorAll('.ticket-detail .cell').forEach(cell => {
        // parseInt trả về number, dataset.value là string, so sánh OK nhưng logic tốt hơn là convert num to string
        if (parseInt(cell.dataset.value) === num) {
            cell.classList.add('highlight');
            if (state.isAutoMode) {
                cell.classList.add('marked');
                // FIX: "Local variable ticketColor is redundant" - Inline trực tiếp
                cell.style.backgroundColor = cell.closest('.ticket-detail').style.borderColor;
            }
        }
    });
}

export function softResetGame() {
    state.hasGameStartedOnce = false;
    state.myTicketIds = [];
    state.isConfirmed = false;
    state.ticketOwners = {};
    const myContainer = document.getElementById('my-tickets-container');
    if(myContainer) myContainer.innerHTML = "";
    updateConfirmedUI(false);
    document.querySelectorAll('.ticket-thumb').forEach(t => {
        t.classList.remove('taken', 'selected');
        const l = t.querySelector('.owner-name');
        if (l) { l.innerText = ""; l.style.display = 'none'; }
    });
    initMasterBoard();

    // FIX: Convert string literal to string (thực ra "0" là string rồi, nhưng để consistency)
    const statDrawn = document.getElementById('stat-drawn');
    const statRemain = document.getElementById('stat-remain');
    if(statDrawn) statDrawn.innerText = "0";
    if(statRemain) statRemain.innerText = "90";

    const curBall = document.getElementById('current-ball');
    if(curBall) curBall.innerText = "--";

    const hist = document.getElementById('recent-history-list');
    if(hist) hist.innerText = "...";

    state.waitingMap = {};
    updateWaitLeaderboard();
    const winArea = document.getElementById('win-status-area');
    if(winArea) winArea.innerHTML = "";

    setGameDisabled(false);
    updateEconomicUI(state.currentTicketPrice, 0);
}