// Biến toàn cục để chứa kiến thức, giúp script.js có thể truy cập được
window.SYSTEM_KNOWLEDGE = "";
window.isKnowledgeLoaded = false;

async function loadKnowledgeBase() {
    const statusDiv = document.getElementById('knowledge-status');
    const statusText = document.getElementById('status-text');
    
    console.log("🚀 Bắt đầu nạp dữ liệu...");

    try {
        // 1. Đọc file manifest để lấy danh sách
        const response = await fetch('knowledge/manifest.json');
        if (!response.ok) throw new Error("Không tìm thấy file manifest.json");
        
        const files = await response.json();
        let combinedData = "DƯỚI ĐÂY LÀ TÀI LIỆU CỦA DOANH NGHIỆP, HÃY TRẢ LỜI DỰA THEO ĐÓ:\n\n";

        // 2. Vòng lặp đọc từng file trong danh sách
        for (const item of files) {
            if (statusText) statusText.innerText = `Đang đọc: ${item.file}...`;
            
            try {
                const fileRes = await fetch(`knowledge/${item.file}`);
                if (fileRes.ok) {
                    const content = await fileRes.text();
                    combinedData += `--- TÀI LIỆU: ${item.description} (Nguồn: ${item.file}) ---\n`;
                    combinedData += content + "\n\n";
                    console.log(`✅ Đã nạp: ${item.file}`);
                } else {
                    console.warn(`❌ Không đọc được file: ${item.file}`);
                }
            } catch (err) {
                console.warn(`Lỗi khi đọc file ${item.file}:`, err);
            }
        }

        combinedData += "--- HẾT TÀI LIỆU ---\n";
        
        // 3. Gán vào biến toàn cục
        window.SYSTEM_KNOWLEDGE = combinedData;
        window.isKnowledgeLoaded = true;
        
        // 4. Cập nhật giao diện báo thành công
        if (statusDiv) {
            statusText.innerText = "Dữ liệu đã sẵn sàng";
            statusText.classList.remove('text-yellow-400');
            statusText.classList.add('text-green-400', 'font-bold');
            
            // Ẩn dòng thông báo sau 3 giây cho gọn
            setTimeout(() => {
                statusDiv.style.opacity = '0';
            }, 3000);
        }

    } catch (error) {
        console.error("🔥 Lỗi nạp dữ liệu:", error);
        if (statusText) {
            statusText.innerText = "Lỗi nạp dữ liệu (Xem Console)";
            statusText.classList.add('text-red-500');
        }
        // Fallback: Nếu lỗi thì gán chuỗi rỗng để bot vẫn chat được bình thường
        window.SYSTEM_KNOWLEDGE = "Không có tài liệu nào được nạp.";
        window.isKnowledgeLoaded = true; 
    }
}

// Chạy hàm này ngay khi file được tải
loadKnowledgeBase();