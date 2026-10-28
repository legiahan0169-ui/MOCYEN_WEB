/* =========================================================
   MOCYEN.JS - Logic tương tác chính (Trang chủ)
========================================================= */
document.addEventListener("DOMContentLoaded", function () {
  
  // Biến lưu trữ sản phẩm để không phải gọi API nhiều lần
  let globalProducts = [];

  /* ==========================================
     1. GỌI API SẢN PHẨM (CHO BEST SELLER & COMBO)
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
      console.error("Lỗi kết nối API Sản phẩm:", err);
      const bestSellerGrid = document.getElementById("home-best-sellers");
      if (bestSellerGrid) {
        bestSellerGrid.innerHTML = '<p style="width: 100%; text-align: center; color: red;">Không thể tải sản phẩm. Vui lòng kiểm tra Server!</p>';
      }
    });


  /* ==========================================
     HÀM RENDER BEST SELLER
  ========================================== */
  function renderBestSellers(products) {
    const homeGrid = document.getElementById("home-best-sellers");
    if (!homeGrid) return;

    homeGrid.innerHTML = ""; 
    const top4 = products.slice(0, 4); // Lấy 4 sản phẩm đầu tiên
    
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

    // Các mã SKU tạo nên combo này (Đã sửa lại cho khớp với Database)
    const comboSkus = ['SRM-ND-150', 'TONER-RDC-500', 'SERUM-RM-30', 'CREAM-ALOE-30'];
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
      // Ép kiểu Number để tránh lỗi NaN
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

    // Tính giá Combo sau khi giảm (Đã sửa công thức chia 100)
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

        // Xử lý nút thêm cả bộ vào giỏ
    document.getElementById("add-custom-routine").addEventListener("click", () => {
      if (typeof window.addToCart === "function") {
        // Tìm ID của sản phẩm Combo (SKU là COMBO-01)
        // Vì Backend đã trả về danh sách products, ta cần gọi thêm 1 lần nữa hoặc truyền ID trực tiếp.
        // Cách đơn giản nhất: Gọi API để lấy ID của combo (hoặc bạn có thể fix cứng ID nếu biết chắc).
        
        fetch('https://mocyen-web.onrender.com/api/products')
          .then(res => res.json())
          .then(allProducts => {
            const comboProduct = allProducts.find(p => p.sku === 'COMBO-01');
            if (comboProduct) {
              // Chỉ thêm 1 sản phẩm Combo vào giỏ
              window.addToCart(comboProduct.id);
              window.showToast(`Đã thêm Combo Chăm Da Cơ Bản vào giỏ hàng!`);
            } else {
              alert("Chưa có sản phẩm combo trong Database!");
            }
          });
      }
    });
  }


  /* ==========================================
     2. TỰ ĐỘNG LẤY BÀI VIẾT MỚI NHẤT (NHẬT KÝ MỘC YÊN)
  ========================================== */
  const homeJournal = document.getElementById("home-journal");
  if (homeJournal) {
    fetch('https://mocyen-web.onrender.com/api/posts')
      .then(res => res.json())
      .then(posts => {
        homeJournal.innerHTML = ""; 
        
        if (posts.length === 0) {
          homeJournal.innerHTML = '<p style="text-align: center; width: 100%; color: #7C877D;">Chưa có bài viết nào.</p>';
          return;
        }

        // Lấy 3 bài viết mới nhất
        const latestPosts = posts.slice(0, 3);

        latestPosts.forEach(post => {
          const card = document.createElement("article");
          card.className = "journal-card";
          
          card.innerHTML = `
            <a href="pages/blog-detail.html?id=${post.id}">
              <img src="images/blog/${post.image}" alt="${post.title}" loading="lazy">
            </a>
            <small>${post.category}</small>
            <h3><a href="pages/blog-detail.html?id=${post.id}" style="color: inherit; text-decoration: none;">${post.title}</a></h3>
            <a href="pages/blog-detail.html?id=${post.id}">Đọc bài viết →</a>
          `;
          homeJournal.appendChild(card);
        });
      })
      .catch(err => {
        console.error("Lỗi tải bài viết:", err);
        homeJournal.innerHTML = '<p style="color:red; text-align:center; width: 100%;">Không thể tải bài viết.</p>';
      });
  }


  /* ==========================================
     3. HIỆU ỨNG SCROLL REVEAL (Xuất hiện khi cuộn)
  ========================================== */
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
     4. STICKY HEADER
  ========================================== */
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }
    });
  }


  /* ==========================================
     5. FORM ĐĂNG KÝ NEWSLETTER
  ========================================== */
  const newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = this.querySelector('input[type="email"]').value;
      if (typeof window.showToast === 'function') {
        window.showToast('Cảm ơn bạn! Đã đăng ký nhận tin từ ' + email);
      } else {
        alert('Cảm ơn bạn! Đã đăng ký nhận tin từ ' + email);
      }
      this.reset();
    });
  }

});