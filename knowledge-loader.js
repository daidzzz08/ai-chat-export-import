// knowledge-loader.js
window.SYSTEM_KNOWLEDGE = "";
window.isKnowledgeLoaded = false;

async function loadKnowledgeBase() {
    const statusList = document.getElementById('doc-list');
    const overallStatus = document.getElementById('knowledge-status-text');
    
    try {
        const response = await fetch('knowledge/manifest.json');
        if (!response.ok) throw new Error("Thiếu file manifest.json");
        
        const files = await response.json();
        let combinedData = "DƯỚI ĐÂY LÀ TÀI LIỆU HỌC TẬP CHÍNH THỨC:\n\n";

        if(statusList) statusList.innerHTML = '';
        let loadedCount = 0;

        for (const item of files) {
            const li = document.createElement('li');
            li.className = "flex items-center gap-2 p-2 rounded hover:bg-slate-800/50 transition cursor-default group";
            li.innerHTML = `
                <i class="fa-solid fa-file-lines text-slate-500 group-hover:text-indigo-400 transition"></i> 
                <span class="text-xs text-slate-400 group-hover:text-slate-200 transition">${item.title}</span>
            `;
            if(statusList) statusList.appendChild(li);

            try {
                const fileRes = await fetch(`knowledge/${item.file}`);
                if (fileRes.ok) {
                    const content = await fileRes.text();
                    combinedData += `=== TÀI LIỆU: ${item.title} ===\n${content}\n\n`;
                    loadedCount++;
                }
            } catch (err) { console.warn(`Lỗi: ${item.file}`); }
        }

        window.SYSTEM_KNOWLEDGE = combinedData;
        window.isKnowledgeLoaded = true;
        
        if (overallStatus) {
            overallStatus.innerText = "Sẵn sàng";
            overallStatus.classList.replace("text-yellow-500", "text-emerald-400");
        }

    } catch (error) {
        console.error("Lỗi data:", error);
        if (overallStatus) {
            overallStatus.innerText = "Lỗi!";
            overallStatus.classList.replace("text-yellow-500", "text-red-500");
        }
    }
}

document.addEventListener('DOMContentLoaded', loadKnowledgeBase);