# TechMart — Bản đồ tính năng (Feature Map)

> Mục đích: Khi bảo vệ đồ án, dùng file này để tra nhanh "tính năng X nằm ở đâu".
> Mọi đường dẫn đều click được trong VSCode (Ctrl+Click).

## Mục lục
1. [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
2. [Xác thực & Người dùng](#1-xác-thực--người-dùng)
3. [Sản phẩm & Danh mục](#2-sản-phẩm--danh-mục)
4. [Giỏ hàng & Đặt hàng](#3-giỏ-hàng--đặt-hàng)
5. [Thanh toán (VNPay + COD + Ví)](#4-thanh-toán)
6. [Ví TechMart (nạp + rút)](#5-ví-techmart)
7. [Hoàn hàng + Kiểm tra hàng](#6-hoàn-hàng--kiểm-tra-hàng)
8. [Tích điểm & Hạng thành viên](#7-tích-điểm--hạng-thành-viên)
9. [Đánh giá sản phẩm](#8-đánh-giá-sản-phẩm)
10. [Voucher & Mã giảm giá](#9-voucher--mã-giảm-giá)
11. [Shipper](#10-shipper)
12. [Chat AI (Groq)](#11-chat-ai)
13. [Hỗ trợ trực tuyến](#12-hỗ-trợ-trực-tuyến)
14. [Khách vãng lai (Guest)](#13-khách-vãng-lai-guest)
15. [Quản trị (Admin)](#14-quản-trị-admin)
16. [Email thông báo](#15-email-thông-báo)
17. [State machine](#state-machine-trạng-thái)
18. [Routes API](#routes-api)
19. [Migrations](#migrations-database)

---

## Kiến trúc tổng quan

**Clean Architecture** — 4 lớp:
```
presentation/   ← controllers, routes, middleware (HTTP layer)
application/    ← use-cases, services, mappers (business logic)
domain/         ← entities, repository interfaces (pure business rules)
infrastructure/ ← repositories impl, database, external APIs (I/O)
```

**Luồng request:** `route → controller → use-case → repository → database`

**Stack:**
- Backend: Express + MySQL + TypeScript ([backend/src/](backend/src/))
- Frontend: React + Vite + TypeScript ([frontend/src/](frontend/src/))
- Realtime: Socket.io (chat hỗ trợ)
- AI: Groq SDK (chatbot)
- Thanh toán: VNPay sandbox

---

## 1. Xác thực & Người dùng

| Lớp | File | Ghi chú |
|---|---|---|
| Route | [backend/src/presentation/routes/auth.routes.ts](backend/src/presentation/routes/auth.routes.ts) | `/api/auth/*` |
| Controller | [backend/src/presentation/controllers/AuthController.ts](backend/src/presentation/controllers/AuthController.ts) | login/register/logout |
| Use-case | [backend/src/application/use-cases/AuthUseCase.ts](backend/src/application/use-cases/AuthUseCase.ts) | bcrypt + JWT |
| Repo | [backend/src/infrastructure/repositories/UserRepository.ts](backend/src/infrastructure/repositories/UserRepository.ts) | CRUD users |
| User CRUD | [backend/src/presentation/controllers/UserControllers.ts](backend/src/presentation/controllers/UserControllers.ts) | đổi mật khẩu, profile |
| Frontend | [frontend/src/features/auth/](frontend/src/features/auth/) | Login/Register page |
| Profile | [frontend/src/features/account/pages/ProfilePage.tsx](frontend/src/features/account/pages/ProfilePage.tsx) | trang tài khoản |
| Middleware | [backend/src/presentation/middleware/authMiddleware.ts](backend/src/presentation/middleware/authMiddleware.ts) | verify JWT, RBAC |

**Roles:** `customer`, `admin`, `shipper` (role `warehouse` đã xóa — xem migration `2026-04-26-remove-warehouse-role.sql`)

---

## 2. Sản phẩm & Danh mục

| Tính năng | File |
|---|---|
| Controller sản phẩm | [backend/src/presentation/controllers/ProductController.ts](backend/src/presentation/controllers/ProductController.ts) |
| Use-case | [backend/src/application/use-cases/ProductUseCase.ts](backend/src/application/use-cases/ProductUseCase.ts) |
| Repo | [backend/src/infrastructure/repositories/ProductRepository.ts](backend/src/infrastructure/repositories/ProductRepository.ts) |
| Mapper (presenter) | [backend/src/application/mappers/ProductPresenter.ts](backend/src/application/mappers/ProductPresenter.ts) |
| Danh mục | [backend/src/presentation/controllers/CategoryController.ts](backend/src/presentation/controllers/CategoryController.ts) |
| Thương hiệu | [backend/src/presentation/controllers/BrandController.ts](backend/src/presentation/controllers/BrandController.ts) |
| Thuộc tính (RAM/màu) | [backend/src/presentation/controllers/AttributeController.ts](backend/src/presentation/controllers/AttributeController.ts) |
| Banner | [backend/src/presentation/controllers/BannerController.ts](backend/src/presentation/controllers/BannerController.ts) |
| FE — Trang sản phẩm | [frontend/src/features/products/](frontend/src/features/products/) |
| FE — Tìm kiếm/lọc | [ProductController.getAll](backend/src/presentation/controllers/ProductController.ts#L11) — slug map cho category/brand |

**Filter hỗ trợ:** category, brand, RAM, storage, chip, giá min/max, on-sale, featured, new, bestseller.

---

## 3. Giỏ hàng & Đặt hàng

| Tính năng | File |
|---|---|
| Cart (FE only) | [frontend/src/features/cart/](frontend/src/features/cart/) |
| Validate cart trước checkout | [ProductController.validateCart](backend/src/presentation/controllers/ProductController.ts#L168) |
| Tạo đơn | [OrderController.createOrder](backend/src/presentation/controllers/OrderController.ts) → [OrderUseCase.createOrder](backend/src/application/use-cases/OrderUseCase.ts) |
| Repo đơn hàng | [backend/src/infrastructure/repositories/OrderRepository.ts](backend/src/infrastructure/repositories/OrderRepository.ts) (file lớn nhất, ~1800 dòng — chứa đầy đủ logic đơn + hoàn) |
| FE — Đặt hàng | [frontend/src/features/payment/](frontend/src/features/payment/) |
| FE — Chi tiết đơn | [frontend/src/features/orders/pages/OrderDetailPage.tsx](frontend/src/features/orders/pages/OrderDetailPage.tsx) |
| FE — Component nhỏ | [frontend/src/features/orders/components/](frontend/src/features/orders/components/) |

**Cart không lưu DB** — chỉ lưu `localStorage`. Validate stock + price ngay trước khi tạo đơn để tránh giá đổi.

---

## 4. Thanh toán

| Phương thức | Backend | Frontend |
|---|---|---|
| **COD** | [CODController.ts](backend/src/presentation/controllers/CODController.ts) | inline trong checkout |
| **VNPay** (sandbox) | [VNPayService.ts](backend/src/application/services/VNPayService.ts) + [PaymentController.ts](backend/src/presentation/controllers/PaymentController.ts) | redirect sang VNPay |
| **Ví TechMart** | [WalletController.ts](backend/src/presentation/controllers/WalletController.ts) | xem mục Ví |
| Repo payments | [PaymentRepository.ts](backend/src/infrastructure/repositories/PaymentRepository.ts) | — |

**VNPay flow:** tạo payment URL → user redirect → VNPay callback → backend verify HMAC SHA512 → cập nhật order/wallet.

---

## 5. Ví TechMart

| Tính năng | File |
|---|---|
| Use-case | [backend/src/application/use-cases/WalletUseCase.ts](backend/src/application/use-cases/WalletUseCase.ts) |
| Controller | [backend/src/presentation/controllers/WalletController.ts](backend/src/presentation/controllers/WalletController.ts) |
| Nạp tiền (VNPay) | `WalletUseCase.topup` → VNPayService |
| Rút tiền (thủ công) | `WalletUseCase.requestWithdraw` — admin duyệt/chuyển khoản tay |
| Admin duyệt nạp | [frontend/src/features/admin/pages/AdminWalletTopups.tsx](frontend/src/features/admin/pages/AdminWalletTopups.tsx) |
| Admin duyệt rút | [frontend/src/features/admin/pages/AdminWalletWithdrawals.tsx](frontend/src/features/admin/pages/AdminWalletWithdrawals.tsx) |
| FE — Trang ví | [frontend/src/features/wallet/](frontend/src/features/wallet/) |
| Migration | [2026-04-10-add-wallet-bank-and-withdrawals.sql](backend/src/infrastructure/database/manual-scripts/2026-04-10-add-wallet-bank-and-withdrawals.sql) |

**Lưu ý:** Rút tiền KHÔNG có API ngân hàng — chỉ mô phỏng. Admin xem yêu cầu, chuyển khoản tay, đánh dấu hoàn thành.

---

## 6. Hoàn hàng & Kiểm tra hàng

**Quy trình:** `requested → approved → received → inspected → refunded/rejected → closed`

| Bước | File | Hàm |
|---|---|---|
| 1. Khách yêu cầu hoàn | OrderUseCase | `requestReturn` |
| 2. Admin duyệt | OrderUseCase | `approveReturn` |
| 3. Admin nhận hàng về | OrderUseCase | `markReturnReceived` |
| 4. **Kiểm tra từng món** | [OrderUseCase.inspectReturn](backend/src/application/use-cases/OrderUseCase.ts) | `inspectReturn` — phân loại good/defective/damaged_by_customer |
| 5. Hoàn tiền | OrderRepository | `refundReturn` — restock + cộng ví + trừ điểm |
| 6. Đóng phiếu | OrderUseCase | `closeReturn` |

| Component | File |
|---|---|
| Modal kiểm tra hàng | [frontend/src/features/admin/components/InspectReturnModal.tsx](frontend/src/features/admin/components/InspectReturnModal.tsx) |
| Danh sách returns admin | [frontend/src/features/admin/components/AdminReturnsList.tsx](frontend/src/features/admin/components/AdminReturnsList.tsx) |
| Trang admin returns | [frontend/src/features/admin/pages/AdminReturns.tsx](frontend/src/features/admin/pages/AdminReturns.tsx) |
| FE — Section hoàn (user) | [frontend/src/features/orders/components/OrderReturnsSection.tsx](frontend/src/features/orders/components/OrderReturnsSection.tsx) |
| Migration | [2026-04-25-add-return-inspection.sql](backend/src/infrastructure/database/manual-scripts/2026-04-25-add-return-inspection.sql) |

**Quy tắc nghiệp vụ:**
- `good` → hoàn đủ tiền, restock vào kho bán
- `defective` (lỗi NSX) → hoàn đủ tiền, KHÔNG restock (cần xử lý bảo hành riêng)
- `damaged_by_customer` → KHÔNG hoàn tiền, trả hàng về cho khách
- Nếu **TẤT CẢ** items đều `damaged_by_customer` → tự động chuyển status='rejected'

---

## 7. Tích điểm & Hạng thành viên

| Tính năng | File |
|---|---|
| Service tích điểm | [backend/src/application/services/LoyaltyService.ts](backend/src/application/services/LoyaltyService.ts) |
| Cộng điểm khi đơn `completed` | [OrderRepository.transitionStatus](backend/src/infrastructure/repositories/OrderRepository.ts) (search `loyalty`) |
| Trừ điểm khi hoàn tiền | [OrderRepository.refundReturn](backend/src/infrastructure/repositories/OrderRepository.ts) |
| Hiển thị điểm + tiến độ | [frontend/src/features/account/pages/ProfilePage.tsx](frontend/src/features/account/pages/ProfilePage.tsx) |
| Migration audit log | [2026-04-26-add-user-points-log.sql](backend/src/infrastructure/database/manual-scripts/2026-04-26-add-user-points-log.sql) |

**Quy tắc:**
- 1.000đ subtotal (sau giảm giá, trước phí ship) = 1 điểm
- Hạng: bronze (0) → silver (10k) → gold (50k) → platinum (200k điểm tích lũy)
- Atomic update với `SELECT ... FOR UPDATE` lock

---

## 8. Đánh giá sản phẩm

| File | Ghi chú |
|---|---|
| [Reviewcontroller .ts](backend/src/presentation/controllers/Reviewcontroller%20.ts) | (tên file có space — pre-existing) |
| [ReviewUseCase.ts](backend/src/application/use-cases/ReviewUseCase.ts) | chỉ cho user đã mua + completed |
| [ReviewRepository.ts](backend/src/infrastructure/repositories/ReviewRepository.ts) | — |
| [ReviewModal.tsx](frontend/src/features/orders/components/ReviewModal.tsx) | modal viết đánh giá |

---

## 9. Voucher & Mã giảm giá

| File |
|---|
| [VoucherController.ts](backend/src/presentation/controllers/VoucherController.ts), [VoucherUseCase.ts](backend/src/application/use-cases/VoucherUseCase.ts), [VoucherRepository.ts](backend/src/infrastructure/repositories/VoucherRepository.ts) |
| [CouponController.ts](backend/src/presentation/controllers/CouponController.ts), [CouponUseCase.ts](backend/src/application/use-cases/CouponUseCase.ts) |
| Admin: [AdminVouchers.tsx](frontend/src/features/admin/pages/AdminVouchers.tsx) |

---

## 10. Shipper

| File |
|---|
| [ShipperController.ts](backend/src/presentation/controllers/ShipperController.ts) — login, list orders, update status |
| [ShipperUseCase.ts](backend/src/application/use-cases/ShipperUseCase.ts) |
| [ShipperRepository.ts](backend/src/infrastructure/repositories/ShipperRepository.ts) |
| FE: [frontend/src/features/shipper/](frontend/src/features/shipper/) |

**Flow:** Admin gán đơn → shipper nhận → đi giao → confirm thành công/thất bại.

---

## 11. Chat AI

| File | Ghi chú |
|---|---|
| [ChatController.ts](backend/src/presentation/controllers/ChatController.ts) | endpoint `/chat` + `/chat/stream` (SSE) |
| [GroqService.ts](backend/src/application/services/GroqService.ts) | wrap Groq SDK |
| [ChatToolsService.ts](backend/src/application/services/ChatToolsService.ts) | tool calling — bot tra cứu sản phẩm/đơn |
| FE | (ChatBox component, search frontend `Chat`) |

**Model:** Groq Llama (free tier). Có rate limit handling (429).

---

## 12. Hỗ trợ trực tuyến

| File |
|---|
| [SupportChatController.ts](backend/src/presentation/controllers/SupportChatController.ts) — Socket.io rooms |
| [SupportChatUseCase.ts](backend/src/application/use-cases/SupportChatUseCase.ts) |
| [SupportChatRepository.ts](backend/src/infrastructure/repositories/SupportChatRepository.ts) |
| Admin UI: [SupportChatAdminPage.tsx](frontend/src/features/admin/pages/SupportChatAdminPage.tsx) |
| Migration: [chat-tables.sql](backend/src/infrastructure/database/manual-scripts/chat-tables.sql) |

Realtime 2 chiều: customer ↔ admin qua Socket.io.

---

## 13. Khách vãng lai (Guest)

Khách không cần đăng ký vẫn đặt được hàng (lưu email + phone).

| File |
|---|
| [GuestOrderAccessService.ts](backend/src/application/services/GuestOrderAccessService.ts) — token tra cứu đơn |
| [frontend/src/features/orders/pages/GuestOrderDetailPage.tsx](frontend/src/features/orders/pages/GuestOrderDetailPage.tsx) |
| [GuestReviewModal.tsx](frontend/src/features/orders/components/GuestReviewModal.tsx), [GuestReturnModal.tsx](frontend/src/features/orders/components/GuestReturnModal.tsx) |
| Migration: [2026-04-07-add-guest-order-snapshot.sql](backend/src/infrastructure/database/manual-scripts/2026-04-07-add-guest-order-snapshot.sql) |

---

## 14. Quản trị (Admin)

| Trang | File |
|---|---|
| Dashboard | [AdminDashboard.tsx](frontend/src/features/admin/pages/AdminDashboard.tsx) |
| Đơn hàng | [AdminOrders.tsx](frontend/src/features/admin/pages/AdminOrders.tsx) + [AdminOrderDetail.tsx](frontend/src/features/admin/pages/AdminOrderDetail.tsx) |
| Sản phẩm | [AdminProducts.tsx](frontend/src/features/admin/pages/AdminProducts.tsx) + [AdminProductFormPage.tsx](frontend/src/features/admin/pages/AdminProductFormPage.tsx) |
| Returns | [AdminReturns.tsx](frontend/src/features/admin/pages/AdminReturns.tsx) |
| Người dùng | [AdminUsers.tsx](frontend/src/features/admin/pages/AdminUsers.tsx) |
| Voucher | [AdminVouchers.tsx](frontend/src/features/admin/pages/AdminVouchers.tsx) |
| Banner/Brand/Category/Attribute | tương ứng |
| Backend | [AdminOrderController.ts](backend/src/presentation/controllers/AdminOrderController.ts), [AdminProductController.ts](backend/src/presentation/controllers/AdminProductController.ts) |
| Routes | [backend/src/presentation/routes/admin/](backend/src/presentation/routes/admin/) |

---

## 15. Email thông báo

[EmailService.ts](backend/src/application/services/EmailService.ts) — Nodemailer + Gmail SMTP.

Gửi email khi: đặt đơn, đổi trạng thái, yêu cầu hoàn, hoàn tiền, mã OTP.

---

## State machine (trạng thái)

### Đơn hàng (`orders.status`)
```
pending → confirmed → processing → shipped → delivered → completed
   ↓         ↓            ↓           ↓
cancelled cancelled  cancelled  return_requested
```

### Hoàn hàng (`order_returns.status`)
```
requested → approved → received → inspected ─┬─> refunded → closed
                                              └─> rejected → closed
                                                  
requested → cancelled  (khách hủy)
requested → rejected   (admin từ chối)
```

### Thanh toán (`orders.payment_status`)
```
unpaid → paid → refunded
       ↓
     failed
```

---

## Routes API

| Prefix | File |
|---|---|
| `/api/auth` | [auth.routes.ts](backend/src/presentation/routes/auth.routes.ts) |
| `/api/users` | [user.routes.ts](backend/src/presentation/routes/user.routes.ts) |
| `/api/products` | [product.routes.ts](backend/src/presentation/routes/product.routes.ts) |
| `/api/categories` | [category.routes.ts](backend/src/presentation/routes/category.routes.ts) |
| `/api/brands` | [brand.routes.ts](backend/src/presentation/routes/brand.routes.ts) |
| `/api/orders` | [order.routes.ts](backend/src/presentation/routes/order.routes.ts) |
| `/api/cod` | [cod.routes.ts](backend/src/presentation/routes/cod.routes.ts) |
| `/api/payment` | [payment.routes.ts](backend/src/presentation/routes/payment.routes.ts) |
| `/api/wallet` | [wallet.routes.ts](backend/src/presentation/routes/wallet.routes.ts) |
| `/api/reviews` | [review.routes.ts](backend/src/presentation/routes/review.routes.ts) |
| `/api/shippers` | [shipper.routes.ts](backend/src/presentation/routes/shipper.routes.ts) |
| `/api/vouchers` | [voucherRoutes.ts](backend/src/presentation/routes/voucherRoutes.ts) |
| `/api/coupons` | [coupon.routes.ts](backend/src/presentation/routes/coupon.routes.ts) |
| `/api/banners` | [banner.routes.ts](backend/src/presentation/routes/banner.routes.ts) |
| `/api/wishlist` | [wishlist.routes.ts](backend/src/presentation/routes/wishlist.routes.ts) |
| `/api/addresses` | [address.routes.ts](backend/src/presentation/routes/address.routes.ts) |
| `/api/locations` | [location.routes.ts](backend/src/presentation/routes/location.routes.ts) |
| `/api/chat` | [chat.routes.ts](backend/src/presentation/routes/chat.routes.ts) |
| `/api/support-chat` | [supportChat.routes.ts](backend/src/presentation/routes/supportChat.routes.ts) |
| `/api/admin/*` | [routes/admin/](backend/src/presentation/routes/admin/) |

---

## Migrations Database

Theo thứ tự thời gian, ở [backend/src/infrastructure/database/manual-scripts/](backend/src/infrastructure/database/manual-scripts/):

| Ngày | File | Tính năng |
|---|---|---|
| 2026-04-01 | reconcile-open-order-stock | đối soát stock đơn pending |
| 2026-04-07 | add-guest-order-snapshot | guest order |
| 2026-04-07 | guest-order-public-actions | guest tra cứu đơn |
| 2026-04-09 | add-payments-table | bảng payments |
| 2026-04-09 | add-shipper-order-columns | thêm shipper_id, shipping_status |
| 2026-04-09 | add-shipper-role | role shipper |
| 2026-04-10 | add-wallet-bank-and-withdrawals | ví + rút tiền |
| 2026-04-14 | add-warehouse-condition | (đã loại bỏ) |
| 2026-04-18 | update-banner-images-cdn | banner images |
| 2026-04-22 | add-return-cancelled-status | trạng thái cancelled cho return |
| 2026-04-25 | add-return-inspection | **kiểm tra hàng** ⭐ |
| 2026-04-26 | add-user-points-log | **tích điểm audit** ⭐ |
| 2026-04-26 | remove-warehouse-role | xóa role warehouse |
| - | chat-tables | chat hỗ trợ |

---

## Tips khi bị giám khảo hỏi

1. **"Logic X ở đâu?"** → Ctrl+F file này, tra theo tính năng
2. **"Sao chia nhiều lớp vậy?"** → Clean Architecture: dễ test, dễ thay đổi I/O (đổi MySQL → Postgres không sửa use-case)
3. **"Bảo mật?"** → JWT + bcrypt + RBAC middleware + HMAC verify VNPay + validate input ở controller
4. **"Realtime?"** → Socket.io cho support chat, SSE cho streaming AI chat
5. **"Tại sao có inspection?"** → Tránh fraud (khách báo lỗi nhưng thật ra do va đập), hoàn đúng nghiệp vụ
