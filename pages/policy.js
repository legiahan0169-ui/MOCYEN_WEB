document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.querySelectorAll(".policy-nav-item");
  const tabPanels = document.querySelectorAll(".policy-tab");

  // Hàm chuyển tab
  function switchTab(targetId) {
    // 1. Ẩn tất cả nội dung, bỏ active menu
    tabPanels.forEach(tab => tab.classList.remove("active"));
    navItems.forEach(item => item.classList.remove("active"));

    // 2. Hiện nội dung được chọn và bôi đậm menu
    const targetTab = document.getElementById(targetId);
    const targetNav = document.querySelector(`.policy-nav-item[data-target="${targetId}"]`);
    
    if (targetTab && targetNav) {
      targetTab.classList.add("active");
      targetNav.classList.add("active");
    }
  }

  // Lắng nghe sự kiện click
  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const target = item.dataset.target;
      
      // Đổi hash URL
      window.history.pushState(null, null, `#${target}`);
      
      // Chuyển tab
      switchTab(target);
      
      // Cuộn lên đầu
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Xử lý khi load trang có sẵn hash (VD: policy.html#doi-tra)
  const hash = window.location.hash.replace("#", "");
  if (hash) {
    switchTab(hash);
  }
  
  // Xử lý nút Back/Forward
  window.addEventListener("popstate", () => {
    const currentHash = window.location.hash.replace("#", "");
    if (currentHash) switchTab(currentHash);
    else switchTab("giao-hang");
  });
});