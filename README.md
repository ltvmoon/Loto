# 🎲 Loto Việt Nam Online (Real-time Multiplayer)

![Rust](https://img.shields.io/badge/Backend-Rust_Axum-orange?style=for-the-badge&logo=rust)
![Frontend](https://img.shields.io/badge/Frontend-HTML_CSS_JS-blue?style=for-the-badge&logo=html5)
![Database](https://img.shields.io/badge/Database-SQLite-lightgrey?style=for-the-badge&logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

Một hệ thống game Loto truyền thống Việt Nam trực tuyến, hỗ trợ nhiều người chơi cùng lúc (Multiplayer) với tốc độ phản hồi thời gian thực (Real-time). Dự án được xây dựng với hiệu năng cao sử dụng **Rust** cho Backend và **Vanilla JavaScript** cho Frontend.

---

## ✨ Tính Năng Nổi Bật

### 🎮 Gameplay (Người chơi)

- **Real-time WebSocket:** Mọi hành động (chọn vé, quay số, trúng thưởng) đều được đồng bộ tức thì tới tất cả người chơi
- **Sảnh chờ (Lobby):** Xem danh sách phòng, tạo phòng ngẫu nhiên, tham gia phòng chơi
- **Cơ chế vé:** Mỗi người chơi được chọn tối đa 2 vé. Hệ thống kiểm tra trùng vé thời gian thực
- **Tự động kết nối lại (Auto Reconnect):** Không lo mất vé hay tiền cược khi lỡ tay tải lại trang (F5) hoặc rớt mạng

### 🛠️ Admin Dashboard (Quản trị viên)

- **Quản lý người dùng:** Xem danh sách, tạo mới, sửa thông tin, xóa người dùng
- **Quản lý tài chính:** Cấp tiền (số dư) cho người chơi
- **Bảo mật:** Hệ thống phân quyền (Role-based), mật khẩu được mã hóa an toàn với **Bcrypt**
- **Chặn lỗi logic:** Admin không thể tự xóa chính mình

### ⚙️ Hệ thống (Backend)

- **Hiệu năng cao:** Sử dụng Rust Axum & Tokio Runtime
- **Cấu hình linh hoạt:** Tích hợp file `.env` để quản lý bảo mật
- **Database:** SQLite gọn nhẹ, dễ triển khai

---

## 🚀 Cài Đặt & Chạy Dự Án

### 1. Yêu cầu hệ thống

- [Rust & Cargo](https://www.rust-lang.org/tools/install) (Phiên bản mới nhất)
- Trình duyệt web hiện đại (Chrome, Edge, Firefox...)

### 2. Clone dự án

```bash
git clone https://github.com/username/loto-app.git
cd loto-app
```

### 3. Cấu hình môi trường (.env)

Tạo file `.env` tại thư mục gốc và điền thông tin:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=123456
DATABASE_URL=loto.db
```

> **Lưu ý:** File `.env` đã được thêm vào `.gitignore` để bảo mật

### 4. Chạy Server

Để có hiệu năng tốt nhất (đặc biệt là tốc độ đăng nhập/tạo user), hãy chạy ở chế độ Release:

```bash
cargo run --release
```

Server sẽ khởi động tại: **http://localhost:3000**

---

## 📖 Hướng Dẫn Sử Dụng

### Đăng nhập lần đầu

Sử dụng tài khoản Admin mặc định (được cấu hình trong `.env` hoặc code):

- **Username:** `admin`
- **Password:** `123456`

### Quy trình chơi game

1. **Admin:** Tạo tài khoản cho người chơi và cấp tiền (Balance)
2. **Host (Chủ phòng):** Vào sảnh, tạo phòng mới, đặt giá vé
3. **Người chơi:** Đăng nhập, chọn phòng tại sảnh chờ
4. **Trong phòng:**
   - Người chơi chọn vé
   - Bấm "Xác nhận chốt vé"
   - Host bấm "Quay Số" (Có thể chọn quay tự động)
5. **Kết thúc:** Hệ thống tự động phát hiện người trúng (Kinh!), cộng tiền thưởng và thông báo người thắng cuộc

---

## 📂 Cấu Trúc Thư Mục

```
loto-app/
├── src/
│   ├── main.rs       # Entry point, Routing, Config
│   ├── handlers.rs   # Xử lý API (Login, CRUD User)
│   ├── ws.rs         # Logic Game Real-time (WebSocket)
│   └── model.rs      # Structs & Data Models
├── static/           # Frontend (Single Page Application)
│   ├── css/          # Giao diện (Style)
│   ├── js/
│   │   ├── main.js   # Entry point JS
│   │   ├── actions.js# Logic tương tác (API, Game)
│   │   ├── ws.js     # Xử lý kết nối socket client
│   │   └── state.js  # Quản lý State Frontend
│   ├── images/       # Tài nguyên ảnh
│   └── index.html    # Giao diện chính
├── loto.db           # SQLite Database (Tự tạo khi chạy)
├── tickets.json      # Dữ liệu vé số
├── Cargo.toml        # Quản lý thư viện Rust
└── .env              # Biến môi trường
```

---

## 🛡️ Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
|------------|-----------|
| Language | Rust 🦀 |
| Framework | Axum 0.8 |
| Runtime | Tokio |
| WebSocket | Axum WS / Futures |
| Database | Rusqlite (SQLite) |
| Security | Bcrypt, Dotenvy |
| Frontend | Vanilla JS, CSS3, HTML5 |
| AI Assistant | Claude (Anthropic) 🤖 |

---

## 🤖 Phát Triển với AI

Dự án này được phát triển với sự hỗ trợ của **Claude AI** từ Anthropic. Claude đã hỗ trợ:

- 💡 Tư vấn kiến trúc hệ thống và lựa chọn công nghệ
- 🔧 Viết code Backend (Rust) và Frontend (JavaScript)
- 🐛 Debug và tối ưu hóa hiệu năng
- 📝 Viết documentation và comments

> Việc sử dụng AI trong phát triển phần mềm giúp tăng tốc quá trình code, đồng thời đảm bảo chất lượng và best practices.

---

## 🤝 Đóng Góp (Contributing)

Mọi đóng góp đều được hoan nghênh! Vui lòng tạo Pull Request hoặc mở Issue nếu bạn tìm thấy lỗi.

1. Fork dự án
2. Tạo branch tính năng (`git checkout -b feature/TinhNangMoi`)
3. Commit thay đổi (`git commit -m 'Thêm tính năng mới'`)
4. Push lên branch (`git push origin feature/TinhNangMoi`)
5. Mở Pull Request

---

## 📝 License

Dự án được phát hành dưới giấy phép [MIT License](LICENSE).

---

**Code with ❤️ by LTVMoon**

⭐ Nếu bạn thấy project hữu ích, hãy cho một star nhé!