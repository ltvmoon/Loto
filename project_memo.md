# 📂 HỆ THỐNG GHI NHỚ NGOÀI - DỰ ÁN LOTO ONLINE

**Cập nhật lần cuối:** (Theo thời gian thực hiện tại)
**Tech Stack:**

* **Backend:** Rust, Axum, Tokio, DashMap, Rusqlite.
* **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules).
* **Communication:** WebSocket (Real-time).

---

## 1. Cấu Trúc Thư Mục (Modular Architecture)

Dự án hiện tại đã được tái cấu trúc để tách biệt nhiệm vụ (Separation of Concerns).

```text
loto-app/
├── Cargo.toml              # Cấu hình dependencies Rust
├── loto.db                 # Database SQLite (Lưu user & số dư)
├── tickets.json            # Dữ liệu mẫu các tờ vé số
├── src/                    # --- BACKEND ---
│   ├── main.rs             # Entry point, Routing, Setup DB/State
│   ├── model.rs            # Định nghĩa Struct (Room, Ticket, User, State)
│   ├── handlers.rs         # Xử lý API HTTP (Login, Get Rooms, Get Tickets)
│   └── ws.rs               # Logic WebSocket chính (Game loop, Handle commands)
└── static/                 # --- FRONTEND ---
    ├── index.html          # Khung HTML chính (Rất gọn)
    ├── images/             # Ảnh vé số (ticket-xxx.png)
    ├── css/
    │   └── style.css       # Toàn bộ Style giao diện
    └── js/
        ├── state.js        # Quản lý biến toàn cục (Global State)
        ├── ui.js           # Xử lý DOM, Render vé/list, Hiệu ứng
        ├── actions.js      # Xử lý sự kiện người dùng (Click, Input)
        ├── ws.js           # Xử lý kết nối & Phân loại tin nhắn WS
        └── main.js         # Entry point, gắn hàm vào window

```

---

## 2. Mô Hình Dữ Liệu (Data Models)

### Backend (`src/model.rs`)

* **`Room`**: Quản lý trạng thái 1 phòng chơi.
* `users`: Danh sách người chơi (`DashMap`).
* `ticket_owners`: Map `ticket_id` -> `username`.
* `drawn_numbers`: Mảng số đã gọi.
* `is_game_over`: Trạng thái kết thúc.
* `log_history`: Lưu 50 dòng log gần nhất để đồng bộ cho người vào sau.
* `auto_draw_handle`: Quản lý thread quay số tự động.


* **`UserInfo`**: Thông tin người chơi (`score`, `is_confirmed`).
* **`RoomSummary`**: Struct trả về cho API danh sách phòng (ID, sĩ số, Host).

### Frontend (`static/js/state.js`)

* Quản lý `currentUser`, `currentRoomId`, `isHost`.
* Phân loại user: `onlineUsers` (tất cả), `ticketOwners` (người chơi chính).
* Trạng thái: `isAutoDrawing`, `hasGameStartedOnce` (để hiện popup confirm).

---

## 3. Quy Tắc Nghiệp Vụ (Business Logic)

### A. Quản lý Phòng (Room Management)

1. **Tạo phòng:** Người dùng có thể nhập ID phòng bất kỳ hoặc tạo Random.
2. **Giới hạn:** Tối đa **16 người/phòng**. Nếu đầy, Server từ chối kết nối.
3. **Tự hủy:** Khi người cuối cùng rời phòng (`users.is_empty()`), Server sẽ **xóa phòng** khỏi bộ nhớ để giải phóng tài nguyên.

### B. Vai trò (Roles)

1. **Host (Chủ phòng):**
* Là người đầu tiên vào phòng hoặc được chỉ định sau khi Host cũ thoát.
* Quyền: Đặt giá vé, Quay số/Dừng quay, Reset ván, Chuyển quyền Host.
* **Chuyển Host:** Chỉ được thực hiện khi ván chơi chưa bắt đầu (hoặc đã Reset).


2. **Player (Người chơi):**
* Là người **đang giữ ít nhất 1 vé**.
* Quyền: Báo chờ, Chốt vé, Nhận thưởng.


3. **Spectator (Khán giả):**
* Là người trong phòng nhưng **không giữ vé**.
* Nếu vào khi ván đang chạy -> Bắt buộc làm khán giả (không mua được vé).
* Hạn chế: Không được báo chờ, không được tính vào danh sách chia thưởng.



### C. Kinh Tế (Economy)

1. **Giá vé:** Host thiết lập. Mặc định 0.
2. **Mua vé:** Trừ tiền ngay lập tức (`balance - price`).
3. **Trả vé:** Hoàn tiền ngay lập tức (`balance + price`).
4. **Hũ thưởng (Pot):** `Tổng vé đã bán * Giá vé`.
5. **Chia thưởng:** Khi có người thắng, Hũ chia đều cho số người thắng (Cộng vào DB).

### D. Luồng Game (Game Flow)

1. **Chuẩn bị:**
* Host đặt giá.
* Người chơi chọn vé -> Ấn "Xác nhận chốt vé" (`CONFIRM_TICKET`).


2. **Bắt đầu:**
* Host ấn "Quay".
* **Validation:** Server kiểm tra:
* Phòng có người không?
* **Tất cả người giữ vé đã chốt vé chưa?** (Nếu chưa chốt -> Báo lỗi, không cho chạy).


* Client hiện Popup xác nhận lần đầu ("Sẵn sàng chưa?"). Các lần sau (pause/resume) không hỏi lại.


3. **Diễn biến:**
* Server tự động quay số theo interval (ví dụ 3s).
* Gửi số về Client -> Client đọc số, tô màu.


4. **Kết thúc:**
* Server tự check hàng ngang đủ số -> Xác định Winner.
* Dừng quay, cộng tiền, thông báo Winner.
* Host phải ấn **"Ván Mới" (Reset)** để bắt đầu lại (xóa vé, xóa số, đưa khán giả về trạng thái có thể mua vé).



---

## 4. Giao thức WebSocket

### Client gửi lên (Commands)

| Command | Tham số | Mô tả |
| --- | --- | --- |
| `JOIN` | `username`, `room_id` | Vào phòng. |
| `SELECT_TICKET` | `ticket_id` | Mua vé (trừ tiền). |
| `UNSELECT_TICKET` | `ticket_id` | Trả vé (hoàn tiền). |
| `CONFIRM_TICKET` | - | Khóa vé để sẵn sàng chơi. |
| `SET_PRICE` | `price` | Host đặt giá vé. |
| `START_AUTO_DRAW` | `interval` | Host bắt đầu quay. |
| `STOP_AUTO_DRAW` | - | Host tạm dừng. |
| `RESET` | - | Host tạo ván mới (xóa dữ liệu ván cũ). |
| `TRANSFER_HOST` | `target` | Chuyển quyền Host cho user khác. |
| `SIGNAL_WAIT` | - | Báo chờ (chỉ Player mới được dùng). |

### Server gửi về (Events)

| Type | Dữ liệu kèm theo | Mô tả |
| --- | --- | --- |
| `SYNC_STATE` | `numbers`, `owners`, `host`, `logs`, `users`... | Đồng bộ toàn bộ trạng thái khi mới vào/F5. |
| `USER_JOINED` | `username` | Có người mới vào. |
| `USER_LEFT` | `username` | Có người thoát. |
| `HOST_CHANGED` | `username` | Chủ phòng mới. |
| `TICKET_TAKEN` | `ticket_id`, `owner` | Vé đã được mua. |
| `TICKET_FREED` | `ticket_id` | Vé đã được trả. |
| `NEW_NUMBER` | `value`, `history` | Số mới vừa quay. |
| `WINNER` | `username`, `message` | Có người thắng (kèm thông tin tiền thưởng). |
| `ERROR` | `message` | Thông báo lỗi (VD: Chưa chốt vé). |
| `PRICE_UPDATED` | `price` | Giá vé thay đổi. |
| `BALANCE_UPDATE` | `balance` | Cập nhật số dư tiền hiển thị. |

---

## 5. Lưu ý quan trọng (Known Behaviors)

1. **Chuyển Host:** Dropdown list tự động lọc bỏ tên chính mình. Chỉ chuyển được khi game đang dừng hoặc chưa bắt đầu.
2. **Bug Fixes:**
* Đã fix lỗi vé "ma" (trả vé nhưng hình không mất).
* Đã fix lỗi "người chưa mua vé vẫn quay được" (Server check chặt chẽ).
* Đã fix lỗi "phòng ảo" (Server tự xóa phòng khi user cuối cùng out).
* Đã fix lỗi Popup confirm hiện liên tục hoặc không hiện (Dùng cờ `hasGameStartedOnce` + sync từ Server).