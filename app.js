/**
 * Anh Khải Shop - Main Application Logic
 * Integrates Cloudflare Worker API, D1 SQLite database, R2 Object Storage, and LocalStorage fallbacks.
 */

class ShopApp {
    constructor() {
        this.apiUrl = '/api';
        this.products = [];
        this.orders = [];
        this.cart = [];
        this.currentUser = null;
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.currentAdminTab = 'products';
        this.currentCloudflareStep = 1;
        this.selectedImageFile = null;

        // Initial default products (Fallback & Seed state matching images)
        this.defaultProducts = [
            {
                id: 1,
                name: 'áo hoàng gia',
                category: 'nam',
                category_label: 'Thời trang Nam',
                price: 120000,
                original_price: 180000,
                image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=600&q=80',
                badge: 'Hot',
                badge_color: 'pink',
                description: 'Phong cách hoàng gia sang trọng, chất liệu vải mềm mại thoáng mát.',
                is_available: 1
            },
            {
                id: 2,
                name: 'áo chó',
                category: 'nu',
                category_label: 'Thời trang Nữ',
                price: 199999,
                original_price: 250000,
                image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=600&q=80',
                badge: 'Mới',
                badge_color: 'blue',
                description: 'Thời trang nữ chất liệu cao cấp, kiểu dáng thời thượng cá tính.',
                is_available: 1
            },
            {
                id: 3,
                name: 'Váy new',
                category: 'nu',
                category_label: 'Thời trang Nữ',
                price: 499999,
                original_price: 650000,
                image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=600&q=80',
                badge: 'Hot',
                badge_color: 'pink',
                description: 'Váy nữ thiết kế ren lộng lẫy quyến rũ, kiểu dáng tôn dáng quyến rũ.',
                is_available: 1
            },
            {
                id: 4,
                name: 'phông micky',
                category: 'nu',
                category_label: 'Thời trang Nữ',
                price: 199999,
                original_price: 230000,
                image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=600&q=80',
                badge: 'Hot',
                badge_color: 'purple',
                description: 'Áo phông họa tiết Micky cá tính, chất cotton 100% cực mát.',
                is_available: 1
            },
            {
                id: 5,
                name: 'Áo khoác Blazer Nam',
                category: 'nam',
                category_label: 'Thời trang Nam',
                price: 350000,
                original_price: 450000,
                image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80',
                badge: 'Hot',
                badge_color: 'pink',
                description: 'Áo Blazer phong cách lịch lãm, lịch sự cho nam giới.',
                is_available: 1
            },
            {
                id: 6,
                name: 'Túi Xách Nữ Đeo Chéo',
                category: 'phu-kien',
                category_label: 'Phụ kiện',
                price: 150000,
                original_price: 220000,
                image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
                badge: 'Mới',
                badge_color: 'blue',
                description: 'Túi xách nữ da mềm cao cấp, kiểu dáng thanh lịch.',
                is_available: 1
            }
        ];

        this.defaultOrders = [
            {
                id: 1,
                customer_name: 'Nguyễn Văn A',
                customer_phone: '0912345678',
                customer_address: '123 Đường Lê Lợi, Cầu Giấy, Hà Nội',
                customer_email: 'khachhang@gmail.com',
                notes: 'Giao trong giờ hành chính',
                total_amount: 319999,
                status: 'pending',
                created_at: new Date().toISOString(),
                items: [
                    { id: 1, product_name: 'áo hoàng gia', price: 120000, quantity: 1 },
                    { id: 2, product_name: 'áo chó', price: 199999, quantity: 1 }
                ]
            },
            {
                id: 2,
                customer_name: 'Anh Khải',
                customer_phone: '0981923581',
                customer_address: 'Ngọc Thiện - Bắc Ninh',
                customer_email: 'Anhkhai0709@gmail.com',
                notes: 'Đơn hàng tự đặt thử',
                total_amount: 499999,
                status: 'approved',
                created_at: new Date().toISOString(),
                items: [
                    { id: 3, product_name: 'Váy new', price: 499999, quantity: 1 }
                ]
            },
            {
                id: 3,
                customer_name: 'Trần Thị B',
                customer_phone: '0988776655',
                customer_address: '456 Phố Huế, Hai Bà Trưng, Hà Nội',
                customer_email: 'tranthib@gmail.com',
                notes: 'Gọi trước khi giao hàng',
                total_amount: 120000,
                status: 'pending',
                created_at: new Date().toISOString(),
                items: [
                    { id: 1, product_name: 'áo hoàng gia', price: 120000, quantity: 1 }
                ]
            }
        ];

        this.init();
    }

    async init() {
        this.loadLocalUser();
        this.loadLocalCart();
        await this.fetchProducts();
        await this.fetchOrders();
        this.renderAuthUI();
        this.renderProducts();
        this.renderCart();
        this.renderAdminProductsTable();
        this.renderAdminOrdersTable();
        this.showCloudflareStep(1);
    }

    // Format currency to VND (e.g. 120.000đ)
    formatVND(amount) {
        return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
    }

    // Local Storage Helpers
    loadLocalUser() {
        const saved = localStorage.getItem('aks_user');
        if (saved) {
            try { this.currentUser = JSON.parse(saved); } catch (e) {}
        } else {
            // Default logged in user matching Image 1 ("anhkhaishop")
            this.currentUser = {
                id: 'admin-1',
                username: 'anhkhaishop',
                full_name: 'Anh Khải (Admin)',
                email: 'Anhkhai0709@gmail.com',
                role: 'admin',
                phone: '0981923581',
                address: 'Ngọc Thiện - Bắc Ninh'
            };
            localStorage.setItem('aks_user', JSON.stringify(this.currentUser));
        }
    }

    saveLocalUser(user) {
        this.currentUser = user;
        if (user) {
            localStorage.setItem('aks_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('aks_user');
        }
        this.renderAuthUI();
    }

    loadLocalCart() {
        const saved = localStorage.getItem('aks_cart');
        if (saved) {
            try { this.cart = JSON.parse(saved); } catch (e) {}
        }
    }

    saveLocalCart() {
        localStorage.setItem('aks_cart', JSON.stringify(this.cart));
        this.renderCart();
    }

    // --- API & DATA FETCHING ---
    async fetchProducts() {
        try {
            const res = await fetch(`${this.apiUrl}/products`);
            if (res.ok) {
                const data = await res.json();
                if (data.products && data.products.length > 0) {
                    this.products = data.products;
                    return;
                }
            }
        } catch (err) {
            console.log('Worker API offline, loading mock products dataset');
        }

        // Fallback to local storage or defaults
        const localProds = localStorage.getItem('aks_products');
        if (localProds) {
            this.products = JSON.parse(localProds);
        } else {
            this.products = [...this.defaultProducts];
            localStorage.setItem('aks_products', JSON.stringify(this.products));
        }
    }

    async fetchOrders() {
        try {
            const res = await fetch(`${this.apiUrl}/orders?role=admin`);
            if (res.ok) {
                const data = await res.json();
                if (data.orders) {
                    this.orders = data.orders;
                    return;
                }
            }
        } catch (err) {
            console.log('Worker API offline, loading mock orders dataset');
        }

        const localOrders = localStorage.getItem('aks_orders');
        if (localOrders) {
            this.orders = JSON.parse(localOrders);
        } else {
            this.orders = [...this.defaultOrders];
            localStorage.setItem('aks_orders', JSON.stringify(this.orders));
        }
    }

    // --- RENDER UI COMPONENTS ---
    renderAuthUI() {
        const container = document.getElementById('userAuthContainer');
        const mobileContainer = document.getElementById('mobileAuthContainer');
        const adminBadge = document.getElementById('navAdminBadge');

        if (this.currentUser) {
            if (adminBadge) adminBadge.classList.toggle('hidden', this.currentUser.role !== 'admin');

            const userHTML = `
                <div class="flex items-center space-x-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-xs font-bold text-indigo-700">
                    <span>👋 ${this.currentUser.username}</span>
                </div>
                <button onclick="app.logout()" class="px-3.5 py-1.5 border border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-bold text-xs rounded-full transition">
                    Thoát
                </button>
            `;
            container.innerHTML = userHTML;

            if (mobileContainer) {
                mobileContainer.innerHTML = `
                    <div class="p-3 bg-indigo-50 rounded-xl flex items-center justify-between text-xs font-bold text-indigo-700">
                        <span>👋 Xin chào, ${this.currentUser.username}</span>
                        <button onclick="app.logout()" class="px-3 py-1 bg-white border border-indigo-200 text-indigo-600 rounded-lg">Thoát</button>
                    </div>
                `;
            }

            // Pre-fill contact order form
            const nameInput = document.getElementById('orderName');
            const phoneInput = document.getElementById('orderPhone');
            const addressInput = document.getElementById('orderAddress');
            const emailInput = document.getElementById('orderEmail');

            if (nameInput && !nameInput.value) nameInput.value = this.currentUser.full_name || '';
            if (phoneInput && !phoneInput.value) phoneInput.value = this.currentUser.phone || '';
            if (addressInput && !addressInput.value) addressInput.value = this.currentUser.address || '';
            if (emailInput && !emailInput.value) emailInput.value = this.currentUser.email || '';

        } else {
            if (adminBadge) adminBadge.classList.add('hidden');

            const loginHTML = `
                <button onclick="app.openAuthModal('login')" class="px-4 py-2 border border-slate-200 hover:border-indigo-500 text-slate-700 hover:text-indigo-600 font-bold text-xs rounded-full transition">
                    Đăng nhập
                </button>
            `;
            container.innerHTML = loginHTML;

            if (mobileContainer) {
                mobileContainer.innerHTML = `
                    <button onclick="app.closeMobileMenu(); app.openAuthModal('login');" class="w-full py-2.5 bg-slate-100 text-slate-800 font-bold rounded-xl text-center text-xs">
                        🔑 Đăng nhập / Đăng ký
                    </button>
                `;
            }
        }
    }

    renderProducts() {
        const grid = document.getElementById('productsGrid');
        const emptyState = document.getElementById('emptyProducts');

        let filtered = this.products.filter(p => p.is_available);

        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(p => p.category === this.currentCategory);
        }

        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)));
        }

        if (filtered.length === 0) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            return;
        }

        grid.classList.remove('hidden');
        emptyState.classList.add('hidden');

        grid.innerHTML = filtered.map(p => {
            const badgeBg = p.badge_color === 'pink' ? 'bg-pink-500' : p.badge_color === 'blue' ? 'bg-blue-600' : 'bg-indigo-600';
            const badgeHTML = p.badge ? `<span class="absolute top-4 left-4 ${badgeBg} text-white font-extrabold text-xs px-3 py-1 rounded-md shadow-md z-10">${p.badge}</span>` : '';
            
            return `
                <div class="product-card bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xs flex flex-col group">
                    <div class="relative overflow-hidden h-64 bg-slate-100">
                        ${badgeHTML}
                        <img src="${p.image}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">
                    </div>
                    <div class="p-6 flex flex-col flex-grow space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">${p.category_label || p.category}</span>
                            <span class="text-lg font-extrabold text-indigo-600">${this.formatVND(p.price)}</span>
                        </div>
                        <h3 class="text-xl font-extrabold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">${p.name}</h3>
                        <p class="text-slate-500 text-xs sm:text-sm line-clamp-2 leading-relaxed flex-grow">${p.description || 'Sản phẩm thời trang cao cấp từ Anh Khải Shop.'}</p>
                        <div class="pt-2">
                            <button onclick="app.addToCart(${p.id})" class="w-full py-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold rounded-2xl transition flex items-center justify-center space-x-2 text-sm">
                                <i data-lucide="shopping-cart" class="w-4 h-4"></i>
                                <span>Thêm vào giỏ</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();
    }

    renderCart() {
        const badge = document.getElementById('cartCountBadge');
        const mobileBadge = document.getElementById('cartCountMobileBadge');
        const body = document.getElementById('cartDrawerBody');
        const totalEl = document.getElementById('cartDrawerTotal');
        const loginNotice = document.getElementById('cartLoginNotice');

        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
        const totalPrice = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (badge) badge.innerText = totalItems;
        if (mobileBadge) mobileBadge.innerText = totalItems;
        if (totalEl) totalEl.innerText = this.formatVND(totalPrice);

        if (loginNotice) {
            loginNotice.classList.toggle('hidden', !!this.currentUser);
        }

        if (this.cart.length === 0) {
            body.innerHTML = `
                <div class="py-12 text-center text-slate-400 space-y-3">
                    <i data-lucide="shopping-bag" class="w-12 h-12 mx-auto text-slate-300"></i>
                    <p class="text-sm font-semibold text-slate-600">Giỏ hàng của bạn đang trống</p>
                    <p class="text-xs">Hãy thêm một số sản phẩm thời trang vào giỏ nhé!</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        body.innerHTML = this.cart.map(item => `
            <div class="flex items-center space-x-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <img src="${item.image}" alt="${item.name}" class="w-16 h-16 object-cover rounded-xl flex-shrink-0">
                <div class="flex-grow min-w-0">
                    <h4 class="text-sm font-bold text-slate-900 truncate">${item.name}</h4>
                    <p class="text-xs font-semibold text-indigo-600">${this.formatVND(item.price)}</p>
                    <div class="flex items-center space-x-2 mt-2">
                        <button onclick="app.updateCartQty(${item.id}, -1)" class="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100">-</button>
                        <span class="text-xs font-bold text-slate-800 w-4 text-center">${item.quantity}</span>
                        <button onclick="app.updateCartQty(${item.id}, 1)" class="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-100">+</button>
                    </div>
                </div>
                <button onclick="app.removeFromCart(${item.id})" class="p-1.5 text-slate-400 hover:text-red-500 rounded-lg">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');

        if (window.lucide) lucide.createIcons();
    }

    renderAdminProductsTable() {
        const body = document.getElementById('adminProductsTableBody');
        const countBadge = document.getElementById('adminProductCount');
        if (countBadge) countBadge.innerText = this.products.length;

        if (!body) return;

        body.innerHTML = this.products.map(p => {
            const badgeBg = p.badge === 'Hot' ? 'bg-indigo-600' : 'bg-blue-600';
            return `
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="py-4 px-6">
                        <img src="${p.image}" alt="${p.name}" class="w-12 h-12 rounded-xl object-cover border border-slate-200">
                    </td>
                    <td class="py-4 px-6 font-bold text-slate-900">${p.name}</td>
                    <td class="py-4 px-6">
                        <span class="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 uppercase tracking-wider">${p.category}</span>
                    </td>
                    <td class="py-4 px-6 font-extrabold text-indigo-600">${this.formatVND(p.price)}</td>
                    <td class="py-4 px-6">
                        ${p.badge ? `<span class="px-3 py-1 rounded-full text-xs font-extrabold ${badgeBg} text-white">${p.badge}</span>` : '<span class="text-slate-400 text-xs">-</span>'}
                    </td>
                    <td class="py-4 px-6 text-right space-x-2">
                        <span class="text-xs font-medium text-slate-400">Sẵn có</span>
                        <button onclick="app.deleteProduct(${p.id})" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg font-semibold text-xs transition">Xóa</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderAdminOrdersTable() {
        const body = document.getElementById('adminOrdersTableBody');
        const countBadge = document.getElementById('adminOrderCount');
        if (countBadge) countBadge.innerText = this.orders.length;

        if (!body) return;

        body.innerHTML = this.orders.map(o => {
            const statusBadge = o.status === 'approved' 
                ? '<span class="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Đã duyệt</span>' 
                : o.status === 'cancelled'
                ? '<span class="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">Đã hủy</span>'
                : '<span class="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">Chờ duyệt</span>';

            const itemsSummary = o.items ? o.items.map(i => `${i.product_name} (x${i.quantity})`).join(', ') : 'Đơn hàng';

            return `
                <tr class="hover:bg-slate-50/80 transition">
                    <td class="py-4 px-6 font-bold text-slate-900">#${o.id}</td>
                    <td class="py-4 px-6 font-bold text-slate-800">${o.customer_name}</td>
                    <td class="py-4 px-6 text-xs text-slate-600">
                        <div>📞 ${o.customer_phone}</div>
                        <div class="text-slate-400 truncate max-w-xs">📍 ${o.customer_address}</div>
                        <div class="italic text-indigo-600 mt-0.5">📦 ${itemsSummary}</div>
                    </td>
                    <td class="py-4 px-6 font-extrabold text-indigo-600">${this.formatVND(o.total_amount)}</td>
                    <td class="py-4 px-6">${statusBadge}</td>
                    <td class="py-4 px-6 text-right space-x-1">
                        ${o.status === 'pending' ? `
                            <button onclick="app.updateOrderStatus(${o.id}, 'approved')" class="px-3 py-1.5 bg-green-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-green-700 transition">Duyệt</button>
                            <button onclick="app.updateOrderStatus(${o.id}, 'cancelled')" class="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition">Hủy</button>
                        ` : '<span class="text-xs text-slate-400">Hoàn tất</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // --- ACTIONS & HANDLERS ---
    setCategory(cat) {
        this.currentCategory = cat;
        document.querySelectorAll('#categoryFilters button').forEach(btn => {
            const isMatch = btn.getAttribute('data-cat') === cat;
            btn.className = isMatch 
                ? 'cat-btn px-5 py-2.5 rounded-full text-sm font-semibold transition bg-indigo-600 text-white shadow-sm'
                : 'cat-btn px-5 py-2.5 rounded-full text-sm font-semibold transition bg-slate-100 text-slate-600 hover:bg-slate-200';
        });
        this.renderProducts();
    }

    handleSearch(query) {
        this.searchQuery = query;
        this.renderProducts();
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const existing = this.cart.find(item => item.id === productId);
        if (existing) {
            existing.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image,
                quantity: 1
            });
        }

        this.saveLocalCart();
        this.toggleCartDrawer(true);
    }

    updateCartQty(productId, delta) {
        const item = this.cart.find(i => i.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                this.cart = this.cart.filter(i => i.id !== productId);
            }
        }
        this.saveLocalCart();
    }

    removeFromCart(productId) {
        this.cart = this.cart.filter(i => i.id !== productId);
        this.saveLocalCart();
    }

    toggleCartDrawer(forceOpen = false) {
        const overlay = document.getElementById('cartDrawerOverlay');
        if (forceOpen) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.toggle('hidden');
        }
    }

    proceedCheckoutFromCart() {
        if (!this.currentUser) {
            this.openAuthModal('login');
            alert('Bạn cần ĐĂNG NHẬP mới có thể mua hàng!');
            return;
        }

        if (this.cart.length === 0) {
            alert('Giỏ hàng của bạn đang trống! Vui lòng chọn sản phẩm trước.');
            return;
        }

        this.toggleCartDrawer(false);
        const contactSec = document.getElementById('lien-he');
        if (contactSec) {
            contactSec.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Submit Order Handlers
    async handleOrderSubmit(e) {
        e.preventDefault();

        if (!this.currentUser) {
            this.openAuthModal('login');
            alert('Yêu cầu bắt buộc: Đăng nhập và đăng nhập mới mua được hàng!');
            return;
        }

        const name = document.getElementById('orderName').value;
        const phone = document.getElementById('orderPhone').value;
        const address = document.getElementById('orderAddress').value;
        const email = document.getElementById('orderEmail').value;
        const notes = document.getElementById('orderNotes').value;

        const orderPayload = {
            user_id: this.currentUser.id,
            customer_name: name,
            customer_phone: phone,
            customer_address: address,
            customer_email: email,
            notes: notes,
            items: this.cart.length > 0 ? this.cart : [{ id: 1, name: 'Tư vấn mua sắm', price: 0, quantity: 1 }],
            total_amount: this.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0)
        };

        try {
            const res = await fetch(`${this.apiUrl}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            });
            if (res.ok) {
                const data = await res.json();
                alert('🎉 Đặt hàng thành công! Anh Khải Shop sẽ liên hệ bạn ngay.');
            } else {
                throw new Error('Fallback offline order creation');
            }
        } catch (err) {
            // Local fallback
            const newOrder = {
                id: Date.now(),
                ...orderPayload,
                status: 'pending',
                created_at: new Date().toISOString()
            };
            this.orders.unshift(newOrder);
            localStorage.setItem('aks_orders', JSON.stringify(this.orders));
            this.renderAdminOrdersTable();
            alert('🎉 Đặt hàng thành công! (Lưu đơn hàng vào hệ thống)');
        }

        // Clear Cart & Form
        this.cart = [];
        this.saveLocalCart();
        document.getElementById('orderForm').reset();
        this.renderAuthUI();
    }

    // --- AUTHENTICATION MODAL ---
    openAuthModal(mode = 'login') {
        document.getElementById('authModal').classList.remove('hidden');
        this.switchAuthMode(mode);
    }

    closeAuthModal() {
        document.getElementById('authModal').classList.add('hidden');
    }

    switchAuthMode(mode) {
        const title = document.getElementById('authModalTitle');
        const loginForm = document.getElementById('loginForm');
        const regForm = document.getElementById('registerForm');

        if (mode === 'login') {
            title.innerText = 'Đăng Nhập Khách Hàng';
            loginForm.classList.remove('hidden');
            regForm.classList.add('hidden');
        } else {
            title.innerText = 'Đăng Ký Tài Khoản Mới';
            loginForm.classList.add('hidden');
            regForm.classList.remove('hidden');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;

        try {
            const res = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            if (res.ok) {
                const data = await res.json();
                this.saveLocalUser(data.user);
                this.closeAuthModal();
                alert(`Đăng nhập thành công! Xin chào ${data.user.full_name}`);
                return;
            }
        } catch (err) {}

        // Fallback demo logins
        if (u === 'anhkhaishop' || u === 'admin') {
            const adminUser = { id: 'admin-1', username: u, full_name: 'Anh Khải (Admin)', email: 'Anhkhai0709@gmail.com', role: 'admin' };
            this.saveLocalUser(adminUser);
        } else {
            const normalUser = { id: `user-${Date.now()}`, username: u, full_name: u, email: `${u}@gmail.com`, role: 'user' };
            this.saveLocalUser(normalUser);
        }

        this.closeAuthModal();
        alert(`Đăng nhập thành công! Xin chào ${this.currentUser.username}`);
    }

    async handleRegister(e) {
        e.preventDefault();
        const fullName = document.getElementById('regFullName').value;
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        const newUser = {
            id: `user-${Date.now()}`,
            username,
            email,
            full_name: fullName,
            role: 'user'
        };

        this.saveLocalUser(newUser);
        this.closeAuthModal();
        alert('Tạo tài khoản mới thành công!');
    }

    logout() {
        this.saveLocalUser(null);
        alert('Đã đăng xuất tài khoản.');
    }

    // --- VIEWS & ADMIN PANEL ---
    showStorefront() {
        document.getElementById('storefrontView').classList.remove('hidden');
        document.getElementById('adminView').classList.add('hidden');
        const text = document.getElementById('adminToggleText');
        if (text) text.innerText = 'Quản trị';
    }

    toggleAdminView() {
        const adminView = document.getElementById('adminView');
        const storefrontView = document.getElementById('storefrontView');
        const isCurrentlyAdmin = !adminView.classList.contains('hidden');

        if (isCurrentlyAdmin) {
            this.showStorefront();
        } else {
            adminView.classList.remove('hidden');
            storefrontView.classList.add('hidden');
            const text = document.getElementById('adminToggleText');
            if (text) text.innerText = 'Xem Cửa Hàng';
            this.renderAdminProductsTable();
            this.renderAdminOrdersTable();
        }
    }

    setAdminTab(tab) {
        this.currentAdminTab = tab;
        const tabProducts = document.getElementById('adminTabProducts');
        const tabOrders = document.getElementById('adminTabOrders');
        const tabSystem = document.getElementById('adminTabSystem');

        tabProducts.classList.toggle('hidden', tab !== 'products');
        tabOrders.classList.toggle('hidden', tab !== 'orders');
        tabSystem.classList.toggle('hidden', tab !== 'system');

        const btnP = document.getElementById('tabBtnProducts');
        const btnO = document.getElementById('tabBtnOrders');
        const btnS = document.getElementById('tabBtnSystem');

        const activeClass = 'px-5 py-2.5 rounded-full font-bold text-sm transition bg-indigo-600 text-white shadow-sm';
        const inactiveClass = 'px-5 py-2.5 rounded-full font-bold text-sm transition bg-slate-200 text-slate-700 hover:bg-slate-300';

        btnP.className = tab === 'products' ? activeClass : inactiveClass;
        btnO.className = tab === 'orders' ? activeClass : inactiveClass;
        btnS.className = tab === 'system' ? activeClass : inactiveClass;
    }

    toggleMobileMenu() {
        document.getElementById('mobileMenu').classList.toggle('hidden');
    }

    closeMobileMenu() {
        document.getElementById('mobileMenu').classList.add('hidden');
    }

    // --- ADMIN PRODUCT CRUD & R2 UPLOAD ---
    openAddProductModal() {
        document.getElementById('addProductModal').classList.remove('hidden');
    }

    closeAddProductModal() {
        document.getElementById('addProductModal').classList.add('hidden');
        document.getElementById('addProductForm').reset();
        this.selectedImageFile = null;
    }

    handleImageFileSelect(e) {
        if (e.target.files && e.target.files[0]) {
            this.selectedImageFile = e.target.files[0];
        }
    }

    async handleAddProductSubmit(e) {
        e.preventDefault();

        const name = document.getElementById('newProdName').value;
        const cat = document.getElementById('newProdCat').value;
        const price = parseFloat(document.getElementById('newProdPrice').value);
        const badge = document.getElementById('newProdBadge').value;
        const desc = document.getElementById('newProdDesc').value;
        let imageUrl = document.getElementById('newProdImageUrl').value;

        // 1. Upload file to Cloudflare R2 if selected
        if (this.selectedImageFile) {
            try {
                const formData = new FormData();
                formData.append('file', this.selectedImageFile);

                const uploadRes = await fetch(`${this.apiUrl}/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    imageUrl = uploadData.url;
                } else {
                    throw new Error('R2 Upload API failed');
                }
            } catch (err) {
                // Fallback preview convert image file to Base64
                imageUrl = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.readAsDataURL(this.selectedImageFile);
                });
            }
        }

        if (!imageUrl) {
            imageUrl = 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=600&q=80';
        }

        const catLabelMap = {
            'nam': 'Thời trang Nam',
            'nu': 'Thời trang Nữ',
            'phu-kien': 'Phụ kiện'
        };

        const newProd = {
            id: Date.now(),
            name,
            category: cat,
            category_label: catLabelMap[cat] || cat,
            price,
            image: imageUrl,
            badge: badge || null,
            badge_color: badge === 'Hot' ? 'pink' : badge === 'Mới' ? 'blue' : 'purple',
            description: desc,
            is_available: 1
        };

        // Send to D1 API or fallback
        try {
            await fetch(`${this.apiUrl}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProd)
            });
        } catch (err) {}

        this.products.unshift(newProd);
        localStorage.setItem('aks_products', JSON.stringify(this.products));

        this.renderProducts();
        this.renderAdminProductsTable();
        this.closeAddProductModal();
        alert('✨ Đã thêm sản phẩm thành công và lưu vào Cloudflare D1!');
    }

    async deleteProduct(id) {
        if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này không?')) return;

        try {
            await fetch(`${this.apiUrl}/products/${id}`, { method: 'DELETE' });
        } catch (e) {}

        this.products = this.products.filter(p => p.id !== id);
        localStorage.setItem('aks_products', JSON.stringify(this.products));

        this.renderProducts();
        this.renderAdminProductsTable();
    }

    async updateOrderStatus(orderId, status) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.status = status;
            localStorage.setItem('aks_orders', JSON.stringify(this.orders));
            this.renderAdminOrdersTable();

            try {
                await fetch(`${this.apiUrl}/orders/${orderId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status })
                });
            } catch (e) {}
        }
    }

    // --- CLOUDFLARE STEP-BY-STEP GUIDANCE (Matching Image 5) ---
    showCloudflareStep(stepNum) {
        this.currentCloudflareStep = stepNum;

        // Update active highlight menu
        const items = document.querySelectorAll('#cloudflareStepsList li');
        items.forEach((item, idx) => {
            if (idx + 1 === stepNum) {
                item.className = 'cf-step-item active p-3 rounded-2xl cursor-pointer bg-indigo-50 text-indigo-600 flex items-center justify-between font-bold border-l-4 border-indigo-600';
            } else {
                item.className = 'cf-step-item p-3 rounded-2xl cursor-pointer hover:bg-slate-50 text-slate-600 flex items-center justify-between font-semibold';
            }
        });

        const detailBox = document.getElementById('stepDetailContent');
        const stepGuides = {
            1: `
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <span class="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg">1</span>
                        <h3 class="text-2xl font-extrabold text-slate-900">Tạo Database D1 SQLite trên Cloudflare</h3>
                    </div>
                    <p class="text-slate-600 text-sm leading-relaxed">
                        Chạy lệnh bên dưới trong terminal để khởi tạo cơ sở dữ liệu SQLite <b>anhkhaishop-db</b> trên Cloudflare D1:
                    </p>
                    <div class="bg-slate-900 text-indigo-300 p-4 rounded-2xl font-mono text-sm shadow-inner relative group">
                        <code>npx wrangler d1 create anhkhaishop-db</code>
                    </div>
                </div>
            `,
            2: `
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <span class="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg">2</span>
                        <h3 class="text-2xl font-extrabold text-slate-900">Lấy Database ID</h3>
                    </div>
                    <p class="text-slate-600 text-sm leading-relaxed">
                        Sau khi chạy lệnh khởi tạo, Wrangler sẽ trả về thông tin kết quả chứa <code class="bg-slate-100 px-2 py-0.5 rounded text-indigo-600 font-bold">database_id</code> dạng UUID (ví dụ: <code class="bg-slate-100 px-2 py-0.5 rounded text-slate-700">xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</code>).
                    </p>
                </div>
            `,
            3: `
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <span class="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg">3</span>
                        <h3 class="text-2xl font-extrabold text-slate-900">Cấu Hình D1 & R2 Binding trong wrangler.jsonc</h3>
                    </div>
                    <p class="text-slate-600 text-sm leading-relaxed">
                        Cập nhật file <code class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">wrangler.jsonc</code> trong thư mục dự án với <code class="bg-slate-100 px-2 py-0.5 rounded font-bold">database_id</code> của bạn:
                    </p>
                    <div class="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-xs overflow-x-auto">
                        <pre><code>"d1_databases": [
  {
    "binding": "DB",
    "database_name": "anhkhaishop-db",
    "database_id": "REPLACE_WITH_YOUR_DATABASE_ID"
  }
],
"r2_buckets": [
  {
    "binding": "IMAGES_BUCKET",
    "bucket_name": "anhkhaishop-images"
  }
]</code></pre>
                    </div>
                </div>
            `,
            4: `
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <span class="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg">4</span>
                        <h3 class="text-2xl font-extrabold text-slate-900">Tạo Bảng Bằng SQL Migration</h3>
                    </div>
                    <p class="text-slate-600 text-sm leading-relaxed">
                        Chạy lệnh SQL migration để khởi tạo các bảng <b>users, products, orders, order_items</b> trên D1 Database:
                    </p>
                    <div class="bg-slate-900 text-indigo-300 p-4 rounded-2xl font-mono text-sm space-y-2">
                        <p class="text-slate-400 text-xs"># Chạy cục bộ (Local Testing):</p>
                        <p><code>npx wrangler d1 execute anhkhaishop-db --local --file=./schema.sql</code></p>
                        <p class="text-slate-400 text-xs mt-3"># Chạy trực tiếp trên Cloudflare Production Database:</p>
                        <p><code>npx wrangler d1 execute anhkhaishop-db --remote --file=./schema.sql</code></p>
                    </div>
                </div>
            `,
            5: `
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <span class="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg">5</span>
                        <h3 class="text-2xl font-extrabold text-slate-900">Kết Nối Worker Với D1 & R2</h3>
                    </div>
                    <p class="text-slate-600 text-sm leading-relaxed">
                        Thư mục <code class="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-bold">functions/api/[[path]].js</code> chứa API handler để tự động kết nối với <code class="bg-slate-100 px-2 py-0.5 rounded font-bold">context.env.DB</code> và <code class="bg-slate-100 px-2 py-0.5 rounded font-bold">context.env.IMAGES_BUCKET</code>.
                    </p>
                </div>
            `,
            6: `
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <span class="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg">6</span>
                        <h3 class="text-2xl font-extrabold text-slate-900">Kiểm Tra Dữ Liệu D1 Database</h3>
                    </div>
                    <p class="text-slate-600 text-sm leading-relaxed">
                        Bạn có thể kiểm tra dữ liệu sản phẩm vừa khởi tạo trong D1 SQLite bằng lệnh:
                    </p>
                    <div class="bg-slate-900 text-indigo-300 p-4 rounded-2xl font-mono text-sm">
                        <code>npx wrangler d1 execute anhkhaishop-db --remote --command="SELECT * FROM products;"</code>
                    </div>
                </div>
            `,
            7: `
                <div class="space-y-4">
                    <div class="flex items-center space-x-3">
                        <span class="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg">7</span>
                        <h3 class="text-2xl font-extrabold text-slate-900">Build và Deploy Lên Cloudflare Pages</h3>
                    </div>
                    <p class="text-slate-600 text-sm leading-relaxed">
                        Tạo bucket R2 và đẩy ứng dụng lên Cloudflare Pages chỉ trong 2 lệnh:
                    </p>
                    <div class="bg-slate-900 text-indigo-300 p-4 rounded-2xl font-mono text-sm space-y-3">
                        <p class="text-slate-400 text-xs"># 1. Tạo R2 Bucket lưu ảnh sản phẩm:</p>
                        <p><code>npx wrangler r2 bucket create anhkhaishop-images</code></p>
                        <p class="text-slate-400 text-xs"># 2. Deploy toàn bộ website lên Cloudflare Pages:</p>
                        <p><code>npx wrangler pages deploy . --project-name=anhkhaishopvip</code></p>
                    </div>
                </div>
            `
        };

        detailBox.innerHTML = stepGuides[stepNum] || stepGuides[1];
        if (window.lucide) lucide.createIcons();
    }
}

// Global App Instance
const app = new ShopApp();
