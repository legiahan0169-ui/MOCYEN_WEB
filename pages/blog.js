document.addEventListener("DOMContentLoaded", () => {
  const blogList = document.getElementById("blog-list");
  if (!blogList) return;

  fetch('http://localhost:3000/api/posts')
    .then(res => res.json())
    .then(posts => {
      if (posts.length === 0) {
        blogList.innerHTML = '<p style="text-align: center; width: 100%; color: #7C877D;">Chưa có bài viết nào.</p>';
        return;
      }

      blogList.innerHTML = "";
      posts.forEach(post => {
        // Cắt ngắn mô tả nếu quá dài
        const shortExcerpt = post.excerpt.length > 110 ? post.excerpt.substring(0, 110) + "..." : post.excerpt;
        
        const card = document.createElement("article");
        card.className = "blog-card";
        card.innerHTML = `
          <a href="blog-detail.html?id=${post.id}" aria-label="Đọc bài viết ${post.title}">
            <img src="../images/blog/${post.image}" alt="${post.title}" loading="lazy">
          </a>
          <div class="blog-info">
            <span>${post.category}</span>
            <h2><a href="blog-detail.html?id=${post.id}" style="color: #243A30; text-decoration: none;">${post.title}</a></h2>
            <p>${shortExcerpt}</p>
            <a href="blog-detail.html?id=${post.id}" class="read-more">Đọc tiếp <i class="fa-solid fa-arrow-right"></i></a>
          </div>
        `;
        blogList.appendChild(card);
      });
    })
    .catch(err => {
      console.error(err);
      blogList.innerHTML = '<p style="color:red; width:100%; text-align:center;">Lỗi kết nối Backend. Vui lòng bật Node.js!</p>';
    });
});