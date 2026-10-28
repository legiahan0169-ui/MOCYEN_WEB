const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(cors());
app.use(express.json());

// ==========================================
// 1. KẾT NỐI DATABASE
// ==========================================
// MỚI
const db = mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'mocyen_db',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_HOST ? { rejectUnauthorized: true } : null // Tự động bật SSL nếu chạy trên mây
});

db.connect(err => {
    if (err) console.error('❌ Lỗi kết nối DB:', err);
    else console.log('✅ Đã kết nối MySQL (mocyen_db) thành công!');
});

// ==========================================
// 2. CÁC API CƠ BẢN
// ==========================================

// Lấy tất cả sản phẩm (Gom nhóm theo group_id, Ưu tiên Best Seller)
app.get('/api/products', (req, res) => {
    const sql = `
        SELECT * FROM products 
        WHERE status = "active" 
        AND id IN (
            SELECT MIN(id) FROM products WHERE status = "active" GROUP BY group_id
        )
        ORDER BY is_bestseller DESC, id ASC
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Lấy chi tiết 1 sản phẩm (theo ID)
app.get('/api/products/:id', (req, res) => {
    const productId = req.params.id;
    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        res.json(results[0]);
    });
});

// Lấy tất cả các size của 1 nhóm sản phẩm
app.get('/api/products/group/:group_id', (req, res) => {
    db.query('SELECT * FROM products WHERE group_id = ?', [req.params.group_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// API Đăng nhập
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Email không tồn tại' });
        
        const user = results[0];
        if (password !== user.password) return res.status(401).json({ error: 'Sai mật khẩu' });
        
        res.json({ 
            message: 'Đăng nhập thành công',
            user: { id: user.id, name: user.name, email: user.email, role: user.role }
        });
    });
});

// API Tạo Đơn Hàng
app.post('/api/orders', (req, res) => {
    const { user_id, customer_name, phone, address, total_amount, payment_method, items, channel, coupon_code, discount_amount } = req.body;
    
    const sqlOrder = `INSERT INTO orders (user_id, customer_name, phone, address, total_amount, payment_method, channel, coupon_code, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
     db.query(sqlOrder, [user_id || null, customer_name, phone, address, total_amount, payment_method, channel, coupon_code || null, discount_amount || 0], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const orderId = result.insertId;
        const orderItemsData = items.map(item => [orderId, item.id, item.name, item.qty, item.price]);
        const sqlItems = `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?`;
        
        db.query(sqlItems, [orderItemsData], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Đặt hàng thành công', orderId });
        });
    });
});

// ==========================================
// 3. API DÀNH CHO CHAT
// ==========================================

// Lấy lịch sử tin nhắn của 1 khách hàng
app.get('/api/messages/:user_id', (req, res) => {
    db.query('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC', [req.params.user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// Lấy danh sách những khách hàng đã từng chat
app.get('/api/admin/chats', (req, res) => {
    db.query('SELECT DISTINCT user_id FROM messages', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// 4. XỬ LÝ CHAT REAL-TIME (SOCKET.IO)
// ==========================================
io.on('connection', (socket) => {
    console.log('Có người kết nối chat:', socket.id);

    // Khách vào phòng chat riêng
    socket.on('customer_join', (userId) => {
        socket.join(`user_${userId}`);
    });

    // Admin vào phòng chung
    socket.on('admin_join', () => {
        socket.join('admin_room');
    });

    // Xử lý gửi tin nhắn
    socket.on('send_message', (data) => {
        const sql = `INSERT INTO messages (user_id, sender, message) VALUES (?, ?, ?)`;
        db.query(sql, [data.user_id, data.sender, data.message], (err, result) => {
            if (!err) {
                // Nếu là khách gửi -> báo cho Admin
                if (data.sender === 'customer') {
                    io.to('admin_room').emit('receive_message', data);
                } 
                // Nếu là Admin gửi -> báo cho đúng khách đó
                else {
                    io.to(`user_${data.user_id}`).emit('receive_message', data);
                }
            }
        });
    });

    socket.on('disconnect', () => {
        // console.log('Một người đã ngắt kết nối chat');
    });
});
// API Kiểm tra mã giảm giá
app.post('/api/check-coupon', (req, res) => {
    const { code, total_amount } = req.body;

    if (!code) return res.status(400).json({ error: "Vui lòng nhập mã." });

    const sql = `SELECT * FROM coupons WHERE code = ? AND status = 'active'`;
    db.query(sql, [code], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Mã giảm giá không tồn tại hoặc đã ngừng áp dụng." });

        const coupon = results[0];

        // 1. Kiểm tra hạn sử dụng (nếu có)
        if (coupon.expiry_date) {
            const today = new Date();
            const expiry = new Date(coupon.expiry_date);
            if (today > expiry) return res.status(400).json({ error: "Mã giảm giá đã hết hạn sử dụng." });
        }

        // 2. Kiểm tra giá trị đơn hàng tối thiểu
        if (total_amount < coupon.min_order_value) {
            return res.status(400).json({ error: `Đơn hàng phải từ ${Number(coupon.min_order_value).toLocaleString('vi-VN')}đ để dùng mã này.` });
        }

        // 3. Tính số tiền được giảm
        let discountAmount = 0;
        if (coupon.discount_type === 'percent') {
            discountAmount = (total_amount * coupon.discount_value) / 100;
        } else {
            discountAmount = Number(coupon.discount_value);
        }

        // Đảm bảo số tiền giảm không vượt quá tổng đơn hàng
        if (discountAmount > total_amount) discountAmount = total_amount;

        res.json({
            message: "Áp dụng mã thành công",
            code: coupon.code,
            discountAmount: discountAmount
        });
    });
});

// ==========================================
// API DÀNH CHO BLOG
// ==========================================

// 1. Lấy danh sách bài viết (Không lấy cột content cho nhẹ)
app.get('/api/posts', (req, res) => {
    db.query('SELECT id, title, category, image, excerpt, author, created_at FROM posts ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. Lấy chi tiết 1 bài viết
app.get('/api/posts/:id', (req, res) => {
    db.query('SELECT * FROM posts WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
        res.json(results[0]);
    });
});

// ==========================================
// API BỔ SUNG CHO TRANG TÀI KHOẢN & ADMIN
// ==========================================

// 1. Lấy danh sách đơn hàng của 1 khách hàng (Cho trang Tài khoản)
app.get('/api/orders/user/:user_id', (req, res) => {
    db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.params.user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 2. Lấy TẤT CẢ đơn hàng (Cho Admin)
app.get('/api/admin/orders', (req, res) => {
    db.query('SELECT * FROM orders ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. Lấy TẤT CẢ sản phẩm (Cho bảng Admin - Không gom nhóm)
app.get('/api/admin/products', (req, res) => {
    db.query('SELECT * FROM products ORDER BY id ASC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 4. Lấy danh sách khách hàng (Cho Admin)
app.get('/api/admin/users', (req, res) => {
    db.query("SELECT id, name, email, phone, created_at FROM users WHERE role = 'customer'", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// ==========================================
// KHỞI CHẠY SERVER
// ==========================================
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 Backend & Chat Server đang chạy tại http://localhost:${PORT}`);
});