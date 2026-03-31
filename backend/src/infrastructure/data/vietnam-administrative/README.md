# Vietnam Administrative Data

- Source: `vietmap-company/vietnam_administrative_address`
- Snapshot: `admin_new`
- Scope: `34` tỉnh/thành và `3.321` xã/phường sau thay đổi có hiệu lực từ `2025-07-01`
- License: xem [LICENSE.vietmap.txt](./LICENSE.vietmap.txt)

Các file trong thư mục này được dùng để:
- cấp dữ liệu selector địa chỉ cho frontend qua backend API
- validate `shippingCity` và `shippingWard` khi tạo đơn hàng

`district` được giữ lại như field legacy tương thích ngược với dữ liệu cũ của hệ thống, nhưng không còn là cấp hành chính bắt buộc trong dữ liệu hiện hành.
