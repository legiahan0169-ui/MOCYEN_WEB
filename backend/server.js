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
const db = mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'mocyen_db',
    port: process.env.DB_PORT || 3306,
    ssl: process.env.DB_HOST ? { rejectUnauthorized: true } : null
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

// ==========================================
// 3. API ĐĂNG NHẬP & ĐĂNG KÝ
// ==========================================

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

// API Tạo tài khoản mới (Đăng ký)
app.post('/api/register', (req, res) => {
    const { name, email, password, phone } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) return res.status(400).json({ error: 'Email này đã được sử dụng' });
        
        const sql = `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, 'customer')`;
        db.query(sql, [name, email, password, phone || null], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: 'Đăng ký thành công' });
        });
    });
});

// API Tạo Đơn Hàng
app.post('/api/orders', (req, res) => {
    const { user_id, customer_name, phone, address, total_amount, payment_method, items, channel, coupon_code, discount_amount } = req.body;
    
    const sqlOrder = `INSERT INTO orders (user_id, customer_name, phone, address, total_amount, payment_method, channel, coupon_code, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.query(sqlOrder, [user_id || null, customer_name, phone, address, total_amount, payment_method, channel, coupon_code || null, discount_amount || 0], (err, result) => {
        if (err) {
            console.error("LỖI INSERT ORDERS:", err);
            return res.status(500).json({ error: err.message }); 
        }
        
        const orderId = result.insertId;
        const orderItemsData = items.map(item => [orderId, item.id, item.name || "Sản phẩm", item.qty, item.price]);
        const sqlItems = `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?`;
        
        db.query(sqlItems, [orderItemsData], (err) => {
            if (err) {
                console.error("LỖI INSERT ORDER_ITEMS:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Đặt hàng thành công', orderId });
        });
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

        if (coupon.expiry_date) {
            const today = new Date();
            const expiry = new Date(coupon.expiry_date);
            if (today > expiry) return res.status(400).json({ error: "Mã giảm giá đã hết hạn sử dụng." });
        }

        if (total_amount < coupon.min_order_value) {
            return res.status(400).json({ error: `Đơn hàng phải từ ${Number(coupon.min_order_value).toLocaleString('vi-VN')}đ để dùng mã này.` });
        }

        let discountAmount = 0;
        if (coupon.discount_type === 'percent') {
            discountAmount = (total_amount * coupon.discount_value) / 100;
        } else {
            discountAmount = Number(coupon.discount_value);
        }

        if (discountAmount > total_amount) discountAmount = total_amount;

        res.json({
            message: "Áp dụng mã thành công",
            code: coupon.code,
            discountAmount: discountAmount
        });
    });
});

// ==========================================
// 4. API DÀNH CHO CHAT
// ==========================================

app.get('/api/messages/:user_id', (req, res) => {
    db.query('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at ASC', [req.params.user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/admin/chats', (req, res) => {
    const sql = `
        SELECT DISTINCT m.user_id, u.name as customer_name 
        FROM messages m
        LEFT JOIN users u ON m.user_id = u.id
    `;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// XỬ LÝ CHAT REAL-TIME
io.on('connection', (socket) => {
    socket.on('customer_join', (userId) => {
        socket.join(`user_${userId}`);
    });

    socket.on('admin_join', () => {
        socket.join('admin_room');
    });

    socket.on('send_message', (data) => {
        const sql = `INSERT INTO messages (user_id, sender, message) VALUES (?, ?, ?)`;
        db.query(sql, [data.user_id, data.sender, data.message], (err, result) => {
            if (!err) {
                if (data.sender === 'customer') {
                    io.to('admin_room').emit('receive_message', data);
                } else {
                    io.to(`user_${data.user_id}`).emit('receive_message', data);
                }
            }
        });
    });
});

// ==========================================
// 5. API DÀNH CHO BLOG & ADMIN
// ==========================================

app.get('/api/posts', (req, res) => {
    db.query('SELECT id, title, category, image, excerpt, author, created_at FROM posts ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/posts/:id', (req, res) => {
    db.query('SELECT * FROM posts WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
        res.json(results[0]);
    });
});

app.get('/api/orders/user/:user_id', (req, res) => {
    db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.params.user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/admin/orders', (req, res) => {
    db.query('SELECT * FROM orders ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/admin/products', (req, res) => {
    db.query('SELECT * FROM products ORDER BY id ASC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

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