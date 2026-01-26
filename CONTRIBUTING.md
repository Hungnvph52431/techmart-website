Quy định làm việc nhóm – Dự án TechMart Website

1. Cấu trúc nhánh (Branch)
- main: chứa code ổn định, chỉ merge khi đã test
- develop: nhánh làm việc chung
- feature/... : nhánh tính năng (feature/login, feature/cart)
- fix/... : nhánh sửa lỗi

2. Quy định commit
Cấu trúc: `<type>: <mô tả ngắn>`
Ví dụ:
- chore: khởi tạo project React
- feat: thêm chức năng đăng ký người dùng
- fix: sửa lỗi hiển thị banner

3. Quy trình Pull Request
1. Hoàn thành tính năng → tạo PR về develop
2. Leader review, kiểm tra code
3. Sau khi ổn định → merge vào main

4. Lưu ý
- Không code trực tiếp trên main
- Luôn pull code mới nhất trước khi làm
- Đặt tên nhánh rõ ràng và commit dễ hiểu
