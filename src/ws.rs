use axum::extract::ws::{Message, WebSocket};
use futures::{sink::SinkExt, stream::StreamExt};
use tokio::sync::mpsc;
use std::sync::Arc;
use std::time::Duration;
use std::collections::HashSet;
use rand::Rng;
use serde_json::json;
use rusqlite::{Connection, params};

use crate::model::{AppState, Room, UserInfo};

// Helper Functions
fn update_balance(state: &Arc<AppState>, room_id: &str, username: &str, amount: i64) {
    if let Ok(conn) = Connection::open(&state.db_path) {
        let _ = conn.execute(
            "UPDATE users SET balance = balance + ?1 WHERE username = ?2",
            params![amount, username]
        );
    }
    if let Some(room) = state.rooms.get(room_id) {
        if let Some(mut u) = room.users.get_mut(username) {
            u.score += amount;
            let new_bal = u.score;
            let _ = state.tx.send(json!({ "type": "BALANCE_UPDATE", "room_id": room_id, "username": username, "balance": new_bal }).to_string());
        }
    }
}

fn check_winner_in_room(state: &Arc<AppState>, room: &Arc<Room>) -> Option<Vec<(String, u32)>> {
    if *room.is_game_over.lock().unwrap() { return None; }
    let drawn_list = room.drawn_numbers.lock().unwrap().clone();
    if drawn_list.is_empty() { return None; }

    let mut winners = Vec::new();
    for entry in room.ticket_owners.iter() {
        let ticket_id = *entry.key();
        let owner = entry.value().clone();
        if let Some(ticket) = state.tickets.iter().find(|t| t.id == ticket_id) {
            for row in &ticket.rows {
                let nums: Vec<u8> = row.iter().filter_map(|&n| n).collect();
                if !nums.is_empty() && nums.iter().all(|n| drawn_list.contains(n)) {
                    winners.push((owner.clone(), ticket_id));
                    break;
                }
            }
        }
    }
    if !winners.is_empty() {
        *room.is_game_over.lock().unwrap() = true;
        return Some(winners);
    }
    None
}

pub async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let (ws_tx, mut ws_rx) = mpsc::channel::<Message>(100);

    let mut write_task = tokio::spawn(async move {
        while let Some(msg) = ws_rx.recv().await {
            if sender.send(msg).await.is_err() { break; }
        }
    });

    let mut rx_broadcast = state.tx.subscribe();
    let ws_tx_broadcast = ws_tx.clone();
    let mut broadcast_task = tokio::spawn(async move {
        while let Ok(msg) = rx_broadcast.recv().await {
            if ws_tx_broadcast.send(Message::Text(msg.into())).await.is_err() { break; }
        }
    });

    let state_clone = state.clone();
    let ws_tx_logic = ws_tx.clone();

    let mut recv_task = tokio::spawn(async move {
        let mut my_username = String::new();
        let mut my_room_id = String::new();

        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text_bytes) = msg {
                let text = text_bytes.as_str();

                if let Ok(data) = serde_json::from_str::<serde_json::Value>(text) {
                    let cmd = data["cmd"].as_str().unwrap_or("");
                    let current_room = if !my_room_id.is_empty() { state_clone.rooms.get(&my_room_id).map(|r| r.clone()) } else { None };

                    match cmd {
                        "JOIN" => {
                            let u = data["username"].as_str().unwrap_or("Guest").to_string();
                            let rid = data["room_id"].as_str().unwrap_or("101").to_string();
                            let room = state_clone.rooms.entry(rid.clone()).or_insert_with(|| Arc::new(Room::new(rid.clone())));

                            if room.users.len() >= 16 {
                                let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Phòng đầy (16/16)!" }).to_string().into())).await;
                                continue;
                            }

                            my_username = u.clone();
                            my_room_id = rid.clone();

                            let conn = Connection::open(&state_clone.db_path).unwrap();
                            let (balance, role): (i64, String) = conn.query_row(
                                "SELECT balance, role FROM users WHERE username = ?1",
                                params![u],
                                |row| Ok((row.get(0)?, row.get(1)?))
                            ).unwrap_or((0, "user".to_string()));

                            room.users.insert(u.clone(), UserInfo {
                                username: u.clone(),
                                score: balance,
                                is_confirmed: false,
                                role,
                            });

                            let is_new_host = {
                                let mut host_lock = room.current_host.lock().unwrap();
                                if host_lock.is_none() { *host_lock = Some(u.clone()); true } else { false }
                            };

                            let history = room.drawn_numbers.lock().unwrap().clone();
                            let owners: std::collections::HashMap<u32, String> = room.ticket_owners.iter().map(|r| (*r.key(), r.value().clone())).collect();
                            let current_host_name = room.current_host.lock().unwrap().clone();
                            let is_over = *room.is_game_over.lock().unwrap();
                            let waiters: std::collections::HashMap<String, u32> = room.waiting_counts.iter().map(|r| (r.key().clone(), *r.value())).collect();
                            let price = *room.ticket_price.lock().unwrap();
                            let logs = room.log_history.lock().unwrap().clone();
                            let user_list: Vec<String> = room.users.iter().map(|r| r.key().clone()).collect();

                            let _ = ws_tx_logic.send(Message::Text(json!({
                                "type": "SYNC_STATE", "room_id": rid,
                                "numbers": history, "owners": owners, "host": current_host_name,
                                "is_game_over": is_over, "waiters": waiters, "ticket_price": price,
                                "logs": logs, "users": user_list
                            }).to_string().into())).await;

                            let msg_txt = format!("{} vào phòng!", u);
                            room.append_log(msg_txt.clone());
                            let _ = state_clone.tx.send(json!({ "type": "USER_JOINED", "room_id": rid, "username": u, "message": msg_txt }).to_string());

                            if is_new_host {
                                let log_host = format!("👑 {} là chủ phòng mới!", u);
                                room.append_log(log_host.clone());
                                let _ = state_clone.tx.send(json!({ "type": "HOST_CHANGED", "room_id": rid, "username": u, "message": log_host }).to_string());
                            }
                        },

                        _ => {
                            if let Some(room) = current_room {
                                match cmd {
                                    "CONFIRM_TICKET" => {
                                        if let Some(mut user) = room.users.get_mut(&my_username) {
                                            user.is_confirmed = true;
                                            let msg = format!("✅ {} đã chốt vé!", my_username);
                                            room.append_log(msg.clone());
                                            let _ = state_clone.tx.send(json!({ "type": "USER_CONFIRMED", "room_id": my_room_id, "username": my_username, "message": msg }).to_string());
                                        }
                                    },
                                    "SELECT_TICKET" => {
                                        let ticket_id = data["ticket_id"].as_u64().unwrap_or(0) as u32;
                                        let has_started = !room.drawn_numbers.lock().unwrap().is_empty();
                                        if *room.is_game_over.lock().unwrap() { let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Game Over!" }).to_string().into())).await; }
                                        else if has_started { let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Ván đang chạy! Bạn là khán giả." }).to_string().into())).await; }
                                        else if room.ticket_owners.contains_key(&ticket_id) { let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Vé đã có chủ" }).to_string().into())).await; }
                                        else {
                                            let my_count = room.ticket_owners.iter().filter(|r| r.value() == &my_username).count();
                                            if my_count >= 2 { let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Max 2 vé!" }).to_string().into())).await; }
                                            else {
                                                let price = *room.ticket_price.lock().unwrap();
                                                update_balance(&state_clone, &my_room_id, &my_username, -price);

                                                room.ticket_owners.insert(ticket_id, my_username.clone());
                                                if let Some(mut u) = room.users.get_mut(&my_username) { u.is_confirmed = false; }
                                                let _ = state_clone.tx.send(json!({ "type": "TICKET_TAKEN", "room_id": my_room_id, "ticket_id": ticket_id, "owner": my_username }).to_string());
                                            }
                                        }
                                    },
                                    "UNSELECT_TICKET" => {
                                        let ticket_id = data["ticket_id"].as_u64().unwrap_or(0) as u32;
                                        let has_started = !room.drawn_numbers.lock().unwrap().is_empty();
                                        if has_started { let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Ván đã chạy!" }).to_string().into())).await; }
                                        else if let Some(owner) = room.ticket_owners.get(&ticket_id) {
                                            if owner.value() == &my_username {
                                                drop(owner); room.ticket_owners.remove(&ticket_id);
                                                if let Some(mut u) = room.users.get_mut(&my_username) { u.is_confirmed = false; }
                                                let price = *room.ticket_price.lock().unwrap();
                                                update_balance(&state_clone, &my_room_id, &my_username, price);
                                                let _ = state_clone.tx.send(json!({ "type": "TICKET_FREED", "room_id": my_room_id, "ticket_id": ticket_id }).to_string());
                                            }
                                        }
                                    },
                                    "SIGNAL_WAIT" => {
                                        let has_ticket = room.ticket_owners.iter().any(|r| r.value() == &my_username);
                                        if !has_ticket {
                                            let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Bạn là khán giả, không được báo chờ!" }).to_string().into())).await;
                                        } else if !*room.is_game_over.lock().unwrap() {
                                            let mut count = room.waiting_counts.entry(my_username.clone()).or_insert(0);
                                            *count += 1; let c = *count; drop(count);
                                            let _ = state_clone.tx.send(json!({ "type": "USER_WAITING", "room_id": my_room_id, "username": my_username, "count": c, "message": format!("⚠️ {} ĐANG CHỜ ({} hàng)!", my_username, c) }).to_string());
                                        }
                                    },
                                    "SET_PRICE" => {
                                        let current_host = room.current_host.lock().unwrap().clone();
                                        if current_host.as_ref() == Some(&my_username) {
                                            let new_price = data["price"].as_i64().unwrap_or(0);
                                            if !room.ticket_owners.is_empty() { let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Không đổi giá khi đã bán vé!" }).to_string().into())).await; }
                                            else {
                                                *room.ticket_price.lock().unwrap() = new_price;
                                                let msg = format!("Host đổi giá vé: {}đ", new_price);
                                                room.append_log(msg.clone());
                                                let _ = state_clone.tx.send(json!({ "type": "PRICE_UPDATED", "room_id": my_room_id, "price": new_price, "message": msg }).to_string());
                                            }
                                        }
                                    },
                                    "START_AUTO_DRAW" => {
                                        let current_host = room.current_host.lock().unwrap().clone();
                                        if current_host.as_ref() == Some(&my_username) {
                                            if *room.is_game_over.lock().unwrap() { let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Game Over! Reset đi." }).to_string().into())).await; }
                                            else if room.ticket_owners.is_empty() { let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Chưa ai mua vé!" }).to_string().into())).await; }
                                            else {
                                                let mut violators = HashSet::new();
                                                for ticket_entry in room.ticket_owners.iter() {
                                                    let owner = ticket_entry.value();
                                                    if let Some(user_info) = room.users.get(owner) {
                                                        if !user_info.is_confirmed { violators.insert(owner.clone()); }
                                                    }
                                                }

                                                if !violators.is_empty() {
                                                    let list: Vec<String> = violators.into_iter().collect();
                                                    let _ = state_clone.tx.send(json!({ "type": "ERROR", "room_id": my_room_id, "message": format!("Người chơi chưa chốt vé: {}", list.join(", ")) }).to_string());
                                                } else {
                                                    let interval_sec = data["interval"].as_u64().unwrap_or(3);
                                                    let msg = format!("Bắt đầu quay ({}s/số)...", interval_sec);
                                                    room.append_log(msg.clone());
                                                    let _ = state_clone.tx.send(json!({ "type": "AUTO_DRAW_STARTED", "room_id": my_room_id, "message": msg }).to_string());

                                                    let room_thread = room.clone();
                                                    let st_thread = state_clone.clone();
                                                    let rid_thread = my_room_id.clone();

                                                    let handle = tokio::spawn(async move {
                                                        loop {
                                                            if room_thread.ticket_owners.is_empty() { let _ = st_thread.tx.send(json!({ "type": "AUTO_DRAW_STOPPED", "room_id": rid_thread, "message": "Hết vé!" }).to_string()); break; }
                                                            tokio::time::sleep(Duration::from_secs(interval_sec)).await;

                                                            // SỬA: Khai báo không init để tránh warning "never read"
                                                            let new_num;
                                                            let history;
                                                            {
                                                                let mut nums = room_thread.drawn_numbers.lock().unwrap();
                                                                if nums.len() >= 90 { break; }
                                                                let mut rng = rand::rng();
                                                                loop {
                                                                    let n = rng.random_range(1..=90);
                                                                    if !nums.contains(&n) {
                                                                        nums.push(n);
                                                                        new_num = n; // Gán lần đầu
                                                                        history = nums.clone(); // Gán lần đầu
                                                                        break;
                                                                    }
                                                                }
                                                            }

                                                            let _ = st_thread.tx.send(json!({ "type": "NEW_NUMBER", "room_id": rid_thread, "value": new_num, "history": history }).to_string());

                                                            if let Some(winners) = check_winner_in_room(&st_thread, &room_thread) {
                                                                let price = *room_thread.ticket_price.lock().unwrap();
                                                                let pot = price * (room_thread.ticket_owners.len() as i64);
                                                                let prize = if !winners.is_empty() { pot / (winners.len() as i64) } else { 0 };
                                                                let mut names = Vec::new();
                                                                for (name, _) in winners { names.push(name.clone()); update_balance(&st_thread, &rid_thread, &name, prize); }

                                                                let msg_win = format!("🏆 {} THẮNG! (+{}đ)", names.join(", "), prize);
                                                                room_thread.append_log(msg_win.clone());
                                                                let _ = st_thread.tx.send(json!({ "type": "WINNER", "room_id": rid_thread, "username": "SERVER", "message": msg_win }).to_string());
                                                                break;
                                                            }
                                                        }
                                                        *room_thread.auto_draw_handle.lock().unwrap() = None;
                                                    });
                                                    *room.auto_draw_handle.lock().unwrap() = Some(handle);
                                                }
                                            }
                                        }
                                    },
                                    "STOP_AUTO_DRAW" => {
                                        let current_host = room.current_host.lock().unwrap().clone();
                                        if current_host.as_ref() == Some(&my_username) {
                                            let mut h = room.auto_draw_handle.lock().unwrap();
                                            if let Some(x) = h.take() {
                                                x.abort();
                                                let msg = "Đã tạm dừng quay.".to_string();
                                                room.append_log(msg.clone());
                                                let _ = state_clone.tx.send(json!({ "type": "AUTO_DRAW_STOPPED", "room_id": my_room_id, "message": msg }).to_string());
                                            }
                                        }
                                    },
                                    "RESET" => {
                                        let current_host = room.current_host.lock().unwrap().clone();
                                        if current_host.as_ref() == Some(&my_username) {
                                            if room.auto_draw_handle.lock().unwrap().is_some() {
                                                let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Đang quay! Hãy dừng trước khi Reset." }).to_string().into())).await;
                                            } else {
                                                room.drawn_numbers.lock().unwrap().clear();
                                                room.ticket_owners.clear();
                                                room.waiting_counts.clear();
                                                *room.is_game_over.lock().unwrap() = false;
                                                for mut u in room.users.iter_mut() { u.is_confirmed = false; }
                                                let msg = "🔄 Ván mới bắt đầu!".to_string();
                                                room.append_log(msg.clone());
                                                let _ = state_clone.tx.send(json!({ "type": "GAME_RESET", "room_id": my_room_id, "message": msg }).to_string());
                                            }
                                        }
                                    },
                                    "TRANSFER_HOST" => {
                                        let current_host = room.current_host.lock().unwrap().clone();
                                        if current_host.as_ref() == Some(&my_username) {
                                            if !room.drawn_numbers.lock().unwrap().is_empty() {
                                                let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "Ván đang chạy! Không thể chuyển Host." }).to_string().into())).await;
                                            } else {
                                                let target = data["target"].as_str().unwrap_or("");
                                                if room.users.contains_key(target) {
                                                    *room.current_host.lock().unwrap() = Some(target.to_string());
                                                    let msg = format!("👑 Host chuyển quyền cho {}", target);
                                                    room.append_log(msg.clone());
                                                    let _ = state_clone.tx.send(json!({ "type": "HOST_CHANGED", "room_id": my_room_id, "username": target, "message": msg }).to_string());
                                                } else {
                                                    let _ = ws_tx_logic.send(Message::Text(json!({ "type": "ERROR", "message": "User không tồn tại!" }).to_string().into())).await;
                                                }
                                            }
                                        }
                                    },
                                    _ => {}
                                }
                            }
                        }
                    }
                }
            }
        }

        if !my_username.is_empty() && !my_room_id.is_empty() {
            let mut should_remove_room = false;
            if let Some(room) = state_clone.rooms.get(&my_room_id) {
                room.users.remove(&my_username);
                let _ = state_clone.tx.send(json!({ "type": "USER_LEFT", "room_id": my_room_id, "username": my_username }).to_string());

                let mut host_lock = room.current_host.lock().unwrap();
                if host_lock.as_ref() == Some(&my_username) {
                    if let Some(first) = room.users.iter().next() {
                        *host_lock = Some(first.key().clone());
                        let msg = format!("👑 {} là chủ phòng mới!", first.key());
                        room.append_log(msg.clone());
                        let _ = state_clone.tx.send(json!({ "type": "HOST_CHANGED", "room_id": my_room_id, "username": first.key(), "message": msg }).to_string());
                    } else { *host_lock = None; }
                }
                if room.users.is_empty() { should_remove_room = true; }
            }
            if should_remove_room { state_clone.rooms.remove(&my_room_id); println!("🗑️ Phòng {} giải tán.", my_room_id); }
        }
    });

    // SỬA: Xóa ngoặc đơn thừa ở (&mut write_task) và dấu chấm phẩy thừa cuối cùng
    tokio::select! {
        _ = &mut write_task => { broadcast_task.abort(); recv_task.abort(); },
        _ = &mut broadcast_task => { write_task.abort(); recv_task.abort(); },
        _ = &mut recv_task => { write_task.abort(); broadcast_task.abort(); }
    }
}