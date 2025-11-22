// script.js

// --- CẤU HÌNH ---
// Đã cập nhật API Key và Model Gemini 2.0 Flash từ cURL của bạn
const API_KEY = "AIzaSyCkCWIf9Imq75iF7dnxteojeVxEfS018ns"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// --- QUẢN LÝ LỊCH SỬ (LOCAL STORAGE) ---
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

// Hàm lưu lịch sử vào LocalStorage
function saveHistory() {
    localStorage.setItem('chatHistory', JSON.stringify(chatHistory));
}

// Hàm xóa lịch sử
function clearChat() {
    if(confirm("Bạn có chắc muốn xóa toàn bộ lịch sử chat?")) {
        chatHistory = [];
        saveHistory();
        location.reload(); // Tải lại trang để reset giao diện
    }
}

// Hàm tải lại lịch sử cũ khi mở trang
function loadHistory() {
    chatHistory.forEach(msg => {
        appendMessage(msg.role, msg.text, false); // false nghĩa là không lưu lại lần nữa
    });
    scrollToBottom();
}

// --- GIAO DIỆN ---

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Tự động chỉnh độ cao textarea khi gõ
userInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    if(this.value === '') this.style.height = 'auto';
});

// Xử lý hiển thị tin nhắn
function appendMessage(role, text, save = true) {
    const isUser = role === 'user';
    
    // HTML cho tin nhắn
    const msgHTML = `
        <div class="flex gap-4 ${isUser ? 'flex-row-reverse' : ''}">
            <div class="w-8 h-8 rounded-full ${isUser ? 'bg-gray-600' : 'bg-blue-600'} flex-shrink-0 flex items-center justify-center">
                <i class="fa-solid ${isUser ? 'fa-user' : 'fa-robot'} text-sm"></i>
            </div>
            <div class="flex-1 space-y-2 flex ${isUser ? 'justify-end' : 'justify-start'}">
                <div class="p-4 rounded-2xl ${isUser ? 'bg-gray-700 rounded-tr-none text-white' : 'bg-gray-800 rounded-tl-none text-gray-100 shadow-lg'} max-w-3xl prose">
                    ${isUser ? text : marked.parse(text)} 
                </div>
            </div>
        </div>
    `;

    chatContainer.insertAdjacentHTML('beforeend', msgHTML);
    scrollToBottom();

    if (save) {
        chatHistory.push({ role, text });
        saveHistory();
    }
}

// Hiển thị hiệu ứng "Đang gõ..."
function showLoading() {
    const loadingHTML = `
        <div id="loading-indicator" class="flex gap-4">
            <div class="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">
                <i class="fa-solid fa-robot text-sm"></i>
            </div>
            <div class="bg-gray-800 p-4 rounded-2xl rounded-tl-none">
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                    <div class="w-2 h-2 bg-gray-400 rounded-full typing-dot"></div>
                </div>
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', loadingHTML);
    scrollToBottom();
}

function hideLoading() {
    const loadingElement = document.getElementById('loading-indicator');
    if (loadingElement) loadingElement.remove();
}

// --- GỌI API GEMINI ---

async function generateResponse(userMessage) {
    // Chuẩn bị ngữ cảnh (Context)
    // Chúng ta ghép KNOWLEDGE_BASE vào phần hướng dẫn hệ thống
    
    // Lưu ý: Gemini 2.0 Flash rất thông minh, ta có thể dùng cấu trúc đơn giản
    const prompt = {
        contents: [
            {
                parts: [
                    // Nhúng kiến thức (KNOWLEDGE_BASE) vào ngữ cảnh
                    { text: `SYSTEM INSTRUCTION / CONTEXT:\n${KNOWLEDGE_BASE}\n\nUSER QUESTION:\n${userMessage}` }
                ]
            }
        ]
    };

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prompt)
        });

        const data = await response.json();
        
        // Kiểm tra lỗi trả về từ API
        if (data.error) {
            console.error("API Error Detail:", data.error);
            throw new Error(data.error.message || "Lỗi không xác định từ Google API");
        }

        // Lấy nội dung trả lời
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
             return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error("AI không trả về nội dung văn bản.");
        }

    } catch (error) {
        console.error("Lỗi kết nối:", error);
        return `⚠️ Gặp sự cố: ${error.message}. Hãy kiểm tra lại API Key hoặc kết nối mạng.`;
    }
}

// --- XỬ LÝ SỰ KIỆN ---

async function handleSend() {
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Hiển thị tin nhắn người dùng
    appendMessage('user', text);
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;

    // 2. Hiển thị loading
    showLoading();

    // 3. Gọi API
    const aiResponse = await generateResponse(text);

    // 4. Ẩn loading và hiện tin nhắn AI
    hideLoading();
    appendMessage('model', aiResponse);
    sendBtn.disabled = false;
}

sendBtn.addEventListener('click', handleSend);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Khởi động
loadHistory();