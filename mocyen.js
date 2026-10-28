/* =========================================================
   MOCYEN.JS - Logic tương tác chính (Đã tối ưu)
========================================================= */
document.addEventListener("DOMContentLoaded", function () {
  
  // Biến lưu trữ sản phẩm để không phải gọi API nhiều lần
  let globalProducts = [];

  /* ==========================================
     1. GỌI API 1 LẦN DUY NHẤT CHO CẢ TRANG
  ========================================== */
  fetch('https://mocyen-web.onrender.com/api/products')
    .then(res => res.json())
    .then(products => {
      globalProducts = products;
      
      // Render Best Seller
      renderBestSellers(products);
      
      // Render Combo Routine
      renderComboRoutine(products);
    })
    .catch(err => {
      console.error("Lỗi kết nối API:", err);
      document.getElementById("home-best-sellers").innerHTML = '<p style="width: 100%; text-align: center; color: red;">Không thể tải sản phẩm. Vui lòng bật Server Node.js!</p>';
    });


  /* ==========================================
     HÀM RENDER BEST SELLER
  ========================================== */
  function renderBestSellers(products) {
    const homeGrid = document.getElementById("home-best-sellers");
    if (!homeGrid) return;

    homeGrid.innerHTML = ""; 
    const top4 = products.slice(0, 4); // Lấy 4 sản phẩm
    
    top4.forEach(product => {
      const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;
      const card = document.createElement("article");
      card.className = "product-card";
      
      card.innerHTML = `
        <div class="product-image">
          ${product.sale_price ? `<span class="badge">KHUYẾN MÃI</span>` : ''}
          <button class="wish" type="button" aria-label="Yêu thích">♡</button>
          <a href="pages/product-detail.html?id=${product.id}">
            <img src="images/product/${product.image}" alt="${product.name}" loading="lazy">
          </a>
        </div>
        <div class="product-info">
          <p class="category-label">${product.category}</p>
          <h3><a href="pages/product-detail.html?id=${product.id}">${product.name}</a></h3>
          <div class="product-bottom">
            <strong>${formatPrice(product.sale_price || product.price)}</strong>
            <button class="quick-add" type="button" data-product-id="${product.id}">＋</button>
          </div>
        </div>
      `;
      homeGrid.appendChild(card);
    });
  }


  /* ==========================================
     HÀM RENDER COMBO ROUTINE
  ========================================== */
  function renderComboRoutine(products) {
    const routineContainer = document.getElementById("routine-box-container");
    if (!routineContainer) return;

    const comboSkus = ['SRM-ND-150', 'TONER-RDC-500', 'SERUM-RM-30', 'KEM-ND-30'];
    const discountPercent = 15;

    const comboProducts = comboSkus.map(sku => products.find(p => p.sku === sku)).filter(p => p !== undefined);

    if (comboProducts.length === 0) {
      routineContainer.innerHTML = '<p>Chưa cập nhật sản phẩm cho combo này.</p>';
      return;
    }

    let totalOriginalPrice = 0;
    let htmlItems = '';
    let step = 1;

    comboProducts.forEach(product => {
      // QUAN TRỌNG: Ép kiểu Number để tránh lỗi NaN
      const price = Number(product.sale_price || product.price);
      totalOriginalPrice += price;
      
      const shortName = product.name.replace("Mộc Yên", "").trim();
      
      // Cắt mô tả ngắn gọn (chỉ lấy 40 ký tự đầu)
      let shortDesc = "Chăm sóc da";
      if (product.short_desc) {
        shortDesc = product.short_desc.length > 40 
            ? product.short_desc.substring(0, 40) + "..." 
            : product.short_desc;
      }

      htmlItems += `
        <div class="routine-item">
          <span>0${step}</span>
          <div>
            <strong>${shortName}</strong>
            <small>${shortDesc}</small>
          </div>
          <b>${price / 1000}k</b>
        </div>
      `;
      step++;
    });

    // Ép kiểu Number cho phép tính cuối cùng
    const finalPrice = Math.round((Number(totalOriginalPrice) * (100 - discountPercent) / 100) / 1000) * 1000;
    const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;

    routineContainer.innerHTML = `
      <div class="routine-title">
        <div>
          <p class="eyebrow">COMBO TIẾT KIỆM</p>
          <h3>Bộ Chăm Da Cơ Bản</h3>
        </div>
        <span class="save-tag">TIẾT KIỆM ${discountPercent}%</span>
      </div>
      ${htmlItems}
      <div class="routine-total">
        <div>
          <small>Tổng bộ</small>
          <strong>${formatPrice(finalPrice)}</strong>
        </div>
        <button class="btn btn-primary" id="add-custom-routine">Thêm cả bộ</button>
      </div>
    `;

    document.getElementById("add-custom-routine").addEventListener("click", () => {
      if (typeof window.addToCart === "function") {
        comboProducts.forEach(p => window.addToCart(p.id));
        window.showToast(`Đã thêm bộ sản phẩm vào giỏ hàng!`);
      } else {
        alert("Đã thêm cả bộ vào giỏ hàng");
      }
    });
  }


  /* ==========================================
     2. HIỆU ỨNG SCROLL REVEAL
  ========================================== */
  // Đặt trong setTimeout để đợi DOM render xong
  setTimeout(() => {
    const revealElements = document.querySelectorAll(
      '.story-copy, .story-image, .routine-visual, .routine-box, .review-card, .journal-card, .benefit-grid article'
    );
    revealElements.forEach(el => el.classList.add('reveal'));

    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });
      revealElements.forEach(el => revealObserver.observe(el));
    } else {
      revealElements.forEach(el => el.classList.add('is-visible'));
    }
  }, 500); 

  /* ==========================================
     3. STICKY HEADER & NEWSLETTER
  ========================================== */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('is-scrolled', window.scrollY > 50);
    });
  }

  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      if (typeof window.showToast === 'function') {
        window.showToast('Cảm ơn bạn! Đã đăng ký nhận tin.');
      } else {
        alert('Cảm ơn bạn! Đã đăng ký nhận tin.');
      }
      this.reset();
    });
  }

});