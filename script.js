const ALLOWED_DOMAIN = "ntun.ac.th";
const SUPER_ADMIN = "aceaa372@gmail.com";

let posts = JSON.parse(localStorage.getItem('ntun_system_db')) || [];
let adminsList = JSON.parse(localStorage.getItem('ntun_admins')) || [];
let currentUser = null;
let selectedImageBase64 = null;
let currentFilter = 'ทั้งหมด';
let currentPage = 'landing';

let isDark = localStorage.getItem('ntun_theme') === 'dark';
let currentLang = localStorage.getItem('ntun_lang') || 'th';

const guideData = {
    giver: ["photo/giver-1.jpg", "photo/giver-2.jpg", "photo/giver-3.jpg", "photo/giver-4.jpg"],
    taker: ["photo/taker-1.jpg", "photo/taker-2.jpg", "photo/taker-3.jpg"]
};
let currentGuideMode = 'giver';
let currentSlideIdx = 0;

// ==========================================
// 🌐 I18N Dictionary (ดิกชันนารีแปลภาษา)
// ==========================================
const dict = {
    th: {
        "nav-home": "หน้าแรก", "nav-board": "กระดาน", "nav-guide": "คู่มือ", "nav-history": "ประวัติ", "nav-admin": "แผงควบคุม",
        "landing-title-1": "แบ่งปัน", "landing-title-2": "สร้างคุณค่าใหม่",
        "landing-sub": "เปลี่ยนของที่ไม่ได้ใช้ ให้กลายเป็นของมีค่าสำหรับเพื่อน",
        "btn-guide": "<span class='text-xl group-hover:rotate-12 transition-transform'>📖</span> วิธีใช้งานระบบ",
        "post-item": "ลงของส่งต่อ", "btn-post": "ประกาศส่งต่อ",
        "cat-all": "ทั้งหมด", "history": "ประวัติ 📁", "give-tab": "ของที่ฝาก", "take-tab": "ของที่รับ",
        "guide": "วิธีใช้งาน 📖", "giver-tab": "คนให้", "taker-tab": "คนรับ",
        "admin-panel": "แผงควบคุมแอดมิน 🛡️", "auth-warn": "🔒 กรุณาล็อกอินด้วยอีเมลโรงเรียนเพื่อเริ่มใช้งาน"
    },
    en: {
        "nav-home": "Home", "nav-board": "Board", "nav-guide": "Guide", "nav-history": "History", "nav-admin": "Admin Panel",
        "landing-title-1": "Share &", "landing-title-2": "Create Value",
        "landing-sub": "Turn unused items into valuable gifts for friends",
        "btn-guide": "<span class='text-xl group-hover:rotate-12 transition-transform'>📖</span> How to use",
        "post-item": "Deposit Item", "btn-post": "Post Item",
        "cat-all": "All", "history": "History 📁", "give-tab": "Given", "take-tab": "Received",
        "guide": "Guide 📖", "giver-tab": "Giver", "taker-tab": "Taker",
        "admin-panel": "Admin Control Panel 🛡️", "auth-warn": "🔒 Please login with school email to start"
    }
};

// ==========================================
// 🛠️ THE MOJIBAKE FIXER (ตัวแก้ภาษาต่างดาว)
// ==========================================
function fixMojibake(str) {
    if (!str) return str;
    if (str.includes('à¸') || str.includes('à¹')) {
        try { return decodeURIComponent(escape(str)); } catch (e) { return str; }
    }
    return str;
}

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const binaryString = window.atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const jsonPayload = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("JWT Parse Error:", e);
        return null;
    }
}

function checkIsAdmin(email) {
    return email === SUPER_ADMIN || adminsList.includes(email);
}

document.addEventListener("DOMContentLoaded", () => {
    if (isDark) document.documentElement.classList.add('dark');
    updateThemeBtn();
    applyLang();

    const loader = document.getElementById('page-loader');
    if(loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }

    const session = localStorage.getItem('ntun_session');
    if (session) {
        currentUser = JSON.parse(session);
        currentUser.name = fixMojibake(currentUser.name);
        
        // อัปเดตสิทธิ์แอดมินทุกครั้งที่เข้าสู่ระบบ
        currentUser.isAdmin = checkIsAdmin(currentUser.email);
        currentUser.isSuperAdmin = (currentUser.email === SUPER_ADMIN);

        renderAuthUI();
        switchPage('app');
    } else {
        switchPage('landing');
    }
});

// ==========================================
// 🌓 THEME & LANGUAGE
// ==========================================
function toggleTheme() {
    isDark = !isDark;
    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('ntun_theme', 'dark');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('ntun_theme', 'light');
    }
    updateThemeBtn();
}
function updateThemeBtn() {
    document.getElementById('theme-btn').innerText = isDark ? '☀️' : '🌙';
}

function toggleLang() {
    currentLang = currentLang === 'th' ? 'en' : 'th';
    localStorage.setItem('ntun_lang', currentLang);
    applyLang();
}
function applyLang() {
    document.getElementById('lang-btn').innerText = currentLang === 'th' ? 'EN' : 'TH';
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[currentLang][key]) {
            el.innerHTML = dict[currentLang][key]; 
        }
    });
    
    document.getElementById('itemName').placeholder = currentLang === 'th' ? "ชื่อสิ่งของ" : "Item Name";
    document.getElementById('itemDesc').placeholder = currentLang === 'th' ? "รายละเอียด (สภาพ, ตำหนิ)" : "Description (Condition, Flaws)";
    document.getElementById('itemContact').placeholder = currentLang === 'th' ? "ข้อมูลติดต่อ (Line, FB)" : "Contact Info (Line, FB)";
    document.getElementById('img-placeholder-text').innerText = currentLang === 'th' ? "เพิ่มรูปภาพ" : "Add Photo";
}

// ==========================================
// 🚀 MAIN LOGIC
// ==========================================
function switchPage(targetPage) {
    if (currentPage === targetPage && currentUser) return;
    
    const landing = document.getElementById('page-landing');
    const app = document.getElementById('page-app');
    
    if (currentPage === 'landing') landing.classList.add('page-leave');
    if (currentPage === 'app') app.classList.add('page-leave');

    setTimeout(() => {
        landing.classList.remove('page-leave', 'page-enter');
        app.classList.remove('page-leave', 'page-enter');

        if (targetPage === 'landing') {
            landing.style.display = 'flex';
            app.style.display = 'none';
            landing.classList.add('page-enter');
        } else {
            landing.style.display = 'none';
            app.style.display = 'block';
            app.classList.add('page-enter');
            renderFeed();
        }
        currentPage = targetPage;
    }, 250); 
}

function handleSignIn(response) {
    const payload = parseJwt(response.credential);
    if(!payload) return alert("เกิดข้อผิดพลาดในการอ่านข้อมูลบัญชี กรุณาลองใหม่");

    const email = payload.email;
    const domain = payload.hd || email.split('@')[1];

    if (domain === ALLOWED_DOMAIN || checkIsAdmin(email)) {
        currentUser = { 
            name: fixMojibake(payload.name),
            email: email, 
            picture: payload.picture,
            isAdmin: checkIsAdmin(email),
            isSuperAdmin: (email === SUPER_ADMIN)
        };
        localStorage.setItem('ntun_session', JSON.stringify(currentUser));
        renderAuthUI();
        switchPage('app');
    } else {
        alert(`❌ ระบบนี้รับเฉพาะ @${ALLOWED_DOMAIN} และ Admin เท่านั้น`);
        location.reload();
    }
}

function logout() {
    if(confirm('ออกจากระบบใช่หรือไม่?')) {
        localStorage.removeItem('ntun_session');
        location.reload();
    }
}

function renderAuthUI() {
    document.getElementById('g_id_onload').remove();
    document.querySelector('.g_id_signin').style.display = 'none';
    document.getElementById('nav-actions').classList.remove('hidden');
    document.getElementById('nav-actions').classList.add('flex');
    
    if(currentUser.isAdmin) {
        document.getElementById('admin-badge').classList.remove('hidden');
        document.getElementById('nav-admin-btn').classList.remove('hidden');
        document.getElementById('nav-admin-btn').classList.add('flex');
    }
    document.getElementById('landing-subtitle').style.display = 'none';
    document.getElementById('landing-guide-btn').style.display = 'none'; 

    const displayName = currentUser.isSuperAdmin ? 'SuperAdmin' : currentUser.isAdmin ? 'Admin' : currentUser.name.split(' ')[0];
    document.getElementById('auth-section').innerHTML = `
        <div onclick="logout()" class="flex items-center gap-2 bg-white/50 dark:bg-black/40 backdrop-blur-md p-1 pr-3 rounded-full border border-gray-200 dark:border-white/10 cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 transition-all btn-press">
            <img src="${currentUser.picture}" class="w-7 h-7 rounded-full" referrerpolicy="no-referrer">
            <span class="text-xs font-semibold ${currentUser.isAdmin ? 'text-rose-600 dark:text-rose-400' : 'text-[#1d1d1f] dark:text-white'} truncate max-w-[80px] md:max-w-[120px]">${displayName}</span>
        </div>
    `;
}

// ==========================================
// 📱 MOBILE UI TOGGLE
// ==========================================
function togglePostForm() {
    const container = document.getElementById('post-form-container');
    const overlay = document.getElementById('mobile-form-overlay');
    if (container.classList.contains('translate-y-full')) {
        container.classList.remove('translate-y-full');
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } else {
        closePostForm();
    }
}
function closePostForm() {
    const container = document.getElementById('post-form-container');
    const overlay = document.getElementById('mobile-form-overlay');
    container.classList.add('translate-y-full');
    overlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// ==========================================
// 🪟 MODALS & TABS
// ==========================================
function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; 
    if (id === 'modal-history') switchHistoryTab('give');
    if (id === 'modal-guide') switchGuideTab('giver');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchGuideTab(mode) {
    currentGuideMode = mode;
    currentSlideIdx = 0;
    const activeClass = "pb-2 text-[#1d1d1f] dark:text-white font-medium border-b-[2px] border-[#1d1d1f] dark:border-white text-sm btn-press transition-colors";
    const inactiveClass = "pb-2 text-[#86868b] font-medium border-b-[2px] border-transparent hover:text-[#1d1d1f] dark:hover:text-white text-sm btn-press transition-colors";
    document.getElementById('gtab-giver').className = (mode === 'giver') ? activeClass : inactiveClass;
    document.getElementById('gtab-taker').className = (mode === 'taker') ? activeClass : inactiveClass;
    updateSliderUI();
}

function updateSliderUI() {
    const images = guideData[currentGuideMode];
    const imgEl = document.getElementById('guide-slider-img');
    imgEl.style.opacity = '0';
    setTimeout(() => {
        imgEl.src = images[currentSlideIdx];
        imgEl.onerror = () => { imgEl.src = `https://via.placeholder.com/800x500/f3f4f6/86868b?text=Image+Not+Found:+${images[currentSlideIdx]}`; };
        imgEl.style.opacity = '1';
    }, 150);
    document.getElementById('slide-counter').innerText = `${currentSlideIdx + 1} / ${images.length}`;
}
function nextSlide() { currentSlideIdx = (currentSlideIdx + 1) % guideData[currentGuideMode].length; updateSliderUI(); }
function prevSlide() { currentSlideIdx = (currentSlideIdx - 1 + guideData[currentGuideMode].length) % guideData[currentGuideMode].length; updateSliderUI(); }

function switchHistoryTab(tab) {
    const activeClass = "pb-2 text-[#1d1d1f] dark:text-white font-medium border-b-[2px] border-[#1d1d1f] dark:border-white text-sm btn-press transition-colors";
    const inactiveClass = "pb-2 text-[#86868b] font-medium border-b-[2px] border-transparent hover:text-[#1d1d1f] dark:hover:text-white text-sm btn-press transition-colors";
    
    document.getElementById('tab-give').className = (tab === 'give') ? activeClass : inactiveClass;
    document.getElementById('tab-take').className = (tab === 'take') ? activeClass : inactiveClass;
    
    const list = document.getElementById('history-list');
    let myPosts = tab === 'give' ? posts.filter(p => p.ownerEmail === currentUser.email) : posts.filter(p => p.reservedByEmail === currentUser.email);
    
    if(myPosts.length === 0) {
        list.innerHTML = `<p class="text-center text-[#86868b] py-8 text-sm">ไม่มีประวัติ</p>`;
        return;
    }
    
    list.innerHTML = myPosts.map(p => `
        <div class="flex items-center gap-4 bg-gray-50 dark:bg-black/30 p-3 rounded-xl border border-gray-100 dark:border-white/5">
            ${p.image ? `<img src="${p.image}" class="w-12 h-12 rounded-lg object-cover">` : `<div class="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center text-[8px] font-bold text-gray-400">IMG</div>`}
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm text-[#1d1d1f] dark:text-white truncate">${p.name}</h4>
                <p class="text-[10px] text-[#86868b]">${p.status === 'completed' ? '🟢 ส่งมอบสำเร็จ' : p.status === 'reserved' ? '🟠 รอส่งมอบ' : '⚪ ว่าง'}</p>
            </div>
            ${(tab === 'give' && p.status === 'reserved') ? `<button onclick="completeOrder(${p.id})" class="text-[10px] font-bold bg-[#1d1d1f] dark:bg-gray-200 text-white dark:text-black px-3 py-1.5 rounded-lg btn-press">ปิดงาน</button>` : ''}
        </div>
    `).join('');
}

// ==========================================
// 📦 POST & FEED MANAGEMENT
// ==========================================
function saveData() {
    localStorage.setItem('ntun_system_db', JSON.stringify(posts));
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        if(input.files[0].size > 5 * 1024 * 1024) return alert("❌ รูปใหญ่เกินไป กรุณาใช้รูปขนาดไม่เกิน 5MB");
        const reader = new FileReader();
        reader.onload = (e) => {
            selectedImageBase64 = e.target.result;
            document.getElementById('image-preview-el').src = selectedImageBase64;
            document.getElementById('image-preview-el').classList.remove('hidden');
            document.getElementById('preview-placeholder').classList.add('hidden');
            document.getElementById('remove-img-btn').classList.remove('hidden');
        };
        reader.readAsDataURL(input.files[0]);
    }
}
function removeImage(e) {
    e.stopPropagation();
    selectedImageBase64 = null;
    document.getElementById('itemImage').value = "";
    document.getElementById('image-preview-el').classList.add('hidden');
    document.getElementById('preview-placeholder').classList.remove('hidden');
    document.getElementById('remove-img-btn').classList.add('hidden');
}

function handlePost(e) {
    e.preventDefault();
    if(!currentUser) return;
    if(!selectedImageBase64) return alert("กรุณาใส่รูปภาพประกอบ เพื่อให้เพื่อนๆ ตัดสินใจได้ง่ายขึ้นครับ");
    if(document.getElementById('itemName').value.length < 4) return alert("กรุณาตั้งชื่อสิ่งของให้ชัดเจนกว่านี้ครับ (อย่างน้อย 4 ตัวอักษร)");

    const newPost = {
        id: Date.now(),
        time: Date.now(),
        ownerEmail: currentUser.email,
        ownerName: currentUser.name,
        name: document.getElementById('itemName').value,
        desc: document.getElementById('itemDesc').value,
        cat: document.getElementById('itemCat').value,
        contact: document.getElementById('itemContact').value,
        image: selectedImageBase64,
        status: 'available',
        reservedByEmail: null,
        reservedByName: null
    };

    posts.unshift(newPost);
    saveData();
    e.target.reset();
    removeImage(new Event('click'));
    setFilter('ทั้งหมด');
    closePostForm(); // ปิดฟอร์มในมือถืออัตโนมัติ
    document.getElementById('feed-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setFilter(cat) {
    currentFilter = cat;
    const tabs = document.getElementById('filter-container').children;
    for (let tab of tabs) {
        tab.className = (tab.innerText === cat || (cat === 'ทั้งหมด' && tab.innerText === 'ทั้งหมด' || cat === 'All' && tab.innerText === 'All')) ? 'cat-tab active btn-press' : 'cat-tab btn-press';
    }
    renderFeed();
}

function renderFeed() {
    const container = document.getElementById('feed-container');
    let displayPosts = (currentFilter === 'ทั้งหมด' || currentFilter === 'All') ? posts : posts.filter(p => p.cat === currentFilter);

    if (displayPosts.length === 0) {
        container.innerHTML = `<div class="col-span-full py-16 text-center"><p class="font-medium text-lg text-[#86868b]">ยังไม่มีของในหมวดหมู่นี้</p></div>`;
        return;
    }

    container.innerHTML = displayPosts.map((post) => {
        const isOwner = currentUser.email === post.ownerEmail;
        const isAdmin = currentUser.isAdmin;
        const isReservedByMe = post.reservedByEmail === currentUser.email;
        const showContact = post.status === 'available' || isOwner || isReservedByMe || isAdmin;
        
        const displayOwnerName = fixMojibake(post.ownerName);
        let badge, actionButton, cardClass = "";

        if (post.status === 'completed') {
            badge = `<span class="text-[10px] font-bold text-[#86868b] dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">จบงาน</span>`;
            actionButton = `<span class="text-xs font-semibold text-[#86868b] dark:text-gray-500 block text-center py-2.5">ส่งมอบสำเร็จแล้ว</span>`;
            cardClass = "opacity-50 grayscale-[50%]";
        } else if (post.status === 'reserved') {
            badge = `<span class="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800 px-2.5 py-1 rounded-full">รอส่งมอบ</span>`;
            if (isOwner) {
                actionButton = `<button onclick="completeOrder(${post.id})" class="w-full bg-[#1d1d1f] dark:bg-gray-200 text-white dark:text-black py-2.5 rounded-xl font-medium btn-press">ยืนยันการส่งมอบ</button>`;
            } else if (isReservedByMe) {
                actionButton = `<span class="text-xs font-medium text-[#1d1d1f] dark:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 block text-center py-2.5 rounded-xl">คุณจองไว้ (ทักนัดรับเลย)</span>`;
            } else {
                actionButton = `<button disabled class="w-full bg-gray-100 dark:bg-gray-800 text-[#86868b] dark:text-gray-500 py-2.5 rounded-xl font-medium cursor-not-allowed">มีคนจองแล้ว</button>`;
            }
        } else {
            badge = `<span class="text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 px-2.5 py-1 rounded-full">ว่าง</span>`;
            if (isOwner) {
                actionButton = `<span class="text-xs font-medium text-[#86868b] dark:text-gray-400 bg-gray-50 dark:bg-gray-800 block text-center py-2.5 rounded-xl border border-gray-100 dark:border-gray-700">ของของคุณเอง</span>`;
            } else {
                actionButton = `<button onclick="reserveItem(${post.id})" class="w-full bg-[#1d1d1f] dark:bg-gray-200 text-white dark:text-black py-2.5 rounded-xl font-medium hover:bg-black dark:hover:bg-white transition-all btn-press">รับของชิ้นนี้</button>`;
            }
        }

        const delBtn = (isAdmin || isOwner) ? `<button onclick="deletePost(${post.id})" class="absolute top-3 right-3 w-7 h-7 bg-black/40 dark:bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-rose-500 font-bold z-10 btn-press transition-colors backdrop-blur-md text-xs">✕</button>` : '';

        return `
            <div class="glass-card flex flex-col relative ${cardClass}">
                ${delBtn}
                ${post.image ? `<img src="${post.image}" class="w-full h-48 object-cover rounded-t-[24px] shrink-0">` : `<div class="w-full h-48 bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-[#86868b] dark:text-gray-500 text-xs font-bold rounded-t-[24px] shrink-0">NO IMAGE</div>`}
                <div class="p-5 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] font-bold text-[#86868b] dark:text-gray-400">${post.cat}</span>
                        ${badge}
                    </div>
                    <h4 class="font-bold text-lg text-[#1d1d1f] dark:text-white line-clamp-1 mb-1">${post.name}</h4>
                    ${post.desc ? `<p class="text-xs text-[#86868b] dark:text-gray-400 mb-3 line-clamp-2">${post.desc}</p>` : ''}
                    
                    <p class="text-[11px] text-[#86868b] dark:text-gray-500 font-medium mb-3">โดย ${displayOwnerName}</p>
                    
                    <div class="bg-white/50 dark:bg-black/30 p-3 rounded-xl mb-4 mt-auto border border-gray-100 dark:border-white/5 relative">
                        ${!showContact ? '<div class="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-xl"><span class="text-[10px] font-bold text-[#86868b] dark:text-gray-400">🔒 สงวนสิทธิ์</span></div>' : ''}
                        <p class="text-[9px] font-bold text-[#86868b] dark:text-gray-500 mb-1">ติดต่อ</p>
                        <p class="text-xs font-medium text-[#1d1d1f] dark:text-gray-200 break-all select-all">${post.contact}</p>
                    </div>
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

function reserveItem(id) {
    if (confirm("ยืนยันการรับสิ่งของนี้ใช่ไหม?")) {
        let p = posts.find(x => x.id === id);
        p.status = 'reserved';
        p.reservedByEmail = currentUser.email;
        p.reservedByName = currentUser.name;
        saveData(); renderFeed();
    }
}
function completeOrder(id) {
    if (confirm("ส่งมอบสิ่งของให้เพื่อนเรียบร้อยแล้วใช่ไหม?")) {
        let p = posts.find(x => x.id === id);
        p.status = 'completed';
        saveData(); renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
        if(document.getElementById('modal-admin').classList.contains('active')) renderAdminTable();
    }
}
function deletePost(id) {
    if (confirm("ต้องการลบโพสต์นี้ใช่ไหม?")) {
        posts = posts.filter(x => x.id !== id);
        saveData(); renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
        if(document.getElementById('modal-admin').classList.contains('active')) renderAdminTable();
    }
}

// ==========================================
// 🛡️ ADMIN PANEL
// ==========================================
function openAdminPanel() {
    if(!currentUser.isAdmin) return;
    openModal('modal-admin');
    renderAdminTable();
    
    if(currentUser.isSuperAdmin) {
        document.getElementById('super-admin-section').classList.remove('hidden');
        renderAdminList();
    }
}

function renderAdminTable() {
    const tbody = document.getElementById('admin-posts-table');
    if(posts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-gray-500">ไม่มีข้อมูล</td></tr>`;
        return;
    }
    tbody.innerHTML = posts.map(p => `
        <tr class="hover:bg-gray-50 dark:hover:bg-black/20 transition-colors">
            <td class="p-3 border-b border-gray-100 dark:border-gray-800">
                <div class="font-bold line-clamp-1 max-w-[150px]">${p.name}</div>
                <div class="text-[10px] text-gray-400">ID: ${p.id}</div>
            </td>
            <td class="p-3 border-b border-gray-100 dark:border-gray-800">
                <div class="font-medium max-w-[100px] truncate">${fixMojibake(p.ownerName)}</div>
                <div class="text-[10px] text-gray-500 max-w-[100px] truncate">${p.ownerEmail}</div>
            </td>
            <td class="p-3 border-b border-gray-100 dark:border-gray-800">
                ${p.reservedByEmail ? `
                    <div class="font-medium text-amber-600 dark:text-amber-400 max-w-[100px] truncate">${fixMojibake(p.reservedByName)}</div>
                    <div class="text-[10px] text-gray-500 max-w-[100px] truncate">${p.reservedByEmail}</div>
                ` : '<span class="text-gray-300">-</span>'}
            </td>
            <td class="p-3 border-b border-gray-100 dark:border-gray-800">
                <span class="text-xs px-2 py-1 rounded-lg ${p.status === 'available' ? 'bg-blue-50 text-blue-600' : p.status === 'reserved' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}">
                    ${p.status === 'available' ? '🟢 ว่าง' : p.status === 'reserved' ? '🟠 รอส่งมอบ' : '⚪ จบงาน'}
                </span>
            </td>
            <td class="p-3 border-b border-gray-100 dark:border-gray-800">
                <div class="flex gap-1 flex-wrap">
                    <button onclick="editPostName(${p.id})" class="text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200">แก้ชื่อ</button>
                    ${p.status !== 'completed' ? `<button onclick="completeOrder(${p.id})" class="text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-2 py-1 rounded hover:bg-green-200">ปิดงาน</button>` : ''}
                    <button onclick="deletePost(${p.id})" class="text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 px-2 py-1 rounded hover:bg-rose-200">ลบ</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editPostName(id) {
    let p = posts.find(x => x.id === id);
    if(p) {
        let newName = prompt("แก้ไขชื่อสิ่งของ:", p.name);
        if(newName && newName.trim() !== "") {
            p.name = newName;
            saveData();
            renderFeed();
            renderAdminTable();
        }
    }
}

function addAdmin() {
    if(!currentUser.isSuperAdmin) return;
    const email = document.getElementById('new-admin-email').value.trim();
    if(email && email !== SUPER_ADMIN && !adminsList.includes(email)) {
        adminsList.push(email);
        localStorage.setItem('ntun_admins', JSON.stringify(adminsList));
        document.getElementById('new-admin-email').value = '';
        renderAdminList();
    }
}

function removeAdmin(email) {
    if(!currentUser.isSuperAdmin) return;
    adminsList = adminsList.filter(e => e !== email);
    localStorage.setItem('ntun_admins', JSON.stringify(adminsList));
    renderAdminList();
}

function renderAdminList() {
    const c = document.getElementById('admin-list-container');
    if(adminsList.length === 0) {
        c.innerHTML = '<span class="text-xs text-gray-500">ไม่มีแอดมินคนอื่น</span>';
        return;
    }
    c.innerHTML = adminsList.map(e => `
        <span class="bg-rose-100 dark:bg-rose-800 text-rose-800 dark:text-rose-100 text-xs px-2 py-1.5 rounded-lg flex items-center gap-2 font-medium">
            ${e} <button onclick="removeAdmin('${e}')" class="font-black hover:text-red-500 bg-white/50 dark:bg-black/20 w-4 h-4 rounded-full flex items-center justify-center btn-press">×</button>
        </span>
    `).join('');
}
