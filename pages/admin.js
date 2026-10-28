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

  // Xử lý Đăng xuất
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
    });
  });

  // ==========================================
  // 3. GỌI API ĐỔ DỮ LIỆU THẬT
  // ==========================================

  // --- 3.1. Bảng Sản phẩm ---
  async function loadProducts() {
    const tbody = document.getElementById("admin-products-list");
    try {
      const res = await fetch('http://localhost:3000/api/admin/products');
      const products = await res.json();
      tbody.innerHTML = "";
      products.forEach(prod => {
        tbody.insertAdjacentHTML("beforeend", `
          <tr>
            <td><img src="../images/product/${prod.image}" style="width:40px;height:40px;border-radius:6px;object-fit:contain;background:#F7F3E9;"></td>
            <td style="font-weight:600; color:#243A30;">${prod.name}</td>
            <td>${prod.category}</td>
            <td style="font-weight:600;">${formatPrice(prod.price)}</td>
            <td>${prod.stock}</td>
            <td><button class="action-btn"><i class="fa-solid fa-pen-to-square"></i></button></td>
          </tr>
        `);
      });
    } catch (e) { console.error("Lỗi tải sản phẩm", e); }
  }

  // --- 3.2. Bảng Khách hàng ---
  async function loadCustomers() {
    const tbody = document.getElementById("admin-customers-list");
    try {
      const res = await fetch('http://localhost:3000/api/admin/users');
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
    } catch (e) { console.error("Lỗi tải khách hàng", e); }
  }

  // --- 3.3. Bảng Đơn hàng & Thống kê (Dashboard) ---
  async function loadOrders() {
    const tbody = document.getElementById("admin-orders-list");
    try {
      const res = await fetch('http://localhost:3000/api/admin/orders');
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
    } catch (e) { console.error("Lỗi tải đơn hàng", e); }
  }

  // --- KHỞI CHẠY ---
  loadProducts();
  loadCustomers();
  loadOrders();
});