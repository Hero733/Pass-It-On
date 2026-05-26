// --- Configuration ---
const MASTER_ADMIN = "aceaa372@gmail.com";
const SCHOOL_DOMAIN = "ntun.ac.th";

const FORBIDDEN = [
    "ยาบ้า", "กัญชา", "เหล้า", "เบียร์", "บุหรี่", "พอต", "vape", "กระท่อม",
    "กางเกงใน", "ยกทรง", "เพศ", "sex", "ปืน", "มีด", "อาวุธ", "หวย", "การพนัน"
];

// --- Data State ---
let posts = JSON.parse(localStorage.getItem('ntun_v4_posts')) || [];
let admins = JSON.parse(localStorage.getItem('ntun_v4_admins')) || [MASTER_ADMIN];
let currentUser = null;
let selectedImgBase64 = null;
let currentFilter = 'all'; // 'all' หรือ 'mine'

// 🧹 ฟังก์ชันลบโพสต์อัตโนมัติ (ลบโพสต์ที่ status = completed เกิน 2 วัน)
function autoCleanUp() {
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000; // 2 วัน ในหน่วยมิลลิวินาที
    const now = Date.now();
    const originalCount = posts.length;
    
    posts = posts.filter(p => {
        if (p.status === 'completed' && p.completedAt) {
            return (now - p.completedAt) < TWO_DAYS; // เก็บไว้ถ้ายังไม่ถึง 2 วัน
        }
        return true;
    });

    if (posts.length !== originalCount) saveData();
}

// ⏳ ฟังก์ชันคำนวณเวลา (เช่น 2 ชั่วโมงที่แล้ว, 3 วันที่แล้ว)
function timeAgo(timestamp) {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);

    if (days > 0) return `ลงเมื่อ ${days} วันที่แล้ว`;
    if (hrs > 0) return `ลงเมื่อ ${hrs} ชั่วโมงที่แล้ว`;
    if (mins > 0) return `ลงเมื่อ ${mins} นาทีที่แล้ว`;
    return "เพิ่งลงเมื่อกี้";
}

// --- 1. Google Login ---
function handleSignIn(response) {
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const payload = JSON.parse(new TextDecoder().decode(bytes));

        const email = payload.email;
        const domain = payload.hd || email.split('@')[1];

        if (domain === SCHOOL_DOMAIN || email === MASTER_ADMIN) {
            currentUser = payload;
            
            document.getElementById('auth-section').innerHTML = `
                <div class="flex items-center gap-3 bg-white/60 backdrop-blur-md p-1.5 pr-4 rounded-full border border-gray-200 shadow-sm">
                    <img src="${payload.picture}" class="w-9 h-9 rounded-full" referrerpolicy="no-referrer">
                    <div class="hidden sm:block">
                        <p class="text-[11px] font-bold text-gray-800 leading-none">${payload.name}</p>
                    </div>
                    <button onclick="location.reload()" class="ml-1 w-6 h-6 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-800 hover:text-white transition text-[9px]">✕</button>
                </div>
            `;
            unlock();
        } else {
            alert(`❌ ระบบนี้อนุญาตเฉพาะนักเรียน @${SCHOOL_DOMAIN} เท่านั้น`);
        }
    } catch (err) { alert("Login Error"); }
}

function unlock() {
    document.getElementById('login-placeholder').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    
    if (admins.includes(currentUser.email)) {
        document.getElementById('admin-panel').style.display = 'block';
    }
    
    autoCleanUp(); // รันเช็กลบโพสต์ที่หมดอายุ
    renderFeed();
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
                const scale = maxW / img.width;
                canvas.width = maxW;
                canvas.height = img.height * scale;
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

// --- 3. UI Tab Logic ---
function setFilter(type) {
    currentFilter = type;
    document.getElementById('tab-all').classList.toggle('active', type === 'all');
    document.getElementById('tab-mine').classList.toggle('active', type === 'mine');
    renderFeed();
}

// --- 4. Post Logic & Rendering ---
function handlePost(e) {
    e.preventDefault();
    const name = document.getElementById('itemName').value;
    const detail = document.getElementById('itemDetail').value;
    const cat = document.getElementById('itemCat').value;
    const contact = document.getElementById('itemContact').value;

    const fullText = (name + detail + contact).toLowerCase();
    if (FORBIDDEN.some(w => fullText.includes(w))) {
        return alert("⚠️ ตรวจพบคำไม่เหมาะสม หรือสินค้าผิดกฎหมาย");
    }

    const newPost = {
        id: Date.now(),
        timestamp: Date.now(), // เก็บเวลาตอนลงโพสต์เพื่อคำนวณ timeAgo
        user: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.picture,
        name, detail, cat, contact,
        image: selectedImgBase64,
        status: 'available',
        reservedBy: null,
        completedAt: null // เก็บเวลาตอนกดยืนยันเพื่อลบออโต้
    };

    posts.unshift(newPost);
    saveData();
    renderFeed();
    e.target.reset();
    removeSelectedImg();
    alert("✅ ลงประกาศสำเร็จ!");
}

function renderFeed() {
    const feed = document.getElementById('feed');
    const isAdmin = admins.includes(currentUser.email);
    
    // กรองข้อมูลตาม Tab ที่เลือก
    let displayPosts = posts;
    if (currentFilter === 'mine') {
        displayPosts = posts.filter(p => p.email === currentUser.email);
    }

    if (displayPosts.length === 0) {
        feed.innerHTML = `
            <div class="col-span-full py-24 flex flex-col items-center justify-center text-gray-400 bg-white/40 backdrop-blur-md rounded-[32px] border-2 border-dashed border-gray-200">
                <span class="text-4xl mb-3 opacity-50">🍃</span>
                <p class="font-medium">ยังไม่มีรายการสิ่งของในหมวดหมู่นี้</p>
            </div>`;
        return;
    }

    feed.innerHTML = displayPosts.map(post => {
        const isOwner = post.email === currentUser.email;
        let statusBadge = `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-full text-[10px] font-bold">✨ พร้อมส่งต่อ</span>`;
        
        // ปุ่มแยกหน้าที่ชัดเจน คนฝาก / คนรับ
        let actionBtn = isOwner 
            ? `<span class="text-xs font-bold text-gray-400 bg-gray-100 px-4 py-2 rounded-xl">ของของคุณ</span>`
            : `<button onclick="reserve(${post.id})" class="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-xs font-bold btn-ios shadow-md shadow-indigo-200">รับของชิ้นนี้</button>`;
        
        let cardClass = "ios-card overflow-hidden flex flex-col";

        if (post.status === 'reserved') {
            statusBadge = `<span class="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold">จองแล้วโดย ${post.reservedBy}</span>`;
            
            // คนฝากของ จะเห็นปุ่มยืนยัน
            actionBtn = isOwner ? 
                `<button onclick="complete(${post.id})" class="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold btn-ios shadow-md shadow-emerald-200 animate-pulse">ยืนยันว่าส่งให้เพื่อนแล้ว</button>` : 
                `<span class="text-xs text-amber-500 font-bold bg-amber-50 px-4 py-2 rounded-xl">มีผู้รับไปแล้ว</span>`;
            cardClass += " opacity-95";
        } else if (post.status === 'completed') {
            statusBadge = `<span class="bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1 rounded-full text-[10px] font-bold">ส่งมอบสำเร็จแล้ว</span>`;
            actionBtn = `<span class="text-xs text-emerald-500 font-bold flex items-center gap-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> ปิดงาน</span>`;
            cardClass += " grayscale opacity-50 scale-[0.98]";
        }

        // คำนวณเวลาที่ลง
        const timeString = timeAgo(post.timestamp);

        return `
        <div class="${cardClass}">
            ${post.image ? `<div class="relative w-full h-48 bg-gray-100"><img src="${post.image}" class="w-full h-full object-cover"></div>` : '<div class="w-full h-10 bg-gray-50"></div>'}
            
            <div class="p-6 flex flex-col flex-1 relative">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">${post.cat}</span>
                    ${statusBadge}
                </div>
                
                <h4 class="text-xl font-bold mb-1 text-gray-900 leading-tight">${post.name}</h4>
                <p class="text-[10px] font-medium text-indigo-400 mb-3">${timeString}</p>
                
                <p class="text-xs text-gray-600 mb-4 line-clamp-2 leading-relaxed flex-1">${post.detail}</p>
                
                <div class="bg-gray-50/80 rounded-xl p-3 mb-5 border border-gray-100">
                    <p class="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-1 flex items-center gap-1">💬 ติดต่อผู้ฝาก</p>
                    <p class="text-sm text-gray-800 font-medium">${post.contact || "ไม่ได้ระบุ"}</p>
                </div>
                
                <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div class="flex items-center gap-2">
                        <img src="${post.avatar}" class="w-8 h-8 rounded-full shadow-sm border border-white" referrerpolicy="no-referrer">
                        <div class="leading-none">
                            <span class="block text-[11px] font-bold text-gray-900">${post.user}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        ${actionBtn}
                        ${isAdmin || isOwner ? `<button onclick="del(${post.id})" class="text-gray-400 w-8 h-8 flex items-center justify-center rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all text-sm">🗑️</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// --- 5. System Logic ---
function reserve(id) {
    const p = posts.find(x => x.id === id);
    if(confirm(`ยืนยันการรับ "${p.name}"?\n\n📌 ติดต่อเจ้าของ: ${p.contact}\nกรุณาติดต่อไปรับของให้ไวที่สุดนะ!`)) {
        p.status = 'reserved';
        p.reservedBy = currentUser.name;
        saveData(); renderFeed();
    }
}

function complete(id) {
    if(confirm("ผู้รับได้รับของเรียบร้อยแล้วใช่ไหม? (โพสต์นี้จะหายไปเองใน 2 วัน)")) {
        const p = posts.find(x => x.id === id);
        p.status = 'completed';
        p.completedAt = Date.now(); // บันทึกเวลาที่ส่งสำเร็จ เพื่อลบออโต้
        saveData(); renderFeed();
    }
}

function del(id) {
    if(confirm("ต้องการลบโพสต์นี้ถาวรหรือไม่?")) {
        posts = posts.filter(x => x.id !== id);
        saveData(); renderFeed();
    }
}

function clearCompleted() {
    posts = posts.filter(x => x.status !== 'completed');
    saveData(); renderFeed();
}

// --- Admin ---
function addAdmin() {
    const email = document.getElementById('new-admin-email').value.trim().toLowerCase();
    if(email && !admins.includes(email)) {
        admins.push(email);
        localStorage.setItem('ntun_v4_admins', JSON.stringify(admins));
        document.getElementById('new-admin-email').value = "";
        alert("เพิ่มแอดมินใหม่สำเร็จ");
    }
}

function saveData() { localStorage.setItem('ntun_v4_posts', JSON.stringify(posts)); }
