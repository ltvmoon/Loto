use axum::{
    extract::{ws::WebSocketUpgrade, State},
    response::{IntoResponse, Response},
    Json,
    http::StatusCode,
};
use std::sync::Arc;
// THÊM: import params từ rusqlite
use rusqlite::{params, Connection};
use bcrypt::{hash, verify, DEFAULT_COST};
use crate::ws::handle_socket;
use crate::model::{AppState, LoginRequest, CreateUserRequest, UpdateUserRequest, Ticket, RoomSummary, UserData};

pub async fn login_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>
) -> Response {
    let conn = Connection::open(&state.db_path).unwrap();

    let result = conn.query_row(
        "SELECT password_hash, role, balance FROM users WHERE username = ?1",
        [&payload.username],
        |row| {
            let hash: String = row.get(0)?;
            let role: String = row.get(1)?;
            let balance: i64 = row.get(2)?;
            Ok((hash, role, balance))
        }
    );

    match result {
        Ok((stored_hash, role, balance)) => {
            if verify(&payload.password, &stored_hash).unwrap_or(false) {
                Json(serde_json::json!({
                    "status": "ok",
                    "username": payload.username,
                    "role": role,
                    "balance": balance
                })).into_response()
            } else {
                (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "status": "error", "message": "Sai mật khẩu!" }))).into_response()
            }
        },
        Err(_) => {
            (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "status": "error", "message": "Tài khoản không tồn tại!" }))).into_response()
        }
    }
}

pub async fn create_user_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateUserRequest>
) -> Response {
    let conn = Connection::open(&state.db_path).unwrap();

    let creator_role: String = conn.query_row(
        "SELECT role FROM users WHERE username = ?1",
        [&payload.creator],
        |row| row.get(0)
    ).unwrap_or("user".to_string());

    if creator_role != "admin" {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "status": "error", "message": "Bạn không có quyền Admin!" }))).into_response();
    }

    let hashed_pw = hash(&payload.password, DEFAULT_COST).unwrap();

    // MỚI: Lấy balance từ payload, mặc định là 0
    let start_balance = payload.balance.unwrap_or(0);

    // MỚI: Cập nhật câu SQL Insert
    let result = conn.execute(
        "INSERT INTO users (username, password_hash, role, balance) VALUES (?1, ?2, ?3, ?4)",
        params![&payload.username, &hashed_pw, &payload.role, start_balance], // Dùng params! để truyền đúng kiểu số
    );

    match result {
        Ok(_) => Json(serde_json::json!({ "status": "ok", "message": format!("Đã tạo user {}", payload.username) })).into_response(),
        Err(_) => (StatusCode::BAD_REQUEST, Json(serde_json::json!({ "status": "error", "message": "User đã tồn tại!" }))).into_response(),
    }
}

// --- CẬP NHẬT HÀM NÀY ---
pub async fn update_user_handler(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdateUserRequest>
) -> Response {
    let conn = Connection::open(&state.db_path).unwrap();

    // 1. Check quyền Admin
    let admin_role: String = conn.query_row(
        "SELECT role FROM users WHERE username = ?1",
        [&payload.admin_username],
        |row| row.get(0)
    ).unwrap_or("user".to_string());

    if admin_role != "admin" {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({ "status": "error", "message": "Không có quyền Admin!" }))).into_response();
    }

    println!("🛠️ Admin {} đang sửa user {}", payload.admin_username, payload.target_username);

    // 2. Update Password (nếu có)
    if let Some(new_pass) = &payload.new_password {
        if !new_pass.is_empty() {
            let hashed = hash(new_pass, DEFAULT_COST).unwrap();
            let res = conn.execute(
                "UPDATE users SET password_hash = ?1 WHERE username = ?2",
                params![hashed, payload.target_username],
            );
            println!("   -> Update Pass: {:?}", res);
        }
    }

    // 3. Update Balance (nếu có)
    if let Some(new_bal) = payload.new_balance {
        let res = conn.execute(
            "UPDATE users SET balance = ?1 WHERE username = ?2",
            params![new_bal, payload.target_username], // Dùng params! chuẩn hơn
        );
        match res {
            Ok(count) => println!("   -> Update Balance ({}): {} dòng bị ảnh hưởng", new_bal, count),
            Err(e) => println!("   -> Update Balance LỖI: {:?}", e),
        }
    }

    Json(serde_json::json!({ "status": "ok", "message": "Cập nhật thành công!" })).into_response()
}

pub async fn get_all_users_handler(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<UserData>> {
    let conn = Connection::open(&state.db_path).unwrap();
    let mut stmt = conn.prepare("SELECT username, role, balance FROM users ORDER BY username ASC").unwrap();

    let users_iter = stmt.query_map([], |row| {
        Ok(UserData {
            username: row.get(0)?,
            role: row.get(1)?,
            balance: row.get(2)?,
        })
    }).unwrap();

    let mut users = Vec::new();
    for user in users_iter {
        if let Ok(u) = user {
            users.push(u);
        }
    }
    Json(users)
}

pub async fn get_tickets_handler(State(state): State<Arc<AppState>>) -> Json<Vec<Ticket>> {
    Json(state.tickets.clone())
}

pub async fn get_rooms_handler(State(state): State<Arc<AppState>>) -> Json<Vec<RoomSummary>> {
    let mut rooms = Vec::new();
    for r in state.rooms.iter() {
        let room = r.value();
        rooms.push(RoomSummary {
            id: room.id.clone(),
            count: room.users.len(),
            host: room.current_host.lock().unwrap().clone()
        });
    }
    rooms.sort_by(|a, b| a.id.cmp(&b.id));
    Json(rooms)
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}