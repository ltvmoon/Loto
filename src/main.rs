mod model;
mod handlers;
mod ws;

use axum::{
    routing::{get, post},
    Router,
};
use std::sync::Arc;
use dashmap::DashMap;
use tokio::sync::broadcast;
use tower_http::services::ServeDir;
use rusqlite::{Connection, params}; // Nhớ thêm params
use std::fs;
use bcrypt::{hash, DEFAULT_COST};
use std::env; // Thư viện để đọc biến môi trường
use dotenvy::dotenv; // Thư viện load file .env

use crate::model::{AppState, Ticket};
use crate::handlers::{
    login_handler,
    get_tickets_handler,
    get_rooms_handler,
    ws_handler,
    create_user_handler,
    get_all_users_handler,
    update_user_handler
};

#[tokio::main]
async fn main() {
    // 1. Load file .env
    dotenv().ok();
    tracing_subscriber::fmt::init();

    // Load vé
    let tickets_data = fs::read_to_string("tickets.json").expect("❌ Lỗi: Không tìm thấy tickets.json");
    let tickets: Vec<Ticket> = serde_json::from_str(&tickets_data).expect("❌ Lỗi: JSON vé sai");

    // Init DB (Lấy đường dẫn từ env hoặc mặc định)
    let db_path = env::var("DATABASE_URL").unwrap_or_else(|_| "loto.db".to_string());
    init_db(&db_path).expect("Failed to init DB");

    let (tx, _rx) = broadcast::channel(500);

    let app_state = Arc::new(AppState {
        tx,
        rooms: DashMap::new(),
        db_path,
        tickets,
    });

    // Định tuyến API
    let app = Router::new()
        .route("/api/login", post(login_handler))
        .route("/api/admin/create_user", post(create_user_handler))
        .route("/api/admin/update_user", post(update_user_handler))
        .route("/api/admin/users", get(get_all_users_handler))
        .route("/api/tickets", get(get_tickets_handler))
        .route("/api/rooms", get(get_rooms_handler))
        .route("/ws", get(ws_handler))
        .fallback_service(ServeDir::new("static"))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("🚀 Server Loto running at http://localhost:3000");

    // In ra gợi ý (chỉ để debug, thực tế nên ẩn đi)
    if let (Ok(u), Ok(_)) = (env::var("ADMIN_USERNAME"), env::var("ADMIN_PASSWORD")) {
        println!("🔑 Admin User configured from .env: {}", u);
    } else {
        println!("⚠️ Warning: .env not found or missing ADMIN creds. Using defaults.");
    }

    axum::serve(listener, app).await.unwrap();
}

fn init_db(path: &str) -> rusqlite::Result<()> {
    let conn = Connection::open(path)?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            balance INTEGER DEFAULT 0
        )",
        [],
    )?;

    // Kiểm tra xem đã có admin chưa
    let count: i64 = conn.query_row("SELECT count(*) FROM users", [], |row| row.get(0))?;

    if count == 0 {
        // Lấy thông tin từ biến môi trường
        let admin_user = env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
        let admin_pass = env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "123456".to_string());

        println!("⚙️ Khởi tạo tài khoản Admin đầu tiên: {}", admin_user);

        // Dùng Cost = 4 cho nhanh (như bài trước đã tối ưu)
        let hashed = hash(&admin_pass, 4).unwrap();

        conn.execute(
            "INSERT INTO users (username, password_hash, role, balance) VALUES (?1, ?2, ?3, ?4)",
            params![admin_user, hashed, "admin", 0], // Cho Admin 1 tỷ chơi cho đã
        )?;
        println!("✅ Đã tạo tài khoản Admin thành công.");
    }

    Ok(())
}