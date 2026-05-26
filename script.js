// --- Configuration ---
const MASTER_ADMIN = "aceaa372@gmail.com";
const SCHOOL_DOMAIN = "ntun.ac.th";
const SESSION_LIMIT = 24 * 60 * 60 * 1000;

const FORBIDDEN = ["ยาบ้า", "กัญชา", "เหล้า", "เบียร์", "บุหรี่", "พอต", "vape", "กระท่อม", "เพศ", "sex", "ปืน", "มีด", "อาวุธ", "หวย", "การพนัน", "18+"];

const CATEGORY_KEYWORDS = {
    '📚': ['หนังสือ', 'ชีท', 'สรุป', 'สอบ', 'เรียน', 'สมุด', 'คณิต', 'วิทย์', 'ภาษา', 'อ่าน', 'ม.4', 'ม.5', 'ม.6'],
    '👕': ['เสื้อ', 'กางเกง', 'กระโปรง', 'พละ', 'ไซส์', 'size', 'ชุด', 'รองเท้า', 'เข็มขัด', 'สภาพ'],
    '✏️': ['ปากกา', 'ดินสอ', 'ยางลบ', 'ไม้บรรทัด', 'สี', 'เครื่องเขียน', 'กล่องดินสอ', 'แฟ้ม'],
    '💻': ['คอม', 'เมาส์', 'คีย์บอร์ด', 'หูฟัง', 'สายชาร์จ', 'เคส', 'ไอแพด', 'จอ', 'usb', 'แบต'],
    '⚽': ['บอล', 'แบด', 'ตะกร้อ', 'ไม้', 'กีฬา', 'สตั๊ด', 'ปิงปอง', 'บาส'],
    '🎸': ['กีตาร์', 'เกม', 'ของเล่น', 'ฟิกเกอร์', 'ตุ๊กตา', 'ดนตรี', 'การ์ตูน']
};

let posts = JSON.parse(localStorage.getItem('ntun_v4_posts')) || [];
let currentUser = null;
let selectedImgBase64 = null;
let currentCatFilter = 'ทั้งหมด';

// แอนิเมชันเอา Loader ออกตอนเว็บโหลดเสร็จ
window.addEventListener('load', () => {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
    }, 400); // ดีเลย์นิดนึงให้ดูสมูท
});

window.onload = () => {
    const storedUser = localStorage.getItem('ntun_user_session');
    const storedTime = localStorage.getItem('ntun_user_time');
    
    if (storedUser && storedTime && (Date.now() - parseInt(storedTime) < SESSION_LIMIT)) {
        currentUser = JSON.parse(storedUser);
        renderAuthUI(); 
        unlock(false); 
    } else {
        localStorage.removeItem('ntun_user_session');
    }
};

function handleSignIn(response) {
    try {
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
        const domain = payload.hd || payload.email.split('@')[1];

        if (domain === SCHOOL_DOMAIN || payload.email === MASTER_ADMIN) {
            currentUser = payload;
            localStorage.setItem('ntun_user_session', JSON.stringify(payload));
            localStorage.setItem('ntun_user_time', Date.now().toString());
            renderAuthUI(); 
            unlock(true); 
        } else { 
            alert(`❌ ระบบนี้อนุญาตเฉพาะนักเรียน @${SCHOOL_DOMAIN} เท่านั้น`); 
        }
    } catch (err) { alert("Login Error"); }
}

function renderAuthUI() {
    // ซ่อนกล่องให้ล็อกอินในหน้าแรก เพราะล็อกอินแล้ว
    const promptArea = document.getElementById('login-prompt-area');
    if (promptArea) promptArea.style.display = 'none';

    document.getElementById('auth-section').innerHTML = `
        <div class="flex items-center gap-3 bg-white/60 p-1.5 pr-4 rounded-full border border-gray-200 shadow-sm transition-all hover:bg-white cursor-pointer btn-bouncy">
            <img src="${currentUser.picture}" class="w-9 h-9 rounded-full shadow-sm" referrerpolicy="no-referrer">
            <div class="hidden sm:block"><p class="text-[11px] font-bold text-gray-800 leading-none">${currentUser.name}</p></div>
            <button onclick="logout()" class="ml-1 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-rose-500 hover:text-white transition text-[9px]" title="ออกจากระบบ">✕</button>
        </div>`;
    
    // เปลี่ยนเมนูให้เป็นปุ่มกดเด้งๆ Modal แทนการเปลี่ยนหน้า
    document.getElementById('nav-links').innerHTML = `
        <div class="flex items-center bg-white/50 p-1.5 rounded-full border border-gray-200/80 backdrop-blur-xl shadow-sm shrink-0 gap-1">
            <button onclick="document.getElementById('top-page').scrollIntoView({behavior: 'smooth'})" class="px-4 py-2 rounded-full text-[11px] md:text-xs font-bold text-gray-700 hover:bg-white hover:shadow-sm hover:text-black transition-all btn-bouncy">🏠 หน้าแรก</button>
            <button onclick="document.getElementById('app-content').scrollIntoView({behavior: 'smooth'})" class="px-4 py-2 rounded-full text-[11px] md:text-xs font-bold text-gray-700 hover:bg-white hover:shadow-sm hover:text-black transition-all btn-bouncy">🎁 กระดานแบ่งปัน</button>
            <button onclick="toggleHistory()" class="px-4 py-2 rounded-full text-[11px] md:text-xs font-bold text-gray-700 hover:bg-white hover:shadow-sm hover:text-black transition-all btn-bouncy">📁 ประวัติ</button>
            <button onclick="toggleGuide()" class="px-4 py-2 rounded-full text-[11px] md:text-xs font-bold text-gray-700 hover:bg-white hover:shadow-sm hover:text-black transition-all btn-bouncy">📖 คู่มือ</button>
        </div>
    `;
}

function logout() {
    localStorage.removeItem('ntun_user_session'); 
    localStorage.removeItem('ntun_user_time'); 
    location.reload(); 
}

function unlock(shouldScroll) {
    const appContent = document.getElementById('app-content');
    appContent.style.display = 'block';
    // เพิ่มคลาสให้ตัวแอปเด้งขึ้นมาสวยๆ ตอนล็อกอิน
    appContent.classList.add('animate-fade-up');
    
    autoCleanUp(); 
    renderFeed();
    
    if(shouldScroll) {
        setTimeout(() => {
            appContent.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    }
}

function autoCleanUp() {
    const originalCount = posts.length;
    posts = posts.filter(p => !(p.status === 'completed' && p.completedAt && (Date.now() - p.completedAt) > 172800000));
    if (posts.length !== originalCount) saveData();
}

function timeAgo(timestamp) {
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins >= 1440) return `ลงเมื่อ ${Math.floor(mins / 1440)} วันที่แล้ว`;
    if (mins >= 60) return `ลงเมื่อ ${Math.floor(mins / 60)} ชั่วโมงที่แล้ว`;
    return mins > 0 ? `ลงเมื่อ ${mins} นาทีที่แล้ว` : "เพิ่งลงเมื่อกี้";
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const img = new Image(); img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
                canvas.width = 600; canvas.height = img.height * (600 / img.width);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                selectedImgBase64 = canvas.toDataURL('image/jpeg', 0.7);
                document.getElementById('image-preview-el').src = selectedImgBase64;
                document.getElementById('image-preview-el').classList.remove('hidden');
                document.getElementById('preview-placeholder').classList.add('hidden');
                document.getElementById('remove-img').classList.remove('hidden');
            }
        };
        reader.readAsDataURL(input.files[0]);
    }
}
function removeSelectedImg() {
    selectedImgBase64 = null; document.getElementById('itemImage').value = '';
    document.getElementById('image-preview-el').classList.add('hidden');
    document.getElementById('preview-placeholder').classList.remove('hidden');
    document.getElementById('remove-img').classList.add('hidden');
}

function setFilter(cat) {
    currentCatFilter = cat;
    const btns = document.getElementById('category-filters').children;
    for(let b of btns) {
        b.className = (b.innerText === cat || (cat === 'ทั้งหมด' && b.innerText === 'รวมทั้งหมด'))
            ? 'cat-btn active btn-bouncy' : 'cat-btn btn-bouncy';
    }
    renderFeed();
}

function handlePost(e) {
    e.preventDefault();
    const btn = document.getElementById('submit-btn');
    const name = document.getElementById('itemName').value;
    const detail = document.getElementById('itemDetail').value;
    const cat = document.getElementById('itemCat').value;
    const contact = document.getElementById('itemContact').value;
    const fullText = (name + " " + detail).toLowerCase();

    if (FORBIDDEN.some(w => fullText.includes(w))) {
        return alert("⚠️ ตรวจพบคำไม่เหมาะสม หรือสินค้าผิดกฎหมาย กรุณาแก้ไขข้อความครับ");
    }
    if (!selectedImgBase64) {
        if (!confirm("🔍 ระบบแนะนำ: คุณยังไม่ได้ใส่รูปภาพ!\nยืนยันที่จะโพสต์โดยไม่มีรูปหรือไม่?")) return;
    }
    const emojiPrefix = cat.substring(0, 2).trim(); 
    if (CATEGORY_KEYWORDS[emojiPrefix]) {
        const hasKeyword = CATEGORY_KEYWORDS[emojiPrefix].some(kw => fullText.includes(kw));
        if (!hasKeyword) {
            if (!confirm(`🧠 AI ตรวจพบ: ข้อความของคุณอาจไม่ตรงกับหมวดหมู่ "${cat}"\nต้องการโพสต์ต่อไปหรือไม่?`)) return;
        }
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="animate-spin text-xl">⏳</span> กำลังส่ง...`;
    btn.disabled = true;

    setTimeout(() => {
        posts.unshift({
            id: Date.now(), timestamp: Date.now(),
            user: currentUser.name, email: currentUser.email, avatar: currentUser.picture,
            name, detail, cat, contact, image: selectedImgBase64,
            status: 'available', reservedBy: null, completedAt: null
        });
        saveData(); setFilter('ทั้งหมด'); e.target.reset(); removeSelectedImg();
        btn.innerHTML = originalText; btn.disabled = false;
    }, 600);
}

function renderFeed() {
    const feed = document.getElementById('feed');
    let displayPosts = posts;
    
    if (currentCatFilter !== 'ทั้งหมด') {
        displayPosts = displayPosts.filter(p => p.cat === currentCatFilter);
    }

    if (displayPosts.length === 0) {
        feed.innerHTML = `<div class="col-span-full py-24 text-center text-gray-400 bg-white/50 rounded-[28px] border-2 border-dashed border-gray-200 animate-fade-up">ยังไม่มีสิ่งของในหมวดหมู่นี้</div>`;
        return;
    }

    feed.innerHTML = displayPosts.map((post, idx) => {
        const isOwner = post.email === currentUser.email;
        let badge = `<span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">ว่าง</span>`;
        let btn = isOwner 
            ? `<span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">ของของคุณ</span>`
            : `<button onclick="reserve(${post.id})" class="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold btn-bouncy shadow-md hover:shadow-lg hover:bg-gray-900">รับของ</button>`;
        
        let cardClass = `ios-card overflow-hidden flex flex-col h-full animate-fade-up`;
        let delayStyle = `animation-delay: ${idx * 0.05}s;`; // ให้การ์ดโหลดไล่ระดับลงมา

        if (post.status === 'reserved') {
            badge = `<span class="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold">จองแล้วโดย ${post.reservedBy}</span>`;
            btn = isOwner 
                ? `<button onclick="complete(${post.id})" class="bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold btn-bouncy animate-pulse hover:bg-emerald-600">ยืนยันว่าส่งแล้ว</button>` 
                : `<span class="text-[10px] text-amber-500 font-bold bg-amber-50 px-3 py-1.5 rounded-lg">ไม่ว่าง</span>`;
            cardClass += " opacity-95 border-amber-100";
        } else if (post.status === 'completed') {
            badge = `<span class="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold">ส่งมอบสำเร็จ</span>`;
            btn = `<span class="text-[10px] text-emerald-500 font-bold">✓ ปิดงาน</span>`;
            cardClass += " grayscale opacity-60 scale-[0.98]";
        }

        return `
        <div class="${cardClass}" style="${delayStyle}">
            ${post.image ? `<div class="w-full h-48 bg-gray-100 relative shrink-0"><img src="${post.image}" class="w-full h-full object-cover"></div>` : ''}
            <div class="p-5 flex flex-col flex-1">
                <div class="flex justify-between items-start mb-2"><span class="text-[10px] font-bold text-gray-500 truncate mr-2">${post.cat}</span>${badge}</div>
                <h4 class="text-xl font-bold mb-1 leading-tight text-gray-900 line-clamp-1">${post.name}</h4>
                <p class="text-[10px] font-semibold text-indigo-400 mb-3">${timeAgo(post.timestamp)}</p>
                <p class="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">${post.detail}</p>
                <div class="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100 text-[11px] mt-auto">
                    <span class="font-bold text-gray-400 uppercase tracking-wide text-[9px]">📞 ช่องทางติดต่อ:</span> 
                    <span class="font-semibold text-gray-800 block mt-1 truncate">${post.contact}</span>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-gray-100/80">
                    <div class="flex items-center gap-2"><img src="${post.avatar}" class="w-7 h-7 rounded-full border border-gray-200"><span class="text-[11px] font-bold text-gray-800">${post.user}</span></div>
                    <div class="flex items-center gap-2">${btn} ${isOwner ? `<button onclick="del(${post.id})" class="text-rose-400 text-sm hover:bg-rose-50 w-8 h-8 rounded-full flex items-center justify-center transition-colors btn-bouncy">🗑️</button>` : ''}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function reserve(id) {
    if(!currentUser) return alert("กรุณาล็อกอินก่อนครับ!");
    const p = posts.find(x => x.id === id);
    if(confirm(`ยืนยันการรับ "${p.name}"?\n📌 ติดต่อ: ${p.contact}`)) {
        p.status = 'reserved'; p.reservedBy = currentUser.name; saveData(); renderFeed();
    }
}
function complete(id) {
    if(confirm("คุณส่งมอบให้เพื่อนเรียบร้อยแล้วใช่ไหม? (โพสต์จะหายไปเองใน 2 วัน)")) {
        posts.find(x => x.id === id).status = 'completed'; posts.find(x => x.id === id).completedAt = Date.now();
        saveData(); renderFeed();
    }
}
function del(id) { if(confirm("ต้องการลบโพสต์นี้ถาวรใช่ไหม?")) { posts = posts.filter(x => x.id !== id); saveData(); renderFeed(); } }
function saveData() { localStorage.setItem('ntun_v4_posts', JSON.stringify(posts)); }

// --- Modal Functions (แอนิเมชันเด้งๆ) ---
function toggleHistory() {
    if (!currentUser) return alert("⚠️ กรุณาล็อกอินด้วยอีเมลโรงเรียนก่อนเข้าดูประวัติครับ!");
    const modal = document.getElementById('history-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    if(modal.style.display === 'flex') showHistoryTab('given');
}

function toggleGuide() {
    const modal = document.getElementById('guide-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

function showHistoryTab(tab) {
    document.getElementById('htab-given').className = tab === 'given' ? 'font-bold text-indigo-600 border-b-2 border-indigo-600 pb-2 px-2 btn-bouncy' : 'font-bold text-gray-400 pb-2 px-2 cursor-pointer btn-bouncy';
    document.getElementById('htab-received').className = tab === 'received' ? 'font-bold text-indigo-600 border-b-2 border-indigo-600 pb-2 px-2 btn-bouncy' : 'font-bold text-gray-400 pb-2 px-2 cursor-pointer btn-bouncy';
    
    const list = tab === 'given' ? posts.filter(p => p.email === currentUser.email) : posts.filter(p => p.reservedBy === currentUser.name);
    const content = document.getElementById('history-content');
    
    if(list.length === 0) return content.innerHTML = `<div class="py-10 text-center text-gray-400 text-sm bg-gray-50 rounded-2xl animate-fade-up">ไม่มีประวัติในหมวดหมู่นี้</div>`;

    content.innerHTML = list.map((p, idx) => `
        <div class="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow animate-fade-up" style="animation-delay: ${idx * 0.05}s;">
            ${p.image ? `<img src="${p.image}" class="w-16 h-16 rounded-xl object-cover shrink-0">` : `<div class="w-16 h-16 rounded-xl bg-gray-200 shrink-0"></div>`}
            <div class="flex-1 overflow-hidden">
                <h4 class="font-bold text-sm leading-tight truncate">${p.name}</h4>
                <p class="text-[11px] text-gray-500 mt-1">สถานะ: ${p.status === 'completed' ? '✅ จบงานแล้ว' : (p.status === 'reserved' ? '⏳ กำลังรอส่งมอบ' : '✨ ว่าง')}</p>
            </div>
            ${p.status === 'reserved' && tab === 'given' ? `<button onclick="complete(${p.id}); toggleHistory();" class="text-xs bg-emerald-500 text-white px-3 py-2 rounded-xl font-bold shadow-sm hover:shadow-md btn-bouncy">ยืนยันส่ง</button>` : ''}
        </div>
    `).join('');
}
