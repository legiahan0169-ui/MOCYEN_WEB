document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id") || 1; 

  const formatPrice = (price) => `${Number(price).toLocaleString("vi-VN")}đ`;

  // Hàm cập nhật text (Tên, giá, sku, các tab)
  function updateProductInfo(product) {
    document.title = `${product.name} | Mộc Yên`;
    document.getElementById("pd-breadcrumb-name").textContent = product.name;
    document.getElementById("pd-name").textContent = product.name;
    document.getElementById("pd-category").textContent = product.category;
    document.getElementById("pd-price").textContent = formatPrice(product.sale_price || product.price);
    document.getElementById("pd-short-desc").textContent = product.short_desc || product.description;
    document.getElementById("pd-sku").textContent = product.sku;

    // Hàm format text cho các tab
    const formatText = (text) => {
      if (!text) return "Đang cập nhật...";
      if (/<(p|div|ul|ol|li|br|strong|span)[\s>]/i.test(text)) return text;
      const paragraphs = text.split(/\n+/).filter(p => p.trim() !== "");
      return paragraphs.map(p => `<p style="margin-bottom: 16px;">${p.trim()}</p>`).join('');
    };

    document.getElementById("pd-desc-content").innerHTML = formatText(product.description);
    document.getElementById("pd-ingredients-content").innerHTML = formatText(product.ingredients);
    document.getElementById("pd-benefits-content").innerHTML = formatText(product.benefits);
    document.getElementById("pd-usage-content").innerHTML = formatText(product.usage);
    
    // Gắn ID cho nút thêm giỏ hàng
    document.getElementById("pd-add-to-cart").dataset.productId = product.id;
  }

  // Hàm lấy TẤT CẢ ảnh duy nhất từ tất cả các size
  function getAllUniqueImages(variants) {
    let allImgs = [];
    variants.forEach(v => {
      let imgs = [];
      try { 
        imgs = typeof v.images === 'string' ? JSON.parse(v.images) : v.images; 
      } catch(e) { 
        imgs = [v.image]; 
      }
      if (!Array.isArray(imgs) || imgs.length === 0) imgs = [v.image];
      allImgs = allImgs.concat(imgs);
    });
    // Lọc trùng (giữ lại 1 ảnh nếu bị lặp)
    return [...new Set(allImgs)].filter(img => img);
  }

  // Hàm vẽ thư viện ảnh chung
  function renderGallery(variants) {
    const mainImg = document.getElementById("pd-img-main");
    const thumbnailContainer = document.getElementById("pd-thumbnails");
    const allImages = getAllUniqueImages(variants);

    thumbnailContainer.innerHTML = "";

    allImages.forEach((imgName, index) => {
      const thumb = document.createElement("img");
      thumb.src = `../images/product/${imgName}`;
      thumb.alt = `Ảnh ${index + 1}`;
      
      thumb.addEventListener("click", () => {
        mainImg.src = `../images/product/${imgName}`;
        document.querySelectorAll(".pd-thumbnails img").forEach(t => t.classList.remove("active"));
        thumb.classList.add("active");
      });
      thumbnailContainer.appendChild(thumb);
    });
  }

    // Hàm đồng bộ ảnh chính và highlight thumbnail khi đổi Size
  function syncImageWithSize(product) {
    const mainImg = document.getElementById("pd-img-main");
    let currentImages = [];
    
    try { 
      currentImages = typeof product.images === 'string' ? JSON.parse(product.images) : product.images; 
    } catch(e) { 
      currentImages = [product.image]; 
    }
    if (!Array.isArray(currentImages) || currentImages.length === 0) currentImages = [product.image];

    // SỬA Ở ĐÂY: Lấy ảnh cuối cùng trong mảng (là ảnh chụp riêng của hũ 50ml hoặc 30ml)
    const mainImgName = currentImages[currentImages.length - 1];
    const mainImgSrc = `../images/product/${mainImgName}`;
    
    // Đổi ảnh lớn
    mainImg.src = mainImgSrc;

    // Tìm và highlight thumbnail tương ứng
    document.querySelectorAll(".pd-thumbnails img").forEach(t => {
      t.classList.remove("active");
      if (t.getAttribute("src") === mainImgSrc) {
        t.classList.add("active");
      }
    });
  }

  // Hàm render nút chọn Size
  function renderSizeButtons(variants, currentId) {
    const attrContainer = document.getElementById("pd-attributes");
    attrContainer.innerHTML = ""; 

    if (variants.length > 1) {
      const groupDiv = document.createElement("div");
      groupDiv.className = "pd-attr-group";
      groupDiv.innerHTML = `<label>Chọn kích thước / dung tích:</label>`;
      
      const btnWrap = document.createElement("div");
      btnWrap.className = "pd-size-buttons";

      variants.forEach((variant) => {
        const btn = document.createElement("button");
        btn.className = "pd-size-btn";
        btn.textContent = variant.size;
        if (variant.id === currentId) btn.classList.add("active");

        btn.addEventListener("click", () => {
          // 1. Đổi text, giá, sku
          updateProductInfo(variant); 
          
          // 2. Đổi ảnh chính theo size mới
          syncImageWithSize(variant); 
          
          // 3. Đổi trạng thái nút
          document.querySelectorAll(".pd-size-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          
          // 4. Đổi URL
          window.history.replaceState(null, '', `?id=${variant.id}`);
        });
        btnWrap.appendChild(btn);
      });
      groupDiv.appendChild(btnWrap);
      attrContainer.appendChild(groupDiv);
    }
  }

  // Gọi API lấy dữ liệu
  async function fetchProduct() {
    try {
      // 1. Lấy sản phẩm hiện tại
      const res = await fetch(`http://localhost:3000/api/products/${productId}`);
      const data = await res.json();
      
      updateProductInfo(data);

      // 2. Lấy TẤT CẢ các size của nhóm sản phẩm này
      if (data.group_id) {
        const groupRes = await fetch(`http://localhost:3000/api/products/group/${data.group_id}`);
        if (groupRes.ok) {
          const variants = await groupRes.json();
          
          // 3. Vẽ thư viện ảnh chung từ tất cả các size
          renderGallery(variants); 
          
          // 4. Vẽ nút chọn size
          renderSizeButtons(variants, data.id);
          
          // 5. Highlight đúng ảnh của size đang xem ban đầu
          syncImageWithSize(data);
        }
      }
    } catch (error) {
      console.error("Lỗi tải sản phẩm:", error);
    }
  }

  // Xử lý chuyển Tab
  const tabBtns = document.querySelectorAll(".pd-tab-btn");
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".pd-tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
    });
  });

  // Xử lý tăng/giảm số lượng
  const qtyInput = document.getElementById("pd-qty-input");
  document.getElementById("pd-qty-minus").addEventListener("click", () => {
    let val = parseInt(qtyInput.value);
    if (val > 1) qtyInput.value = val - 1;
  });
  document.getElementById("pd-qty-plus").addEventListener("click", () => {
    let val = parseInt(qtyInput.value);
    if (val < 99) qtyInput.value = val + 1;
  });

  // Khởi chạy
  fetchProduct();
});