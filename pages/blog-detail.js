document.addEventListener("DOMContentLoaded", () => {
  // 1. Tự động nhận diện môi trường (Localhost vs Vercel)
  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") 
    ? "http://localhost:3000" 
    : "https://mocyen-web.onrender.com";

  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");

  const skeleton = document.getElementById("article-skeleton");
  const content = document.getElementById("article-content");
  const errorUI = document.getElementById("article-error");

  // Hàm chuyển sang trạng thái Lỗi
  const showError = () => {
    skeleton.style.display = "none";
    content.style.display = "none";
    errorUI.style.display = "block";
    document.title = "Không tìm thấy bài viết | Mộc Yên";
  };

  if (!postId) {
    showError();
    return;
  }

  fetch(`${API_BASE}/api/posts/${postId}`)
    .then(res => {
      if (!res.ok) throw new Error("Lỗi API");
      return res.json();
    })
    .then(post => {
      // 1. CẬP NHẬT SEO ON-PAGE
      document.title = `${post.title} | Mộc Yên`;
      
      // Cập nhật thẻ meta description (Tốt cho SEO chia sẻ Facebook/Google)
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        // Lấy 150 ký tự đầu của nội dung, xóa thẻ HTML để làm mô tả
        const rawText = post.content.replace(/<[^>]+>/g, '').substring(0, 150) + "...";
        metaDesc.setAttribute("content", rawText);
      }
      
      // 2. ĐỔ DỮ LIỆU VÀO GIAO DIỆN
      document.getElementById("post-category").textContent = post.category || "Bài viết";
      document.getElementById("post-title").textContent = post.title || "Không có tiêu đề";
      
      // Format ngày tháng (DD/MM/YYYY)
      const dateEl = document.getElementById("post-date");
      if (post.created_at) {
        const date = new Date(post.created_at);
        dateEl.textContent = date.toLocaleDateString('vi-VN', { 
          day: '2-digit', month: '2-digit', year: 'numeric' 
        });
      } else {
        dateEl.textContent = "Gần đây";
      }

      document.getElementById("post-author").textContent = post.author || "Mộc Yên";

      // Cập nhật ảnh (Có cơ chế fallback nếu link ảnh chết)
      const imgEl = document.getElementById("post-image");
      if (post.image) {
        imgEl.src = `../images/blog/${post.image}`;
      } else {
        imgEl.src = `../images/banner/hero.png`;
      }
      imgEl.alt = post.title; // Tốt cho SEO

      // Render nội dung bài viết
      document.getElementById("post-body").innerHTML = post.content || "<p>Nội dung đang cập nhật...</p>";

      // 3. HIỂN THỊ BÀI VIẾT & ẨN SKELETON
      skeleton.style.display = "none";
      content.style.display = "block";
    })
    .catch(err => {
      console.error("Lỗi tải bài viết:", err);
      showError();
    });
});