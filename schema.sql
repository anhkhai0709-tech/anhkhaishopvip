-- Cloudflare D1 Database Schema for Anh Khải Shop

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'nam', 'nu', 'phu-kien'
    category_label TEXT NOT NULL, -- 'Thời trang Nam', 'Thời trang Nữ', 'Phụ kiện'
    price REAL NOT NULL,
    original_price REAL,
    image TEXT NOT NULL,
    badge TEXT, -- 'Hot', 'Mới', 'Giảm giá', NULL
    badge_color TEXT DEFAULT 'purple', -- 'purple', 'pink', 'blue'
    description TEXT,
    is_available INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_email TEXT,
    notes TEXT,
    total_amount REAL NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending' (Chờ duyệt), 'approved' (Đã duyệt), 'cancelled' (Đã hủy)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    price REAL NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Seed Initial Admin User (Default admin password: admin123, hash or plaintext for demo)
INSERT OR IGNORE INTO users (id, username, email, password, full_name, phone, address, role)
VALUES ('admin-1', 'anhkhaishop', 'Anhkhai0709@gmail.com', 'admin123', 'Anh Khải (Admin)', '0981923581', 'Ngọc Thiện - Bắc Ninh', 'admin');

-- Seed Initial Customer User
INSERT OR IGNORE INTO users (id, username, email, password, full_name, phone, address, role)
VALUES ('user-1', 'khachhang1', 'khachhang@gmail.com', '123456', 'Nguyễn Văn A', '0912345678', 'Hà Nội', 'user');

-- Seed Products matching UI design images
INSERT OR IGNORE INTO products (id, name, category, category_label, price, original_price, image, badge, badge_color, description, is_available) VALUES
(1, 'áo hoàng gia', 'nam', 'Thời trang Nam', 120000, 180000, 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80', 'Hot', 'pink', 'Phong cách hoàng gia sang trọng, chất liệu vải mềm mại thoáng mát.', 1),
(2, 'áo chó', 'nu', 'Thời trang Nữ', 199999, 250000, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80', 'Mới', 'blue', 'Thời trang nữ chất liệu cao cấp, kiểu dáng thời thượng cá tính.', 1),
(3, 'Váy new', 'nu', 'Thời trang Nữ', 499999, 650000, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80', 'Hot', 'pink', 'Váy nữ thiết kế ren lộng lẫy quyến rũ, kiểu dáng tôn dáng quyến rũ.', 1),
(4, 'phông micky', 'nu', 'Thời trang Nữ', 199999, 230000, 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80', 'Hot', 'purple', 'Áo phông họa tiết Micky cá tính, chất cotton 100% cực mát.', 1),
(5, 'Áo khoác Blazer Nam', 'nam', 'Thời trang Nam', 350000, 450000, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80', 'Hot', 'pink', 'Áo Blazer phong cách lịch lãm, lịch sự cho nam giới.', 1),
(6, 'Túi Xách Nữ Đeo Chéo', 'phu-kien', 'Phụ kiện', 150000, 220000, 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80', 'Mới', 'blue', 'Túi xách nữ da mềm cao cấp, kiểu dáng thanh lịch.', 1),
(7, 'Mũ Nồi Thời Trang', 'phu-kien', 'Phụ kiện', 89000, 120000, 'https://images.unsplash.com/photo-1521369909029-2afed882baee?auto=format&fit=crop&w=600&q=80', 'Mới', 'blue', 'Mũ nồi phụ kiện thời trang Hàn Quốc trẻ trung.', 1),
(8, 'Quần Jeans Nam Slimfit', 'nam', 'Thời trang Nam', 280000, 350000, 'https://images.unsplash.com/photo-1542272604-780c36856d60?auto=format&fit=crop&w=600&q=80', 'Hot', 'pink', 'Quần jeans co giãn thoải mái, form dáng chuẩn đẹp.', 1),
(9, 'Kính Râm Thời Trang', 'phu-kien', 'Phụ kiện', 99000, 150000, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=600&q=80', 'Giảm giá', 'purple', 'Kính râm chống tia UV400 cao cấp, phong cách sành điệu.', 1);

-- Seed Initial Sample Orders
INSERT OR IGNORE INTO orders (id, user_id, customer_name, customer_phone, customer_address, customer_email, notes, total_amount, status) VALUES
(1, 'user-1', 'Nguyễn Văn A', '0912345678', '123 Đường Lê Lợi, Cầu Giấy, Hà Nội', 'khachhang@gmail.com', 'Giao trong giờ hành chính', 319999, 'pending'),
(2, 'admin-1', 'Anh Khải', '0981923581', 'Ngọc Thiện - Bắc Ninh', 'Anhkhai0709@gmail.com', 'Đơn hàng tự đặt thử', 499999, 'approved'),
(3, 'user-1', 'Trần Thị B', '0988776655', '456 Phố Huế, Hai Bà Trưng, Hà Nội', 'tranthib@gmail.com', 'Gọi trước khi giao', 120000, 'pending');

INSERT OR IGNORE INTO order_items (order_id, product_id, product_name, price, quantity) VALUES
(1, 1, 'áo hoàng gia', 120000, 1),
(1, 2, 'áo chó', 199999, 1),
(2, 3, 'Váy new', 499999, 1),
(3, 1, 'áo hoàng gia', 120000, 1);
