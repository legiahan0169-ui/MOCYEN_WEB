document.addEventListener("DOMContentLoaded", async () => {
  // Hàm lấy Key giỏ hàng riêng (Giống hệt bên cart.js và components.js)
  function getCartKey() {
    const userJson = localStorage.getItem("mocyen_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        return "mocyen_cart_user_" + user.id; 
      } catch (e) { return "mocyen_cart_guest"; }
    }
    return "mocyen_cart_guest"; 
  }

  const CART_KEY = getCartKey();

  // 1. KIỂM TRA ĐĂNG NHẬP
  const userJson = localStorage.getItem("mocyen_user");
  if (!userJson) {
    alert("Vui lòng đăng nhập để thanh toán!");
    window.location.href = "login.html?redirect=checkout.html";
    return;
  }
  const currentUser = JSON.parse(userJson);

  // 2. Lấy giỏ hàng
  let cart = [];
  try {
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) { cart = []; }

  // Nếu giỏ trống, báo lỗi và đá về trang giỏ hàng
  if (cart.length === 0) {
    alert("Giỏ hàng của bạn đang trống! Vui lòng chọn sản phẩm.");
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
  let productsDB = {};

  // 3. Tự động điền thông tin
  document.getElementById("fullname").value = currentUser.name || "";
  document.getElementById("email").value = currentUser.email || "";
  if (currentUser.phone) document.getElementById("phone").value = currentUser.phone;

  // 4. Fetch Sản phẩm & Tỉnh thành
  async function fetchData() {
    try {
      // Fetch Products
      const resProd = await fetch('https://mocyen-web.onrender.com/api/products');
      const products = await resProd.json();
      products.forEach(p => productsDB[p.id] = p);

      // Fetch Tỉnh thành
      const resProv = await fetch('https://provinces.open-api.vn/api/v2/p/');
      const provinces = await resProv.json();
      
      citySelect.innerHTML = '<option value="" disabled selected>-- Chọn Tỉnh/Thành phố --</option>';
      provinces.forEach(prov => {
        citySelect.insertAdjacentHTML('beforeend', `<option value="${prov.code}">${prov.name}</option>`);
      });
    } catch (error) {
      console.error("Lỗi tải dữ liệu:", error);
      itemsContainer.innerHTML = '<p style="color:red; text-align:center;">Lỗi kết nối dữ liệu. Vui lòng bật Server!</p>';
    }
  }

  // 5. Xử lý Dropdown Phường/Xã
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
    }
  });

  // 6. Render Tóm tắt đơn hàng
  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;
  function renderSummary() {
    itemsContainer.innerHTML = "";
    let subtotal = 0;

    cart.forEach(item => {
      const product = productsDB[item.id];
      if (!product) return;

      const price = Number(product.sale_price || product.price);
      const itemTotal = price * item.qty;
      subtotal += itemTotal;

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

    subtotalEl.textContent = formatPrice(subtotal);

    let shippingFee = (subtotal > 0 && subtotal < 499000) ? 30000 : 0;
    shippingEl.textContent = shippingFee === 0 ? "Miễn phí" : formatPrice(shippingFee);

    currentTotal = subtotal + shippingFee;
    totalEl.textContent = formatPrice(currentTotal);
  }

  // 7. Xử lý Mã giảm giá
  const btnApplyCoupon = document.getElementById("btn-apply-coupon");
  const couponInput = document.getElementById("coupon-input");
  const couponMessage = document.getElementById("coupon-message");
  const discountRow = document.getElementById("discount-row");
  let discountAmount = 0;
  let appliedCoupon = "";

  if (btnApplyCoupon) {
    btnApplyCoupon.addEventListener("click", async () => {
      const code = couponInput.value.trim().toUpperCase();
      if (!code) return;

      btnApplyCoupon.textContent = "Đang ktra...";
      btnApplyCoupon.disabled = true;
      couponMessage.textContent = "";

      try {
        const res = await fetch("https://mocyen-web.onrender.com/api/check-coupon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: code, total_amount: currentTotal })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Mã không hợp lệ");

        discountAmount = data.discountAmount;
        appliedCoupon = data.code;
        
        couponMessage.style.color = "#2E7D32";
        couponMessage.textContent = `Thành công: Giảm ${formatPrice(discountAmount)}`;
        
        discountRow.style.display = "flex";
        document.getElementById("discount-code-display").textContent = appliedCoupon;
        document.getElementById("checkout-discount").textContent = `-${formatPrice(discountAmount)}`;
        
        updateTotal();
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

  // Hàm tính tổng tiền có mã giảm giá
  function updateTotal() {
    let subtotal = 0;
    cart.forEach(item => {
      const p = productsDB[item.id];
      if (p) subtotal += Number(p.sale_price || p.price) * item.qty;
    });
    
    let shippingFee = (subtotal > 0 && subtotal < 499000) ? 30000 : 0;
    currentTotal = subtotal + shippingFee - discountAmount;
    if (currentTotal < 0) currentTotal = 0;

    totalEl.textContent = formatPrice(currentTotal);

    // NẾU ĐANG CHỌN CHUYỂN KHOẢN, CẬP NHẬT LẠI SỐ TIỀN TRÊN MÃ QR
    const selectedPayment = document.querySelector('input[name="payment_method"]:checked');
    if (selectedPayment && (selectedPayment.value === "bank" || selectedPayment.value === "transfer")) {
      selectedPayment.dispatchEvent(new Event('change')); // Kích hoạt lại sự kiện change để vẽ lại QR
    }
  }

    // ==========================================
  // 8. XỬ LÝ HIỂN THỊ THÔNG TIN CHUYỂN KHOẢN
  // ==========================================
  const paymentRadios = document.querySelectorAll('input[name="payment_method"]');
  
  // CẤU HÌNH THÔNG TIN NGÂN HÀNG CỦA BẠN TẠI ĐÂY
  const bankId = "VCB"; // Mã ngân hàng (Vietcombank là VCB, MB là MB...)
  const accountNo = "0123456789"; // Số tài khoản của bạn
  const accountName = "CONG TY MOC YEN"; // Tên chủ tài khoản (Viết không dấu)

  paymentRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      const method = e.target.value;
      
      // SỬA LẠI ĐIỀU KIỆN CHO KHỚP VỚI HTML: value="BANK_TRANSFER"
      if (method === "BANK_TRANSFER") { 
        if (bankQrBox) {
          bankQrBox.style.display = "block";
          
          const addInfo = `Thanh toan don hang ${currentUser.name || ''}`.trim(); 
          
          // Tạo URL ảnh QR động từ API của VietQR (Tự động điền số tiền)
          const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${currentTotal}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;
          
          // Bơm mã QR động vào thay thế cho chữ (Mã QR Demo) trong HTML
          bankQrBox.innerHTML = `
            <div style="text-align: center; padding: 15px; border: 1px dashed #2E7D32; border-radius: 8px; background: #fff; margin-top: 15px;">
              <p style="margin-bottom: 10px; font-weight: bold; color: #2E7D32;">Quét mã QR để thanh toán nhanh</p>
              <img src="${qrUrl}" alt="QR Code" style="max-width: 250px; margin: 0 auto; display: block; border-radius: 8px;">
              <div style="margin-top: 15px; font-size: 14px; text-align: left; line-height: 1.6;">
                <div><strong>Ngân hàng:</strong> ${bankId}</div>
                <div><strong>Số TK:</strong> ${accountNo}</div>
                <div><strong>Chủ TK:</strong> ${accountName}</div>
                <div><strong>Số tiền:</strong> <span style="color: #C4425B; font-weight: bold;">${formatPrice(currentTotal)}</span></div>
                <div><strong>Nội dung:</strong> ${addInfo}</div>
              </div>
            </div>
          `;
        }
      } else {
        // Nếu chọn COD thì ẩn khung QR đi
        if (bankQrBox) bankQrBox.style.display = "none";
      }
    });
  });

  // 9. Submit Form
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const cityName = citySelect.options[citySelect.selectedIndex].text;
    const wardName = districtSelect.options[districtSelect.selectedIndex].text;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    const orderData = {
      user_id: currentUser.id,
      customer_name: data.fullname,
      phone: data.phone,
      address: `${data.address}, ${wardName}, ${cityName}`,
      note: data.note || "",
      payment_method: data.payment_method,
      total_amount: currentTotal,
      coupon_code: appliedCoupon,
      discount_amount: discountAmount,
      items: cart.map(item => {
        const p = productsDB[item.id];
        return {
          id: item.id,
          name: p ? p.name : "Sản phẩm",
          qty: item.qty,
          price: p ? Number(p.sale_price || p.price) : 0
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
      
      // Thông báo thành công
      if (typeof window.showToast === "function") {
        window.showToast("Đặt hàng thành công!");
      } else {
        alert("Đặt hàng thành công! Bạn sẽ được chuyển về trang chủ.");
      }
      
      // Tăng thời gian chờ lên 3 giây để khách kịp nhìn thấy thông báo
      setTimeout(() => window.location.href = "../index.html", 3000);
      
    } catch (error) {
      console.error(error);
      alert("Lỗi đặt hàng: " + (error.message || "Vui lòng thử lại!"));
      btnSubmit.textContent = "Hoàn tất đặt hàng";
      btnSubmit.disabled = false;
    }
  });

  // --- KHỞI CHẠY ---
  await fetchData();
  renderSummary();
});