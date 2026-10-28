document.addEventListener("DOMContentLoaded", () => {
  const blogList = document.getElementById("blog-list");
  const filterContainer = document.getElementById("blog-filters");
  if (!blogList || !filterContainer) return;

  // Tự động nhận diện môi trường (Localhost vs Vercel)
  const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") 
    ? "http://localhost:3000" 
    : "https://mocyen-web.onrender.com";

  let allPosts = []; // Biến lưu trữ toàn bộ bài viết để lọc

  // Hàm format ngày tháng (VD: 2026-10-28 -> 28/10/2026)
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date)) return "";
    return date.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Hàm render HTML cho từng bài viết
  const createBlogCard = (post) => {
    const shortExcerpt = post.excerpt && post.excerpt.length > 110 
      ? post.excerpt.substring(0, 110) + "..." 
      : (post.excerpt || "Đang cập nhật mô tả...");
      
    const imageUrl = post.image ? `../images/blog/${post.image}` : '../images/banner/hero.png';
    const postDate = post.created_at ? formatDate(post.created_at) : "";

    const card = document.createElement("article");
    card.className = "blog-card";
    card.innerHTML = `
      <a href="blog-detail.html?id=${post.id}" class="img-wrap" aria-label="Đọc bài viết ${post.title}">
        <img src="${imageUrl}" alt="${post.title}" loading="lazy" onerror="this.src='../images/banner/hero.png'">
      </a>
      <div class="blog-info">
        <div class="blog-meta">
          <span class="blog-category">${post.category || "Chung"}</span>
          ${postDate ? `<span class="blog-date"><i class="fa-regular fa-calendar"></i> ${postDate}</span>` : ""}
        </div>
        <h2><a href="blog-detail.html?id=${post.id}">${post.title}</a></h2>
        <p>${shortExcerpt}</p>
        <a href="blog-detail.html?id=${post.id}" class="read-more">
          Đọc tiếp <i class="fa-solid fa-arrow-right"></i>
        </a>
      </div>
    `;
    return card;
  };

  // Hàm hiển thị danh sách bài viết
  const renderPosts = (postsToRender) => {
    // Hiệu ứng mờ dần khi đổi tab
    blogList.classList.add("is-filtering");

    setTimeout(() => {
      blogList.innerHTML = "";

      if (postsToRender.length === 0) {
        blogList.innerHTML = '<p style="text-align: center; width: 100%; color: #7C877D; grid-column: 1 / -1;">Chưa có bài viết nào trong mục này.</p>';
      } else {
        postsToRender.forEach(post => {
          blogList.appendChild(createBlogCard(post));
        });
      }
      
      blogList.classList.remove("is-filtering");
    }, 300); // Khớp với thời gian transition opacity trong CSS
  };

  // Hàm khởi tạo các nút lọc
  const renderFilters = (categories) => {
    filterContainer.innerHTML = "";
    
    // Nút "Tất cả"
    const btnAll = document.createElement("button");
    btnAll.className = "filter-btn active";
    btnAll.textContent = "Tất cả bài viết";
    btnAll.dataset.category = "all";
    filterContainer.appendChild(btnAll);

    // Các nút chủ đề
    categories.forEach(cat => {
      const btn = document.createElement("button");
      btn.className = "filter-btn";
      btn.textContent = cat;
      btn.dataset.category = cat;
      filterContainer.appendChild(btn);
    });

    // Gắn sự kiện Click cho các nút
    const allBtns = filterContainer.querySelectorAll(".filter-btn");
    allBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        // Đổi trạng thái active
        allBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        // Lọc dữ liệu
        const selectedCat = btn.dataset.category;
        if (selectedCat === "all") {
          renderPosts(allPosts);
        } else {
          const filtered = allPosts.filter(p => p.category === selectedCat);
          renderPosts(filtered);
        }
      });
    });
  };

  // Gọi API lấy dữ liệu
  fetch(`${API_BASE}/api/posts`)
    .then(res => {
      if (!res.ok) throw new Error("Lỗi mạng");
      return res.json();
    })
    .then(posts => {
      allPosts = posts;

      if (posts.length === 0) {
        renderPosts([]);
        return;
      }

      // Tự động trích xuất danh sách các Category duy nhất
      const uniqueCategories = [...new Set(posts.map(p => p.category).filter(Boolean))];

      // Render bộ lọc và danh sách bài viết mặc định
      renderFilters(uniqueCategories);
      renderPosts(allPosts);
    })
    .catch(err => {
      console.error("Lỗi tải bài viết:", err);
      blogList.innerHTML = '<p style="color:#C4425B; width:100%; text-align:center; grid-column: 1 / -1;">Không thể kết nối đến máy chủ. Vui lòng thử lại sau!</p>';
      filterContainer.innerHTML = "";
    });
});