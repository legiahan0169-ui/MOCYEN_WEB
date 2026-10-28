document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("id");

  if (!postId) {
    document.getElementById("post-title").textContent = "Không tìm thấy bài viết";
    document.getElementById("post-body").textContent = "Vui lòng kiểm tra lại đường dẫn.";
    return;
  }

  fetch(`http://localhost:3000/api/posts/${postId}`)
    .then(res => {
      if (!res.ok) throw new Error("Lỗi API");
      return res.json();
    })
    .then(post => {
      // 1. CẬP NHẬT SEO ON-PAGE
      document.title = `${post.title} | Mộc Yên`;
      
      // 2. ĐỔ DỮ LIỆU VÀO GIAO DIỆN
      document.getElementById("post-category").textContent = post.category;
      document.getElementById("post-title").textContent = post.title;
      
      // Format ngày tháng
      const date = new Date(post.created_at);
      document.getElementById("post-date").textContent = date.toLocaleDateString('vi-VN');
      document.getElementById("post-author").textContent = post.author;

      const imgEl = document.getElementById("post-image");
      imgEl.src = `../images/blog/${post.image}`;
      imgEl.alt = post.title; // Tốt cho SEO

      // Render nội dung bài viết
      document.getElementById("post-body").innerHTML = post.content;
    })
    .catch(err => {
      console.error(err);
      document.getElementById("post-title").textContent = "Lỗi tải bài viết";
      document.getElementById("post-body").textContent = "Không thể kết nối đến Server. Hãy bật Node.js!";
    });
});