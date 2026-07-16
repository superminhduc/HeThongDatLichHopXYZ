README - ĐỒ ÁN LẬP TRÌNH ỨNG DỤNG WEB
====================================

NHÓM: 6
HỌC PHẦN: Lập Trình Ứng Dụng Web
Giảng viên: Trần Công Thanh

----------------------------------------------------------------------
I. THÔNG TIN THÀNH VIÊN
----------------------------------------------------------------------
- 2474802010274 – Trần Phước Nhân – Nhóm trưởng (Database)
- 2474802010090 – Nguyễn Minh Đức – Thành viên (Frontend)
- 2474802010571 – Nguyễn Phan Vĩnh Phát – Thành viên (Backend)

----------------------------------------------------------------------
II. MÔ TẢ ĐỀ TÀI
----------------------------------------------------------------------
Tên đề tài:
Hệ Thống Đặt Lịch Họp (Meeting Scheduling System)

Mô tả ngắn:

Website quản lý lịch họp nội bộ doanh nghiệp được xây dựng bằng
Node.js, Express.js, EJS và MySQL.

Hệ thống hỗ trợ:

- Quản lý danh sách cuộc họp.
- Tạo cuộc họp mới.
- Chỉnh sửa thông tin cuộc họp.
- Xem chi tiết cuộc họp.
- Hủy cuộc họp.
- Đánh dấu cuộc họp hoàn thành.
- Xem lịch họp theo dạng Calendar.
- Quản lý người tổ chức và người tham gia.
- Kiểm tra trùng lịch của nhân viên.
- Kiểm tra trùng phòng họp.
- Thống kê Dashboard.

----------------------------------------------------------------------
III. CÁCH CÀI ĐẶT & CHẠY DỰ ÁN (LOCALHOST)
----------------------------------------------------------------------

1. Cài đặt:

- Node.js
- MySQL Server
- MySQL Workbench

2. Copy SourceCode vào thư mục mong muốn.

3. Mở Terminal tại thư mục SourceCode.

4. Cài đặt thư viện:

npm install

5. Import cơ sở dữ liệu:

- Mở MySQL Workbench.
- Import file:

Database/meeting_system.sql

6. Tạo file .env:

PORT=3000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=meeting_system

7. Chạy chương trình:

npm run dev

8. Mở trình duyệt:

http://localhost:3000
