/* =========================================================
   MOCYEN - POLICY PAGE SCRIPT
   - Chuyển tab theo hash (#giao-hang, #doi-tra, ...)
   - Đồng bộ URL khi click nav item
   - Hỗ trợ back/forward, paste URL, mở link từ footer
   - Fallback khi hash không hợp lệ
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".policy-nav-item");
  const tabPanels = document.querySelectorAll(".policy-tab");
  const contentCard = document.querySelector(".policy-content-card");
  const DEFAULT_TAB = "giao-hang";

  /* ---------------------------------------------
     Hàm chuyển tab
     - targetId: id của policy-tab cần hiện
     - scroll:   có cuộn về đầu content card không
     - Trả về true/false (tìm thấy tab hay không)
  --------------------------------------------- */
  function switchTab(targetId, { scroll = false } = {}) {
    tabPanels.forEach(tab => tab.classList.remove("active"));
    navItems.forEach(item => {
      item.classList.remove("active");
      item.removeAttribute("aria-selected");
    });

    const targetTab = document.getElementById(targetId);
    const targetNav = document.querySelector(
      `.policy-nav-item[data-target="${targetId}"]`
    );

    if (!targetTab || !targetNav) return false;

    targetTab.classList.add("active");
    targetNav.classList.add("active");
    targetNav.setAttribute("aria-selected", "true");

    if (scroll && contentCard) {
      // Dùng scrollIntoView + scroll-margin-top trong CSS để tránh header dính
      contentCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    return true;
  }

  /* ---------------------------------------------
     Kích hoạt tab theo hash hiện tại
     - Nếu hash không hợp lệ -> fallback DEFAULT_TAB
  --------------------------------------------- */
  function activateFromHash({ scroll = false } = {}) {
    const hash = window.location.hash.replace("#", "");
    if (hash && switchTab(hash, { scroll })) return true;

    // Hash rỗng hoặc không hợp lệ -> về tab mặc định
    switchTab(DEFAULT_TAB, { scroll });
    if (hash !== DEFAULT_TAB) {
      history.replaceState(null, "", `#${DEFAULT_TAB}`);
    }
    return false;
  }

  /* ---------------------------------------------
     Click nav item -> đổi tab + cập nhật URL
  --------------------------------------------- */
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const target = item.dataset.target;
      if (!target) return;

      // Cập nhật URL (không gây scroll tự động)
      history.pushState(null, "", `#${target}`);

      // Đổi tab + cuộn về đầu content
      switchTab(target, { scroll: true });
    });
  });

  /* ---------------------------------------------
     XỬ LÝ LẦN ĐẦU TẢI TRANG
     - Nếu URL có hash (VD: policy.html#dieu-khoan) -> mở đúng tab đó
     - Nếu không có hash -> tab mặc định (HTML đã set sẵn active)
     - Ép scroll về top để tránh trình duyệt tự nhảy vào anchor đang ẩn
  --------------------------------------------- */
  const initialHash = window.location.hash.replace("#", "");

  if (initialHash) {
    const ok = switchTab(initialHash, { scroll: false });
    if (!ok) {
      switchTab(DEFAULT_TAB);
      history.replaceState(null, "", `#${DEFAULT_TAB}`);
    }
    // Đảm bảo đầu trang (một số trình duyệt tự scroll đến anchor trước khi JS chạy)
    window.scrollTo(0, 0);
  } else {
    // Không có hash -> chuẩn hoá URL thành #giao-hang (dễ share link)
    history.replaceState(null, "", `#${DEFAULT_TAB}`);
  }

  /* ---------------------------------------------
     HASHCHANGE - xử lý:
     - User paste URL có #hash khi đang ở trang
     - Bấm Back/Forward trên trình duyệt
     - Click anchor <a href="#..."> nội bộ (không qua navItems)
  --------------------------------------------- */
  window.addEventListener("hashchange", () => {
    activateFromHash({ scroll: true });
  });
});