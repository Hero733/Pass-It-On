// --- Configuration ---
const MASTER_ADMIN = "aceaa372@gmail.com";
const SCHOOL_DOMAIN = "ntun.ac.th";
const SESSION_LIMIT = 24 * 60 * 60 * 1000; // 24 ชั่วโมง

const FORBIDDEN = [
    "ยาบ้า", "กัญชา", "เหล้า", "เบียร์", "บุหรี่", "พอต", "vape", "กระท่อม",
    "เพศ", "sex", "ปืน", "มีด", "อาวุธ", "หวย", "การพนัน", "18+"
];

// --- Data State ---
let posts = JSON.parse(localStorage.getItem('ntun_v4_posts')) || [];
let admins = JSON.parse(localStorage.getItem('ntun_v4_admins')) || [MASTER_ADMIN];
let currentUser = null;
let selectedImgBase64 = null;
let currentCatFilter = 'ทั้งหมด';

// ตรวจสอบ Session 24 ชม. ทันทีที่โหลดหน้าเว็บ
window.onload = () => {
    const storedUser = localStorage.getItem('ntun_user_session');
    const storedTime = localStorage.getItem('ntun_user_time');
    
    if (storedUser && storedTime) {
        if (Date.now() - parseInt(storedTime) < SESSION_LIMIT) {
            currentUser = JSON.parse(storedUser);
            renderAuthUI();
            unlock();
        } else {
            logout(); // หมดเวลา 24 ชม.
        }
    }
};

// --- 1. Google Login & Session ---
function handleSignIn(response) {
    try {
        const base64Url = response.credential.split('.')[1];
        const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64Url.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
        
        const email = payload.email;
        const domain = payload.hd || email.split('@')[1];

        if (domain === SCHOOL_DOMAIN || email === MASTER_ADMIN) {
            currentUser = payload;
            // บันทึกลง LocalStorage ให้อยู่ได้ 24 ชม.
            localStorage.setItem('ntun_user_session', JSON.stringify(payload));
            localStorage.setItem('ntun_user_time', Date.now().toString());
            
            renderAuthUI();
            unlock();
        } else {
            alert(`❌ ระบบนี้อนุญาตเฉพาะนักเรียน @${SCHOOL_DOMAIN} เท่านั้น`);
        }
    } catch (err) { alert("Login Error"); }
}

function renderAuthUI() {
    document.getElementById('auth-section').innerHTML = `
        <div class="flex items-center gap-3 bg-white/60 p-1.5 pr-4 rounded-full border border-gray-200">
            <img src="${currentUser.picture}" class="w-9 h-9 rounded-full" referrerpolicy="no-referrer">
            <div class="hidden sm:block">
                <p class="text-[11px] font-bold text-gray-800 leading-none">${currentUser.name}</p>
            </div>
            <button onclick="logout()" class="ml-1 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-rose-500 hover:text-white transition text-[9px]" title="ออกจากระบบ">✕</button>
        </div>
    `;
}

function logout() {
    localStorage.removeItem('ntun_user_session');
    localStorage.removeItem('ntun_user_time');
    location.reload();
}

function unlock() {
    document.getElementById('login-placeholder').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    autoCleanUp(); 
    renderFeed();
}

// 🧹 ลบโพสต์อัตโนมัติ (ลบโพสต์ที่ status = completed เกิน 2 วัน)
function autoCleanUp() {
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const originalCount = posts.length;
    posts = posts.filter(p => !(p.status === 'completed' && p.completedAt && (now - p.completedAt) > TWO_DAYS));
    if (posts.length !== originalCount) saveData();
}

function timeAgo(timestamp) {
    if (!timestamp) return "";
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `ลงเมื่อ ${days} วันที่แล้ว`;
    if (hrs > 0) return `ลงเมื่อ ${hrs} ชั่วโมงที่แล้ว`;
    if (mins > 0) return `ลงเมื่อ ${mins} นาทีที่แล้ว`;
    return "เพิ่งลงเมื่อกี้";
}

// --- 2. Image Engine ---
function previewImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxW = 600; 
                canvas.width = maxW;
                canvas.height = img.height * (maxW / img.width);
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
    selectedImgBase64 = null;
    document.getElementById('itemImage').value = '';
    document.getElementById('image-preview-el').classList.add('hidden');
    document.getElementById('preview-placeholder').classList.remove('hidden');
    document.getElementById('remove-img').classList.add('hidden');
}

// --- 3. Filter หมวดหมู่ ---
function setFilter(cat) {
    currentCatFilter = cat;
    const btns = document.getElementById('category-filters').children;
    for(let b of btns) {
        b.className = b.innerText.includes(cat) || (cat === 'ทั้งหมด' && b.innerText === 'รวมทั้งหมด') 
            ? 'cat-btn active' : 'cat-btn';
    }
    renderFeed();
}

// --- 4. Post Logic ---
function handlePost(e) {
    e.preventDefault();
    const name = document.getElementById('itemName').value;
    const detail = document.getElementById('itemDetail').value;
    const cat = document.getElementById('itemCat').value;
    const contact = document.getElementById('itemContact').value;

    if (FORBIDDEN.some(w => (name + detail).toLowerCase().includes(w))) {
        return alert("⚠️ ตรวจพบคำไม่เหมาะสม หรือสินค้าผิดกฎหมาย");
    }

    posts.unshift({
        id: Date.now(), timestamp: Date.now(),
        user: currentUser.name, email: currentUser.email, avatar: currentUser.picture,
        name, detail, cat, contact, image: selectedImgBase64,
        status: 'available', reservedBy: null, completedAt: null
    });
    saveData(); renderFeed(); e.target.reset(); removeSelectedImg();
}

function renderFeed() {
    const feed = document.getElementById('feed');
    let displayPosts = posts;
    
    // กรองหมวดหมู่ (ใช้ Emoji เป็นตัวกรอง)
    if (currentCatFilter !== 'ทั้งหมด') {
        displayPosts = displayPosts.filter(p => p.cat.startsWith(currentCatFilter));
    }

    if (displayPosts.length === 0) {
        feed.innerHTML = `<div class="col-span-full py-20 text-center text-gray-400 bg-white/40 rounded-[32px] border-2 border-dashed border-gray-200">ไม่มีสิ่งของในหมวดหมู่นี้</div>`;
        return;
    }

    feed.innerHTML = displayPosts.map(post => {
        const isOwner = post.email === currentUser.email;
        let badge = `<span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold">ว่าง</span>`;
        let btn = isOwner 
            ? `<span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg">ของที่คุณลง</span>`
            : `<button onclick="reserve(${post.id})" class="bg-black text-white px-5 py-2 rounded-xl text-xs font-bold btn-ios">รับของ</button>`;
        
        let cardClass = "ios-card overflow-hidden flex flex-col";

        if (post.status === 'reserved') {
            badge = `<span class="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold">จองแล้วโดย ${post.reservedBy}</span>`;
            btn = isOwner 
                ? `<button onclick="complete(${post.id})" class="bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold btn-ios">ยืนยันว่าส่งแล้ว</button>` 
                : `<span class="text-[10px] text-amber-500 font-bold bg-amber-50 px-3 py-1.5 rounded-lg">ไม่ว่าง</span>`;
            cardClass += " opacity-95 border-amber-100";
        } else if (post.status === 'completed') {
            badge = `<span class="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold">สำเร็จ</span>`;
            btn = `<span class="text-[10px] text-emerald-500 font-bold">✓ จบงาน</span>`;
            cardClass += " grayscale opacity-50 scale-[0.98]";
        }

        return `
        <div class="${cardClass}">
            ${post.image ? `<div class="w-full h-40 bg-gray-100"><img src="${post.image}" class="w-full h-full object-cover"></div>` : ''}
            <div class="p-5 flex flex-col flex-1">
                <div class="flex justify-between items-start mb-2"><span class="text-[9px] font-bold text-gray-400">${post.cat}</span>${badge}</div>
                <h4 class="text-lg font-bold mb-1 leading-tight">${post.name}</h4>
                <p class="text-[9px] font-medium text-indigo-400 mb-2">${timeAgo(post.timestamp)}</p>
                <p class="text-xs text-gray-500 mb-3 line-clamp-2">${post.detail}</p>
                <div class="bg-gray-50 rounded-lg p-2 mb-3 border border-gray-100 text-[10px]"><span class="font-bold text-gray-400">📞 ติดต่อ:</span> <span class="font-medium">${post.contact}</span></div>
                <div class="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                    <div class="flex items-center gap-2"><img src="${post.avatar}" class="w-6 h-6 rounded-full"><span class="text-[10px] font-bold">${post.user}</span></div>
                    <div class="flex gap-2">${btn} ${isOwner ? `<button onclick="del(${post.id})" class="text-rose-400 text-xs hover:bg-rose-50 w-6 h-6 rounded-full flex items-center justify-center">🗑️</button>` : ''}</div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- 5. System Logic ---
function reserve(id) {
    const p = posts.find(x => x.id === id);
    if(confirm(`ยืนยันการรับ "${p.name}"?\n📌 ติดต่อ: ${p.contact}`)) {
        p.status = 'reserved'; p.reservedBy = currentUser.name;
        saveData(); renderFeed();
    }
}
function complete(id) {
    if(confirm("ส่งมอบให้เพื่อนเรียบร้อยใช่ไหม?")) {
        const p = posts.find(x => x.id === id);
        p.status = 'completed'; p.completedAt = Date.now();
        saveData(); renderFeed();
    }
}
function del(id) {
    if(confirm("ลบโพสต์นี้?")) { posts = posts.filter(x => x.id !== id); saveData(); renderFeed(); }
}
function saveData() { localStorage.setItem('ntun_v4_posts', JSON.stringify(posts)); }

// --- 6. ระบบประวัติ (History Modal) ---
function toggleHistory() {
    const modal = document.getElementById('history-modal');
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    if(modal.style.display === 'flex') showHistoryTab('given');
}

function showHistoryTab(tab) {
    document.getElementById('htab-given').className = tab === 'given' ? 'font-bold text-indigo-600 border-b-2 border-indigo-600 pb-2 px-2' : 'font-bold text-gray-400 pb-2 px-2';
    document.getElementById('htab-received').className = tab === 'received' ? 'font-bold text-indigo-600 border-b-2 border-indigo-600 pb-2 px-2' : 'font-bold text-gray-400 pb-2 px-2';
    
    const list = tab === 'given' 
        ? posts.filter(p => p.email === currentUser.email) // ของที่ฉันฝาก
        : posts.filter(p => p.reservedBy === currentUser.name); // ของที่ฉันกดรับ
        
    const content = document.getElementById('history-content');
    if(list.length === 0) {
        content.innerHTML = `<div class="py-10 text-center text-gray-400 text-sm">ไม่มีประวัติในหมวดหมู่นี้</div>`;
        return;
    }

    content.innerHTML = list.map(p => `
        <div class="flex items-center gap-4 bg-gray-50 p-3 rounded-2xl border border-gray-100">
            ${p.image ? `<img src="${p.image}" class="w-16 h-16 rounded-xl object-cover">` : `<div class="w-16 h-16 rounded-xl bg-gray-200"></div>`}
            <div class="flex-1">
                <h4 class="font-bold text-sm leading-tight">${p.name}</h4>
                <p class="text-[10px] text-gray-400 mt-1">สถานะ: ${p.status === 'completed' ? '✅ จบงานแล้ว' : (p.status === 'reserved' ? '⏳ กำลังจอง' : '✨ รอคนรับ')}</p>
            </div>
            ${p.status === 'reserved' && tab === 'given' ? `<button onclick="complete(${p.id}); toggleHistory();" class="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold">ยืนยันส่ง</button>` : ''}
        </div>
    `).join('');
}
