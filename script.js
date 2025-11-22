// script.js - Phiên bản Pro (Phát Đại AI) - Hỗ trợ Word/PDF

// --- CẤU HÌNH ---
const API_KEY = "AIzaSyCkCWIf9Imq75iF7dnxteojeVxEfS018ns"; 
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// GIỚI HẠN FILE: 10MB (Tính theo bytes)
const MAX_FILE_SIZE = 1024 * 1024 * 1024; 

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const emptyState = document.getElementById('empty-state');
const filePreviewArea = document.getElementById('file-preview-area');

let chatHistory = JSON.parse(localStorage.getItem('pd_study_history')) || [];
let pendingFiles = []; 

// --- SYSTEM PROMPT ---
function getSystemPrompt(knowledgeData) {
    return `
BẠN LÀ: "Phát Đại AI" - Giảng viên Đại học ảo chuyên sâu.
NGƯỜI TẠO RA BẠN LÀ: Phát Đại.

NHIỆM VỤ: Hỗ trợ người dùng học tập dựa trên DỮ LIỆU ĐƯỢC CUNG CẤP và CÁC TỆP ĐÍNH KÈM.

--- KNOWLEDGE BASE (DỮ LIỆU GỐC) ---
${knowledgeData}
--- KẾT THÚC DỮ LIỆU ---

QUY TẮC ỨNG XỬ (STRICT RULES):
1.  **XỬ LÝ TỆP:** Người dùng có thể gửi kèm nội dung từ file Word, PDF hoặc Ảnh. Hãy phân tích nội dung đó kết hợp với Knowledge Base để trả lời.
2.  **NGÔN NGỮ:**
    - Hỏi Anh -> Trả lời Anh (Academic).
    - Hỏi Việt -> Trả lời Việt.
3.  **PHONG CÁCH (LECTURER):**
    - Giải thích cặn kẽ, logic.
    - **TRÍCH DẪN:** Ghi rõ nguồn thông tin (VD: [Nguồn: Chương 1] hoặc [Nguồn: File đính kèm]).
4.  **ĐỊNH DẠNG:**
    - Markdown chuẩn.
    - Toán học: Dùng LaTeX trong dấu $ (ví dụ $E=mc^2$).
    - Code: Dùng block code.
`;
}

// --- QUẢN LÝ UI & UTILS ---

function saveHistory() { localStorage.setItem('pd_study_history', JSON.stringify(chatHistory)); }

function clearChat() {
    if(confirm("Xóa lịch sử và bắt đầu phiên mới?")) {
        chatHistory = [];
        saveHistory();
        location.reload();
    }
}

function scrollToBottom() { chatContainer.scrollTop = chatContainer.scrollHeight; }

function adjustTextareaHeight() {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 200) + 'px';
}
userInput.addEventListener('input', adjustTextareaHeight);

// --- RENDER MESSAGE ---

function renderContent(element) {
    // Render Math (KaTeX)
    renderMathInElement(element, {
        delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '$', right: '$', display: false}
        ],
        throwOnError: false
    });

    // Highlight Code
    element.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
    });
}

function appendMessage(role, text, attachments = [], save = true) {
    if (emptyState) emptyState.style.display = 'none';
    const isUser = role === 'user';
    
    // Render Attachments Preview trong tin nhắn
    let attHTML = '';
    if (attachments?.length) {
        attHTML = '<div class="flex gap-2 flex-wrap mb-3">';
        attachments.forEach(att => {
            let iconClass = 'fa-file';
            let typeName = 'File';
            
            if (att.mimeType.startsWith('image/')) {
                iconClass = 'fa-image'; typeName = 'Ảnh';
            } else if (att.mimeType === 'application/pdf') {
                iconClass = 'fa-file-pdf'; typeName = 'PDF';
            } else if (att.isWord) {
                iconClass = 'fa-file-word'; typeName = 'Word';
            }

            // Nếu là ảnh thì hiện thumbnail, còn lại hiện icon
            if (att.mimeType.startsWith('image/')) {
                attHTML += `<img src="data:${att.mimeType};base64,${att.data}" class="h-20 rounded-lg border border-slate-700 object-cover">`;
            } else {
                attHTML += `<div class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-indigo-300 flex items-center gap-2">
                    <i class="fa-solid ${iconClass}"></i> 
                    <div class="flex flex-col">
                        <span class="font-bold text-white">${typeName}</span>
                        <span class="text-[9px] opacity-70 truncate max-w-[80px]">${att.name}</span>
                    </div>
                </div>`;
            }
        });
        attHTML += '</div>';
    }

    const msgDiv = document.createElement('div');
    msgDiv.className = `flex gap-4 ${isUser ? 'flex-row-reverse' : ''} mb-8 message-animation`;
    
    msgDiv.innerHTML = `
        <div class="w-10 h-10 rounded-full ${isUser ? 'bg-slate-700' : 'bg-indigo-600'} flex-shrink-0 flex items-center justify-center shadow-lg border border-white/10">
            <i class="fa-solid ${isUser ? 'fa-user' : 'fa-robot'} text-sm text-white"></i>
        </div>
        <div class="flex-1 min-w-0 flex ${isUser ? 'justify-end' : 'justify-start'}">
            <div class="p-5 rounded-2xl ${isUser ? 'bg-slate-800 text-white border border-slate-700' : 'bg-[#1E293B]/90 border border-indigo-500/20 shadow-xl w-full max-w-3xl'}">
                ${attHTML}
                <div class="prose prose-invert text-sm md:text-base leading-relaxed break-words content-body"></div>
            </div>
        </div>
    `;

    const contentBody = msgDiv.querySelector('.content-body');
    if (isUser) {
        contentBody.innerText = text; 
        contentBody.className += " whitespace-pre-wrap";
    } else {
        contentBody.innerHTML = marked.parse(text);
        renderContent(contentBody);
    }

    chatContainer.appendChild(msgDiv);
    scrollToBottom();

    if (save) {
        chatHistory.push({ role, parts: [{ text }] }); // Chỉ lưu text lịch sử
        saveHistory();
    }
}

// --- XỬ LÝ FILE (LOGIC PHỨC TẠP NHẤT) ---

async function handleFiles(input) {
    if (!input.files.length) return;
    const files = Array.from(input.files);
    
    // Giới hạn số lượng file gửi 1 lần (ví dụ 3 file)
    if (files.length > 3) {
        alert("Vui lòng chỉ gửi tối đa 3 file cùng lúc.");
        return;
    }

    for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
            alert(`File "${file.name}" quá lớn (>10MB). Vui lòng nén nhỏ lại.`);
            continue;
        }

        try {
            // 1. Xử lý file WORD (.docx) -> Chuyển thành Text
            if (file.name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
                const arrayBuffer = await readFileAsArrayBuffer(file);
                const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                pendingFiles.push({
                    type: 'text_content', // Đánh dấu là nội dung text trích xuất
                    name: file.name,
                    content: `\n\n--- NỘI DUNG FILE WORD: ${file.name} ---\n${result.value}\n--- HẾT FILE ---\n`,
                    isWord: true,
                    mimeType: 'application/msword' // Fake mime để hiển thị icon
                });
            }
            // 2. Xử lý file PDF, ẢNH, TEXT -> Base64 cho Gemini
            else {
                const base64Data = await readFileAsBase64(file);
                let mime = file.type;
                
                // Chuẩn hóa mime type cho PDF nếu trình duyệt nhận sai
                if (file.name.endsWith('.pdf')) mime = 'application/pdf';
                
                pendingFiles.push({
                    type: 'media', // Đánh dấu là media gửi qua inline_data
                    name: file.name,
                    data: base64Data,
                    mimeType: mime
                });
            }
        } catch (err) {
            console.error(err);
            alert(`Lỗi đọc file ${file.name}: ${err.message}`);
        }
    }
    
    input.value = ''; // Reset input
    renderFilePreview();
}

// Helper: Đọc file thành ArrayBuffer (cho Mammoth)
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Helper: Đọc file thành Base64 (cho Gemini)
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function renderFilePreview() {
    filePreviewArea.innerHTML = '';
    if (pendingFiles.length > 0) {
        filePreviewArea.classList.remove('hidden');
        pendingFiles.forEach((f, i) => {
            const div = document.createElement('div');
            div.className = "relative group flex-shrink-0 w-24 h-24 bg-slate-800 border border-slate-600 rounded-xl flex flex-col items-center justify-center overflow-hidden cursor-default";
            
            let icon = 'fa-file';
            let color = 'text-slate-400';
            
            if (f.mimeType?.startsWith('image/')) {
                div.innerHTML = `<img src="data:${f.mimeType};base64,${f.data}" class="w-full h-full object-cover opacity-70">`;
            } else {
                if (f.mimeType === 'application/pdf') { icon = 'fa-file-pdf'; color = 'text-red-400'; }
                else if (f.isWord) { icon = 'fa-file-word'; color = 'text-blue-400'; }
                else if (f.mimeType?.includes('text')) { icon = 'fa-file-lines'; color = 'text-gray-400'; }
                
                div.innerHTML = `
                    <i class="fa-solid ${icon} ${color} text-2xl mb-1"></i>
                    <span class="text-[9px] text-slate-300 px-1 text-center truncate w-full">${f.name}</span>
                `;
            }
            
            div.innerHTML += `<button onclick="removeFile(${i})" class="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] hover:bg-red-600 transition shadow-md"><i class="fa-solid fa-xmark"></i></button>`;
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

// --- GỌI API GEMINI ---

async function handleSend() {
    if (!window.isKnowledgeLoaded) {
        alert("⚠️ Dữ liệu chưa nạp xong. Vui lòng đợi.");
        return;
    }

    let text = userInput.value.trim();
    if (!text && pendingFiles.length === 0) return;

    // Tách danh sách file: Cái nào là Text Content (Word), cái nào là Media (PDF/Image)
    const textFiles = pendingFiles.filter(f => f.type === 'text_content');
    const mediaFiles = pendingFiles.filter(f => f.type === 'media');

    // Gộp nội dung file Word vào prompt text
    if (textFiles.length > 0) {
        textFiles.forEach(f => {
            text += f.content;
        });
    }

    // UI: Hiển thị tin nhắn User
    appendMessage('user', userInput.value.trim() || "[Gửi tệp đính kèm]", pendingFiles);
    
    // Reset UI
    userInput.value = '';
    userInput.style.height = 'auto';
    pendingFiles = [];
    renderFilePreview();
    sendBtn.disabled = true;

    // UI: Loading
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.className = 'flex gap-4 mb-6';
    loadingDiv.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center"><i class="fa-solid fa-robot text-white animate-spin"></i></div>
        <div class="bg-slate-800 p-4 rounded-2xl rounded-tl-none border border-slate-700 flex items-center gap-2">
            <span class="text-sm text-slate-400">Phát Đại AI đang nghiên cứu...</span>
            <div class="typing-dot w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
            <div class="typing-dot w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
        </div>`;
    chatContainer.appendChild(loadingDiv);
    scrollToBottom();

    // Logic Context: Lấy 10 tin nhắn gần nhất
    const historyParts = chatHistory.slice(-10).map(msg => ({
        role: msg.role,
        parts: msg.parts
    }));

    // Xây dựng phần hiện tại
    const currentParts = [];
    if (text) currentParts.push({ text }); // Text bao gồm cả nội dung file Word đã trích xuất
    
    // Đính kèm PDF/Image (Base64)
    mediaFiles.forEach(f => {
        currentParts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
    });

    const requestBody = {
        system_instruction: { parts: [{ text: getSystemPrompt(window.SYSTEM_KNOWLEDGE) }] },
        contents: [...historyParts, { role: "user", parts: currentParts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8000 }
    };

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody)
        });
        const data = await res.json();
        document.getElementById('loading-indicator').remove();
        
        if (data.error) throw new Error(data.error.message);
        const aiResponse = data.candidates[0].content.parts[0].text;
        appendMessage('model', aiResponse);

    } catch (err) {
        document.getElementById('loading-indicator')?.remove();
        appendMessage('model', `⚠️ **Lỗi hệ thống:** ${err.message}. (Có thể file quá lớn hoặc API quá tải)`);
    } finally {
        sendBtn.disabled = false;
        userInput.focus();
    }
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
});

if (chatHistory.length > 0) {
    if(emptyState) emptyState.style.display = 'none';
    chatHistory.forEach(msg => appendMessage(msg.role, msg.parts[0].text, [], false));
}