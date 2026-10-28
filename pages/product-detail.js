/* =========================================================
   MOCYEN — PRODUCT DETAIL PAGE
   - Fetch sản phẩm từ API (auto-detect local/prod)
   - Render thông tin, gallery, size buttons
   - Xử lý thêm giỏ hàng, tab, qty, back/forward
========================================================= */
document.addEventListener("DOMContentLoaded", () => {

  /* ============ CẤU HÌNH ============ */
  // Tự detect môi trường: local dev → backend local, còn lại → production
  const API_BASE = (() => {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h === "" || h.endsWith(".local")) {
      return "http://localhost:3000";
    }
    return "https://mocyen-web.onrender.com";
  })();

  /* ============ VALIDATE PRODUCT ID ============ */
  const params = new URLSearchParams(window.location.search);
  const rawId = params.get("id");
  const parsedId = parseInt(rawId, 10);
  const productId = Number.isInteger(parsedId) && parsedId > 0 ? parsedId : 1;

  const formatPrice = (price) => {
    const n = Number(price);
    return Number.isFinite(n) && n > 0 ? n.toLocaleString("vi-VN") + "đ" : "—";
  };

  /* ============ HELPER: Hiển thị lỗi ============ */
  function showError(message) {
    document.title = "Không tìm thấy sản phẩm | Mộc Yên";
    document.getElementById("pd-breadcrumb-name").textContent = "Không tìm thấy";
    document.getElementById("pd-name").textContent = "Không tìm thấy sản phẩm";
    document.getElementById("pd-category").textContent = "—";
    document.getElementById("pd-price").textContent = "—";
    document.getElementById("pd-sku").textContent = "—";
    document.getElementById("pd-short-desc").textContent = message;
    document.getElementById("pd-rating").textContent = "—";
    document.getElementById("pd-reviews").textContent = "(Chưa có đánh giá)";

    const mainImg = document.getElementById("pd-img-main");
    if (mainImg) mainImg.alt = "Không tìm thấy sản phẩm";

    ["pd-desc-content", "pd-ingredients-content", "pd-benefits-content", "pd-usage-content"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<p>${message}</p>`;
      });

    const btn = document.getElementById("pd-add-to-cart");
    if (btn) { btn.disabled = true; btn.textContent = "Sản phẩm không khả dụng"; }
  }

  /* ============ CẬP NHẬT THÔNG TIN ============ */
  function updateProductInfo(product) {
    document.title = `${product.name || "Sản phẩm"} | Mộc Yên`;
    document.getElementById("pd-breadcrumb-name").textContent = product.name || "Sản phẩm";
    document.getElementById("pd-name").textContent = product.name || "Sản phẩm";
    document.getElementById("pd-category").textContent = product.category || "SẢN PHẨM";
    document.getElementById("pd-price").textContent =
      formatPrice(product.sale_price || product.price);
    document.getElementById("pd-short-desc").textContent =
      product.short_desc || product.description || "Đang cập nhật mô tả...";
    document.getElementById("pd-sku").textContent = product.sku || "—";

    // Rating: nếu DB có dữ liệu thì show, không thì fallback
    const ratingEl = document.getElementById("pd-rating");
    const reviewsEl = document.getElementById("pd-reviews");
    const rAvg = parseFloat(product.rating_avg);
    const rCount = parseInt(product.rating_count, 10) || 0;
    if (Number.isFinite(rAvg) && rAvg > 0) {
      ratingEl.textContent = rAvg.toFixed(1);
      reviewsEl.textContent = `(${rCount} đánh giá)`;
    } else {
      ratingEl.textContent = "—";
      reviewsEl.textContent = "(Chưa có đánh giá)";
    }

    // Format nội dung tab (cho phép HTML từ admin, tự wrap <p> nếu là plain text)
    const formatText = (text) => {
      if (!text) return "<p>Đang cập nhật...</p>";
      // Nếu chứa HTML hợp lệ → giữ nguyên (giả định nội dung do admin nhập)
      if (/<(p|div|ul|ol|li|br|strong|em|span|h[1-6])[\s>]/i.test(text)) return text;
      // Ngược lại → wrap từng đoạn bằng <p>
      return text.split(/\n+/).filter(p => p.trim() !== "")
        .map(p => `<p>${p.trim()}</p>`).join("");
    };

    document.getElementById("pd-desc-content").innerHTML = formatText(product.description);
    document.getElementById("pd-ingredients-content").innerHTML = formatText(product.ingredients);
    document.getElementById("pd-benefits-content").innerHTML = formatText(product.benefits);
    document.getElementById("pd-usage-content").innerHTML = formatText(product.usage);

    // Lưu ID hiện tại cho nút thêm giỏ
    const btn = document.getElementById("pd-add-to-cart");
    btn.dataset.productId = product.id;
    btn.disabled = false;
  }

  /* ============ GALLERY ============ */
  function parseImages(v) {
    let imgs = [];
    try {
      imgs = typeof v.images === "string" ? JSON.parse(v.images) : v.images;
    } catch (e) { imgs = [v.image]; }
    if (!Array.isArray(imgs) || imgs.length === 0) imgs = [v.image];
    return imgs.filter(Boolean);
  }

  function getAllUniqueImages(variants) {
    let all = [];
    variants.forEach(v => { all = all.concat(parseImages(v)); });
    return [...new Set(all)];
  }

  function renderGallery(variants) {
    const thumbnailContainer = document.getElementById("pd-thumbnails");
    const allImages = getAllUniqueImages(variants);
    thumbnailContainer.innerHTML = "";

    allImages.forEach((imgName, index) => {
      const thumb = document.createElement("img");
      thumb.src = `../images/product/${imgName}`;
      thumb.alt = `Ảnh sản phẩm ${index + 1}`;
      thumb.loading = "lazy";
      thumb.tabIndex = 0;
      thumb.addEventListener("click", () => {
        document.getElementById("pd-img-main").src = thumb.src;
        document.querySelectorAll(".pd-thumbnails img").forEach(t => t.classList.remove("active"));
        thumb.classList.add("active");
      });
      thumb.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); thumb.click(); }
      });
      thumbnailContainer.appendChild(thumb);
    });
  }

  // Đồng bộ ảnh chính khi đổi size
  // Quy ước DB: ảnh CUỐI trong mảng `images` là ảnh đại diện riêng của size đó
  function syncImageWithSize(product) {
    const mainImg = document.getElementById("pd-img-main");
    const currentImages = parseImages(product);
    if (currentImages.length === 0) return;

    const mainImgName = currentImages[currentImages.length - 1];
    const mainImgSrc = `../images/product/${mainImgName}`;
    mainImg.src = mainImgSrc;

    document.querySelectorAll(".pd-thumbnails img").forEach(t => {
      t.classList.toggle("active", t.getAttribute("src") === mainImgSrc);
    });
  }

  /* ============ SIZE BUTTONS ============ */
  function renderSizeButtons(variants, currentId) {
    const attrContainer = document.getElementById("pd-attributes");
    attrContainer.innerHTML = "";
    if (variants.length <= 1) return;

    const groupDiv = document.createElement("div");
    groupDiv.className = "pd-attr-group";
    groupDiv.innerHTML = `<label>Chọn kích thước / dung tích:</label>`;

    const btnWrap = document.createElement("div");
    btnWrap.className = "pd-size-buttons";
    btnWrap.setAttribute("role", "group");

    variants.forEach((variant) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pd-size-btn";
      btn.textContent = variant.size || "—";
      btn.setAttribute("aria-pressed", variant.id === currentId ? "true" : "false");
      if (variant.id === currentId) btn.classList.add("active");

      btn.addEventListener("click", () => {
        updateProductInfo(variant);
        syncImageWithSize(variant);
        document.querySelectorAll(".pd-size-btn").forEach(b => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        window.history.replaceState(null, "", `?id=${variant.id}`);
      });
      btnWrap.appendChild(btn);
    });

    groupDiv.appendChild(btnWrap);
    attrContainer.appendChild(groupDiv);
  }

  /* ============ ADD TO CART (FIX BLOCKER) ============ */
  document.getElementById("pd-add-to-cart").addEventListener("click", () => {
    const btn = document.getElementById("pd-add-to-cart");
    const id = btn.dataset.productId;
    const qtyInput = document.getElementById("pd-qty-input");
    const qty = Math.max(1, Math.min(99, parseInt(qtyInput.value, 10) || 1));

    if (!id) {
      if (typeof window.showToast === "function") {
        window.showToast("Sản phẩm chưa sẵn sàng, vui lòng thử lại");
      }
      return;
    }

    if (typeof window.addToCart === "function") {
      window.addToCart(id, qty);   // components.js tự toast + update cart count
    } else {
      console.error("[MOCYEN] window.addToCart chưa sẵn sàng — kiểm tra components.js");
    }
  });

  /* ============ FETCH DỮ LIỆU ============ */
  async function fetchProduct() {
    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}`);
      if (!res.ok) {
        if (res.status === 404) return showError("Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.");
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();

      updateProductInfo(data);

      // Lấy tất cả size của nhóm
      if (data.group_id) {
        const groupRes = await fetch(`${API_BASE}/api/products/group/${data.group_id}`);
        if (groupRes.ok) {
          const variants = await groupRes.json();
          renderGallery(variants);
          renderSizeButtons(variants, data.id);
          syncImageWithSize(data);
        }
      } else {
        // Sản phẩm không có group → render gallery từ ảnh của chính nó
        renderGallery([data]);
        syncImageWithSize(data);
      }
    } catch (error) {
      console.error("[MOCYEN] Lỗi tải sản phẩm:", error);
      showError("Không thể tải thông tin sản phẩm. Vui lòng kiểm tra kết nối và thử lại.");
    }
  }

  /* ============ TABS ============ */
  const tabBtns = document.querySelectorAll(".pd-tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".pd-tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  /* ============ QTY +/- ============ */
  const qtyInput = document.getElementById("pd-qty-input");
  document.getElementById("pd-qty-minus").addEventListener("click", () => {
    const val = parseInt(qtyInput.value, 10) || 1;
    if (val > 1) qtyInput.value = val - 1;
  });
  document.getElementById("pd-qty-plus").addEventListener("click", () => {
    const val = parseInt(qtyInput.value, 10) || 1;
    if (val < 99) qtyInput.value = val + 1;
  });
  qtyInput.addEventListener("input", () => {
    let v = parseInt(qtyInput.value, 10);
    if (!Number.isFinite(v) || v < 1) qtyInput.value = 1;
    else if (v > 99) qtyInput.value = 99;
  });

  /* ============ POPSTATE (Back/Forward) ============ */
  // Khi user bấm Back sau khi đổi size → reload để re-render đúng ID trong URL
  window.addEventListener("popstate", () => {
    const newId = parseInt(new URLSearchParams(window.location.search).get("id"), 10);
    const validNewId = Number.isInteger(newId) && newId > 0 ? newId : 1;
    if (validNewId !== productId) location.reload();
  });

  /* ============ KHỞI CHẠY ============ */
  fetchProduct();
});