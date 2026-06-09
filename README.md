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
7. **💾 Zero-Config Auto Log Rotation**: Tích hợp sẵn bộ máy quản lý vòng đời file log ngay trong Agent. Không cần cài đặt module ngoài, tự động cắt log khi vượt ngưỡng 10MB, nén Gzip (.gz) siêu tiết kiệm dung lượng, và tự động xóa sau 7 ngày! Bảo vệ máy chủ khỏi rủi ro tràn ổ cứng.

---

## 🏗 Kiến trúc Hệ thống

Hệ thống được thiết kế theo mô hình **Hub-and-Spoke** hoàn chỉnh, chia thành 3 cấu phần chính (Monorepo):

1. **`/backend` (Hub - Central Server)**:
   - Máy chủ trung tâm (Express + Socket.io).
   - Quản lý toàn bộ State và trạng thái kết nối của các Spoke (Agent) gửi về.
   - Đóng vai trò là cầu nối (Router) định tuyến luồng Log Stream và các lệnh điều khiển (Restart/Stop) từ Frontend xuống đúng Agent tương ứng.
   - Phân phối toàn bộ giao diện tĩnh (Frontend Build) ở chế độ Production.

2. **`/agent` (Spoke - Node Client)**:
   - Cài đặt trực tiếp trên các máy chủ cần giám sát (nơi đang chạy PM2).
   - **Metrics Collector**: Kết nối sâu vào PM2 Bus API (`pm2.launchBus`) để lấy thông số (CPU, RAM, Req/min, Latency) và sự kiện của PM2.
   - **Log Streamer**: Stream trực tiếp luồng stdout/stderr thời gian thực.
   - **Zero-Config Log Rotator**: Tích hợp bộ máy quản lý vòng đời file log (tự động cắt file >10MB, nén gzip, tự xóa file cũ) trực tiếp bên trong nội bộ tiến trình, tránh phụ thuộc vào module lỗi của hệ điều hành.

3. **`/frontend` (Dashboard UI)**:
   - Xây dựng bằng React + Vite + TailwindCSS với giao diện Glassmorphism.
   - **Global Dashboard**: Tự động tổng hợp và tính toán tài nguyên (Aggregated Metrics) của toàn bộ Cluster/Grid các máy chủ độc lập.
   - **Real-time Engine**: Kết nối Socket.io liên tục để render các biểu đồ Recharts mượt mà.
   - **FlexSearch Integration**: Lập chỉ mục và cho phép tìm kiếm Full-text siêu tốc nội dung log của bất kỳ Worker nào ngay trên trình duyệt (Client-side Search).

---

## 🛠 Hướng dẫn Cài đặt & Chạy

---

## 🚀 Triển khai thực tế (Production) bằng 1-Click Install

Thay vì phải tải mã nguồn và gõ từng lệnh, **PM2-Watch PRO** đã được đóng gói thành một Global CLI Tool cực kỳ chuyên nghiệp. 

**Bước 1: Cài đặt từ kho NPM (Yêu cầu Node.js)**
```bash
npm install -g @noname260588/pm2-watch
```

**Bước 2: Khởi động hệ thống**
Bạn chỉ cần gõ đúng 1 lệnh duy nhất ở bất kỳ đâu:
```bash
pm2-watch start
```

Lệnh này sẽ kích hoạt 2 tiến trình chạy ngầm:
1. `pm2-watch-backend`: Khởi động máy chủ trung tâm kiêm Server phát giao diện tĩnh ở cổng **3000**.
2. `pm2-watch-agent`: Khởi động Agent nội bộ thu thập dữ liệu.

Mở trình duyệt tại: `http://localhost:3000`

**Các lệnh CLI hỗ trợ:**
- `pm2-watch start`: Bật hệ thống giám sát.
- `pm2-watch stop`: Tắt hệ thống.
- `pm2-watch logs`: Xem log của máy chủ trung tâm.

*Lưu ý: Để PM2 tự động bật hệ thống khi VPS khởi động lại, hãy chạy `pm2 save` và `pm2 startup`.*

---

## 🔄 Hướng dẫn Cập nhật / Gỡ cài đặt

**Cập nhật lên phiên bản mới nhất:**
```bash
pm2-watch stop
npm cache clean --force
npm install -g @noname260588/pm2-watch
pm2-watch start
```

**Gỡ bỏ hoàn toàn khỏi hệ thống:**
```bash
pm2 delete pm2-watch-agent pm2-watch-backend
npm uninstall -g @noname260588/pm2-watch
```

---

## 🐳 Triển khai bằng Docker (Docker Compose)

Nếu bạn không muốn cài đặt Node.js trực tiếp lên server, bạn hoàn toàn có thể chạy PM2-Watch PRO dưới dạng một Container. Điều đặc biệt là Agent bên trong Container vẫn có thể giám sát được PM2 chạy trên máy Host!

**Khởi động bằng Docker Compose:**
```bash
git clone https://github.com/noname260588/pm2-watch.git
cd pm2-watch
docker-compose up -d --build
```

**Bí mật đằng sau:**
Hệ thống sử dụng kỹ thuật mount volume `~/.pm2:/root/.pm2:ro` để Agent bên trong Container có thể kết nối vào Socket RPC của PM2 đang chạy trên máy thật (Host).

---



## 🔐 Mở rộng trong tương lai
- Thêm bảo mật Token xác thực cho Agent và Frontend.
- Lưu trữ Log và History lâu dài vào cơ sở dữ liệu (MongoDB/ClickHouse).
- Quản lý phân quyền người dùng (Role-based access).

*Được phát triển với niềm đam mê dành cho High-Performance Node.js Monitoring.*
