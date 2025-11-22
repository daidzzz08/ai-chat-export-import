// script.js

// --- CẤU HÌNH ---
const API_KEY = "AIzaSyCkCWIf9Imq75iF7dnxteojeVxEfS018ns"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const emptyState = document.getElementById('empty-state');
const micBtn = document.getElementById('mic-btn');
const imageUploadInput = document.getElementById('image-upload');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');

let currentImageBase64 = null;
let currentImageMimeType = null;
let chatHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];

// --- HÀM TIỆN ÍCH ---

function saveHistory() { localStorage.setItem('chatHistory', JSON.stringify(chatHistory)); }

function clearChat() {
    if(confirm("Xóa sạch dữ liệu chat?")) {
        chatHistory = [];
        saveHistory();
        location.reload();
    }
}

function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
    if(userInput.value === '') userInput.style.height = 'auto';
}
userInput.addEventListener('input', adjustTextareaHeight);

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function quickAction(text) {
    userInput.value = text;
    userInput.focus();
}

// --- XỬ LÝ ẢNH ---
function handleImageUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            currentImageBase64 = e.target.result.split(',')[1];
            currentImageMimeType = file.type;
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('hidden');
            userInput.focus();
        }
        reader.readAsDataURL(file);
    }
}

function removeImage() {
    currentImageBase64 = null;
    currentImageMimeType = null;
    imageUploadInput.value = '';
    imagePreviewContainer.classList.add('hidden');
}

// --- VOICE ---
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;

    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('recording-pulse')) {
            recognition.stop();
        } else {
            recognition.start();
        }
    });

    recognition.onstart = () => {
        micBtn.classList.add('recording-pulse');
        userInput.placeholder = "Đang nghe...";
    };

    recognition.onend = () => {
        micBtn.classList.remove('recording-pulse');
        userInput.placeholder = "Hỏi gì đó...";
        userInput.focus();
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value += transcript + " ";
        adjustTextareaHeight();
    };
} else {
    micBtn.style.display = 'none';
}

// --- HIỂN THỊ TIN NHẮN ---
function appendMessage(role, text, imageSrc = null, save = true) {
    if (emptyState) emptyState.style.display = 'none';
    
    const isUser = role === 'user';
    let imageHTML = imageSrc ? `<img src="${imageSrc}" class="max-h-48 rounded-lg mb-2 border border-gray-600">` : '';

    const msgHTML = `
        <div class="flex gap-4 ${isUser ? 'flex-row-reverse' : ''} message-animation">
            <div class="w-9 h-9 rounded-full ${isUser ? 'bg-gray-700' : 'bg-gradient-to-br from-blue-600 to-blue-500'} flex-shrink-0 flex items-center justify-center shadow-lg">
                <i class="fa-solid ${isUser ? 'fa-user' : 'fa-robot'} text-sm text-white"></i>
            </div>
            <div class="flex-1 space-y-2 flex ${isUser ? 'justify-end' : 'justify-start'}">
                <div class="p-4 rounded-2xl ${isUser ? 'bg-blue-600/20 border border-blue-500/30 text-white rounded-tr-none' : 'bg-gray-800/80 border border-gray-700 backdrop-blur-sm text-gray-100 rounded-tl-none shadow-xl'} max-w-3xl prose">
                    ${imageHTML}
                    ${isUser ? text : marked.parse(text)} 
                </div>
            </div>
        </div>
    `;

    chatContainer.insertAdjacentHTML('beforeend', msgHTML);
    scrollToBottom();

    if (save) {
        chatHistory.push({ role, text, hasImage: !!imageSrc });
        saveHistory();
    }
}

function showLoading() {
    const loadingHTML = `
        <div id="loading-indicator" class="flex gap-4 message-animation">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex-shrink-0 flex items-center justify-center">
                <i class="fa-solid fa-robot text-sm text-white"></i>
            </div>
            <div class="bg-gray-800/80 border border-gray-700 p-4 rounded-2xl rounded-tl-none">
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-blue-400 rounded-full typing-dot"></div>
                    <div class="w-2 h-2 bg-purple-400 rounded-full typing-dot"></div>
                    <div class="w-2 h-2 bg-pink-400 rounded-full typing-dot"></div>
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

// --- GỌI API GEMINI (LOGIC QUAN TRỌNG) ---

async function generateResponse(userMessage, imageBase64 = null, imageMime = null) {
    
    // Lấy dữ liệu từ file loader
    const knowledge = window.SYSTEM_KNOWLEDGE || "Chưa có dữ liệu.";

    const requestBody = {
        // NHÚNG DỮ LIỆU ĐÃ NẠP VÀO ĐÂY
        system_instruction: {
            parts: [
                { text: `Bạn là trợ lý AI Xuất Nhập Khẩu. Hãy sử dụng thông tin sau để trả lời:\n\n${knowledge}` } 
            ]
        },
        contents: [
            {
                role: "user",
                parts: []
            }
        ],
        generationConfig: {
            temperature: 0.5, // Giảm xuống để bot trả lời chính xác theo tài liệu hơn
            maxOutputTokens: 2000,
        }
    };

    requestBody.contents[0].parts.push({ text: userMessage });

    if (imageBase64 && imageMime) {
        requestBody.contents[0].parts.push({
            inline_data: {
                mime_type: imageMime,
                data: imageBase64
            }
        });
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error.message);

        if (data.candidates && data.candidates[0].content) {
             return data.candidates[0].content.parts[0].text;
        } else {
            return "Hmm, tôi không nghĩ ra câu trả lời.";
        }

    } catch (error) {
        console.error("Lỗi API:", error);
        return `⚠️ Lỗi: ${error.message}`;
    }
}

// --- SỰ KIỆN GỬI ---

async function handleSend() {
    // Chặn nếu dữ liệu chưa load xong
    if (!window.isKnowledgeLoaded) {
        alert("Đang nạp dữ liệu kiến thức, vui lòng đợi 2-3 giây!");
        return;
    }

    const text = userInput.value.trim();
    const imgData = currentImageBase64;
    const imgMime = currentImageMimeType;

    if (!text && !imgData) return;

    let displayImageSrc = imgData ? imagePreview.src : null;
    
    appendMessage('user', text, displayImageSrc);
    
    // Reset UI
    userInput.value = '';
    userInput.style.height = 'auto';
    removeImage(); 
    sendBtn.disabled = true;

    showLoading();

    const aiResponse = await generateResponse(text, imgData, imgMime);

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

// Load lịch sử (chỉ text)
if (chatHistory.length > 0 && emptyState) {
    emptyState.style.display = 'none';
    chatHistory.forEach(msg => appendMessage(msg.role, msg.text, null, false));
    scrollToBottom();
}