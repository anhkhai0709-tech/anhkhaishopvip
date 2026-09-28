// Cloudflare Pages Function API Handler for Anh Khải Shop
// Handles Auth, Products CRUD, Orders, R2 Image Upload, and D1 SQLite operations

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');
    const method = request.method;

    // Standard JSON Response Helper
    const json = (data, status = 200) => new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });

    // Handle CORS Preflight OPTIONS
    if (method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    try {
        // --- 1. R2 IMAGE SERVING (/api/images/:key) ---
        if (path.startsWith('/images/')) {
            const key = path.replace('/images/', '');
            if (!env.IMAGES_BUCKET) {
                return json({ error: 'R2 bucket binding not configured' }, 500);
            }
            const object = await env.IMAGES_BUCKET.get(key);
            if (!object) {
                return json({ error: 'Image not found' }, 404);
            }
            const headers = new Headers();
            object.writeHttpMetadata(headers);
            headers.set('etag', object.httpEtag);
            headers.set('Cache-Control', 'public, max-age=31536000');
            return new Response(object.body, { headers });
        }

        // --- 2. R2 IMAGE UPLOAD (/api/upload) ---
        if (path === '/upload' && method === 'POST') {
            if (!env.IMAGES_BUCKET) {
                return json({ error: 'R2 bucket binding (IMAGES_BUCKET) is required' }, 500);
            }
            const formData = await request.formData();
            const file = formData.get('file');
            if (!file) {
                return json({ error: 'No image file provided' }, 400);
            }

            const extension = file.name.split('.').pop() || 'jpg';
            const filename = `product-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;
            
            await env.IMAGES_BUCKET.put(filename, file.stream(), {
                httpMetadata: { contentType: file.type || 'image/jpeg' }
            });

            // Return relative R2 proxy URL or full R2 URL
            const imageUrl = `/api/images/${filename}`;
            return json({ success: true, filename, url: imageUrl });
        }

        // Check D1 DB Binding availability
        if (!env.DB) {
            return json({ error: 'Cloudflare D1 Database binding (DB) is missing. Please configure wrangler.jsonc.' }, 500);
        }

        // --- 3. AUTHENTICATION ---
        if (path === '/auth/login' && method === 'POST') {
            const body = await request.json();
            const { username, password } = body;

            const user = await env.DB.prepare('SELECT id, username, email, full_name, phone, address, role FROM users WHERE username = ? AND password = ?')
                .bind(username, password)
                .first();

            if (!user) {
                return json({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, 401);
            }

            return json({ success: true, user });
        }

        if (path === '/auth/register' && method === 'POST') {
            const body = await request.json();
            const { username, email, password, full_name, phone, address } = body;

            if (!username || !password || !email || !full_name) {
                return json({ error: 'Vui lòng điền đầy đủ các thông tin bắt buộc' }, 400);
            }

            const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ? OR email = ?')
                .bind(username, email)
                .first();

            if (existing) {
                return json({ error: 'Tên đăng nhập hoặc Email đã tồn tại' }, 400);
            }

            const userId = `user-${Date.now()}`;
            await env.DB.prepare('INSERT INTO users (id, username, email, password, full_name, phone, address, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
                .bind(userId, username, email, password, full_name, phone || '', address || '', 'user')
                .run();

            return json({
                success: true,
                user: { id: userId, username, email, full_name, phone: phone || '', address: address || '', role: 'user' }
            });
        }

        // --- 4. PRODUCTS ---
        if (path === '/products' && method === 'GET') {
            const category = url.searchParams.get('category');
            const search = url.searchParams.get('search');

            let query = 'SELECT * FROM products WHERE is_available = 1';
            let params = [];

            if (category && category !== 'all') {
                query += ' AND category = ?';
                params.push(category);
            }

            if (search) {
                query += ' AND (name LIKE ? OR description LIKE ?)';
                params.push(`%${search}%`, `%${search}%`);
            }

            query += ' ORDER BY id DESC';

            const { results } = await env.DB.prepare(query).bind(...params).all();
            return json({ products: results || [] });
        }

        if (path === '/admin/products' && method === 'GET') {
            const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY id DESC').all();
            return json({ products: results || [] });
        }

        if (path === '/products' && method === 'POST') {
            const body = await request.json();
            const { name, category, category_label, price, original_price, image, badge, badge_color, description } = body;

            if (!name || !category || !price || !image) {
                return json({ error: 'Tên, danh mục, giá và hình ảnh là bắt buộc' }, 400);
            }

            const result = await env.DB.prepare(
                'INSERT INTO products (name, category, category_label, price, original_price, image, badge, badge_color, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(
                name,
                category,
                category_label || (category === 'nam' ? 'Thời trang Nam' : category === 'nu' ? 'Thời trang Nữ' : 'Phụ kiện'),
                parseFloat(price),
                original_price ? parseFloat(original_price) : null,
                image,
                badge || null,
                badge_color || 'purple',
                description || ''
            ).run();

            return json({ success: true, id: result.meta.last_row_id });
        }

        if (path.match(/^\/products\/\d+$/) && method === 'DELETE') {
            const id = path.split('/')[2];
            await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run();
            return json({ success: true, message: 'Đã xóa sản phẩm thành công' });
        }

        if (path.match(/^\/products\/\d+$/) && method === 'PUT') {
            const id = path.split('/')[2];
            const body = await request.json();
            const { name, category, category_label, price, image, badge, description, is_available } = body;

            await env.DB.prepare(
                'UPDATE products SET name = ?, category = ?, category_label = ?, price = ?, image = ?, badge = ?, description = ?, is_available = ? WHERE id = ?'
            ).bind(name, category, category_label, price, badge, description, is_available ? 1 : 0, id).run();

            return json({ success: true, message: 'Đã cập nhật sản phẩm' });
        }

        // --- 5. ORDERS ---
        if (path === '/orders' && method === 'GET') {
            const userId = url.searchParams.get('user_id');
            const role = url.searchParams.get('role');

            let query = 'SELECT * FROM orders ORDER BY id DESC';
            let params = [];

            if (role !== 'admin' && userId) {
                query = 'SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC';
                params.push(userId);
            }

            const { results: orders } = await env.DB.prepare(query).bind(...params).all();

            // Fetch items for each order
            for (let order of orders) {
                const { results: items } = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(order.id).all();
                order.items = items || [];
            }

            return json({ orders: orders || [] });
        }

        if (path === '/orders' && method === 'POST') {
            const body = await request.json();
            const { user_id, customer_name, customer_phone, customer_address, customer_email, notes, items, total_amount } = body;

            if (!user_id) {
                return json({ error: 'Bạn cần phải đăng nhập mới có thể đặt hàng!' }, 401);
            }

            if (!customer_name || !customer_phone || !customer_address || !items || items.length === 0) {
                return json({ error: 'Vui lòng cung cấp đầy đủ thông tin nhận hàng và sản phẩm' }, 400);
            }

            const orderResult = await env.DB.prepare(
                'INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, customer_email, notes, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(user_id, customer_name, customer_phone, customer_address, customer_email || '', notes || '', total_amount, 'pending').run();

            const orderId = orderResult.meta.last_row_id;

            for (const item of items) {
                await env.DB.prepare(
                    'INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?, ?, ?, ?, ?)'
                ).bind(orderId, item.id || item.product_id, item.name || item.product_name, item.price, item.quantity).run();
            }

            return json({ success: true, order_id: orderId, message: 'Đặt hàng thành công!' });
        }

        if (path.match(/^\/orders\/\d+\/status$/) && method === 'PUT') {
            const orderId = path.split('/')[2];
            const { status } = await request.json();

            await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status, orderId).run();
            return json({ success: true, message: `Đã cập nhật trạng thái đơn hàng #${orderId} thành ${status}` });
        }

        return json({ error: 'API route not found' }, 404);

    } catch (err) {
        return json({ error: err.message || 'Internal Server Error' }, 500);
    }
}
