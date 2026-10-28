let allProducts = []; 
let cards = [];

document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  const categoryInputs = [...document.querySelectorAll('input[name="category"]')];
  const priceInputs = [...document.querySelectorAll('input[name="price"]')];
  const sortSelect = document.getElementById("sort-select");
  const resultCount = document.getElementById("result-count");
  const emptyMessage = document.getElementById("no-products");
  const activeFilters = document.getElementById("active-filters");
  const clearButton = document.getElementById("clear-filters");

  const formatPrice = price => `${Number(price).toLocaleString("vi-VN")}đ`;
  const getCheckedValue = inputs => inputs.find(input => input.checked)?.value || "all";

  // GỌI API LẤY DỮ LIỆU TỪ DATABASE
  try {
    grid.innerHTML = '<p style="text-align:center;width:100%;">Đang tải sản phẩm...</p>';
    const response = await fetch('http://localhost:3000/api/products');
    allProducts = await response.json();
    grid.innerHTML = "";

    allProducts.forEach((product, index) => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.dataset.id = product.id;
      card.dataset.category = product.category;
      card.dataset.price = product.sale_price || product.price; // Dùng giá sale nếu có
      card.dataset.name = product.name;
      card.dataset.order = index + 1;

      let badgeHTML = product.sale_price ? `<span class="badge">KHUYẾN MÃI</span>` : "";

      card.innerHTML = `
        <div class="product-image">
          ${badgeHTML}
          <button class="wish" type="button" aria-label="Yêu thích" aria-pressed="false">♡</button>
          <a href="product-detail.html?id=${product.id}">
            <img src="../images/product/${product.image}" alt="${product.name}" loading="lazy">
          </a>
        </div>
        <div class="product-info">
          <p class="category-label">${product.category}</p>
          <h3><a href="product-detail.html?id=${product.id}">${product.name}</a></h3>
          <div class="product-bottom">
            <strong>${formatPrice(product.sale_price || product.price)}</strong>
            <button class="quick-add" type="button" data-product-id="${product.id}">＋</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    cards = [...grid.querySelectorAll(".product-card")];
    renderProducts(); 

  } catch (error) {
    grid.innerHTML = '<p style="color:red;text-align:center;width:100%;">Lỗi kết nối Backend. Vui lòng kiểm tra lại Node.js!</p>';
  }

  // Hàm lọc
  function renderProducts() {
    const selectedCategory = getCheckedValue(categoryInputs);
    const selectedPrice = getCheckedValue(priceInputs);

    const visibleCards = cards.filter(card => {
      const price = Number(card.dataset.price);
      const matchesCategory = selectedCategory === "all" || card.dataset.category === selectedCategory;
      let matchesPrice = true;

      if (selectedPrice === "under250") matchesPrice = price < 250000;
      else if (selectedPrice === "250to350") matchesPrice = price >= 250000 && price <= 350000;
      else if (selectedPrice === "over350") matchesPrice = price > 350000;

      return matchesCategory && matchesPrice;
    });

    const sortValue = sortSelect?.value || "featured";
    visibleCards.sort((a, b) => {
      if (sortValue === "price-asc") return Number(a.dataset.price) - Number(b.dataset.price);
      if (sortValue === "price-desc") return Number(b.dataset.price) - Number(a.dataset.price);
      if (sortValue === "name") return a.dataset.name.localeCompare(b.dataset.name, "vi");
      return Number(a.dataset.order) - Number(b.dataset.order);
    });

    cards.forEach(card => card.hidden = true);
    visibleCards.forEach(card => {
      card.hidden = false;
      grid.appendChild(card);
    });

    if (resultCount) resultCount.textContent = `Hiển thị ${visibleCards.length} sản phẩm`;
    if (emptyMessage) emptyMessage.hidden = visibleCards.length > 0;
  }

  // Gắn sự kiện
  [...categoryInputs, ...priceInputs].forEach(input => input.addEventListener("change", renderProducts));
  if (sortSelect) sortSelect.addEventListener("change", renderProducts);

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const allCategory = categoryInputs.find(i => i.value === "all");
      const allPrice = priceInputs.find(i => i.value === "all");
      if (allCategory) allCategory.checked = true;
      if (allPrice) allPrice.checked = true;
      if (sortSelect) sortSelect.value = "featured";
      renderProducts();
    });
  }
});