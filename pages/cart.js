/* =========================================================
   MOCYEN — CART.JS (Đã tối ưu cho Giỏ hàng riêng của từng User)
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  
  // 1. Hàm lấy Key giỏ hàng riêng theo User (Giống hệt bên components.js)
  function getCartKey() {
    const userJson = localStorage.getItem("mocyen_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        return "mocyen_cart_user_" + user.id; // Giỏ riêng của user này
      } catch (e) {
        return "mocyen_cart_guest";
      }
    }
    return "mocyen_cart_guest"; // Giỏ của khách chưa đăng nhập
  }

  const CART_KEY = getCartKey();

  // 2. Xử lý nút Thanh toán (ĐƯA LÊN TRÊN ĐỂ KHÔNG BỊ LỖI KHI GIỎ TRỐNG)
  const btnCheckout = document.getElementById("btn-checkout");
  if (btnCheckout) {
    btnCheckout.addEventListener("click", function(e) {
      const userJson = localStorage.getItem("mocyen_user");
      if (!userJson) {
        e.preventDefault(); // Chặn chuyển trang
        alert("Vui lòng đăng nhập để tiến hành thanh toán!");
        window.location.href = "login.html?redirect=checkout.html";
      }
    });
  }

  // 3. Lấy dữ liệu giỏ hàng từ localStorage
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) { cart = []; }

  // DOM Elements
  const emptyState = document.getElementById("cart-empty");
  const contentState = document.getElementById("cart-content");
  const itemsContainer = document.getElementById("cart-items-container");
  const subtotalEl = document.getElementById("cart-subtotal");
  const shippingEl = document.getElementById("cart-shipping");
  const totalEl = document.getElementById("cart-total");
  const shippingNote = document.getElementById("shipping-note");

  // Nếu giỏ trống thì hiển thị thông báo
  if (cart.length === 0) {
    if (emptyState) emptyState.hidden = false;
    if (contentState) contentState.hidden = true;
    return;
  }

  // 4. Gọi API lấy thông tin sản phẩm thật từ Database
  let productsDB = {};
  try {
    const res = await fetch('https://mocyen-web.onrender.com/api/products');
    const products = await res.json();
    products.forEach(p => { productsDB[p.id] = p; });
  } catch (error) {
    console.error("Lỗi tải sản phẩm:", error);
    itemsContainer.innerHTML = '<p style="color:red; text-align:center;">Lỗi kết nối Backend. Vui lòng bật Node.js!</p>';
    return;
  }

  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;

  // 5. Hàm Render Giỏ Hàng
  function renderCart() {
    if (cart.length === 0) {
      if (emptyState) emptyState.hidden = false;
      if (contentState) contentState.hidden = true;
      return;
    }

    if (emptyState) emptyState.hidden = true;
    if (contentState) contentState.hidden = false;
    
    itemsContainer.innerHTML = ""; 
    let subtotal = 0;

    cart.forEach((item, index) => {
      const product = productsDB[item.id];
      if (!product) return; 

      const price = product.sale_price || product.price;
      const itemTotal = price * item.qty;
      subtotal += itemTotal;

      const itemHTML = `
        <div class="cart-item" data-id="${item.id}">
          <div class="cart-item-info">
            <img src="../images/product/${product.image}" alt="${product.name}" class="cart-item-img">
            <div class="cart-item-details">
              <a href="product-detail.html?id=${item.id}" class="cart-item-name">${product.name}</a>
              <span class="cart-item-sku">SKU: ${product.sku}</span>
            </div>
          </div>
          
          <div class="cart-item-price">${formatPrice(price)}</div>
          
          <div class="cart-qty">
            <button class="cart-qty-btn btn-minus" data-index="${index}">−</button>
            <input type="number" value="${item.qty}" readonly>
            <button class="cart-qty-btn btn-plus" data-index="${index}">+</button>
          </div>
          
          <div class="cart-item-subtotal">
            <strong>${formatPrice(itemTotal)}</strong>
            <button class="cart-remove-btn btn-remove" data-index="${index}" aria-label="Xóa sản phẩm">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </div>
      `;
      itemsContainer.insertAdjacentHTML("beforeend", itemHTML);
    });

    // Tính toán Tổng tiền
    subtotalEl.textContent = formatPrice(subtotal);
    
    let shippingFee = 0;
    if (subtotal > 0 && subtotal < 499000) {
      shippingFee = 30000;
      shippingEl.textContent = formatPrice(shippingFee);
      shippingNote.innerHTML = `<i class="fa-solid fa-circle-info"></i> Mua thêm <strong>${formatPrice(499000 - subtotal)}</strong> để được miễn phí giao hàng.`;
      shippingNote.style.color = "#C4425B";
      shippingNote.style.background = "#FBEAEE";
    } else {
      shippingEl.textContent = "Miễn phí";
      shippingNote.innerHTML = `<i class="fa-solid fa-truck-fast"></i> Đơn hàng của bạn được miễn phí giao hàng!`;
      shippingNote.style.color = "#658354";
      shippingNote.style.background = "#F4F7F1";
    }

    totalEl.textContent = formatPrice(subtotal + shippingFee);

    if (typeof window.updateCartCount === "function") window.updateCartCount();
  }

  // 6. Xử lý sự kiện Tăng/Giảm/Xóa
  itemsContainer.addEventListener("click", (e) => {
    if (e.target.closest(".btn-plus")) {
      const index = e.target.closest(".btn-plus").dataset.index;
      cart[index].qty += 1;
      saveAndRender();
    }
    
    if (e.target.closest(".btn-minus")) {
      const index = e.target.closest(".btn-minus").dataset.index;
      if (cart[index].qty > 1) {
        cart[index].qty -= 1;
        saveAndRender();
      }
    }

    if (e.target.closest(".btn-remove")) {
      const index = e.target.closest(".btn-remove").dataset.index;
      cart.splice(index, 1);
      saveAndRender();
      if (typeof window.showToast === "function") window.showToast("Đã xóa sản phẩm khỏi giỏ hàng");
    }
  });

  // Hàm lưu giỏ hàng (Dùng Key động)
  function saveAndRender() {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCart();
  }

  // Khởi chạy
  renderCart();
});