# 🛒 Anh Khải Shop - Website Bán Hàng Cloudflare Pages

Dự án website bán hàng thời trang **Anh Khải Shop** thiết kế chuẩn Mobile-First, chuẩn theo giao diện thiết kế hình ảnh mẫu, tích hợp đầy đủ tính năng Giỏ hàng, Đăng nhập/Đăng ký mua hàng, Quản trị Admin, kết nối cơ sở dữ liệu **Cloudflare D1 (SQLite)** và bộ lưu trữ hình ảnh **Cloudflare R2 Object Storage**.

---

## 🌟 Tính Năng Nổi Bật

1. **Mobile First & Responsive 100%**: Giao diện đẹp mắt, tương thích hoàn hảo từ thiết bị di động, tablet đến màn hình máy tính.
2. **Backend Serverless (Cloudflare Pages Functions / Worker)**: Xử lý REST API cực nhanh trên mạng lưới Edge toàn cầu của Cloudflare.
3. **Cloudflare D1 (SQLite)**: Lưu trữ sản phẩm, tài khoản người dùng, đơn hàng và chi tiết đơn hàng.
4. **Cloudflare R2 Object Storage**: Lưu trữ và upload ảnh sản phẩm từ bảng quản trị Admin.
5. **Giỏ hàng & Đặt hàng**: Quản lý giỏ hàng thông minh, yêu cầu bắt buộc **Đăng nhập và đăng nhập mới mua được hàng**.
6. **Bảng Quản Trị Hệ Thống (Admin Dashboard)**:
   - Thêm / Sửa / Xóa sản phẩm, upload ảnh trực tiếp lên R2.
   - Duyệt đơn hàng khách hàng (Duyệt / Hủy).
   - Tích hợp tab **Hướng dẫn cài đặt Cloudflare** từng bước (1-7).

---

## 📁 Cấu Trúc Thư Mục Dự Án

```
d:\anhkhaishopvip\
├── index.html                    # Giao diện Single Page Application (Mobile First, Tailwind CSS, Lucide icons)
├── style.css                     # Custom styles, hiệu ứng animation & màu sắc badge
├── app.js                        # Xử lý logic Frontend, Cart, Auth, Admin CRUD, R2 Upload & Fallback LocalStorage
├── schema.sql                    # SQL Migration cho Cloudflare D1 (Bảng users, products, orders, order_items)
├── wrangler.jsonc                # File cấu hình Cloudflare Pages / Worker (Binding DB & R2)
└── functions/
    └── api/
        └── [[path]].js           # Worker API Handlers (Phục vụ /api/products, /api/orders, /api/auth, /api/upload, /api/images)
```

---

## 🚀 Hướng Dẫn Deploy Lên Cloudflare Pages (7 Bước Chi Tiết)

### **Bước 1: Tạo Database D1 trên Cloudflare**
Mở Terminal tại thư mục dự án và chạy lệnh:
```bash
npx wrangler d1 create anhkhaishop-db
```

### **Bước 2: Lấy Database ID**
Kết quả trả về từ lệnh trên sẽ bao gồm thông tin:
```text
database_name = "anhkhaishop-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### **Bước 3: Cấu hình D1 & R2 Binding trong `wrangler.jsonc`**
Mở file `wrangler.jsonc` và thay thế `database_id` vừa tạo:
```json
{
  "name": "anhkhaishopvip",
  "pages_build_output_dir": "./",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "anhkhaishop-db",
      "database_id": "DÁN_DATABASE_ID_CỦA_BẠN_VÀO_ĐÂY"
    }
  ],
  "r2_buckets": [
    {
      "binding": "IMAGES_BUCKET",
      "bucket_name": "anhkhaishop-images"
    }
  ]
}
```

### **Bước 4: Khởi Tạo Các Bảng Bằng SQL Migration (`schema.sql`)**
Chạy lệnh khởi tạo cơ sở dữ liệu trên Cloudflare Production:
```bash
npx wrangler d1 execute anhkhaishop-db --remote --file=./schema.sql
```
*(Hoặc chạy cục bộ `--local` nếu thử nghiệm bằng `npx wrangler pages dev`)*.

### **Bước 5: Tạo Cloudflare R2 Bucket Lưu Ảnh**
```bash
npx wrangler r2 bucket create anhkhaishop-images
```

### **Bước 6: Kiểm Tra Dữ Liệu D1 Database**
Kiểm tra xem dữ liệu mẫu đã vào bảng `products` chưa:
```bash
npx wrangler d1 execute anhkhaishop-db --remote --command="SELECT * FROM products;"
```

### **Bước 7: Deploy Website Lên Cloudflare Pages**
Đẩy toàn bộ trang web và Worker APIs lên Cloudflare Pages chỉ bằng 1 lệnh:
```bash
npx wrangler pages deploy . --project-name=anhkhaishopvip
```

Sau khi deploy hoàn tất, Cloudflare sẽ cấp cho bạn một đường dẫn công khai (ví dụ: `https://anhkhaishopvip.pages.dev`).

---

## 🔑 Tài Khoản Quản Trị Mặc Định

- **Tên đăng nhập**: `anhkhaishop`
- **Mật khẩu**: `admin123`
- **Quyền**: Admin (Truy cập Bảng Quản Trị Hệ Thống, Thêm sản phẩm, Duyệt đơn hàng).
