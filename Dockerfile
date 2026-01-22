# --- STAGE 1: BUILDER (Dùng bản mới nhất để compile) ---
FROM rust:1-bookworm as builder
WORKDIR /usr/src/app
COPY . .
# Build bản release để tối ưu hiệu năng
RUN cargo build --release

# --- STAGE 2: RUNNER (Nhẹ, dùng để chạy thật) ---
FROM debian:bookworm-slim

# Cài các thư viện hệ thống tối thiểu
RUN apt-get update && apt-get install -y libssl-dev ca-certificates sqlite3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Chỉ copy file đã biên dịch từ Stage 1 sang
COPY --from=builder /usr/src/app/target/release/loto-app /app/loto-app

# Copy dữ liệu cần thiết
COPY tickets.json /app/
COPY .env /app/
COPY static /app/static

# Expose port nội bộ
EXPOSE 3000

# Lệnh chạy
CMD ["./loto-app"]