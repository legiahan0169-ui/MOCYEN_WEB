document.addEventListener("DOMContentLoaded", () => {
  const userJson = localStorage.getItem("mocyen_user");
  if (userJson) {
    const user = JSON.parse(userJson);
    if (user.role !== "admin") {
      alert("Bạn không có quyền truy cập!");
      window.location.href = "../index.html";
      return;
    }
  } else {
    window.location.href = "login.html";
    return;
  }

  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") 
    ? "http://localhost:3000" : "https://mocyen-web.onrender.com";

  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;

  document.getElementById("btn-logout").addEventListener("click", (e) => {
    e.preventDefault();
    if (confirm("Bạn có chắc muốn đăng xuất?")) {
      localStorage.removeItem("mocyen_user");
      window.location.href = "login.html";
    }
  });

  // CHUYỂN TAB
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
  // 3. GỌI API ĐỔ DỮ LIỆU
  // ==========================================

  async function loadProducts() {
    const tbody = document.getElementById("admin-products-list");
    if (!tbody) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/products`);
      const products = await res.json();
      tbody.innerHTML = "";
      products.forEach(prod => {
        tbody.insertAdjacentHTML("beforeend", `
          <tr>
            <td><img src="../images/product/${prod.image}" style="width:40px;height:40px;border-radius:6px;object-fit:contain;background:#F7F3E9;" onerror="this.src='../images/banner/hero.png'"></td>
            <td style="font-weight:600; color:#243A30;">${prod.name}</td>
            <td>${prod.category}</td>
            <td style="font-weight:600;">${formatPrice(prod.price)}</td>
            <td style="font-weight:600; color:${prod.stock < 10 ? '#C4425B' : '#155724'}">${prod.stock}</td>
            <td><button class="action-btn" onclick="alert('Chức năng sửa sản phẩm đang phát triển!')"><i class="fa-solid fa-pen-to-square"></i></button></td>
          </tr>
        `);
      });
    } catch (e) { 
        tbody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  async function loadCustomers() {
    const tbody = document.getElementById("admin-customers-list");
    if (!tbody) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`);
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
        tbody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  let allOrders = [];
  let currentOrderIdForModal = null;

  async function loadOrdersAndStats() {
    const tbody = document.getElementById("admin-orders-list");
    if (!tbody) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/orders`);
      allOrders = await res.json();
      
      let totalRev = 0;
      allOrders.forEach(o => { totalRev += Number(o.total_amount); });
      document.getElementById("stat-revenue").textContent = formatPrice(totalRev);
      document.getElementById("stat-aov").textContent = formatPrice(allOrders.length > 0 ? totalRev / allOrders.length : 0);

      renderOrdersTable(allOrders);
      renderCharts(allOrders);
    } catch (e) { 
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Lỗi tải dữ liệu</td></tr>`;
    }
  }

  function renderOrdersTable(ordersToRender) {
    const tbody = document.getElementById("admin-orders-list");
    tbody.innerHTML = "";
    if (ordersToRender.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Không có đơn hàng.</td></tr>`;
      return;
    }

    ordersToRender.forEach(o => {
      let statusHTML = `<span class="badge-status status-pending">Chờ xử lý</span>`;
      if (o.status === 'completed') statusHTML = `<span class="badge-status status-completed">Hoàn thành</span>`;
      else if (o.status === 'shipping') statusHTML = `<span class="badge-status status-shipping">Đang giao</span>`;
      else if (o.status === 'cancelled') statusHTML = `<span class="badge-status status-cancelled">Đã hủy</span>`;
      
      const date = new Date(o.created_at).toLocaleDateString('vi-VN');
      const channel = o.channel || 'Website'; 

      tbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td><span class="order-code">#${o.id}</span></td>
          <td>${o.customer_name}</td>
          <td>${date}</td>
          <td><span class="badge-channel channel-${channel}">${channel}</span></td>
          <td style="font-weight:600;">${formatPrice(o.total_amount)}</td>
          <td>${statusHTML}</td>
          <td>
            <!-- NÚT XEM CHI TIẾT MỚI -->
            <button class="action-btn" onclick="openOrderModal(${o.id})" title="Xem chi tiết">
              <i class="fa-solid fa-eye" style="color:#1565C0"></i>
            </button>
          </td>
        </tr>
      `);
    });
  }

  // Lọc kênh
  const filterBtns = document.querySelectorAll("#order-channel-filters .btn-filter");
  filterBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      filterBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const channel = btn.dataset.channel;
      if (channel === "all") renderOrdersTable(allOrders);
      else renderOrdersTable(allOrders.filter(o => (o.channel || 'Website') === channel));
    });
  });

  // ==========================================
  // MODAL CHI TIẾT ĐƠN HÀNG
  // ==========================================
  const modal = document.getElementById("order-modal");
  const modalBody = document.getElementById("modal-order-body");
  const modalTitle = document.getElementById("modal-order-title");
  const modalStatusSelect = document.getElementById("modal-status-select");
  const modalSaveBtn = document.getElementById("modal-save-btn");

  window.openOrderModal = async function(orderId) {
    currentOrderIdForModal = orderId;
    modalBody.innerHTML = '<p style="text-align:center;">Đang tải dữ liệu...</p>';
    modal.classList.add("active");

    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${orderId}`);
      const order = await res.json();
      
      modalTitle.textContent = `Chi tiết đơn hàng #${order.id}`;
      modalStatusSelect.value = order.status;

      // Render sản phẩm
      let itemsHtml = "";
      if(order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const imgSrc = item.image ? `../images/product/${item.image}` : '../images/banner/hero.png';
          itemsHtml += `
            <div class="modal-item">
              <img src="${imgSrc}" onerror="this.src='../images/banner/hero.png'">
              <div class="modal-item-info">
                <h4>${item.product_name}</h4>
                <p>Số lượng: ${item.quantity}</p>
              </div>
              <div class="modal-item-price">${formatPrice(item.price)}</div>
            </div>
          `;
        });
      }

      const date = new Date(order.created_at).toLocaleString('vi-VN');
      
      modalBody.innerHTML = `
        <div class="modal-info-group">
          <p><strong>Khách hàng:</strong> ${order.customer_name}</p>
          <p><strong>Số điện thoại:</strong> ${order.phone}</p>
          <p><strong>Địa chỉ:</strong> ${order.address}</p>
          <p><strong>Ngày đặt:</strong> ${date}</p>
          <p><strong>Kênh:</strong> ${order.channel || 'Website'}</p>
          <p><strong>Thanh toán:</strong> ${order.payment_method}</p>
          ${order.coupon_code ? `<p><strong>Mã giảm giá:</strong> ${order.coupon_code} (-${formatPrice(order.discount_amount)})</p>` : ''}
        </div>
        <div class="modal-item-list">
          <p style="font-weight:600; margin-bottom:10px;">Danh sách sản phẩm:</p>
          ${itemsHtml || '<p>Không có sản phẩm nào.</p>'}
        </div>
        <div style="text-align: right; margin-top: 20px; border-top: 2px solid #264F40; padding-top: 15px;">
          <p style="font-size: 14px; margin-bottom: 5px;">Tổng thanh toán:</p>
          <h3 style="color: #264F40; font-size: 22px; margin: 0;">${formatPrice(order.total_amount)}</h3>
        </div>
      `;
    } catch (e) {
      modalBody.innerHTML = '<p style="color:red; text-align:center;">Lỗi tải chi tiết đơn hàng.</p>';
    }
  };

  document.getElementById("modal-close-btn").addEventListener("click", () => {
    modal.classList.remove("active");
  });

  // Lưu trạng thái mới
  modalSaveBtn.addEventListener("click", async () => {
    if (!currentOrderIdForModal) return;
    const newStatus = modalStatusSelect.value;
    
    const originalText = modalSaveBtn.textContent;
    modalSaveBtn.textContent = "Đang lưu...";
    modalSaveBtn.disabled = true;

    try {
      const res = await fetch(`${API_BASE}/api/admin/orders/${currentOrderIdForModal}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message || "Cập nhật thành công!");
        modal.classList.remove("active");
        loadOrdersAndStats(); // Tải lại danh sách
        loadProducts();        // Tải lại kho (vì có thể bị thay đổi)
      } else {
        alert(data.error || "Có lỗi xảy ra!");
      }
    } catch (e) {
      alert("Lỗi kết nối Server!");
    } finally {
      modalSaveBtn.textContent = originalText;
      modalSaveBtn.disabled = false;
    }
  });

  // BIỂU ĐỒ
  function renderCharts(orders) {
    if (typeof Chart === 'undefined') return;
    const ctxChannel = document.getElementById('channelChart').getContext('2d');
    const revByChannel = { Website: 0, Shopee: 0, Facebook: 0, TikTok: 0 };
    orders.forEach(o => {
      const ch = o.channel || 'Website';
      if (revByChannel[ch] !== undefined) revByChannel[ch] += Number(o.total_amount);
    });

    new Chart(ctxChannel, {
      type: 'doughnut',
      data: {
        labels: ['Website', 'Shopee', 'Facebook', 'TikTok'],
        datasets: [{ data: [revByChannel.Website, revByChannel.Shopee, revByChannel.Facebook, revByChannel.TikTok], backgroundColor: ['#2E7D32', '#E65100', '#1565C0', '#263238'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });

    const ctxTraffic = document.getElementById('trafficChart').getContext('2d');
    new Chart(ctxTraffic, {
      type: 'bar',
      data: {
        labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'],
        datasets: [{ label: 'Doanh thu (VNĐ)', data: [1200000, 1900000, 3000000, 5000000, 2000000, 3000000, 4500000], backgroundColor: '#264F40', borderRadius: 6 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  }

  loadProducts();
  loadCustomers();
  loadOrdersAndStats();


  // ==========================================
  // 4. CHAT
  // ==========================================
  let currentChatUserId = null;
  let adminSocket = null;

  const adminSocketScript = document.createElement('script');
  adminSocketScript.src = "https://cdn.socket.io/4.7.2/socket.io.min.js";
  document.head.appendChild(adminSocketScript);

  adminSocketScript.onload = () => {
      adminSocket = io(API_BASE); 
      adminSocket.emit('admin_join');
      adminSocket.on('receive_message', (data) => {
          if (data.sender === 'customer') {
              if (currentChatUserId == data.user_id) displayAdminMessage(data.message, 'customer');
              loadAdminChatList(); 
          }
      });
  };

  function displayAdminMessage(text, sender) {
      const body = document.getElementById("admin-chat-body");
      if (!body) return;
      const div = document.createElement("div");
      div.style.cssText = `max-width: 70%; padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; margin-bottom: 10px;
        ${sender === 'admin' ? 'background: #264F40; color: white; align-self: flex-end; border-bottom-right-radius: 2px;' : 'background: #FFFDF8; color: #243A30; align-self: flex-start; border: 1px solid #E4E2D7; border-bottom-left-radius: 2px;'}`;
      div.textContent = text; 
      body.appendChild(div);
      body.scrollTop = body.scrollHeight;
  }

  async function loadAdminChatList() {
      const listContainer = document.getElementById("admin-chat-list");
      if (!listContainer) return;
      try {
          const res = await fetch(`${API_BASE}/api/admin/chats`);
          const users = await res.json();
          listContainer.innerHTML = "";
          if (users.length === 0) { listContainer.innerHTML = '<p style="padding: 20px; color: #7C877D; font-size: 13px;">Chưa có ai nhắn tin.</p>'; return; }

          users.forEach(u => {
              const div = document.createElement("div");
              div.style.cssText = "padding: 15px 20px; border-bottom: 1px solid #EAEAEA; cursor: pointer; transition: 0.2s;";
              const displayName = u.customer_name || `Khách ID: ${u.user_id}`;
              div.innerHTML = `<strong>${displayName}</strong>`;
              div.onmouseover = () => div.style.background = '#F4F6F3';
              div.onmouseout = () => div.style.background = 'transparent';
              div.onclick = () => openAdminChat(u.user_id, displayName);
              listContainer.appendChild(div);
          });
      } catch (e) { console.error(e); }
  }

  async function openAdminChat(userId, name) {
      currentChatUserId = userId;
      document.getElementById("admin-chat-header").textContent = `Đang chat với: ${name}`;
      try {
          const res = await fetch(`${API_BASE}/api/messages/${userId}`);
          const msgs = await res.json();
          document.getElementById("admin-chat-body").innerHTML = "";
          msgs.forEach(m => displayAdminMessage(m.message, m.sender));
      } catch(e) { console.error(e); }
  }

  const btnAdminSend = document.getElementById("admin-chat-send");
  const inputAdminChat = document.getElementById("admin-chat-input");

  function sendAdminMessage() {
      const text = inputAdminChat.value.trim();
      if (!text || !currentChatUserId || !adminSocket) return;
      inputAdminChat.value = "";
      adminSocket.emit('send_message', { user_id: currentChatUserId, sender: 'admin', message: text });
      displayAdminMessage(text, 'admin');
  }

  if (btnAdminSend) btnAdminSend.addEventListener("click", sendAdminMessage);
  if (inputAdminChat) inputAdminChat.addEventListener("keypress", (e) => { if (e.key === "Enter") sendAdminMessage(); });

  const chatTabBtn = document.querySelector('.tab-btn[data-target="tab-messages"]');
  if (chatTabBtn) chatTabBtn.addEventListener('click', loadAdminChatList);
});