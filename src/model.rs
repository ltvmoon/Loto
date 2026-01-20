use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use dashmap::DashMap;
use tokio::task::JoinHandle;
use tokio::sync::broadcast;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Ticket {
    pub id: u32,
    pub color: String,
    pub rows: Vec<Vec<Option<u8>>>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct UserInfo {
    pub username: String,
    pub score: i64,
    pub is_confirmed: bool,
    pub role: String, // 'admin' hoặc 'user'
}

// Struct trả về danh sách user cho Admin (không lộ password hash)
#[derive(Serialize)]
pub struct UserData {
    pub username: String,
    pub role: String,
    pub balance: i64,
}

pub struct Room {
    pub id: String,
    pub users: DashMap<String, UserInfo>,
    pub drawn_numbers: Mutex<Vec<u8>>,
    pub ticket_owners: DashMap<u32, String>,
    pub current_host: Mutex<Option<String>>,
    pub is_game_over: Mutex<bool>,
    pub auto_draw_handle: Mutex<Option<JoinHandle<()>>>,
    pub waiting_counts: DashMap<String, u32>,
    pub ticket_price: Mutex<i64>,
    pub log_history: Mutex<Vec<String>>,
}

impl Room {
    pub fn new(id: String) -> Self {
        Self {
            id,
            users: DashMap::new(),
            drawn_numbers: Mutex::new(Vec::new()),
            ticket_owners: DashMap::new(),
            current_host: Mutex::new(None),
            is_game_over: Mutex::new(false),
            auto_draw_handle: Mutex::new(None),
            waiting_counts: DashMap::new(),
            ticket_price: Mutex::new(0),
            log_history: Mutex::new(Vec::new()),
        }
    }

    pub fn append_log(&self, message: String) {
        let mut logs = self.log_history.lock().unwrap();
        logs.push(message);
        if logs.len() > 50 { logs.remove(0); }
    }
}

#[derive(Serialize)]
pub struct RoomSummary {
    pub id: String,
    pub count: usize,
    pub host: Option<String>,
}

pub struct AppState {
    pub tx: broadcast::Sender<String>,
    pub rooms: DashMap<String, Arc<Room>>,
    pub db_path: String,
    pub tickets: Vec<Ticket>,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: String,
    pub balance: Option<i64>, // MỚI: Thêm trường này (Option để không lỗi nếu client cũ gửi thiếu)
    pub creator: String,
}

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    pub target_username: String, // User cần sửa
    pub new_password: Option<String>, // Mật khẩu mới (Option: nếu không gửi thì không sửa)
    pub new_balance: Option<i64>,     // Số dư mới
    pub admin_username: String,       // Người thực hiện (để check quyền)
}

#[derive(Deserialize)]
pub struct DeleteUserRequest {
    pub target_username: String, // User cần xóa
    pub admin_username: String,  // Admin thực hiện lệnh này
}