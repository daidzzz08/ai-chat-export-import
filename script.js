// script.js

// --- CẤU HÌNH ---
const API_KEY = "AIzaSyCkCWIf9Imq75iF7dnxteojeVxEfS018ns"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const emptyState = document.getElementById('empty-state');
const fileInput = document.getElementById('file-upload');
const filePreviewArea = document.getElementById('file-preview-area');

// Lưu trữ lịch sử chat và các file đang chờ gửi
let chatHistory = JSON.parse(localStorage.getItem('studyChatHistory')) || [];
let pendingFiles = []; // Danh sách file người dùng chọn nhưng chưa bấm gửi

// --- SYSTEM PROMPT (CHỈ THỊ CỐT LÕI) ---
function getSystemPrompt(knowledgeData) {
    return `
BẠN LÀ MỘT TRỢ LÝ HỌC TẬP (STUDY COMPANION) THÔNG MINH.
Nhiệm vụ: Hỗ trợ người dùng học tập dựa trên ngữ cảnh cuộc trò chuyện và DỮ LIỆU NỀN TẢNG.

--- DỮ LIỆU NỀN TẢNG (KNOWLEDGE BASE) ---
${knowledgeData}
--- KẾT THÚC DỮ LIỆU ---

NGUYÊN TẮC TRẢ LỜI:
1.  **Ưu tiên dữ liệu nền tảng:** Luôn kiểm tra dữ liệu được cung cấp trước.
2.  **Ngữ cảnh (Context Aware):** Hãy nhớ những gì người dùng và bạn đã trao đổi trước đó trong phiên làm việc này.
3.  **Xử lý File:** Nếu người dùng gửi ảnh hoặc đoạn văn bản, hãy phân tích chúng kết hợp với kiến thức nền tảng.
4.  **Định dạng:** Dùng Markdown. In đậm các ý chính. Nếu có công thức, trình bày rõ ràng.
5.  **Trung thực:** Nếu không biết, hãy nói không biết, đừng bịa đặt thông tin sai lệch.
`;
}

// --- QUẢN LÝ LỊCH SỬ & GIAO DIỆN ---

function saveHistory() { localStorage.setItem('studyChatHistory', JSON.stringify(chatHistory)); }

function clearChat() {
    if(confirm("Bắt đầu phiên học mới?")) {
        chatHistory = [];
        saveHistory();
        location.reload();
    }
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = (userInput.scrollHeight) + 'px';
    if(userInput.value === '') userInput.style.height = 'auto';
}
userInput.addEventListener('input', adjustTextareaHeight);

function quickAction(text) {
    userInput.value = text;
    userInput.focus();
    adjustTextareaHeight();
    handleSend();
}

// Hiển thị tin nhắn lên màn hình
function appendMessage(role, text, attachments = [], save = true) {
    if (emptyState) emptyState.style.display = 'none';
    
    const isUser = role === 'user';
    
    // Xử lý hiển thị file đính kèm trong tin nhắn cũ
    let attachmentHTML = '';
    if (attachments && attachments.length > 0) {
        attachmentHTML = `<div class="flex gap-2 flex-wrap mb-2">`;
        attachments.forEach(att => {
            if (att.mimeType.startsWith('image/')) {
                attachmentHTML += `<img src="data:${att.mimeType};base64,${att.data}" class="h-32 rounded-lg border border-slate-600 object-cover">`;
            } else {
                attachmentHTML += `<div class="p-2 bg-slate-800 rounded border border-slate-600 text-xs flex items-center"><i class="fa-solid fa-file-lines mr-2"></i> File đính kèm</div>`;
            }
        });
        attachmentHTML += `</div>`;
    }

    const msgHTML = `
        <div class="flex gap-4 ${isUser ? 'flex-row-reverse' : ''} mb-6 message-animation">
            <div class="w-8 h-8 rounded-full ${isUser ? 'bg-slate-700 border border-slate-600' : 'bg-gradient-to-br from-indigo-500 to-purple-600'} flex-shrink-0 flex items-center justify-center shadow-lg">
                <i class="fa-solid ${isUser ? 'fa-user' : 'fa-brain'} text-xs text-white"></i>
            </div>
            <div class="flex-1 space-y-2 flex ${isUser ? 'justify-end' : 'justify-start'}">
                <div class="p-4 rounded-2xl ${isUser ? 'bg-slate-800 text-slate-100 rounded-tr-none border border-slate-700' : 'bg-[#1e293b]/80 backdrop-blur border border-slate-700/50 text-slate-200 rounded-tl-none shadow-md'} max-w-3xl">
                    ${attachmentHTML}
                    <div class="prose prose-invert prose-sm leading-relaxed whitespace-pre-wrap">${isUser ? text : marked.parse(text)}</div>
                </div>
            </div>
        </div>
    `;

    chatContainer.insertAdjacentHTML('beforeend', msgHTML);
    scrollToBottom();

    if (save) {
        // Lưu ý: Để tiết kiệm bộ nhớ LocalStorage, ta có thể chọn không lưu toàn bộ base64 ảnh cũ,
        // hoặc chỉ lưu text. Ở đây tôi lưu text để đơn giản hóa.
        chatHistory.push({ 
            role, 
            parts: [{ text: text }] 
            // Không lưu attachments vào localStorage để tránh lỗi Quota Exceeded
        });
        saveHistory();
    }
}

// --- XỬ LÝ FILE (ĐỌC FILE CLIENT-SIDE) ---

function handleFiles(input) {
    const files = input.files;
    if (!files.length) return;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function(e) {
            const base64Data = e.target.result.split(',')[1]; // Lấy data sau dấu phẩy
            const fileObj = {
                mimeType: file.type,
                data: base64Data,
                name: file.name
            };
            
            pendingFiles.push(fileObj);
            renderFilePreview();
        };

        reader.readAsDataURL(file);
    }
    // Reset input để chọn lại cùng file nếu muốn
    input.value = '';
}

function renderFilePreview() {
    filePreviewArea.innerHTML = '';
    if (pendingFiles.length > 0) {
        filePreviewArea.classList.remove('hidden');
        pendingFiles.forEach((file, index) => {
            const isImage = file.mimeType.startsWith('image/');
            const div = document.createElement('div');
            div.className = "relative group flex-shrink-0";
            div.innerHTML = `
                <div class="w-16 h-16 rounded-lg border border-slate-600 bg-slate-800 flex items-center justify-center overflow-hidden relative">
                    ${isImage 
                        ? `<img src="data:${file.mimeType};base64,${file.data}" class="w-full h-full object-cover opacity-80">` 
                        : `<i class="fa-solid fa-file-lines text-slate-400 text-xl"></i>`
                    }
                </div>
                <button onclick="removeFile(${index})" class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-600 shadow-sm z-10"><i class="fa-solid fa-xmark"></i></button>
                <span class="text-[9px] text-slate-400 truncate w-16 block mt-1 text-center">${file.name}</span>
            `;
            filePreviewArea.appendChild(div);
        });
    } else {
        filePreviewArea.classList.add('hidden');
    }
}

window.removeFile = function(index) {
    pendingFiles.splice(index, 1);
    renderFilePreview();
}

// --- LOGIC GỌI API (QUAN TRỌNG NHẤT: CONTEXT MEMORY) ---

async function handleSend() {
    if (!window.isKnowledgeLoaded) {
        alert("Đang nạp dữ liệu, vui lòng đợi giây lát...");
        return;
    }

    const text = userInput.value.trim();
    // Nếu không có chữ và không có file thì không gửi
    if (!text && pendingFiles.length === 0) return;

    // 1. Hiển thị tin nhắn người dùng (kèm file preview nếu có)
    const currentAttachments = [...pendingFiles]; // Copy lại để hiển thị
    appendMessage('user', text, currentAttachments); // Hiển thị UI

    // Reset UI Input
    userInput.value = '';
    userInput.style.height = 'auto';
    pendingFiles = []; // Xóa danh sách chờ sau khi đã đẩy vào xử lý
    renderFilePreview();
    sendBtn.disabled = true;

    // 2. Hiển thị Loading
    showLoading();

    // 3. Xây dựng Payload gửi đi (Bao gồm Lịch sử + Tin nhắn mới + File)
    
    // Bước 3a: System Instruction
    const systemPrompt = getSystemPrompt(window.SYSTEM_KNOWLEDGE);
    
    // Bước 3b: Xây dựng lịch sử hội thoại (Chat History)
    // Lưu ý: Google API yêu cầu xen kẽ User - Model.
    let contents = [];
    
    // Lấy 10 tin nhắn gần nhất để làm ngữ cảnh (tránh quá tải token)
    const recentHistory = chatHistory.slice(-10); 
    
    recentHistory.forEach(msg => {
        contents.push({
            role: msg.role,
            parts: msg.parts // Đã lưu dưới dạng [{text: "..."}]
        });
    });

    // Bước 3c: Tạo tin nhắn hiện tại (Text + Attachments)
    const currentParts = [];
    
    // Thêm text
    if (text) currentParts.push({ text: text });
    
    // Thêm file (Image/Text) vào parts
    currentAttachments.forEach(file => {
        currentParts.push({
            inline_data: {
                mime_type: file.mimeType,
                data: file.data
            }
        });
    });

    // Đẩy tin nhắn hiện tại vào contents
    contents.push({
        role: "user",
        parts: currentParts
    });

    // Cấu trúc request hoàn chỉnh
    const requestBody = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: contents,
        generationConfig: {
            temperature: 0.4, 
            maxOutputTokens: 4000,
        }
    };

    // 4. Gọi API
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        hideLoading();

        if (data.error) throw new Error(data.error.message);
        
        const aiResponse = data.candidates[0].content.parts[0].text;
        appendMessage('model', aiResponse);

    } catch (error) {
        hideLoading();
        appendMessage('model', `⚠️ **Lỗi hệ thống:** ${error.message}. Vui lòng kiểm tra API Key hoặc file quá lớn.`);
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

// --- UTILS HIỂN THỊ LOADING ---
function showLoading() {
    const html = `
        <div id="loading-indicator" class="flex gap-4 mb-6">
            <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                <i class="fa-solid fa-brain text-xs text-white animate-pulse"></i>
            </div>
            <div class="bg-slate-800 p-3 rounded-2xl rounded-tl-none border border-slate-700">
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></div>
                    <div class="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></div>
                    <div class="w-2 h-2 bg-indigo-400 rounded-full typing-dot"></div>
                </div>
            </div>
        </div>`;
    chatContainer.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
}

function hideLoading() {
    const el = document.getElementById('loading-indicator');
    if (el) el.remove();
}

// --- EVENTS ---
sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
});

// Khôi phục lịch sử cũ (Chỉ Text)
if (chatHistory.length > 0) {
    if(emptyState) emptyState.style.display = 'none';
    chatHistory.forEach(msg => {
        // Chỉ lấy phần text để hiển thị lại lịch sử
        const textPart = msg.parts.find(p => p.text);
        if(textPart) appendMessage(msg.role, textPart.text, [], false);
    });
}