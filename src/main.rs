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
use rusqlite::Connection;
use std::fs;
use bcrypt::{hash, DEFAULT_COST};

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
    tracing_subscriber::fmt::init();

    // Load vé
    let tickets_data = fs::read_to_string("tickets.json").expect("❌ Lỗi: Không tìm thấy tickets.json");
    let tickets: Vec<Ticket> = serde_json::from_str(&tickets_data).expect("❌ Lỗi: JSON vé sai");

    // Init DB
    let db_path = "loto.db".to_string();
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
        // --- SỬA LỖI Ở ĐÂY (Axum 0.8) ---
        // Thay vì nest_service("/", ...), ta dùng fallback_service
        .fallback_service(ServeDir::new("static"))
        .with_state(app_state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("🚀 Server Loto running at http://localhost:3000");
    println!("🔑 Default Admin: user='admin', pass='123456'");
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
        let hashed = hash("123456", DEFAULT_COST).unwrap();
        conn.execute(
            "INSERT INTO users (username, password_hash, role, balance) VALUES (?1, ?2, ?3, ?4)",
            ["admin", &hashed, "admin", "1000000"],
        )?;
        println!("✅ Đã tạo tài khoản Admin mặc định.");
    }

    Ok(())
}