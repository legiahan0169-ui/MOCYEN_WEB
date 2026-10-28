const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT"] }
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
// 2. CÁC API CƠ BẢN (SẢN PHẨM)
// ==========================================
app.get('/api/products/group/:group_id', (req, res) => {
    db.query('SELECT * FROM products WHERE group_id = ?', [req.params.group_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

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

app.get('/api/products/:id', (req, res) => {
    db.query('SELECT * FROM products WHERE id = ?', [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        res.json(results[0]);
    });
});

// ==========================================
// 3. API ĐĂNG NHẬP & ĐĂNG KÝ & ĐẶT HÀNG
// ==========================================
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Email không tồn tại' });
        const user = results[0];
        if (password !== user.password) return res.status(401).json({ error: 'Sai mật khẩu' });
        res.json({ message: 'Đăng nhập thành công', user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
    });
});

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

// [NÂNG CẤP] API Tạo Đơn Hàng - Có xử lý Transaction và Trừ Tồn Kho
app.post('/api/orders', (req, res) => {
    const { user_id, customer_name, phone, address, total_amount, payment_method, items, channel, coupon_code, discount_amount } = req.body;
    
    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ error: "Lỗi bắt đầu giao dịch" });

        const sqlOrder = `INSERT INTO orders (user_id, customer_name, phone, address, total_amount, payment_method, channel, coupon_code, discount_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        db.query(sqlOrder, [user_id || null, customer_name, phone, address, total_amount, payment_method, channel, coupon_code || null, discount_amount || 0], (err, result) => {
            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
            
            const orderId = result.insertId;
            const orderItemsData = items.map(item => [orderId, item.id, item.name || "Sản phẩm", item.qty, item.price]);
            const sqlItems = `INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ?`;
            
            db.query(sqlItems, [orderItemsData], (err) => {
                if (err) return db.rollback(() => res.status(500).json({ error: err.message }));

                // Cập nhật tồn kho (Trừ đi số lượng khách mua)
                let stockUpdatePromises = items.map(item => {
                    return new Promise((resolve, reject) => {
                        // Điều kiện stock >= item.qty để đảm bảo không bán âm kho
                        db.query('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [item.qty, item.id, item.qty], (err, result) => {
                            if (err) return reject(err);
                            if (result.affectedRows === 0) return reject(new Error(`Sản phẩm "${item.name}" đã hết hàng hoặc không đủ tồn kho!`));
                            resolve();
                        });
                    });
                });

                Promise.all(stockUpdatePromises)
                    .then(() => {
                        db.commit((err) => {
                            if (err) return db.rollback(() => res.status(500).json({ error: err.message }));
                            res.json({ message: 'Đặt hàng thành công', orderId });
                        });
                    })
                    .catch(err => {
                        db.rollback(() => res.status(400).json({ error: err.message }));
                    });
            });
        });
    });
});

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
        if (total_amount < coupon.min_order_value) return res.status(400).json({ error: `Đơn hàng phải từ ${Number(coupon.min_order_value).toLocaleString('vi-VN')}đ để dùng mã này.` });
        let discountAmount = 0;
        if (coupon.discount_type === 'percent') discountAmount = (total_amount * coupon.discount_value) / 100;
        else discountAmount = Number(coupon.discount_value);
        if (discountAmount > total_amount) discountAmount = total_amount;
        res.json({ message: "Áp dụng mã thành công", code: coupon.code, discountAmount: discountAmount });
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
    const sql = `SELECT DISTINCT m.user_id, u.name as customer_name FROM messages m LEFT JOIN users u ON m.user_id = u.id`;
    db.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

io.on('connection', (socket) => {
    socket.on('customer_join', (userId) => socket.join(`user_${userId}`));
    socket.on('admin_join', () => socket.join('admin_room'));
    socket.on('send_message', (data) => {
        const sql = `INSERT INTO messages (user_id, sender, message) VALUES (?, ?, ?)`;
        db.query(sql, [data.user_id, data.sender, data.message], (err, result) => {
            if (!err) {
                if (data.sender === 'customer') io.to('admin_room').emit('receive_message', data);
                else io.to(`user_${data.user_id}`).emit('receive_message', data);
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
    const sql = `
        SELECT o.*, (
            SELECT JSON_ARRAYAGG(JSON_OBJECT('name', oi.product_name, 'qty', oi.quantity, 'price', oi.price, 'image', p.image)) 
            FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = o.id
        ) as items
        FROM orders o WHERE o.user_id = ? ORDER BY o.created_at DESC
    `;
    db.query(sql, [req.params.user_id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const parsedResults = results.map(order => ({
            ...order,
            items: typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || [])
        }));
        res.json(parsedResults);
    });
});

// API Admin: Lấy chi tiết 1 đơn hàng (Đã bỏ JOIN để tránh lỗi thiếu cột ảnh)
app.get('/api/admin/orders/:id', (req, res) => {
    const orderId = req.params.id;
    db.query('SELECT * FROM orders WHERE id = ?', [orderId], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        if (orders.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
        
        // Lấy thẳng từ bảng order_items
        const sqlItems = `SELECT * FROM order_items WHERE order_id = ?`;
        db.query(sqlItems, [orderId], (err, items) => {
            if (err) return res.status(500).json({ error: err.message });
            // Trả về thông tin đơn + danh sách sản phẩm
            res.json({ ...orders[0], items: items });
        });
    });
});

// API Admin: Cập nhật trạng thái đơn hàng (Tự động hoàn kho nếu Hủy)
app.put('/api/admin/orders/:id/status', (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;
    
    db.query('SELECT status FROM orders WHERE id = ?', [orderId], (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });
        if (orders.length === 0) return res.status(404).json({ error: 'Không tìm thấy đơn' });
        
        const currentStatus = orders[0].status;
        if (currentStatus === status) return res.json({ message: 'Trạng thái không thay đổi' });
        
        db.query('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Nếu chuyển sang Hủy -> Hoàn lại số lượng vào kho
            if (status === 'cancelled' && currentStatus !== 'cancelled') {
                db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
                    if (!err && items.length > 0) {
                        const updatePromises = items.map(item => new Promise((resolve, reject) => {
                            db.query('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id], (err) => {
                                if (err) reject(err); else resolve();
                            });
                        }));
                        Promise.all(updatePromises).then(() => res.json({ message: 'Cập nhật thành công & đã hoàn kho' }));
                    } else {
                        res.json({ message: 'Cập nhật thành công' });
                    }
                });
            } else {
                res.json({ message: 'Cập nhật trạng thái thành công' });
            }
        });
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Backend & Chat Server đang chạy tại http://localhost:${PORT}`);
});