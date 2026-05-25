// --- Configuration ---
const MASTER_ADMIN = "aceaa372@gmail.com";
const SCHOOL_DOMAIN = "ntun.ac.th";

// 🛡️ ระบบป้องกันคำไม่เหมาะสม / ของผิดกฎหมาย
const FORBIDDEN = [
    "ยาบ้า", "กัญชา", "เหล้า", "เบียร์", "บุหรี่", "พอต", "vape", "กระท่อม",
    "กางเกงใน", "ยกทรง", "เพศ", "sex", "ปืน", "มีด", "อาวุธ", "หวย", "การพนัน"
];

// --- Data State ---
let posts = JSON.parse(localStorage.getItem('ntun_v4_posts')) || [];
let admins = JSON.parse(localStorage.getItem('ntun_v4_admins')) || [MASTER_ADMIN];
let currentUser = null;
let selectedImgBase64 = null;

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
                <div class="flex items-center gap-3 bg-white/80 p-2 pr-5 rounded-[20px] border border-black/5 shadow-sm">
                    <img src="${payload.picture}" class="w-10 h-10 rounded-[12px] border border-black/5" referrerpolicy="no-referrer">
                    <div class="hidden sm:block">
                        <p class="text-[11px] font-bold leading-none">${payload.name}</p>
                        <p class="text-[9px] text-emerald-500 font-bold mt-1 uppercase">Student ID Verified</p>
                    </div>
                    <button onclick="location.reload()" class="ml-2 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-rose-50 hover:text-rose-500 transition text-[10px]">✕</button>
                </div>
            `;
            unlock();
        } else {
            alert(`❌ ปฏิเสธ: ระบบนี้อนุญาตเฉพาะนักเรียน @${SCHOOL_DOMAIN} เท่านั้น`);
        }
    } catch (err) { alert("Login Error"); }
}

function unlock() {
    document.getElementById('login-placeholder').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    
    if (admins.includes(currentUser.email)) {
        document.getElementById('admin-panel').style.display = 'block';
        updateAdminStats();
    }
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

// --- 3. Post Logic & Security Filter ---
function handlePost(e) {
    e.preventDefault();
    const name = document.getElementById('itemName').value;
    const detail = document.getElementById('itemDetail').value;
    const cat = document.getElementById('itemCat').value;
    const contact = document.getElementById('itemContact').value; // ดึงข้อมูลติดต่อ

    // ตรวจสอบคำหยาบและของผิดกฎหมาย
    const fullText = (name + detail + contact).toLowerCase();
    if (FORBIDDEN.some(w => fullText.includes(w))) {
        return alert("⚠️ ปฏิเสธการแชร์: ตรวจพบคำไม่เหมาะสม หรือสินค้าผิดกฎหมายโรงเรียน");
    }

    const newPost = {
        id: Date.now(),
        user: currentUser.name,
        email: currentUser.email,
        avatar: currentUser.picture,
        name, detail, cat, contact, // บันทึกข้อมูลติดต่อ
        image: selectedImgBase64,
        status: 'available',
        reservedBy: null,
        date: new Date().toLocaleDateString('th-TH')
    };

    posts.unshift(newPost);
    saveData();
    renderFeed();
    e.target.reset();
    removeSelectedImg();
    if (admins.includes(currentUser.email)) updateAdminStats();
    alert("✅ ลงประกาศสำเร็จ!");
}

function renderFeed() {
    const feed = document.getElementById('feed');
    const isAdmin = admins.includes(currentUser.email);
    
    if (posts.length === 0) {
        feed.innerHTML = `<div class="col-span-full py-20 text-center text-gray-400 ios-card border-2 border-dashed border-gray-100 bg-transparent">ยังไม่มีของที่ส่งต่อในขณะนี้</div>`;
        return;
    }

    feed.innerHTML = posts.map(post => {
        const isOwner = post.email === currentUser.email;
        let statusBadge = `<span class="bg-emerald-500/10 text-emerald-600 px-3 py-1.5 rounded-full text-[10px] font-bold">ว่าง</span>`;
        let actionBtn = `<button onclick="reserve(${post.id})" class="bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold btn-ios">จองของ</button>`;
        let cardClass = "ios-card overflow-hidden fade-in flex flex-col";

        if (post.status === 'reserved') {
            statusBadge = `<span class="bg-orange-500/10 text-orange-600 px-3 py-1.5 rounded-full text-[10px] font-bold">จองแล้วโดย ${post.reservedBy}</span>`;
            actionBtn = isOwner ? 
                `<button onclick="complete(${post.id})" class="bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold btn-ios animate-pulse">ยืนยันส่งแล้ว</button>` : 
                `<span class="text-xs text-gray-400 font-bold bg-gray-100 px-4 py-2 rounded-xl">ไม่ว่าง</span>`;
            cardClass += " opacity-90 border-2 border-orange-100";
        } else if (post.status === 'completed') {
            statusBadge = `<span class="bg-gray-100 text-gray-400 px-3 py-1.5 rounded-full text-[10px] font-bold">ส่งมอบสำเร็จ</span>`;
            actionBtn = `<span class="text-xs text-emerald-500 font-bold">✓ Success</span>`;
            cardClass += " grayscale opacity-40 scale-[0.98]";
        }

        return `
        <div class="${cardClass}">
            ${post.image ? `<img src="${post.image}" class="w-full h-48 object-cover">` : '<div class="w-full h-12 bg-gray-50/50"></div>'}
            <div class="p-6 flex flex-col flex-1">
                <div class="flex justify-between items-start mb-3">
                    <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">${post.cat}</span>
                    ${statusBadge}
                </div>
                <h4 class="text-lg font-bold mb-2 leading-tight">${post.name}</h4>
                <p class="text-xs text-gray-500 mb-4 line-clamp-2 leading-relaxed flex-1">${post.detail}</p>
                
                <div class="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-100">
                    <p class="text-[9px] text-gray-400 font-bold uppercase tracking-wide mb-1">📞 ช่องทางติดต่อเจ้าของ</p>
                    <p class="text-xs text-gray-700 font-medium">${post.contact || "ไม่ได้ระบุไว้"}</p>
                </div>
                
                <div class="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div class="flex items-center gap-3">
                        <img src="${post.avatar}" class="w-7 h-7 rounded-full shadow-sm" referrerpolicy="no-referrer">
                        <div class="leading-none">
                            <span class="block text-[11px] font-bold text-gray-800">${post.user}</span>
                            <span class="block text-[8px] text-gray-400 mt-1">${post.date}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        ${actionBtn}
                        ${isAdmin || isOwner ? `<button onclick="del(${post.id})" class="text-rose-500 w-8 h-8 flex items-center justify-center rounded-xl bg-rose-50 hover:bg-rose-500 hover:text-white transition-all text-xs">🗑️</button>` : ''}
                    </div>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// --- 4. System Logic ---
function reserve(id) {
    const p = posts.find(x => x.id === id);
    if(p.email === currentUser.email) return alert("จองของตัวเองไม่ได้นะ!");
    
    // แจ้งเตือนช่องทางติดต่อตอนกดจอง
    if(confirm(`ยืนยันการจอง "${p.name}"?\n\n📌 ช่องทางติดต่อเจ้าของ: ${p.contact}\nกรุณาติดต่อไปรับของทันที`)) {
        p.status = 'reserved';
        p.reservedBy = currentUser.name;
        saveData(); renderFeed(); updateAdminStats();
    }
}

function complete(id) {
    if(confirm("คุณส่งมอบของชิ้นนี้ให้เพื่อนเรียบร้อยแล้วใช่ไหม?")) {
        posts.find(x => x.id === id).status = 'completed';
        saveData(); renderFeed(); updateAdminStats();
    }
}

function del(id) {
    if(confirm("ลบโพสต์นี้ถาวร?")) {
        posts = posts.filter(x => x.id !== id);
        saveData(); renderFeed(); updateAdminStats();
    }
}

function clearCompleted() {
    if(confirm("ลบรายการที่ส่งมอบสำเร็จทั้งหมดเพื่อล้างกระดาน?")) {
        posts = posts.filter(x => x.status !== 'completed');
        saveData(); renderFeed(); updateAdminStats();
    }
}

// --- 5. Admin Logic ---
function addAdmin() {
    const email = document.getElementById('new-admin-email').value.trim().toLowerCase();
    if(email && !admins.includes(email)) {
        admins.push(email);
        localStorage.setItem('ntun_v4_admins', JSON.stringify(admins));
        updateAdminStats();
        document.getElementById('new-admin-email').value = "";
        alert("เพิ่มแอดมินใหม่สำเร็จ");
    }
}

function updateAdminStats() {
    document.getElementById('stat-total').innerText = posts.length;
    document.getElementById('stat-reserved').innerText = posts.filter(p => p.status === 'reserved').length;
    document.getElementById('stat-done').innerText = posts.filter(p => p.status === 'completed').length;
    document.getElementById('stat-admin').innerText = admins.length;
    
    document.getElementById('admin-list').innerHTML = admins.map(a => `
        <div class="bg-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 text-[11px] border border-white/5">
            <span class="w-2 h-2 bg-blue-400 rounded-full"></span> ${a} 
            ${a !== MASTER_ADMIN ? `<button onclick="removeAdmin('${a}')" class="text-rose-400 font-bold ml-1">✕</button>` : '👑'}
        </div>
    `).join('');
}

function removeAdmin(a) {
    if(confirm("ยกเลิกสิทธิ์แอดมินคนนี้?")) {
        admins = admins.filter(x => x !== a);
        localStorage.setItem('ntun_v4_admins', JSON.stringify(admins));
        updateAdminStats();
    }
}

function saveData() { localStorage.setItem('ntun_v4_posts', JSON.stringify(posts)); }
