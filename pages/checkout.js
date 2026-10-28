/* =========================================================
   MOCYEN — CHECKOUT.JS
   Xử lý logic thanh toán, API tỉnh thành và tạo đơn hàng
========================================================= */
  // KIỂM TRA ĐĂNG NHẬP
  const userJson = localStorage.getItem("mocyen_user");
  if (!userJson) {
    alert("Vui lòng đăng nhập để thanh toán!");
    window.location.href = "login.html?redirect=checkout.html";
    return;
  }
  const currentUser = JSON.parse(userJson);

  // Tự động điền thông tin
  document.getElementById("fullname").value = currentUser.name || "";
  document.getElementById("email").value = currentUser.email || "";
  if (currentUser.phone) document.getElementById("phone").value = currentUser.phone;

document.addEventListener("DOMContentLoaded", async () => {
  const CART_KEY = "mocyen_cart";

  // 1. Lấy giỏ hàng
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) { cart = []; }

  if (cart.length === 0) {
    alert("Giỏ hàng của bạn đang trống!");
    window.location.href = "cart.html";
    return;
  }

  // DOM Elements
  const itemsContainer = document.getElementById("checkout-items");
  const subtotalEl = document.getElementById("checkout-subtotal");
  const shippingEl = document.getElementById("checkout-shipping");
  const totalEl = document.getElementById("checkout-total");
  const bankQrBox = document.getElementById("bank-qr-box");
  const form = document.getElementById("checkout-form");
  const btnSubmit = document.getElementById("btn-place-order");
  const citySelect = document.getElementById("city");
  const districtSelect = document.getElementById("district");

  let currentTotal = 0;
   let currentSubTotal = 0;
  let currentShippingFee = 0;
  let discountAmount = 0;
  let appliedCoupon = "";
  let productsDB = {};

  // 2. Fetch Sản phẩm & Tỉnh thành
  async function fetchData() {
    try {
      // Fetch Products
      const resProd = await fetch('https://mocyen-web.onrender.com/api/products');
      const products = await resProd.json();
      products.forEach(p => productsDB[p.id] = p);

      // Fetch Tỉnh thành (API chuẩn mới 2 cấp)
      const resProv = await fetch('https://provinces.open-api.vn/api/v2/p/');
      const provinces = await resProv.json();
      
      citySelect.innerHTML = '<option value="" disabled selected>-- Chọn Tỉnh/Thành phố --</option>';
      provinces.forEach(prov => {
        citySelect.insertAdjacentHTML('beforeend', `<option value="${prov.code}">${prov.name}</option>`);
      });

    } catch (error) {
       console.error(error);
      // Sửa dòng dưới đây để nó hiện lỗi thật của Database
      alert("Lỗi đặt hàng: " + (error.message || "Vui lòng thử lại!")); 
      btnSubmit.textContent = "Hoàn tất đặt hàng";
      btnSubmit.disabled = false;
    }
  }

  // 3. Xử lý Dropdown Phường/Xã
  citySelect.addEventListener("change", async function() {
    const provinceCode = this.value;
    
    districtSelect.innerHTML = '<option value="" disabled selected>Đang tải phường/xã...</option>';
    districtSelect.disabled = true;

    try {
      const res = await fetch(`https://provinces.open-api.vn/api/v2/p/${provinceCode}?depth=2`);
      const data = await res.json();
      
      districtSelect.innerHTML = '<option value="" disabled selected>-- Chọn Phường/Xã --</option>';
      if (data.wards && data.wards.length > 0) {
        data.wards.forEach(ward => {
          districtSelect.insertAdjacentHTML('beforeend', `<option value="${ward.name}">${ward.name}</option>`);
        });
        districtSelect.disabled = false;
      }
    } catch (error) {
      console.error("Lỗi tải phường xã:", error);
      districtSelect.innerHTML = '<option value="" disabled selected>Lỗi tải dữ liệu</option>';
    }
  });

    // XỬ LÝ MÃ GIẢM GIÁ
  const btnApplyCoupon = document.getElementById("btn-apply-coupon");
  const couponInput = document.getElementById("coupon-input");
  const couponMessage = document.getElementById("coupon-message");
  const discountRow = document.getElementById("discount-row");

  if (btnApplyCoupon) {
    btnApplyCoupon.addEventListener("click", async () => {
      const code = couponInput.value.trim().toUpperCase();
      if (!code) return;

      btnApplyCoupon.textContent = "Đang ktra...";
      btnApplyCoupon.disabled = true;
      couponMessage.textContent = "";

      try {
        // Gọi API kiểm tra mã (Gửi tổng tiền TẠM TÍNH, chưa cộng ship)
        const res = await fetch("https://mocyen-web.onrender.com/api/check-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code, total_amount: currentSubTotal })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Mã không hợp lệ");

        // Thành công
        discountAmount = data.discountAmount;
        appliedCoupon = data.code;
        
        couponMessage.style.color = "#2E7D32";
        couponMessage.textContent = `Thành công: Giảm ${formatPrice(discountAmount)}`;
        
        // Hiển thị dòng giảm giá
        discountRow.style.display = "flex";
        document.getElementById("discount-code-display").textContent = appliedCoupon;
        document.getElementById("checkout-discount").textContent = `-${formatPrice(discountAmount)}`;
        
        updateTotal(); // Cập nhật lại tổng

      } catch (error) {
        discountAmount = 0;
        appliedCoupon = "";
        discountRow.style.display = "none";
        couponMessage.style.color = "#C4425B";
        couponMessage.textContent = error.message;
        updateTotal();
      } finally {
        btnApplyCoupon.textContent = "Áp dụng";
        btnApplyCoupon.disabled = false;
      }
    });
  }

  // 4. Render Tóm tắt đơn hàng
  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;
   function renderSummary() {
    itemsContainer.innerHTML = "";
    currentSubTotal = 0; // Reset lại

    cart.forEach(item => {
      const product = productsDB[item.id];
      if (!product) return;

      const price = product.sale_price || product.price;
      const itemTotal = price * item.qty;
      currentSubTotal += itemTotal;

      itemsContainer.insertAdjacentHTML("beforeend", `
        <div class="summary-item">
          <img src="../images/product/${product.image}" alt="${product.name}" class="summary-item-img">
          <div class="summary-item-info">
            <div class="summary-item-name">${product.name}</div>
            <div class="summary-item-qty">SL: ${item.qty}</div>
          </div>
          <div class="summary-item-price">${formatPrice(itemTotal)}</div>
        </div>
      `);
    });

    // Tính ship
    currentShippingFee = (currentSubTotal > 0 && currentSubTotal < 499000) ? 30000 : 0;
    
    // Cập nhật DOM
    subtotalEl.textContent = formatPrice(currentSubTotal);
    shippingEl.textContent = currentShippingFee === 0 ? "Miễn phí" : formatPrice(currentShippingFee);
    
    updateTotal();
  }

  // Hàm tính tổng tiền mới (có trừ mã giảm giá)
  function updateTotal() {
    currentTotal = currentSubTotal + currentShippingFee - discountAmount;
    if (currentTotal < 0) currentTotal = 0;
    totalEl.textContent = formatPrice(currentTotal);
  }

  // 5. Xử lý đổi phương thức thanh toán
  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  paymentRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      document.querySelectorAll(".payment-item").forEach(el => el.classList.remove("active"));
      e.target.closest(".payment-item").classList.add("active");
      bankQrBox.hidden = (e.target.value !== "BANK_TRANSFER");
    });
  });

  // 6. Xử lý Submit Form Đặt Hàng
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    // Lấy text hiển thị của Tỉnh/Thành và Phường/Xã (vì value là mã code)
    const cityName = citySelect.options[citySelect.selectedIndex].text;
    const wardName = districtSelect.options[districtSelect.selectedIndex].text;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    let currentUser = JSON.parse(localStorage.getItem("mocyen_user"));
    let userId = currentUser ? currentUser.id : null;

    const orderData = {
      user_id: currentUser.id,
      customer_name: data.fullname,
      phone: data.phone,
      address: `${data.address}, ${wardName}, ${cityName}`,
      note: data.note || "",
      payment_method: data.payment_method,
      total_amount: currentTotal,
      items: cart.map(item => {
        const p = productsDB[item.id];
        return {
          id: item.id,
          name: p ? p.name : "Sản phẩm",
          qty: item.qty,
          price: p ? (p.sale_price || p.price) : 0
        };
      }),
      channel: "Website"
    };

    try {
      btnSubmit.textContent = "Đang xử lý...";
      btnSubmit.disabled = true;

      const response = await fetch("https://mocyen-web.onrender.com/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData)
      });

      if (!response.ok) throw new Error("Lỗi khi đặt hàng");

      localStorage.removeItem(CART_KEY);
      if (typeof window.showToast === "function") {
        window.showToast("Đặt hàng thành công!");
      } else {
        alert("Đặt hàng thành công!");
      }
      
      setTimeout(() => window.location.href = "../index.html", 1500);
      
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại!");
      btnSubmit.textContent = "Hoàn tất đặt hàng";
      btnSubmit.disabled = false;
    }
  });

  // --- KHỞI CHẠY ---
  await fetchData(); // Đợi load xong dữ liệu
  renderSummary();   // Mới vẽ giao diện tóm tắt
});