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
use rusqlite::{Connection, params};
use std::fs;
use bcrypt::hash; // Đã bỏ DEFAULT_COST warning
use std::env;
use dotenvy::dotenv;

use crate::model::{AppState, Ticket};
use crate::handlers::{
    login_handler,
    get_tickets_handler,
    get_rooms_handler,
    ws_handler,
    create_user_handler,
    get_all_users_handler,
    update_user_handler,
    delete_user_handler
};

#[tokio::main]
async fn main() {
    // 1. Load môi trường
    dotenv().ok();
    tracing_subscriber::fmt::init();

    // Load vé
    let tickets_data = fs::read_to_string("tickets.json").expect("❌ Lỗi: Không tìm thấy tickets.json");
    let tickets: Vec<Ticket> = serde_json::from_str(&tickets_data).expect("❌ Lỗi: JSON vé sai");

    // Init DB
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
        .route("/api/admin/delete_user", post(delete_user_handler))
        .route("/api/admin/users", get(get_all_users_handler))
        .route("/api/tickets", get(get_tickets_handler))
        .route("/api/rooms", get(get_rooms_handler))
        .route("/ws", get(ws_handler))
        .fallback_service(ServeDir::new("static"))
        .with_state(app_state);

    // --- ĐOẠN CODE IN IP MỚI ---
    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    let port = listener.local_addr().unwrap().port();

    println!("\n=======================================================");
    println!("🚀 LOTO SERVER ĐANG CHẠY!");
    println!("-------------------------------------------------------");
    println!("👉 Trên máy này:  http://localhost:{}", port);

    match get_local_ip() {
        Some(ip) => {
            println!("👉 Mạng LAN:      http://{}:{}  <-- Gửi link này cho mọi người!", ip, port);
        },
        None => {
            println!("⚠️  Không tìm thấy IP LAN. Hãy kiểm tra kết nối mạng.");
        }
    }
    println!("=======================================================\n");

    // In thông báo nếu load được admin từ env (Debug)
    if let (Ok(u), Ok(_)) = (env::var("ADMIN_USERNAME"), env::var("ADMIN_PASSWORD")) {
        println!("🔑 Admin config loaded: {}", u);
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

    let count: i64 = conn.query_row("SELECT count(*) FROM users", [], |row| row.get(0))?;
    if count == 0 {
        let admin_user = env::var("ADMIN_USERNAME").unwrap_or_else(|_| "admin".to_string());
        let admin_pass = env::var("ADMIN_PASSWORD").unwrap_or_else(|_| "123456".to_string());

        let hashed = hash(&admin_pass, 4).unwrap();

        conn.execute(
            "INSERT INTO users (username, password_hash, role, balance) VALUES (?1, ?2, ?3, ?4)",
            params![admin_user, hashed, "admin", 0],
        )?;
        println!("✅ Đã tạo tài khoản Admin mặc định: {}", admin_user);
    }

    Ok(())
}

// --- HÀM LẤY IP LOCAL ---
fn get_local_ip() -> Option<std::net::IpAddr> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    socket.local_addr().ok().map(|addr| addr.ip())
}