/* =========================================================
   MOCYEN - PROMOTIONS.JS
   Chức năng: Cập nhật trạng thái, Cuộn menu, và Copy mã
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  
  /* ==========================================
     1. TỰ ĐỘNG CẬP NHẬT TRẠNG THÁI CHƯƠNG TRÌNH
     (Dựa vào data-start và data-end trong HTML)
  ========================================== */
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Đưa thời gian về 00:00:00 để so sánh chính xác theo ngày

  const badges = document.querySelectorAll(".status-badge");

  badges.forEach(badge => {
    // Lấy ngày bắt đầu và kết thúc từ thuộc tính data- của thẻ HTML
    const startDate = new Date(badge.dataset.start);
    const endDate = new Date(badge.dataset.end);
    endDate.setHours(23, 59, 59, 999); // Tính đến hết ngày kết thúc

    if (today < startDate) {
      badge.textContent = "Sắp diễn ra";
      badge.classList.add("status-upcoming");
    } else if (today > endDate) {
      badge.textContent = "Đã kết thúc";
      badge.classList.add("status-ended");
    } else {
      badge.textContent = "Đang diễn ra";
      badge.classList.add("status-active");
    }
  });

  /* ==========================================
     2. XỬ LÝ MENU ĐIỀU HƯỚNG NHANH (QUICK NAV)
     (Cuộn trang và đổi màu nút khi cuộn tới)
  ========================================== */
  const navChips = document.querySelectorAll(".nav-chip");
  const sections = document.querySelectorAll("section[id]");

  window.addEventListener("scroll", () => {
    let current = "";
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      // Nếu cuộn qua 1/3 chiều cao của section
      if (window.scrollY >= sectionTop - 150) {
        current = section.getAttribute("id");
      }
    });

    navChips.forEach(chip => {
      chip.classList.remove("active");
      if (chip.getAttribute("href") === `#${current}`) {
        chip.classList.add("active");
      }
    });
  });

  // Cuộn mượt cho các liên kết neo (anchor links)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        const headerOffset = 80; // Trừ đi khoảng 80px của Header để không bị che
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.scrollY - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        });
      }
    });
  });

  /* ==========================================
     3. XỬ LÝ COPY MÃ GIẢM GIÁ (Đã Fix Lỗi)
  ========================================== */
  const copyButtons = document.querySelectorAll(".btn-copy-coupon");
  
  copyButtons.forEach(btn => {
    btn.addEventListener("click", async (e) => {
      // Dùng e.currentTarget để luôn lấy đúng thẻ <button> dù click vào icon hay chữ
      const button = e.currentTarget;
      const code = button.dataset.code;
      
      if (!code) return;

      // Hàm copy: Dùng Clipboard API (HTTPS/localhost) hoặc Fallback (HTTP)
      const copyToClipboard = async (text) => {
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
          } else {
            // Fallback cho môi trường không bảo mật (http://)
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "absolute";
            textArea.style.left = "-999999px";
            document.body.prepend(textArea);
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
            return true;
          }
        } catch (error) {
          console.error("Lỗi copy:", error);
          return false;
        }
      };

      // Thực hiện copy
      const isCopied = await copyToClipboard(code);

      if (isCopied) {
        // Đổi giao diện nút
        const originalHTML = button.innerHTML;
        button.innerHTML = `<i class="fa-solid fa-check"></i> Đã chép ✓`;
        button.classList.add("copied");
        
        // Hiển thị Toast (Gọi hàm từ components.js)
        if (typeof window.showToast === "function") {
          window.showToast(`Đã sao chép mã: ${code}`);
        }

        // Trả lại trạng thái ban đầu sau 2 giây
        setTimeout(() => {
          button.innerHTML = originalHTML;
          button.classList.remove("copied");
        }, 2000);
      } else {
        alert("Trình duyệt của bạn không hỗ trợ sao chép tự động. Vui lòng bôi đen mã và copy thủ công.");
      }
    });
  });

});