(function() {
    // 1. Kiểm tra nếu là trang admin thì bỏ qua
    if (window.location.pathname.includes('admin')) return;

    // 2. Tạo giao diện HTML trực tiếp
    const widgetHTML = `
        <div id="chat-widget-btn">
            <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
        <div id="chat-widget-box" class="hidden">
            <div class="chat-header">
                <div>
                    <strong>Hỗ trợ Mộc Yên</strong>
                    <small>Thường trả lời trong vài phút</small>
                </div>
                <button id="close-chat">✕</button>
            </div>
            <div class="chat-body" id="chat-body">
                <!-- Tin nhắn sẽ hiển thị ở đây -->
            </div>
            <div class="chat-footer">
                <input type="text" id="chat-input" placeholder="Nhập tin nhắn...">
                <button id="chat-send">➤</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    // 3. Lấy thông tin User đang đăng nhập
    let currentUser = null;
    try {
        const userJson = localStorage.getItem("mocyen_user");
        if (userJson) currentUser = JSON.parse(userJson);
    } catch(e) {}

    const btn = document.getElementById("chat-widget-btn");
    const box = document.getElementById("chat-widget-box");
    const closeBtn = document.getElementById("close-chat");
    const input = document.getElementById("chat-input");
    const sendBtn = document.getElementById("chat-send");
    const chatBody = document.getElementById("chat-body");

    // 4. Xử lý khi click vào nút chat
    btn.addEventListener("click", () => {
        if (!currentUser) {
            // Nếu chưa đăng nhập, chặn lại và yêu cầu đăng nhập
            if (confirm("Vui lòng đăng nhập để chat với Admin. Bạn có muốn chuyển đến trang Đăng nhập không?")) {
                // Lưu lại trang hiện tại để tí nữa đăng nhập xong quay lại
                const currentUrl = window.location.pathname.split('/').pop() + window.location.search;
                window.location.href = `login.html?redirect=${encodeURIComponent(currentUrl)}`;
            }
            return;
        }
        // Nếu đã đăng nhập thì mở box chat
        box.classList.toggle("hidden");
        if (!box.classList.contains("hidden")) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    });

    closeBtn.addEventListener("click", () => box.classList.add("hidden"));

    // 5. Khởi tạo Socket và lấy tin nhắn (Chỉ chạy khi đã có User)
    if (currentUser) {
        const userId = currentUser.id;

        // Tải thư viện Socket
        const socketScript = document.createElement('script');
        socketScript.src = "https://unpkg.com/socket.io-client@4.7.2/dist/socket.io.min.js";
        document.body.appendChild(socketScript);

        socketScript.onload = () => {
            const socket = io("https://mocyen-web.onrender.com"); // Link Render
            
            // Tham gia phòng chat mang tên user_id của mình
            socket.emit('customer_join', userId);

            // Tải lịch sử tin nhắn của chính mình
            fetch(`https://mocyen-web.onrender.com/api/messages/${userId}`)
                .then(res => res.json())
                .then(msgs => {
                    chatBody.innerHTML = "";
                    if (msgs.length === 0) {
                        chatBody.innerHTML = '<div class="chat-msg admin">Xin chào! Mộc Yên có thể giúp gì cho bạn?</div>';
                    } else {
                        msgs.forEach(m => displayMessage(m.message, m.sender));
                    }
                })
                .catch(err => console.log("Lỗi tải tin nhắn"));

            // Hàm hiển thị tin nhắn
            function displayMessage(text, sender) {
                const div = document.createElement("div");
                div.className = `chat-msg ${sender}`;
                div.textContent = text;
                chatBody.appendChild(div);
                chatBody.scrollTop = chatBody.scrollHeight;
            }

            // Gửi tin nhắn
            function sendMessage() {
                const text = input.value.trim();
                if (!text) return;
                input.value = "";
                
                socket.emit('send_message', { user_id: userId, sender: 'customer', message: text });
                displayMessage(text, 'customer');
            }

            sendBtn.addEventListener("click", sendMessage);
            input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

            // Nhận tin nhắn từ Admin (Chỉ nhận tin của phòng mình)
            socket.on('receive_message', (data) => {
                if (data.user_id == userId && data.sender === 'admin') {
                    displayMessage(data.message, 'admin');
                }
            });
        };
    }
})();