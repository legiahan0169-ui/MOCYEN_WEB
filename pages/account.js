document.addEventListener("DOMContentLoaded", async () => {
  const userJson = localStorage.getItem("mocyen_user");
  if (!userJson) {
    alert("Vui lòng đăng nhập để xem trang này!");
    window.location.href = "login.html";
    return;
  }

  const user = JSON.parse(userJson);

  // 1. Điền thông tin User
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("user-avatar").textContent = user.name.charAt(0).toUpperCase();
  document.getElementById("profile-name").value = user.name;
  document.getElementById("profile-email").value = user.email;

  // 2. Xử lý chuyển Tab
  const navBtns = document.querySelectorAll(".acc-nav-btn[data-target]");
  const tabPanels = document.querySelectorAll(".acc-tab-panel");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navBtns.forEach(b => b.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.target).classList.add("active");
    });
  });

  // 3. Xử lý Đăng xuất
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("mocyen_user");
      localStorage.removeItem("mocyen_token");
      if (typeof window.showToast === "function") window.showToast("Đã đăng xuất");
      setTimeout(() => window.location.href = "../index.html", 1000);
    }
  });

  // 4. GỌI API LẤY ĐƠN HÀNG THẬT
  const orderContainer = document.getElementById("order-list-container");
  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;

  try {
    const res = await fetch(`https://mocyen-web.onrender.com/api/orders/user/${user.id}`);
    const orders = await res.json();

    if (orders.length === 0) {
      orderContainer.innerHTML = `<p style="text-align:center; color:#7C877D; padding: 20px;">Bạn chưa có đơn hàng nào.</p>`;
      return;
    }

    orderContainer.innerHTML = "";
    orders.forEach(order => {
      // Xử lý trạng thái đơn hàng
      let statusText = "Chờ xử lý";
      let statusClass = "status-pending";
      if (order.status === "shipping") { statusText = "Đang giao hàng"; statusClass = "status-shipping"; }
      else if (order.status === "completed") { statusText = "Hoàn thành"; statusClass = "status-completed"; }
      else if (order.status === "cancelled") { statusText = "Đã hủy"; statusClass = "status-cancelled"; }

      // Format ngày
      const orderDate = new Date(order.created_at).toLocaleString('vi-VN');

      const card = document.createElement("div");
      card.className = "order-card";
      card.innerHTML = `
        <div class="order-header">
          <div>
            <div class="order-id">Đơn hàng #${order.id}</div>
            <div class="order-date">Ngày đặt: ${orderDate}</div>
          </div>
          <span class="order-status ${statusClass}">${statusText}</span>
        </div>
        <div class="order-body" style="padding: 15px 20px;">
          <p><strong>Người nhận:</strong> ${order.customer_name} - ${order.phone}</p>
          <p><strong>Địa chỉ:</strong> ${order.address}</p>
          <p><strong>Phương thức TT:</strong> ${order.payment_method}</p>
        </div>
        <div class="order-footer">
          <div class="order-total-text">
            Tổng cộng: <span class="order-total-price">${formatPrice(order.total_amount)}</span>
          </div>
        </div>
      `;
      orderContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Lỗi lấy đơn hàng:", error);
    orderContainer.innerHTML = `<p style="color:red; text-align:center;">Lỗi tải lịch sử đơn hàng. Vui lòng thử lại sau.</p>`;
  }
});