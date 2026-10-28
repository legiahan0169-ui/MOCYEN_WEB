/* =========================================================
   MOCYEN · components.js
   - Load header.html & footer.html vào mọi trang
   - Tự xử lý đường dẫn __BASE__ theo vị trí trang hiện tại
   - Các hành vi dùng chung: menu mobile, cart, toast,
     newsletter, wishlist, quick-add, add-routine
   - [NEW] Floating Cart: nút giỏ hàng nổi khi scroll
   ========================================================= */
(function () {
  'use strict';

    /* ==========================================
     HIỆU ỨNG CHUYỂN TRANG (PAGE TRANSITION)
  ========================================== */
  // 1. Tạo lớp phủ (overlay) và gắn vào body
  var pageTransition = document.createElement('div');
  pageTransition.id = 'page-transition';
  
  // Đảm bảo body đã tồn tại mới chèn (vì components.js nằm ở cuối body)
  if (document.body) {
      document.body.appendChild(pageTransition);
  } else {
      document.addEventListener('DOMContentLoaded', function() {
          document.body.appendChild(pageTransition);
      });
  }

  // 2. Hiệu ứng Fade In khi trang vừa tải xong
  window.addEventListener('pageshow', function (event) {
      // pageshow xử lý cả trường hợp bấm nút Back/Forward của trình duyệt
      pageTransition.classList.remove('is-active');
  });

  // 3. Hiệu ứng Fade Out khi click chuyển trang
  document.addEventListener('click', function (e) {
      // Tìm thẻ <a> gần nhất được click
      var link = e.target.closest('a');
      if (!link) return;

      var href = link.getAttribute('href');
      
      // Bỏ qua các link không phải chuyển trang (link neo #, mở tab mới, tel, mailto...)
      if (!href || 
          href.startsWith('#') || 
          href.startsWith('javascript') || 
          link.getAttribute('target') === '_blank' ||
          href.startsWith('http') || 
          href.startsWith('mailto') || 
          href.startsWith('tel')) {
          return;
      }

      // Nếu là link nội bộ (chuyển trang) -> Kích hoạt hiệu ứng mờ dần
      e.preventDefault();
      
      pageTransition.classList.add('is-active');

      // Đợi 400ms (khớp với thời gian transition trong CSS) rồi mới chuyển trang
      setTimeout(function () {
          window.location.href = href;
      }, 400);
  });

  /* Xác định base path: trang trong /pages/ → '..', trang root → '.' */
  var basePath = window.location.pathname.indexOf('/pages/') !== -1 ? '..' : '.';

  /* ---------- Load component ---------- */
  async function loadComponent(mountId, fileName) {
    var mount = document.getElementById(mountId);
    if (!mount) return;

    try {
      var res = await fetch(basePath + '/components/' + fileName, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);

      var html = await res.text();
      /* Thay token __BASE__ bằng đường dẫn tương đối đúng */
      html = html.replace(/__BASE__/g, basePath);
      mount.innerHTML = html;
      mount.dispatchEvent(new CustomEvent('component:loaded', { bubbles: true, detail: { file: fileName } }));
    } catch (err) {
      console.error('[MOCYEN] Không tải được ' + fileName + ':', err);
      mount.innerHTML = '<!-- Không tải được ' + fileName + ' (chạy qua local server) -->';
    }
  }

  /* ---------- Cart (localStorage) ---------- */
  // Hàm lấy tên key giỏ hàng riêng cho từng user
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

  function getCart() {
    try { return JSON.parse(localStorage.getItem(getCartKey()) || '[]'); }
    catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));
    updateCartCount();
    window.dispatchEvent(new CustomEvent('cart:updated'));
  }

  function updateCartCount() {
    var total = getCart().reduce(function (s, i) { return s + (i.qty || 1); }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) { el.textContent = total; });
  }

  /* ---------- Toast ---------- */
  /* ---------- Toast (Thông báo) ---------- */
  function toast(msg) {
    var el = document.querySelector('.toast');
    // Nếu chưa có thẻ div toast thì tạo mới
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    
    // Hiển thị lên
    el.classList.add('is-visible');
    
    // Tự động ẩn sau 2.5s
    clearTimeout(el._t);
    el._t = setTimeout(function () { 
        el.classList.remove('is-visible'); 
    }, 2500);
  }

  /* ---------- Thêm vào giỏ hàng ---------- */
  function addToCart(id, qty) {
    qty = qty || 1;
    var cart = getCart();
    var found = cart.find(function (i) { return i.id === String(id); });
    if (found) found.qty = (found.qty || 1) + qty;
    else cart.push({ id: String(id), qty: qty });
    saveCart(cart);
    toast('Đã thêm sản phẩm vào giỏ hàng!'); // <-- GỌI HIỂN THỊ THÔNG BÁO Ở ĐÂY
  }

  /* ---------- Header behaviors ---------- */
  function initHeader() {
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.querySelector('.main-nav');

    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', nav.classList.contains('is-open'));
      });
    }

    /* Mobile: bấm "Sản phẩm" mở dropdown thay vì điều hướng */
    document.querySelectorAll('.nav-dropdown-toggle').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (window.matchMedia('(max-width: 900px)').matches) {
          e.preventDefault();
          link.parentElement.classList.toggle('is-open');
        }
      });
    });

    /* Nút tìm kiếm */
    var searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
      searchBtn.addEventListener('click', function () {
        var q = prompt('Tìm sản phẩm...');
        if (q) window.location.href = basePath + '/pages/shop.html?q=' + encodeURIComponent(q);
      });
    }

    updateCartCount();
  }

  /* ---------- Page behaviors ---------- */
  function initWishlist() {
    document.querySelectorAll('.wish').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        btn.classList.toggle('is-active');
        btn.textContent = btn.classList.contains('is-active') ? '♥' : '♡';
        toast(btn.classList.contains('is-active') ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích');
      });
    });
  }

  function initQuickAdd() {
    // Sử dụng Event Delegation: Gắn sự kiện vào document thay vì từng nút
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.quick-add[data-product-id]');
      
      // Nếu click không trúng nút + thì bỏ qua
      if (!btn) return;
      
      e.preventDefault();
      
      // Lấy ID và thêm vào giỏ
      addToCart(btn.dataset.productId);
      toast('Đã thêm vào giỏ hàng');
    });
  }

  function initAddRoutine() {
    var btn = document.getElementById('add-routine');
    if (!btn) return;
    btn.addEventListener('click', function () {
      ['routine-cleanser', 'routine-toner', 'routine-serum'].forEach(function (id) { addToCart(id); });
      toast('Đã thêm cả bộ vào giỏ hàng');
    });
  }

  function initNewsletter() {
    var form = document.getElementById('newsletter-form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.email.value.trim();
      if (!email) return;
      toast('Cảm ơn bạn! Đã đăng ký ' + email);
      form.reset();
    });
  }

  /* =======================================================
     [NEW] FLOATING CART — Nút giỏ hàng nổi khi scroll
     - Tự inject vào mọi trang (trừ trang admin)
     - Hiện khi user scroll xuống > 300px
     - Badge đỏ cập nhật real-time khi thêm/xóa sản phẩm
  ======================================================= */
  function initFloatingCart() {
    // Không hiển thị trên trang admin
    if (window.location.pathname.indexOf('admin') !== -1) return;

    // Tạo nút <a> trỏ thẳng tới cart.html
    var btn = document.createElement('a');
    btn.href = basePath + '/pages/cart.html';
    btn.className = 'floating-cart';
    btn.setAttribute('aria-label', 'Đi đến giỏ hàng');
    btn.innerHTML =
      '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>' +
      '<span class="floating-cart-count" aria-live="polite"></span>';
    document.body.appendChild(btn);

    var countEl = btn.querySelector('.floating-cart-count');

    /* Cập nhật số lượng hiển thị trên badge */
    function updateFloatCount() {
      var total = getCart().reduce(function (s, i) { return s + (i.qty || 1); }, 0);
      countEl.textContent = total > 99 ? '99+' : total;
      countEl.style.display = total > 0 ? 'flex' : 'none';
    }

    updateFloatCount();

    // Đồng bộ khi cart thay đổi (thêm/xóa/sửa từ bất kỳ nguồn nào)
    window.addEventListener('cart:updated', updateFloatCount);

    // Đồng bộ khi user quay lại tab từ trang khác
    window.addEventListener('pageshow', updateFloatCount);

    /* Hiện/ẩn nút theo scroll — tránh che hero banner lúc mới vào trang */
    function onScroll() {
      if (window.scrollY > 300) {
        btn.classList.add('is-visible');
      } else {
        btn.classList.remove('is-visible');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // check ngay lần đầu (tránh trường hợp load với hash scroll)
  }

  window.addToCart = addToCart;
  window.showToast = toast;

   /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', async function () {
    await Promise.all([
      loadComponent('site-header', 'header.html'),
      loadComponent('site-footer', 'footer.html')
    ]);

    initHeader();
    initWishlist();
    initQuickAdd();
    initAddRoutine();
    initNewsletter();
    initFloatingCart();   // ← [NEW] Nút giỏ hàng nổi

    // =======================================================
    // CẬP NHẬT TÊN USER TRÊN HEADER SAU KHI ĐĂNG NHẬP
    // =======================================================
    const userJson = localStorage.getItem("mocyen_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const accountLink = document.querySelector(".account-link");
        
        if (accountLink && user.name) {
          // Lấy tên (VD: "Lê Gia Hân" -> lấy chữ "Hân")
          const nameParts = user.name.trim().split(" ");
          const mainName = nameParts[nameParts.length - 1];
          // Lấy chữ cái đầu tiên của tên chính (VD: "H")
          const avatarLetter = mainName.charAt(0).toUpperCase();

          accountLink.innerHTML = `
            <span style="font-size: 12px; font-weight: 600; background: #264F40; color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
              ${avatarLetter}
            </span>
          `;
          accountLink.title = `Xin chào, ${user.name}`;
        }
      } catch (e) {
        console.error("Lỗi đọc thông tin user", e);
      }
    }
  });

  /* Đồng bộ cart khi mở nhiều tab */
  window.addEventListener('storage', function (e) {
    if (e.key === CART_KEY) updateCartCount();
  });

})();
        // Tự động load Chat Widget
    if (window.location.pathname.indexOf('admin') === -1) {
      const chatScript = document.createElement('script');
      chatScript.src = (window.location.pathname.indexOf('/pages/') !== -1 ? '..' : '.') + '/components/chat-widget.js';
      document.body.appendChild(chatScript);
    }