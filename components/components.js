/* =========================================================
   MOCYEN · components.js
   - Load header.html & footer.html vào mọi trang
   - Tự xử lý đường dẫn __BASE__ theo vị trí trang hiện tại
   - Các hành vi dùng chung: menu mobile, cart, toast,
     newsletter, wishlist, quick-add, add-routine
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
  var CART_KEY = 'mocyen_cart';

  function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }
    catch (e) { return []; }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
    window.dispatchEvent(new CustomEvent('cart:updated'));
  }

  function updateCartCount() {
    var total = getCart().reduce(function (s, i) { return s + (i.qty || 1); }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) { el.textContent = total; });
  }

  function addToCart(id, qty) {
    qty = qty || 1;
    var cart = getCart();
    var found = cart.find(function (i) { return i.id === String(id); });
    if (found) found.qty = (found.qty || 1) + qty;
    else cart.push({ id: String(id), qty: qty });
    saveCart(cart);
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

    // =======================================================
    // CẬP NHẬT TÊN USER TRÊN HEADER SAU KHI ĐĂNG NHẬP
    // =======================================================
    const userJson = localStorage.getItem("mocyen_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const accountLink = document.querySelector(".account-link");
        
        if (accountLink) {
          // Đổi icon user thành chữ cái đầu của tên
          accountLink.innerHTML = `<span style="font-size: 12px; font-weight: bold; background: #264F40; color: white; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">${user.name.charAt(0).toUpperCase()}</span>`;
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