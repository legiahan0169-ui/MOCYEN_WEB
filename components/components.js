/* =========================================================
   MOCYEN · components.js
   - Load header.html & footer.html vào mọi trang
   - Tự xử lý đường dẫn __BASE__ theo vị trí trang hiện tại
   - Các hành vi dùng chung: menu mobile, cart, toast,
     newsletter, wishlist, quick-add, add-routine
   - [NEW] Floating Cart: nút giỏ hàng nổi LUÔN HIỂN THỊ
   ========================================================= */
(function () {
  'use strict';

    /* ==========================================
     HIỆU ỨNG CHUYỂN TRANG (PAGE TRANSITION)
  ========================================== */
  var pageTransition = document.createElement('div');
  pageTransition.id = 'page-transition';
  
  if (document.body) {
      document.body.appendChild(pageTransition);
  } else {
      document.addEventListener('DOMContentLoaded', function() {
          document.body.appendChild(pageTransition);
      });
  }

  window.addEventListener('pageshow', function (event) {
      pageTransition.classList.remove('is-active');
  });

  document.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (!link) return;

      var href = link.getAttribute('href');
      
      if (!href || 
          href.startsWith('#') || 
          href.startsWith('javascript') || 
          link.getAttribute('target') === '_blank' ||
          href.startsWith('http') || 
          href.startsWith('mailto') || 
          href.startsWith('tel')) {
          return;
      }

      e.preventDefault();
      pageTransition.classList.add('is-active');

      setTimeout(function () {
          window.location.href = href;
      }, 400);
  });

  var basePath = window.location.pathname.indexOf('/pages/') !== -1 ? '..' : '.';

  /* ---------- Load component ---------- */
  async function loadComponent(mountId, fileName) {
    var mount = document.getElementById(mountId);
    if (!mount) return;

    try {
      var res = await fetch(basePath + '/components/' + fileName, { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status + ' ' + res.statusText);

      var html = await res.text();
      html = html.replace(/__BASE__/g, basePath);
      mount.innerHTML = html;
      mount.dispatchEvent(new CustomEvent('component:loaded', { bubbles: true, detail: { file: fileName } }));
    } catch (err) {
      console.error('[MOCYEN] Không tải được ' + fileName + ':', err);
      mount.innerHTML = '<!-- Không tải được ' + fileName + ' (chạy qua local server) -->';
    }
  }

  /* ---------- Cart (localStorage) ---------- */
  function getCartKey() {
    const userJson = localStorage.getItem("mocyen_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        return "mocyen_cart_user_" + user.id;
      } catch (e) {
        return "mocyen_cart_guest";
      }
    }
    return "mocyen_cart_guest";
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
  function toast(msg) {
    var el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
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
    toast('Đã thêm sản phẩm vào giỏ hàng!');
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

    document.querySelectorAll('.nav-dropdown-toggle').forEach(function (link) {
      link.addEventListener('click', function (e) {
        if (window.matchMedia('(max-width: 900px)').matches) {
          e.preventDefault();
          link.parentElement.classList.toggle('is-open');
        }
      });
    });

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
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.quick-add[data-product-id]');
      if (!btn) return;
      e.preventDefault();
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
     [UPDATED] FLOATING CART — Luôn hiển thị 100% thời gian
  ======================================================= */
  function initFloatingCart() {
    if (window.location.pathname.indexOf('admin') !== -1) return;
    if (document.querySelector('.floating-cart')) return;

    /* --- INJECT CSS --- */
    if (!document.getElementById('mocyen-floating-cart-style')) {
      var style = document.createElement('style');
      style.id = 'mocyen-floating-cart-style';
      style.textContent = `
        .floating-cart {
          position: fixed;
          left: 24px;
          bottom: 24px;
          z-index: 99999;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #264F40;
          color: #fff;
          border-radius: 50%;
          box-shadow: 0 8px 24px rgba(38, 79, 64, 0.28),
                      0 2px 6px rgba(38, 79, 64, 0.15);
          transition: background 0.2s ease,
                      box-shadow 0.2s ease,
                      transform 0.2s ease;
          text-decoration: none;
          /* Bỏ opacity/transform ẩn, luôn hiện */
        }
        .floating-cart:hover {
          background: #183C31;
          box-shadow: 0 12px 30px rgba(38, 79, 64, 0.35);
          transform: translateY(-3px) scale(1.05);
        }
        .floating-cart:focus-visible {
          outline: 2px solid #264F40;
          outline-offset: 3px;
        }
        .floating-cart i {
          font-size: 20px;
          transition: transform 0.2s ease;
        }
        .floating-cart:hover i {
          transform: rotate(-8deg) scale(1.05);
        }
        .floating-cart-count {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          display: none;
          align-items: center;
          justify-content: center;
          background: #C4425B;
          color: #fff;
          border-radius: 100px;
          font-family: "Montserrat", sans-serif;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          border: 2px solid #F7F3E9;
          animation: mocyenCartBump 0.4s ease;
        }
        @keyframes mocyenCartBump {
          0%   { transform: scale(0.6); }
          60%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @media (max-width: 768px) {
          .floating-cart {
            width: 50px;
            height: 50px;
            left: 16px;
            bottom: 20px;
          }
          .floating-cart i { font-size: 18px; }
          .floating-cart-count {
            min-width: 20px;
            height: 20px;
            font-size: 10px;
          }
        }
      `;
      document.head.appendChild(style);
    }

    /* --- INJECT HTML NÚT (Không có class is-visible, CSS đã luôn hiện) --- */
    var btn = document.createElement('a');
    btn.href = basePath + '/pages/cart.html';
    btn.className = 'floating-cart';
    btn.setAttribute('aria-label', 'Đi đến giỏ hàng');
    btn.innerHTML =
      '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i>' +
      '<span class="floating-cart-count" aria-live="polite"></span>';
    document.body.appendChild(btn);

    var countEl = btn.querySelector('.floating-cart-count');

    /* --- UPDATE BADGE --- */
    function updateFloatCount() {
      var total = getCart().reduce(function (s, i) { return s + (i.qty || 1); }, 0);
      countEl.textContent = total > 99 ? '99+' : total;
      countEl.style.display = total > 0 ? 'flex' : 'none';
    }
    updateFloatCount();
    window.addEventListener('cart:updated', updateFloatCount);
    window.addEventListener('pageshow', updateFloatCount);
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
    initFloatingCart();   // Luôn chạy

        // =======================================================
    // CẬP NHẬT TÊN USER VÀ NÚT ADMIN TRÊN HEADER
    // =======================================================
    const userJson = localStorage.getItem("mocyen_user");
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        const accountLink = document.querySelector(".account-link");
        
        // 1. Cập nhật Avatar chữ cái
        if (accountLink && user.name) {
          const nameParts = user.name.trim().split(" ");
          const mainName = nameParts[nameParts.length - 1];
          const avatarLetter = mainName.charAt(0).toUpperCase();

          accountLink.innerHTML = `
            <span style="font-size: 12px; font-weight: 600; background: #264F40; color: white; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%;">
              ${avatarLetter}
            </span>
          `;
          accountLink.title = `Xin chào, ${user.name}`;
        }

        // 2. [MỚI] Tự động thêm nút "Quản trị viên" nếu là Admin
        if (user.role === "admin") {
          const headerActions = document.querySelector(".header-actions");
          if (headerActions) {
            // Tạo nút Admin (Dùng icon bánh răng hoặc biểu đồ)
            const adminLink = document.createElement("a");
            adminLink.href = basePath + "/pages/admin.html";
            adminLink.title = "Trang Quản Trị Viên";
            adminLink.innerHTML = '<i class="fa-solid fa-gear"></i>';
            adminLink.style.cssText = "display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; background: #264F40; color: white; margin-right: 15px; transition: 0.2s;";
            
            // Hiệu ứng hover
            adminLink.onmouseover = () => adminLink.style.background = "#183C31";
            adminLink.onmouseout = () => adminLink.style.background = "#264F40";
            
            // Chèn vào đầu cụm action (bên trái icon Tìm kiếm)
            headerActions.insertBefore(adminLink, headerActions.firstChild);
          }
        }

      } catch (e) {
        console.error("Lỗi đọc thông tin user", e);
      }
    }
  });

  /* Đồng bộ cart khi mở nhiều tab */
  window.addEventListener('storage', function (e) {
    if (e.key && e.key.indexOf('mocyen_cart_') === 0) updateCartCount();
  });

})();
        // Tự động load Chat Widget
    if (window.location.pathname.indexOf('admin') === -1) {
      const chatScript = document.createElement('script');
      chatScript.src = (window.location.pathname.indexOf('/pages/') !== -1 ? '..' : '.') + '/components/chat-widget.js';
      document.body.appendChild(chatScript);
    }