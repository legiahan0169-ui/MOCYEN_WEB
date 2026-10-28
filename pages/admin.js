document.addEventListener("DOMContentLoaded", () => {
  // 1. KIỂM TRA QUYỀN ADMIN
  const userJson = localStorage.getItem("mocyen_user");
  if (userJson) {
    const user = JSON.parse(userJson);
    if (user.role !== "admin") {
      alert("Bạn không có quyền truy cập trang này!");
      window.location.href = "../index.html";
      return;
    }
  } else {
    window.location.href = "login.html";
    return;
  }

  // Đăng xuất
  document.getElementById("btn-logout").addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      localStorage.removeItem("mocyen_user");
      window.location.href = "login.html";
    }
  });

  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;

  // 2. CHUYỂN TAB
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanels = document.querySelectorAll(".admin-tab-panel");
  const pageTitle = document.getElementById("page-title-text");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      tabBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      tabPanels.forEach(p => p.classList.remove("active"));
      document.getElementById(btn.dataset.target).classList.add("active");

      if (btn.dataset.target === "tab-dashboard") pageTitle.textContent = "Báo cáo Kinh doanh";
      if (btn.dataset.target === "tab-orders") pageTitle.textContent = "Quản lý Đơn hàng";
      if (btn.dataset.target === "tab-products") pageTitle.textContent = "Quản lý Sản phẩm";
      if (btn.dataset.target === "tab-customers") pageTitle.textContent = "Quản lý Khách hàng";
      if (btn.dataset.target === "tab-messages") pageTitle.textContent = "Hỗ trợ Chat";
    });
  });

  // ==========================================
  // 3. GỌI API ĐỔ DỮ LIỆU THẬT
  // ==========================================

  // --- 3.1. Bảng Sản phẩm ---
  async function loadProducts() {
    const tbody = document.getElementById("admin-products-list");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Đang tải...</td></tr>`;
    try {
      const res = await fetch('https://mocyen-web.onrender.com/api/admin/products');
      const products = await res.json();
      tbody.innerHTML = "";
      products.forEach(prod => {
        tbody.insertAdjacentHTML("beforeend", `
          <tr>
            <!-- Đã thêm dấu / ở đầu đường dẫn ảnh -->
            <td><img src="/images/product/${prod.image}" style="width:40px;height:40px;border-radius:6px;object-fit:contain;background:#F7F3E9;"></td>
            <td style="font-weight:600; color:#243A30;">${prod.name}</td>
            <td>${prod.category}</td>
            <td style="font-weight:600;">${formatPrice(prod.price)}</td>
            <td>${prod.stock}</td>
            <td><button class="action-btn"><i class="fa-solid fa-pen-to-square"></i></button></td>
          </tr>
        `);
      });
    } catch (e) { 
        console.error("Lỗi tải sản phẩm", e); 
        tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  // --- 3.2. Bảng Khách hàng ---
  async function loadCustomers() {
    const tbody = document.getElementById("admin-customers-list");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Đang tải...</td></tr>`;
    try {
      const res = await fetch('https://mocyen-web.onrender.com/api/admin/users');
      const users = await res.json();
      tbody.innerHTML = "";
      users.forEach(u => {
        const date = new Date(u.created_at).toLocaleDateString('vi-VN');
        tbody.insertAdjacentHTML("beforeend", `
          <tr>
            <td><span class="order-code">#${u.id}</span></td>
            <td style="font-weight:600;">${u.name}</td>
            <td>${u.email}</td>
            <td>${u.phone || 'Chưa cập nhật'}</td>
            <td>${date}</td>
          </tr>
        `);
      });
    } catch (e) { 
        console.error("Lỗi tải khách hàng", e); 
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  // --- 3.3. Bảng Đơn hàng & Thống kê (Dashboard) ---
  async function loadOrders() {
    const tbody = document.getElementById("admin-orders-list");
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Đang tải...</td></tr>`;
    try {
      const res = await fetch('https://mocyen-web.onrender.com/api/admin/orders');
      const orders = await res.json();
      
      // Tính toán thống kê
      let totalRev = 0;
      orders.forEach(o => { totalRev += Number(o.total_amount); });
      document.getElementById("stat-revenue").textContent = formatPrice(totalRev);
      
      const aov = orders.length > 0 ? totalRev / orders.length : 0;
      document.getElementById("stat-aov").textContent = formatPrice(aov);

      // Render bảng
      tbody.innerHTML = "";
      orders.forEach(o => {
        let statusHTML = o.status === 'completed' ? `<span class="badge-status status-completed">Hoàn thành</span>` 
                      : o.status === 'shipping' ? `<span class="badge-status status-shipping">Đang giao</span>` 
                      : `<span class="badge-status status-pending">Chờ xử lý</span>`;
        
        const date = new Date(o.created_at).toLocaleDateString('vi-VN');

        tbody.insertAdjacentHTML("beforeend", `
          <tr>
            <td><span class="order-code">#${o.id}</span></td>
            <td>${o.customer_name}</td>
            <td>${date}</td>
            <td><span class="badge-channel channel-${o.channel}">${o.channel}</span></td>
            <td style="font-weight:600;">${formatPrice(o.total_amount)}</td>
            <td>${statusHTML}</td>
            <td><button class="action-btn"><i class="fa-solid fa-eye"></i></button></td>
          </tr>
        `);
      });
    } catch (e) { 
        console.error("Lỗi tải đơn hàng", e); 
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  // --- KHỞI CHẠY DATA ---
  loadProducts();
  loadCustomers();
  loadOrders();


  // ==========================================
  // 4. LOGIC CHAT DÀNH CHO ADMIN (SOCKET.IO)
  // ==========================================
  let currentChatUserId = null;
  let adminSocket = null;

  // Tải thư viện Socket.io
  const adminSocketScript = document.createElement('script');
  adminSocketScript.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
  document.head.appendChild(adminSocketScript);

  adminSocketScript.onload = () => {
      // Kết nối tới link Render (Đã đổi từ localhost)
      adminSocket = io("https://mocyen-web.onrender.com"); 
      adminSocket.emit('admin_join');

      // Nhận tin nhắn mới từ khách
      adminSocket.on('receive_message', (data) => {
          if (data.sender === 'customer') {
              // Nếu đang mở chat của khách này thì hiện ngay lên
              if (currentChatUserId == data.user_id) {
                  displayAdminMessage(data.message, 'customer');
              }
              // Cập nhật lại danh sách bên trái
              loadAdminChatList(); 
          }
      });
  };

  // Hàm hiển thị tin nhắn lên khung chat của Admin
  function displayAdminMessage(text, sender) {
      const body = document.getElementById("admin-chat-body");
      if (!body) return;
      const div = document.createElement("div");
      div.style.cssText = `max-width: 70%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; margin-bottom: 10px;
        ${sender === 'admin' 
          ? 'background: #264F40; color: white; align-self: flex-end; border-bottom-right-radius: 2px;' 
          : 'background: #FFFDF8; color: #243A30; align-self: flex-start; border: 1px solid #E4E2D7; border-bottom-left-radius: 2px;'
        }`;
      div.textContent = text;
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
  }

  // Lấy danh sách khách đã chat
  async function loadAdminChatList() {
      const listContainer = document.getElementById("admin-chat-list");
      if (!listContainer) return;
      try {
          const res = await fetch('https://mocyen-web.onrender.com/api/admin/chats');
          const users = await res.json();
          listContainer.innerHTML = "";
          
          if (users.length === 0) {
              listContainer.innerHTML = '<p style="padding: 20px; color: #7C877D; font-size: 13px;">Chưa có khách hàng nào nhắn tin.</p>';
              return;
          }

          users.forEach(u => {
              const div = document.createElement("div");
              div.style.cssText = "padding: 15px 20px; border-bottom: 1px solid #EAEAEA; cursor: pointer; transition: 0.2s;";
              div.innerHTML = `<strong>Khách: ${u.user_id}</strong>`;
              
              div.onmouseover = () => div.style.background = '#F4F6F3';
              div.onmouseout = () => div.style.background = 'transparent';

              div.onclick = () => openAdminChat(u.user_id);
              listContainer.appendChild(div);
          });
      } catch (e) {
          console.error("Lỗi tải danh sách chat", e);
      }
  }

  // Mở khung chat của 1 khách cụ thể
  async function openAdminChat(userId) {
      currentChatUserId = userId;
      document.getElementById("admin-chat-header").textContent = `Đang chat với khách: ${userId}`;
      
      try {
          const res = await fetch(`https://mocyen-web.onrender.com/api/messages/${userId}`);
          const msgs = await res.json();
          document.getElementById("admin-chat-body").innerHTML = "";
          msgs.forEach(m => displayAdminMessage(m.message, m.sender));
      } catch(e) {
          console.error("Lỗi tải lịch sử chat", e);
      }
  }

  // Nút Gửi tin nhắn của Admin
  const btnAdminSend = document.getElementById("admin-chat-send");
  if (btnAdminSend) {
      btnAdminSend.addEventListener("click", () => {
          const input = document.getElementById("admin-chat-input");
          const text = input.value.trim();
          if (!text || !currentChatUserId || !adminSocket) return;
          
          input.value = "";
          adminSocket.emit('send_message', { user_id: currentChatUserId, sender: 'admin', message: text });
          displayAdminMessage(text, 'admin');
      });
  }

  // Tự động tải danh sách khi bấm vào tab Chat
  const chatTabBtn = document.querySelector('.tab-btn[data-target="tab-messages"]');
  if (chatTabBtn) {
      chatTabBtn.addEventListener('click', loadAdminChatList);
  }
});