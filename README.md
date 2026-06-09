# 🚀 PM2-Watch PRO

**PM2-Watch PRO** là một hệ thống giám sát tập trung (Centralized Monitoring System) thời gian thực dành cho các cụm máy chủ Node.js chạy bằng PM2. Hệ thống được thiết kế theo cấu trúc Hub-and-Spoke với giao diện **Glassmorphism Dark Mode** hiện đại, mang lại trải nghiệm tương đương các hệ thống APM (Application Performance Monitoring) chuyên nghiệp.

![PM2-Watch Architecture](https://raw.githubusercontent.com/noname260588/pm2-watch/main/frontend/public/hero.png) *(Hình ảnh minh họa)*

---

## 🌟 Tính năng nổi bật

1. **💻 System-Level Metrics**: Giám sát không chỉ process Node.js mà còn hiển thị theo thời gian thực CPU Load, % RAM tiêu thụ và Uptime của Hệ điều hành (OS) vật lý.
2. **📈 Real-time APM & Custom Metrics**: 
   - Tự động tích hợp `@pm2/io`.
   - Giám sát luồng mạng: **RPM (Requests Per Minute)** và **Latency (Độ trễ API)**.
   - Quét và hiển thị tự động các Custom Metrics (như *Active DB Connections*, *External API Calls*...).
3. **📊 Drill-down Charts**: Click vào từng Worker để xem biểu đồ biến động phần cứng (CPU/RAM) và Mạng (Req/min, Latency) trong 60 giây gần nhất bằng biểu đồ đường (`Recharts`).
4. **🚨 Smart Alerts**: Cảnh báo tức thời (Toasts) khi CPU vượt mức 80% hoặc một tiến trình bị lỗi/crash.
5. **📜 Live Log Streaming & FlexSearch**: 
   - Stream log (stdout/stderr) từ tất cả server theo thời gian thực.
   - Tích hợp bộ máy **FlexSearch** cho phép tìm kiếm lỗi Full-text siêu tốc độ ngay trên trình duyệt.
6. **⚡ Remote Action Gateway**: Tương tác với process từ xa (Restart/Stop) trực tiếp trên giao diện Dashboard thông qua bảo mật WebSocket.

---

## 🏗 Kiến trúc Hệ thống

Hệ thống được chia thành 3 phần chính (Monorepo):
- **`/backend` (Hub)**: Máy chủ trung tâm (Express + Socket.io) quản lý State của các cụm máy chủ và định tuyến lệnh/logs.
- **`/agent` (Spoke)**: Client cài đặt trên các máy chủ có chạy PM2. Thu thập dữ liệu OS và giao tiếp với PM2 API nội bộ, sau đó truyền về Hub.
- **`/frontend`**: Ứng dụng web React + Vite + TailwindCSS, đóng vai trò Dashboard theo dõi và ra lệnh.

---

## 🛠 Hướng dẫn Cài đặt & Chạy

### 1. Khởi động Backend (Trung tâm)
Backend là trạm trung chuyển dữ liệu (chạy ở cổng 3000).
```bash
cd backend
npm install
node server.js
```

### 2. Khởi động Agent
Agent cần được chạy cùng quyền User với PM2 (cùng session). Nó sẽ thu thập metrics và gửi lên Backend.
```bash
cd agent
npm install
node index.js
```

### 3. Khởi động Frontend (Dashboard)
Giao diện quản trị hiện đại.
```bash
cd frontend
npm install
npm run dev
```
Mở trình duyệt tại: `http://localhost:5173`

### 4. Chạy Dummy App (Môi trường test)
Để xem toàn bộ sức mạnh của Dashboard, bạn có thể chạy ứng dụng mô phỏng (Dummy App) có tích hợp sẵn `@pm2/io`:
```bash
# Tại thư mục gốc
npm install
pm2 start dummy.js --name "test-worker" --max-memory-restart 100M
```

---

## 🔐 Mở rộng trong tương lai
- Thêm bảo mật Token xác thực cho Agent và Frontend.
- Lưu trữ Log và History lâu dài vào cơ sở dữ liệu (MongoDB/ClickHouse).
- Quản lý phân quyền người dùng (Role-based access).

*Được phát triển với niềm đam mê dành cho High-Performance Node.js Monitoring.*
