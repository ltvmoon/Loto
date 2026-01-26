# 🎲 Loto Việt Nam Online - Real-time Multiplayer Game

![Rust](https://img.shields.io/badge/Backend-Rust_Axum-orange?style=for-the-badge&logo=rust)
![Frontend](https://img.shields.io/badge/Frontend-Vanilla_JS-yellow?style=for-the-badge&logo=javascript)
![Database](https://img.shields.io/badge/Database-SQLite-lightgrey?style=for-the-badge&logo=sqlite)
![Docker](https://img.shields.io/badge/Deploy-Docker-blue?style=for-the-badge&logo=docker)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

> **Hệ thống game Loto truyền thống Việt Nam trực tuyến** với khả năng hỗ trợ **nhiều người chơi cùng lúc** (Multiplayer), đồng bộ **thời gian thực** (Real-time) qua WebSocket. Dự án được xây dựng với **hiệu năng cao** sử dụng Rust cho Backend và Vanilla JavaScript cho Frontend.

---

## 📋 Mục Lục

- [✨ Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
- [🎯 Demo & Screenshots](#-demo--screenshots)
- [🚀 Cài Đặt & Triển Khai](#-cài-đặt--triển-khai)
- [📖 Hướng Dẫn Sử Dụng](#-hướng-dẫn-sử-dụng)
- [📂 Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [🛡️ Công Nghệ Sử Dụng](#️-công-nghệ-sử-dụng)
- [🔧 API Documentation](#-api-documentation)
- [🐳 Docker Deployment](#-docker-deployment)
- [🤝 Đóng Góp](#-đóng-góp)
- [📝 License](#-license)

---

## ✨ Tính Năng Nổi Bật

### 🎮 Trải Nghiệm Người Chơi

#### Real-time Sync
- **WebSocket 2-way communication:** Mọi hành động (chọn vé, quay số, trúng thưởng) được đồng bộ **tức thì** tới tất cả người chơi
- **Auto Reconnect:** Tự động kết nối lại khi F5 hoặc mất mạng - **không mất vé, không mất tiền cược**
- **Low Latency:** Độ trễ < 100ms nhờ kiến trúc Rust + Tokio

#### Gameplay
- **Sảnh chờ (Lobby):** Xem danh sách phòng, số người online, host phòng
- **Tạo phòng linh hoạt:** ID ngẫu nhiên 3 chữ số (101-999), tối đa 16 người/phòng
- **Cơ chế vé:** Mỗi người tối đa 2 vé, hệ thống kiểm tra trùng real-time
- **2 chế độ đánh dấu:**
   - **Manual:** Tự đánh dấu số khi quay
   - **Auto:** Hệ thống tự đánh dấu + đọc số bằng giọng nói

#### Âm Thanh & Trực Quan
- **Text-to-Speech:** Đọc số tự động khi quay (file MP3 pre-recorded)
- **Highlight Animation:** Hiệu ứng nổi bật số vừa quay
- **Responsive UI:** Tương thích mọi thiết bị (Desktop, Tablet, Mobile)

### 🛠️ Quản Trị Viên (Admin Dashboard)

#### Quản Lý Người Dùng
- ✅ **CRUD đầy đủ:** Tạo, Xem, Sửa, Xóa tài khoản
- ✅ **Phân quyền:** Admin / User role-based
- ✅ **Bảo mật:** Mật khẩu Bcrypt (cost=4 optimized)
- ✅ **Chặn lỗi logic:** Admin không thể tự xóa chính mình

#### Quản Lý Tài Chính
- 💰 Cấp số dư cho người chơi
- 💰 Theo dõi balance real-time
- 💰 Lịch sử giao dịch (Win/Loss tracking)

### ⚙️ Hệ Thống Backend

- **High Performance:** Rust + Axum + Tokio async runtime
- **Scalable:** DashMap concurrent hashmap, handle 1000+ connections
- **Persistent:** SQLite với auto-migration
- **Configurable:** File `.env` cho bảo mật
- **Production Ready:** Docker + Nginx reverse proxy

---

## 🎯 Demo & Screenshots

### 🖼️ Giao Diện Chính

```
┌─────────────────────────────────────────────────┐
│  🎲 LOTO VIỆT NAM ONLINE                       │
├─────────────────────────────────────────────────┤
│  Sảnh Chờ          │   Game Board   │  Stats   │
│  ┌──────────┐      │   ┌─────────┐  │          │
│  │ Phòng 123│ 👤 5 │   │ VÉ #105 │  │  💰 Pot  │
│  │ Phòng 456│ 👤 2 │   │ VÉ #108 │  │  🎯 Ball │
│  └──────────┘      │   └─────────┘  │  📊 Grid │
└─────────────────────────────────────────────────┘
```

### 🎥 Flow Game

```
Admin tạo user → User login → Vào Lobby → Chọn/Tạo phòng 
    ↓
Host đặt giá vé → Players chọn vé → Xác nhận
    ↓
Host quay số (Manual/Auto) → Hệ thống check Winner
    ↓
Thông báo Winner → Chia thưởng → Reset vòng mới
```

---

## 🚀 Cài Đặt & Triển Khai

### Phương Án 1: Chạy Local (Development)

#### Yêu Cầu Hệ Thống
- [Rust & Cargo](https://www.rust-lang.org/tools/install) ≥ 1.70
- Python 3.8+ (nếu cần generate vé mới)
- Trình duyệt hiện đại (Chrome/Edge/Firefox)

#### Các Bước Cài Đặt

```bash
# 1. Clone dự án
git clone https://github.com/ltvmoon/Loto.git
cd Loto

# 2. Tạo file .env
cat > .env << EOF
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
DATABASE_URL=loto.db
EOF

# 3. (Optional) Generate vé mới
python main.py  # Nhập số cặp vé muốn tạo

# 4. Chạy server (Release mode khuyến nghị)
cargo run --release
```

Server khởi động tại:
- **Local:** http://localhost:3000
- **LAN:** http://[YOUR_IP]:3000 *(hiển thị trong console)*

---

### Phương Án 2: Deploy Ubuntu với Docker (Production)

#### Yêu Cầu
- Ubuntu 20.04+ hoặc Debian 11+
- Docker & Docker Compose đã cài đặt
- Port 8888 mở firewall

#### Hướng Dẫn Deploy Nhanh

```bash
# 1. Tạo thư mục dự án
mkdir loto_data && cd loto_data

# 2. Tạo file .env
nano .env
```

Nội dung file `.env`:
```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD=StrongPassword123
DATABASE_URL=loto.db
```

Lưu file: `Ctrl + X` → `Y` → `Enter`

```bash
# 3. Clone code từ GitHub
git clone https://github.com/ltvmoon/Loto.git .

# 4. Tạo DB rỗng và mở port
touch loto.db
sudo ufw allow 8888/tcp
sudo ufw reload

# 5. Build và chạy
docker compose up -d --build
```

#### Quản Lý Container

```bash
# Xem logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Update code mới
git pull origin main
docker compose down
docker compose up -d --build
```

Truy cập game: **http://[IP_SERVER]:8888**

---

## 📖 Hướng Dẫn Sử Dụng

### 🔐 Đăng Nhập Lần Đầu

Tài khoản Admin mặc định:
- **Username:** `admin` (hoặc giá trị trong `.env`)
- **Password:** `123456` (hoặc giá trị trong `.env`)

⚠️ **Lưu ý bảo mật:** Đổi password ngay sau lần đăng nhập đầu tiên!

---

### 🎯 Quy Trình Chơi Game

#### Bước 1: Admin - Thiết Lập
1. Đăng nhập với tài khoản Admin
2. Vào **"Quản Lý User"**
3. Tạo tài khoản cho người chơi
4. Cấp số dư ban đầu (Balance)

#### Bước 2: Host - Tạo Phòng
1. Đăng nhập tài khoản
2. Vào **Sảnh Chờ**
3. Bấm **"Tạo Phòng Mới"** (ID ngẫu nhiên 3 số)
4. Đặt **giá vé** (VD: 10,000đ)
5. Chờ người chơi vào phòng

#### Bước 3: Player - Chọn Vé
1. Đăng nhập → Chọn phòng từ Lobby
2. Chọn tối đa **2 vé** từ pool
3. Bấm **"Xác Nhận Chốt Vé"**
4. Chờ Host bắt đầu

#### Bước 4: Quay Số
Host có 2 tùy chọn:
- **Manual:** Bấm "Quay" từng số một
- **Auto:** Đặt interval (1-10s), hệ thống tự quay

#### Bước 5: Chiến Thắng
- Hệ thống tự động phát hiện **dòng Kinh** (5 số liên tiếp)
- Chia đều tiền thưởng cho người thắng
- Hiển thị thông báo + cập nhật balance
- Host reset để chơi vòng mới

---

## 📂 Cấu Trúc Dự Án

```
loto-app/
├── 📁 src/                      # Backend Rust
│   ├── main.rs                  # Entry point, routing, DB init
│   ├── handlers.rs              # API handlers (login, CRUD user)
│   ├── ws.rs                    # WebSocket game logic
│   └── model.rs                 # Data structures (Ticket, Room, User...)
│
├── 📁 static/                   # Frontend (SPA)
│   ├── 📁 css/
│   │   └── style.css            # Toàn bộ UI styling
│   ├── 📁 js/
│   │   ├── main.js              # Entry point, export to window
│   │   ├── actions.js           # Business logic (login, game, admin)
│   │   ├── ws.js                # WebSocket client handler
│   │   ├── state.js             # Global state management
│   │   └── ui.js                # UI rendering & animations
│   ├── 📁 images/               # Ảnh vé (ticket-101.png ~ ticket-132.png)
│   ├── 📁 sounds/               # File MP3 đọc số (1.mp3 ~ 90.mp3)
│   └── index.html               # Single Page Application
│
├── 📁 python_tools/             # Tools sinh vé
│   ├── main.py                  # Generate tickets.json (chuyên nghiệp)
│   ├── generator.html           # Tool web tạo vé nhanh
│   └── index.html               # Preview vé đã tạo
│
├── 📄 tickets.json              # Dữ liệu 132 vé (16 cặp)
├── 📄 loto.db                   # SQLite database (auto-created)
├── 📄 Cargo.toml                # Rust dependencies
├── 📄 Dockerfile                # Multi-stage build
├── 📄 docker-compose.yml        # Orchestration (Backend + Nginx)
├── 📄 nginx.conf                # Reverse proxy config
├── 📄 .env.example              # Template env variables
├── 📄 .gitignore                # Ignore DB & .env
├── 📄 LICENSE                   # MIT License
└── 📄 README.md                 # This file
```

---

## 🛡️ Công Nghệ Sử Dụng

### Backend Stack

| Thành Phần | Công Nghệ | Mục Đích |
|------------|-----------|----------|
| **Language** | Rust 🦀 | Hiệu năng cao, memory safety |
| **Framework** | Axum 0.8 | Async HTTP framework |
| **Runtime** | Tokio | Async runtime, multi-threading |
| **WebSocket** | Axum WS + Futures | Real-time 2-way communication |
| **Database** | Rusqlite (SQLite) | Embedded DB, zero-config |
| **Security** | Bcrypt | Password hashing |
| **Config** | Dotenvy | Environment variables |
| **Concurrency** | DashMap | Lock-free concurrent HashMap |
| **Random** | Rand 0.9 | Ticket generation |

### Frontend Stack

| Thành Phần | Công Nghệ | Lý Do |
|------------|-----------|-------|
| **Language** | Vanilla JavaScript (ES6+) | Zero framework overhead |
| **Modules** | ES6 Modules | Code organization |
| **WebSocket** | Native WebSocket API | Real-time sync |
| **Audio** | HTML5 Audio API | Text-to-Speech playback |
| **Storage** | LocalStorage | Session persistence |
| **Styling** | Pure CSS3 | Responsive design |

### DevOps & Deployment

| Công Cụ | Mục Đích |
|---------|----------|
| **Docker** | Containerization |
| **Docker Compose** | Multi-container orchestration |
| **Nginx** | Reverse proxy, static file serving |
| **GitHub** | Version control & CI/CD |

### Development Tools

- **Python 3.8+** - Generate tickets with constraints
- **NumPy** - Matrix operations for ticket layout
- **Git** - Version control
- **VSCode / Vim** - Code editor

### AI Assistant

- **Claude (Anthropic)** 🤖
   - Kiến trúc hệ thống
   - Code generation (Rust + JS)
   - Debug & optimization
   - Documentation

---

## 🔧 API Documentation

### Authentication

#### POST `/api/login`
Đăng nhập và lấy thông tin user

**Request:**
```json
{
  "username": "player1",
  "password": "pass123"
}
```

**Response (Success):**
```json
{
  "status": "ok",
  "username": "player1",
  "role": "user",
  "balance": 50000
}
```

---

### Admin Endpoints (Requires `role: admin`)

#### GET `/api/admin/users`
Lấy danh sách tất cả user

**Response:**
```json
[
  {
    "username": "player1",
    "role": "user",
    "balance": 50000
  },
  {
    "username": "admin",
    "role": "admin",
    "balance": 0
  }
]
```

#### POST `/api/admin/create_user`
Tạo user mới

**Request:**
```json
{
  "username": "newplayer",
  "password": "secure123",
  "role": "user",
  "balance": 100000,
  "creator": "admin"
}
```

#### POST `/api/admin/update_user`
Cập nhật thông tin user

**Request:**
```json
{
  "target_username": "player1",
  "admin_username": "admin",
  "new_password": "newpass123",  // Optional
  "new_balance": 75000            // Optional
}
```

#### POST `/api/admin/delete_user`
Xóa user (không thể tự xóa)

**Request:**
```json
{
  "target_username": "player1",
  "admin_username": "admin"
}
```

---

### Game Endpoints

#### GET `/api/tickets`
Lấy danh sách tất cả vé

**Response:**
```json
[
  {
    "id": 101,
    "color": "#E91E63",
    "rows": [
      [null, null, 20, 30, null, 51, 60, 70, null],
      ...
    ]
  }
]
```

#### GET `/api/rooms`
Lấy danh sách phòng đang hoạt động

**Response:**
```json
[
  {
    "id": "123",
    "count": 5,
    "host": "player1"
  }
]
```

---

### WebSocket Commands

Kết nối: `ws://localhost:3000/ws`

#### Join Room
```json
{
  "cmd": "JOIN",
  "username": "player1",
  "room_id": "123"
}
```

#### Select Ticket
```json
{
  "cmd": "SELECT_TICKET",
  "ticket_id": 105,
  "username": "player1",
  "room_id": "123"
}
```

#### Confirm Selection
```json
{
  "cmd": "CONFIRM_TICKET",
  "username": "player1",
  "room_id": "123"
}
```

#### Start Auto Draw (Host only)
```json
{
  "cmd": "START_AUTO_DRAW",
  "interval": 3,
  "username": "host_player",
  "room_id": "123"
}
```

#### Signal Wait (Báo chờ)
```json
{
  "cmd": "SIGNAL_WAIT",
  "username": "player1",
  "room_id": "123"
}
```

#### Reset Game (Host only)
```json
{
  "cmd": "RESET",
  "username": "host_player",
  "room_id": "123"
}
```

---

## 🐳 Docker Deployment

### Kiến Trúc Container

```
┌─────────────────────────────────────────┐
│          Internet (Port 8888)           │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼────────┐
         │  Nginx (80)    │  Static files + Reverse Proxy
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │                         │
┌───▼─────┐            ┌──────▼──────┐
│ Backend │            │  WebSocket  │
│ (3000)  │            │  (3000/ws)  │
└─────────┘            └─────────────┘
    │
┌───▼─────┐
│ SQLite  │
│ Volume  │
└─────────┘
```

### Cấu Hình Chi Tiết

#### `docker-compose.yml`
- **loto-backend:** Rust app (512MB RAM limit)
- **loto-nginx:** Nginx reverse proxy (128MB RAM)
- **Network:** Isolated `loto_network`
- **Volumes:**
   - `loto.db` - Persistent database
   - `static/` - Hot-reload static files

#### `Dockerfile` (Multi-stage Build)
- **Stage 1 (Builder):** Compile Rust với `cargo build --release`
- **Stage 2 (Runner):** Debian slim + binary only → Image size ~50MB

#### `nginx.conf`
- Static file serving (HTML/CSS/JS/Images/Sounds)
- WebSocket upgrade handling
- API reverse proxy
- Cache headers (30 days cho MP3/Images)

---

## 🤝 Đóng Góp

Mọi đóng góp đều được hoan nghênh! Vui lòng:

1. Fork dự án
2. Tạo branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

### Coding Standards

- **Rust:** Follow Clippy lints
- **JavaScript:** ESLint + Prettier
- **Commit:** Conventional Commits format

---

## 📝 License

Dự án được phát hành dưới [MIT License](LICENSE).

**TL;DR:**
- ✅ Sử dụng thương mại
- ✅ Sửa đổi source code
- ✅ Phân phối
- ❌ Không bảo hành
- 📋 Phải giữ license gốc

---

## 🙏 Credits

- **Author:** LTVMoon
- **AI Assistant:** Claude (Anthropic)
- **Inspiration:** Loto truyền thống Việt Nam

---

## 📞 Liên Hệ & Hỗ Trợ

- **GitHub Issues:** [Report bugs](https://github.com/ltvmoon/Loto/issues)
- **GitHub Discussions:** [Q&A & Ideas](https://github.com/ltvmoon/Loto/discussions)
- **Email:** [Contact maintainer]

---

<div align="center">

**⭐ Nếu bạn thấy project hữu ích, hãy cho một star! ⭐**

**Made with ❤️ in Vietnam 🇻🇳**

</div>