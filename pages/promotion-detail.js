/* =========================================================
   MOCYEN - PROMOTION DETAIL JS
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Lấy mã chiến dịch từ URL (VD: ?campaign=11-11)
  const params = new URLSearchParams(window.location.search);
  const campaignId = params.get("campaign");

  // 2. Cơ sở dữ liệu các chiến dịch
  const campaignsDB = {
    "11-11": {
      eyebrow: "ONLINE SHOPPING FESTIVAL",
      title: "Dịu Dàng 11.11",
      message: "Ngày hội mua sắm, lựa chọn vừa đủ.",
      desc: "Khám phá những sản phẩm chăm sóc da thiết yếu và lựa chọn routine phù hợp với nhu cầu của bạn cùng ưu đãi đặc biệt từ Mộc Yên.",
      benefits: [
        "Sử dụng mã MEGA1111 để nhận ưu đãi Giảm 15% cho đơn hàng từ 299.000đ.",
        "Miễn phí vận chuyển cho đơn hàng từ 299.000đ khi áp dụng mã MEGA1111.",
        "Áp dụng cho tất cả sản phẩm và bộ routine trên website."
      ],
      conditions: [
        "Mỗi đơn hàng chỉ được áp dụng 1 mã giảm giá duy nhất.",
        "Không cộng dồn với các chương trình khuyến mãi khác.",
        "Chương trình diễn ra từ 01/11/2026 đến hết ngày 11/11/2026.",
        "Số lượng mã giảm giá có giới hạn."
      ],
      time: "01/11/2026 – 11/11/2026",
      start: "2026-11-01",
      end: "2026-11-11"
    },
    "20-11": {
      eyebrow: "VIETNAMESE TEACHERS' DAY · 20.11",
      title: "Gửi Một Điều Dịu Êm",
      message: "Một món quà nhỏ, một lời cảm ơn chân thành.",
      desc: "Có những người luôn dành cho chúng ta sự kiên nhẫn, những lời động viên và sự tận tâm. Nhân dịp 20/11, Mộc Yên gợi ý những món quà chăm sóc bản thân tinh tế như một lời cảm ơn gửi đến người đã đồng hành cùng bạn.",
      benefits: [
        "Giảm 10% cho các bộ quà tặng được chọn.",
        "Tặng thiệp viết lời cảm ơn cho đơn hàng quà tặng.",
        "Tặng một mặt nạ giấy cho đơn hàng từ 399.000đ."
      ],
      conditions: [
        "Chỉ áp dụng cho các bộ quà tặng được chỉ định.",
        "Quà tặng mặt nạ áp dụng cho đơn từ 399.000đ sau giảm giá.",
        "Thiệp quà tặng phụ thuộc vào số lượng tồn kho giả định.",
        "Không cộng dồn các chương trình giảm giá nếu không được quy định riêng."
      ],
      time: "12/11/2026 – 20/11/2026",
      start: "2026-11-12",
      end: "2026-11-20"
    },
    "green-friday": {
      eyebrow: "CONSCIOUS BEAUTY",
      title: "Green Friday — Mua Có Ý Thức",
      message: "Không cần mua nhiều hơn, chỉ cần lựa chọn tốt hơn.",
      desc: "Green Friday là lời mời từ Mộc Yên để chúng ta nhìn lại cách mua sắm và chăm sóc bản thân. Hãy chọn sản phẩm phù hợp, sử dụng đến khi hết và trao lại bao bì đúng cách khi có thể.",
      benefits: [
        "Giảm 10% cho các bộ chăm sóc da tối giản được chọn.",
        "Thu hồi 3 bao bì mỹ phẩm Mộc Yên đủ điều kiện để nhận voucher 30.000đ cho đơn hàng tiếp theo từ 299.000đ.",
        "Tặng túi vải tái sử dụng cho khách hàng đạt điều kiện của chương trình, trong giới hạn số lượng quà tặng."
      ],
      conditions: [
        "Chương trình thu hồi bao bì áp dụng theo thể lệ Vòng Đời Xanh.",
        "Bao bì phải thuộc sản phẩm Mộc Yên, được làm sạch và không còn lượng sản phẩm đáng kể.",
        "Chỉ nhận các loại bao bì được liệt kê trong hướng dẫn chương trình.",
        "Voucher không có giá trị quy đổi thành tiền mặt."
      ],
      time: "21/11/2026 – 26/11/2026",
      start: "2026-11-21",
      end: "2026-11-26"
    },
    "black-friday": {
      eyebrow: "NOVEMBER SPECIAL",
      title: "Black Friday — Dịu Lành Cuối Tháng",
      message: "Ưu đãi đặc biệt cho hành trình chăm sóc bản thân.",
      desc: "Khép lại tháng 11 với những lựa chọn phù hợp cho chu trình chăm sóc da của bạn. Khám phá các sản phẩm được ưu đãi và những bộ routine giúp việc chăm sóc da trở nên đơn giản hơn.",
      benefits: [
        "Giảm đến 25% cho các sản phẩm được chọn.",
        "Giảm 15% cho các bộ routine được chọn.",
        "Tặng quà cho 30 đơn hàng đầu tiên đạt giá trị từ 699.000đ."
      ],
      conditions: [
        "Mức giảm tối đa 25% chỉ áp dụng cho các sản phẩm được đánh dấu.",
        "Không mặc định toàn bộ cửa hàng giảm 25%.",
        "Các bộ routine không cộng dồn với ưu đãi giảm giá khác.",
        "Quà tặng áp dụng cho 30 đơn hàng hợp lệ đầu tiên đạt điều kiện, theo thứ tự xác nhận đơn."
      ],
      time: "27/11/2026 – 30/11/2026",
      start: "2026-11-27",
      end: "2026-11-30"
    },
    "vong-doi-xanh": {
      eyebrow: "CHƯƠNG TRÌNH DÀI HẠN",
      title: "Vòng Đời Xanh — Đổi Vỏ Nhận Quà",
      message: "Trao vỏ rỗng, gửi mầm xanh.",
      desc: "Mỗi chiếc chai, chiếc hũ đều có một hành trình sau khi sản phẩm được sử dụng hết. Với Vòng Đời Xanh, Mộc Yên mong muốn khuyến khích khách hàng thu hồi bao bì đã sử dụng và hình thành thói quen tiêu dùng có trách nhiệm hơn.",
      benefits: [
        "Thu hồi 3 bao bì: Voucher 30.000đ cho đơn từ 299.000đ.",
        "Thu hồi 5 bao bì: Voucher 50.000đ cho đơn từ 399.000đ HOẶC quà sống xanh."
      ],
      conditions: [
        "Chỉ áp dụng cho các loại bao bì Mộc Yên được chấp nhận (chai serum, toner, hũ kem, tuýp sữa rửa mặt, hộp giấy).",
        "Bao bì cần được làm sạch và không còn lượng sản phẩm đáng kể.",
        "Mỗi lượt đổi chỉ nhận một mức quyền lợi cao nhất đạt được. Không cộng dồn hai mức voucher.",
        "Chương trình giả định cho đồ án, không tuyên bố đã có mạng lưới thu hồi thực tế."
      ],
      time: "Đang diễn ra dài hạn",
      start: "2026-01-01",
      end: "2026-12-31"
    }
  };

  // 3. Chọn dữ liệu (Mặc định là 11.11 nếu không có URL)
  const data = campaignsDB[campaignId] || campaignsDB["11-11"];

  // 4. Cập nhật DOM Text
  document.getElementById("breadcrumb-current").textContent = data.title;
  document.getElementById("camp-eyebrow").textContent = data.eyebrow;
  document.getElementById("camp-title").textContent = data.title;
  document.getElementById("camp-message").textContent = `"${data.message}"`;
  document.getElementById("camp-desc").textContent = data.desc;
  document.getElementById("camp-time").textContent = data.time;

  // 5. Render Danh sách Quyền lợi
  const benefitsList = document.getElementById("camp-benefits");
  if (benefitsList) {
    benefitsList.innerHTML = "";
    data.benefits.forEach(benefit => {
      const li = document.createElement("li");
      li.textContent = benefit;
      benefitsList.appendChild(li);
    });
  }

  // 6. Render Danh sách Điều kiện
  const conditionsList = document.getElementById("camp-conditions");
  if (conditionsList) {
    conditionsList.innerHTML = "";
    data.conditions.forEach(cond => {
      const li = document.createElement("li");
      li.textContent = cond;
      conditionsList.appendChild(li);
    });
  }

  // 7. Xử lý Trạng thái tự động
  const statusEl = document.getElementById("camp-status");
  if (statusEl) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(data.start);
    const endDate = new Date(data.end);
    endDate.setHours(23, 59, 59, 999);

    if (today < startDate) {
      statusEl.textContent = "Sắp diễn ra";
      statusEl.className = "status-badge status-upcoming";
    } else if (today > endDate) {
      statusEl.textContent = "Đã kết thúc";
      statusEl.className = "status-badge status-ended";
    } else {
      statusEl.textContent = "Đang diễn ra";
      statusEl.className = "status-badge status-active";
    }
  }
});