/* =========================================================
   MOCYEN - CONTACT.JS
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault(); // Chặn load lại trang khi ấn gửi

      // Lấy nút submit để đổi trạng thái
      const btn = form.querySelector("button[type='submit']");
      const originalText = btn.textContent;

      // Đổi trạng thái nút thành Đang gửi...
      btn.textContent = "Đang gửi...";
      btn.disabled = true;

      // Giả lập thời gian gửi (1.5 giây)
      setTimeout(() => {
        // Hiển thị thông báo Toast (dùng hàm từ components.js)
        if (typeof window.showToast === "function") {
          window.showToast("Cảm ơn bạn! Mộc Yên đã nhận được tin nhắn.");
        } else {
          alert("Cảm ơn bạn! Mộc Yên đã nhận được tin nhắn.");
        }

        // Reset lại form và nút
        form.reset();
        btn.textContent = originalText;
        btn.disabled = false;
      }, 1500);
    });
  }
});