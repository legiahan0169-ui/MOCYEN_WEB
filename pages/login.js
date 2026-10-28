/* =========================================================
   MOCYEN — LOGIN/REGISTER.JS
   Xử lý chuyển tab, hiện mật khẩu và giả lập đăng nhập
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Chuyển đổi Tab Đăng nhập / Đăng ký
  const tabs = document.querySelectorAll(".auth-tab");
  const forms = document.querySelectorAll(".auth-form");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      forms.forEach(f => f.classList.remove("active"));

      tab.classList.add("active");
      const targetId = tab.dataset.target;
      document.getElementById(targetId).classList.add("active");
    });
  });

  // 2. Ẩn/Hiện mật khẩu
  const togglePasswords = document.querySelectorAll(".toggle-password");
  togglePasswords.forEach(icon => {
    icon.addEventListener("click", () => {
      const input = icon.previousElementSibling;
      if (input.type === "password") {
        input.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        input.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    });
  });

  const showToast = (msg) => {
    if (typeof window.showToast === "function") window.showToast(msg);
    else alert(msg);
  };

  // 3. Xử lý Đăng nhập (Đã cập nhật nhận diện Admin)
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      const btn = loginForm.querySelector("button[type='submit']");

      try {
        btn.textContent = "Đang xử lý...";
        btn.disabled = true;

              // Lấy tham số redirect trên URL (nếu có)
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get("redirect");

      setTimeout(() => {
        if (data.user.role === "admin") {
          window.location.href = "admin.html";
        } else if (redirectUrl) {
          // Quay lại trang khách đang dở (ví dụ checkout.html)
          window.location.href = redirectUrl;
        } else {
          window.location.href = "../index.html";
        }
      }, 1000);

        // KIỂM TRA TÀI KHOẢN ADMIN
        const isAdmin = email === "admin@mocyen.com";
        
        const mockUser = { 
          id: isAdmin ? 99 : 1, 
          name: isAdmin ? "Quản trị viên" : "Khách Hàng Mộc Yên", 
          email: email,
          role: isAdmin ? "admin" : "customer"
        };
        localStorage.setItem("mocyen_user", JSON.stringify(mockUser));

        showToast(isAdmin ? "Đăng nhập Admin thành công!" : "Đăng nhập thành công!");
        
        setTimeout(() => {
          if (isAdmin) {
            window.location.href = "admin.html"; // Bay vào Dashboard
          } else {
            window.location.href = "../index.html"; // Về trang chủ
          }
        }, 1000);

      } catch (error) {
        showToast(error.message);
        btn.textContent = "Đăng nhập";
        btn.disabled = false;
      }
    });
  }

  // Xử lý Đăng ký
  const registerForm = document.getElementById("register-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      // Lấy dữ liệu (đảm bảo lấy đúng id="reg-name")
      const name = document.getElementById("reg-name").value;
      const email = document.getElementById("reg-email").value;
      const password = document.getElementById("reg-password").value;
      const btn = registerForm.querySelector("button[type='submit']");

      try {
        btn.textContent = "Đang xử lý...";
        btn.disabled = true;

        // Gửi API thật (Đảm bảo có biến name trong body)
        const response = await fetch("https://mocyen-web.onrender.com/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }) 
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Lỗi đăng ký");

        showToast("Đăng ký thành công! Vui lòng đăng nhập.");
        
        // Chuyển sang tab đăng nhập và điền sẵn email
        document.querySelector('.auth-tab[data-target="login-form"]').click();
        document.getElementById("login-email").value = email;
        document.getElementById("login-password").value = "";

        btn.textContent = "Đăng ký tài khoản";
        btn.disabled = false;
        registerForm.reset();

      } catch (error) {
        showToast(error.message);
        btn.textContent = "Đăng ký tài khoản";
        btn.disabled = false;
      }
    });
  }
});