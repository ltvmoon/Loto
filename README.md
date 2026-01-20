🎲 Loto Việt Nam Online (Real-time Multiplayer)Một hệ thống game Loto truyền thống Việt Nam trực tuyến, hỗ trợ nhiều người chơi cùng lúc (Multiplayer) với tốc độ phản hồi thời gian thực (Real-time). Dự án được xây dựng với hiệu năng cao sử dụng Rust cho Backend và Vanilla JS cho Frontend.✨ Tính Năng Nổi Bật🎮 Gameplay (Người chơi)Real-time WebSocket: Mọi hành động (chọn vé, quay số, trúng thưởng) đều được đồng bộ tức thì tới tất cả người chơi.Sảnh chờ (Lobby): Xem danh sách phòng, tạo phòng ngẫu nhiên, tham gia phòng chơi.Cơ chế vé: Mỗi người chơi được chọn tối đa 2 vé. Hệ thống kiểm tra trùng vé thời gian thực.Tự động kết nối lại (Auto Reconnect): Không lo mất vé hay tiền cược khi lỡ tay tải lại trang (F5) hoặc rớt mạng.🛠️ Admin Dashboard (Quản trị viên)Quản lý người dùng: Xem danh sách, Tạo mới, Sửa thông tin, Xóa người dùng.Quản lý tài chính: Cấp tiền (số dư) cho người chơi.Bảo mật: Hệ thống phân quyền (Role-based), mật khẩu được mã hóa an toàn với Bcrypt.Chặn lỗi logic: Admin không thể tự xóa chính mình.⚙️ Hệ thống (Backend)Hiệu năng cao: Sử dụng Rust Axum & Tokio Runtime.Cấu hình linh hoạt: Tích hợp file .env để quản lý bảo mật.Database: SQLite gọn nhẹ, dễ triển khai.🚀 Cài Đặt & Chạy Dự Án1. Yêu cầu hệ thốngRust & Cargo (Phiên bản mới nhất).Trình duyệt web hiện đại (Chrome, Edge, Firefox...).2. Clone dự ánBashgit clone https://github.com/username/loto-app.git
cd loto-app
3. Cấu hình môi trường (.env)Tạo file .env tại thư mục gốc và điền thông tin:Code snippetADMIN_USERNAME=admin
   ADMIN_PASSWORD=123456
   DATABASE_URL=loto.db
   (Lưu ý: File .env đã được thêm vào .gitignore để bảo mật)4. Chạy ServerĐể có hiệu năng tốt nhất (đặc biệt là tốc độ đăng nhập/tạo user), hãy chạy ở chế độ Release:Bashcargo run --release
   Server sẽ khởi động tại: http://localhost:3000📖 Hướng Dẫn Sử DụngĐăng nhập lần đầuSử dụng tài khoản Admin mặc định (được cấu hình trong .env hoặc code):Username: adminPassword: 123456Quy trình chơi gameAdmin: Tạo tài khoản cho người chơi và cấp tiền (Balance).Host (Chủ phòng): Vào sảnh, tạo phòng mới. Đặt giá vé.Người chơi: Đăng nhập, chọn phòng tại sảnh chờ.Trong phòng:Người chơi chọn vé.Bấm "Xác nhận chốt vé".Host bấm "Quay Số" (Có thể chọn quay tự động).Kết thúc: Hệ thống tự động phát hiện người trúng (Kinh!), cộng tiền thưởng và thông báo người thắng cuộc.📂 Cấu Trúc Thư Mụcloto-app/
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
   │   │   ├── ws.rs     # Xử lý kết nối socket client
   │   │   └── state.js  # Quản lý State Frontend
   │   ├── images/       # Tài nguyên ảnh
   │   └── index.html    # Giao diện chính
   ├── loto.db           # SQLite Database (Tự tạo khi chạy)
   ├── tickets.json      # Dữ liệu vé số
   ├── Cargo.toml        # Quản lý thư viện Rust
   └── .env              # Biến môi trường
   🛡️ Công Nghệ Sử DụngThành phầnCông nghệLanguageRust 🦀FrameworkAxum 0.8RuntimeTokioWebSocketAxum WS / FuturesDatabaseRusqlite (SQLite)SecurityBcrypt, DotenvyFrontendVanilla JS, CSS3, HTML5🤝 Đóng Góp (Contributing)Mọi đóng góp đều được hoan nghênh! Vui lòng tạo Pull Request hoặc mở Issue nếu bạn tìm thấy lỗi.Fork dự án.Tạo branch tính năng (git checkout -b feature/TinhNangMoi).Commit thay đổi (git commit -m 'Thêm tính năng mới').Push lên branch (git push origin feature/TinhNangMoi).Mở Pull Request.📝 LicenseDự án được phát hành dưới giấy phép MIT License.Code with ❤️ by LTVMoon