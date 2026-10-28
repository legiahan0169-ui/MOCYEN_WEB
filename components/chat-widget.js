(function() {
    // 1. Kiểm tra nếu là trang admin thì bỏ qua
    if (window.location.pathname.includes('admin')) return;

    // 2. TỰ ĐỘNG CHÈN CSS (Đảm bảo không bao giờ bị mất giao diện)
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
        #chat-widget-btn {
            position: fixed !important; bottom: 30px !important; right: 30px !important;
            width: 60px !important; height: 60px !important;
            background: #264F40 !important; color: white !important;
            border-radius: 50% !important; display: flex !important; align-items: center !important; justify-content: center !important;
            font-size: 24px !important; cursor: pointer !important; z-index: 9999999 !important;
            box-shadow: 0 10px 20px rgba(38,79,64,0.3) !important;
            transition: transform 0.3s !important;
        }
        #chat-widget-btn:hover { transform: scale(1.1) !important; }
        
        #chat-widget-box {
            position: fixed !important; bottom: 100px !important; right: 30px !important;
            width: 350px !important; height: 450px !important;
            background: #FFFDF8 !important; border-radius: 16px !important;
            box-shadow: 0 15px 40px rgba(0,0,0,0.15) !important;
            display: flex !important; flex-direction: column !important; z-index: 9999999 !important;
            border: 1px solid #E4E2D7 !important; overflow: hidden !important;
            transition: all 0.3s ease !important; opacity: 1 !important;
        }
        #chat-widget-box.hidden {
            opacity: 0 !important; pointer-events: none !important; transform: translateY(20px) !important;
        }
        .chat-header {
            background: #264F40 !important; color: white !important; padding: 15px 20px !important;
            display: flex !important; justify-content: space-between !important; align-items: center !important;
        }
        .chat-header strong { font-size: 15px !important; display: block !important; color: white !important; margin: 0 !important;}
        .chat-header small { font-size: 11px !important; color: #A8BDB4 !important; }
        .chat-header button { background: none !important; border: none !important; color: white !important; font-size: 18px !important; cursor: pointer !important; }
        .chat-body {
            flex: 1 !important; padding: 20px !important; overflow-y: auto !important; background: #F7F4EB !important;
            display: flex !important; flex-direction: column !important; gap: 10px !important;
        }
        .chat-msg { max-width: 80% !important; padding: 10px 14px !important; border-radius: 12px !important; font-size: 13px !important; line-height: 1.5 !important; }
        .chat-msg.customer { background: #264F40 !important; color: white !important; align-self: flex-end !important; border-bottom-right-radius: 2px !important; }
        .chat-msg.admin { background: #FFFDF8 !important; color: #243A30 !important; align-self: flex-start !important; border-bottom-left-radius: 2px !important; border: 1px solid #E4E2D7 !important; }
        .chat-footer {
            display: flex !important; padding: 10px !important; background: #FFFDF8 !important; border-top: 1px solid #E4E2D7 !important;
        }
        .chat-footer input {
            flex: 1 !important; border: none !important; outline: none !important; padding: 10px !important; font-size: 13px !important; font-family: inherit !important; background: transparent !important;
        }
        .chat-footer button {
            background: #264F40 !important; color: white !important; border: none !important; width: 40px !important; height: 40px !important; border-radius: 50% !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important;
        }
    `;
    document.head.appendChild(styleTag);

    // 3. TỰ ĐỘNG CHÈN HTML
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
                <div class="chat-msg admin">Xin chào! Mộc Yên có thể giúp gì cho bạn?</div>
            </div>
            <div class="chat-footer">
                <input type="text" id="chat-input" placeholder="Nhập tin nhắn...">
                <button id="chat-send">➤</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', widgetHTML);

    // 4. Lấy thông tin User đang đăng nhập
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

    // 5. Bắt buộc đăng nhập mới được chat
    btn.addEventListener("click", () => {
        if (!currentUser) {
            if (confirm("Vui lòng đăng nhập để chat với Admin. Bạn có muốn chuyển đến trang Đăng nhập không?")) {
                window.location.href = `login.html?redirect=${encodeURIComponent(window.location.pathname.split('/').pop())}`;
            }
            return;
        }
        box.classList.toggle("hidden");
        if (!box.classList.contains("hidden")) {
            chatBody.scrollTop = chatBody.scrollHeight;
        }
    });

    closeBtn.addEventListener("click", () => box.classList.add("hidden"));

    // 6. Khởi tạo Socket và lấy tin nhắn
    if (currentUser) {
        const userId = currentUser.id;

        const socketScript = document.createElement('script');
        socketScript.src = "https://unpkg.com/socket.io-client@4.7.2/dist/socket.io.min.js";
        document.body.appendChild(socketScript);

        socketScript.onload = () => {
            const socket = io("https://mocyen-web.onrender.com"); 
            socket.emit('customer_join', userId);

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

            function displayMessage(text, sender) {
                const div = document.createElement("div");
                div.className = `chat-msg ${sender}`;
                div.textContent = text;
                chatBody.appendChild(div);
                chatBody.scrollTop = chatBody.scrollHeight;
            }

            function sendMessage() {
                const text = input.value.trim();
                if (!text) return;
                input.value = "";
                
                socket.emit('send_message', { user_id: userId, sender: 'customer', message: text });
                displayMessage(text, 'customer');
            }

            sendBtn.addEventListener("click", sendMessage);
            input.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

            socket.on('receive_message', (data) => {
                if (data.user_id == userId && data.sender === 'admin') {
                    displayMessage(data.message, 'admin');
                }
            });
        };
    }
})();