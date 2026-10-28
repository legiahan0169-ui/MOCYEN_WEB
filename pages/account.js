document.addEventListener("DOMContentLoaded", async () => {
  // Tự động nhận diện môi trường
  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") 
    ? "http://localhost:3000" : "https://mocyen-web.onrender.com";

  const userJson = localStorage.getItem("mocyen_user");
  if (!userJson) {
    alert("Vui lòng đăng nhập để xem trang này!");
    window.location.href = "login.html";
    return;
  }

  const user = JSON.parse(userJson);
  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;

  // 1. ĐIỀN THÔNG TIN USER LÊN SIDEBAR & FORM
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-email").textContent = user.email;
  document.getElementById("user-avatar").textContent = user.name.charAt(0).toUpperCase();
  
  document.getElementById("profile-name").value = user.name;
  document.getElementById("profile-email").value = user.email;
  // Nếu DB có lưu số điện thoại thì hiển thị, không thì để trống
  if (user.phone) {
    document.getElementById("profile-phone").value = user.phone;
  }

  // 2. XỬ LÝ CHUYỂN TAB
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

  // 3. XỬ LÝ ĐĂNG XUẤT
  document.getElementById("btn-logout").addEventListener("click", () => {
    if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("mocyen_user");
      localStorage.removeItem("mocyen_token");
      if (typeof window.showToast === "function") window.showToast("Đã đăng xuất");
      setTimeout(() => window.location.href = "../index.html", 1000);
    }
  });

  // 4. CẬP NHẬT THÔNG TIN CÁ NHÂN
  const profileForm = document.getElementById("profile-form");
  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newName = document.getElementById("profile-name").value.trim();
    const newPhone = document.getElementById("profile-phone").value.trim();

    if (!newName) {
      if (typeof window.showToast === "function") window.showToast("Tên không được để trống!");
      return;
    }

    // Cập nhật vào localStorage
    user.name = newName;
    user.phone = newPhone;
    localStorage.setItem("mocyen_user", JSON.stringify(user));

    // Cập nhật lại giao diện Sidebar
    document.getElementById("user-name").textContent = newName;
    document.getElementById("user-avatar").textContent = newName.charAt(0).toUpperCase();

    if (typeof window.showToast === "function") {
      window.showToast("Đã lưu thông tin thành công!");
    } else {
      alert("Đã lưu thông tin thành công!");
    }
  });

  // 5. GỌI API LẤY LỊCH SỬ ĐƠN HÀNG
  const orderContainer = document.getElementById("order-list-container");

  try {
    const res = await fetch(`${API_BASE}/api/orders/user/${user.id}`);
    const orders = await res.json();

    if (orders.length === 0) {
      orderContainer.innerHTML = `
        <div class="empty-orders">
          <i class="fa-solid fa-box-open"></i>
          <p>Bạn chưa có đơn hàng nào tại Mộc Yên.</p>
          <a href="shop.html" class="btn btn-primary">Mua sắm ngay</a>
        </div>
      `;
      return;
    }

    orderContainer.innerHTML = "";
    
    orders.forEach(order => {
      // Xử lý trạng thái
      let statusText = "Chờ xử lý";
      let statusClass = "status-pending";
      if (order.status === "shipping") { statusText = "Đang giao hàng"; statusClass = "status-shipping"; }
      else if (order.status === "completed") { statusText = "Hoàn thành"; statusClass = "status-completed"; }
      else if (order.status === "cancelled") { statusText = "Đã hủy"; statusClass = "status-cancelled"; }

      // Format ngày
      const orderDate = new Date(order.created_at).toLocaleString('vi-VN', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });

      // Render danh sách sản phẩm (Nếu Backend trả về items)
      let itemsHtml = "";
      if (order.items && order.items.length > 0) {
        itemsHtml = `<div class="order-products-list">`;
        order.items.forEach(item => {
          const imgSrc = item.image ? `../images/product/${item.image}` : '../images/banner/hero.png';
          itemsHtml += `
            <div class="order-product-item">
              <img src="${imgSrc}" alt="${item.name}" onerror="this.src='../images/banner/hero.png'">
              <div class="order-product-info">
                <h4>${item.name}</h4>
                <p>Số lượng: ${item.qty}</p>
              </div>
              <div class="order-product-price">${formatPrice(item.price)}</div>
            </div>
          `;
        });
        itemsHtml += `</div>`;
      }

      // Render toàn bộ Card đơn hàng
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
        <div class="order-body">
          <div class="order-info-text"><strong>Người nhận:</strong> ${order.customer_name} - ${order.phone}</div>
          <div class="order-info-text"><strong>Địa chỉ:</strong> ${order.address}</div>
          <div class="order-info-text"><strong>Thanh toán:</strong> ${order.payment_method}</div>
          
          <!-- Danh sách sản phẩm -->
          ${itemsHtml}
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
    orderContainer.innerHTML = `<p style="color:red; text-align:center; padding:20px;">Lỗi tải lịch sử đơn hàng. Vui lòng thử lại sau.</p>`;
  }
});