const ALLOWED_DOMAIN = "ntun.ac.th";
const ADMIN_EMAIL = "aceaa372@ntun.ac.th"; // อัปเดตอีเมลแอดมินตามที่ขอ

let posts = JSON.parse(localStorage.getItem('ntun_system_db')) || [];
let currentUser = null;
let selectedImageBase64 = null;
let currentFilter = 'ทั้งหมด';
let currentPage = 'landing';
let isDarkMode = false;
let currentLang = 'th';

// ระบบภาษา (Dictionary)
const i18n = {
    'th': {
        'nav-home': 'หน้าแรก', 'nav-board': 'กระดาน', 'nav-guide': 'คู่มือ', 'nav-history': 'ประวัติ', 'nav-admin': 'แผงควบคุม',
        'hero-title': 'แบ่งปัน<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">สร้างคุณค่าใหม่</span>',
        'hero-subtitle': 'เปลี่ยนของที่ไม่ได้ใช้ ให้กลายเป็นของมีค่าสำหรับเพื่อน',
        'hero-login': '🔒 กรุณาล็อกอินด้วยอีเมลโรงเรียนเพื่อเริ่มใช้งาน',
        'form-title': 'ลงของส่งต่อ', 'form-img': 'เพิ่มรูปภาพ', 'form-submit': 'ประกาศส่งต่อ', 'cat-all': 'ทั้งหมด'
    },
    'en': {
        'nav-home': 'Home', 'nav-board': 'Board', 'nav-guide': 'Guide', 'nav-history': 'History', 'nav-admin': 'Admin Panel',
        'hero-title': 'Share &<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">Create Value</span>',
        'hero-subtitle': 'Turn unused items into valuable gifts for friends.',
        'hero-login': '🔒 Please login with your school email to start.',
        'form-title': 'Post Item', 'form-img': 'Add Image', 'form-submit': 'Publish', 'cat-all': 'All'
    }
};

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
        for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
        return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (e) { return null; }
}

document.addEventListener("DOMContentLoaded", () => {
    // ลบส่วน Loader ออกตามที่ขอ
    const session = localStorage.getItem('ntun_session');
    if (session) {
        currentUser = JSON.parse(session);
        currentUser.name = fixMojibake(currentUser.name);
        renderAuthUI();
        switchPage('app');
    } else {
        switchPage('landing');
    }
    
    // โหลดธีมและภาษาที่บันทึกไว้
    if(localStorage.getItem('theme') === 'dark') toggleTheme();
    if(localStorage.getItem('lang') === 'en') toggleLang();
});

// ระบบ Theme
function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.getElementById('theme-btn').innerText = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// ระบบ Language
function toggleLang() {
    currentLang = currentLang === 'th' ? 'en' : 'th';
    document.getElementById('lang-btn').innerText = currentLang === 'th' ? 'EN' : 'TH';
    localStorage.setItem('lang', currentLang);
    
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (i18n[currentLang][key]) el.innerHTML = i18n[currentLang][key];
    });
    
    // อัปเดต Placeholder
    document.getElementById('itemName').placeholder = currentLang === 'th' ? 'ชื่อสิ่งของ' : 'Item Name';
    document.getElementById('itemDesc').placeholder = currentLang === 'th' ? 'รายละเอียด (สภาพ, ตำหนิ)' : 'Description (Condition, Flaws)';
    document.getElementById('itemContact').placeholder = currentLang === 'th' ? 'ข้อมูลติดต่อ (Line, FB)' : 'Contact (Line, FB)';
    
    renderFeed();
}

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
            landing.style.display = 'flex'; app.style.display = 'none'; landing.classList.add('page-enter');
        } else {
            landing.style.display = 'none'; app.style.display = 'block'; app.classList.add('page-enter'); renderFeed();
        }
        currentPage = targetPage;
    }, 250); 
}

function handleSignIn(response) {
    const payload = parseJwt(response.credential);
    if(!payload) return alert(currentLang === 'th' ? "เกิดข้อผิดพลาดในการอ่านข้อมูล" : "Error reading account data");

    const email = payload.email;
    const domain = payload.hd || email.split('@')[1];

    if (domain === ALLOWED_DOMAIN || email === ADMIN_EMAIL) {
        currentUser = { 
            name: fixMojibake(payload.name), email: email, picture: payload.picture, isAdmin: (email === ADMIN_EMAIL) 
        };
        localStorage.setItem('ntun_session', JSON.stringify(currentUser));
        renderAuthUI(); switchPage('app');
    } else {
        alert(currentLang === 'th' ? `❌ ระบบนี้รับเฉพาะ @${ALLOWED_DOMAIN} และ Admin เท่านั้น` : `❌ Only @${ALLOWED_DOMAIN} allowed`);
        location.reload();
    }
}

function logout() {
    if(confirm(currentLang === 'th' ? 'ออกจากระบบใช่หรือไม่?' : 'Are you sure you want to log out?')) {
        localStorage.removeItem('ntun_session'); location.reload();
    }
}

function renderAuthUI() {
    document.getElementById('g_id_onload')?.remove();
    document.querySelector('.g_id_signin').style.display = 'none';
    document.getElementById('nav-actions').classList.remove('hidden');
    document.getElementById('nav-actions').classList.add('flex');
    
    if(currentUser.isAdmin) {
        document.getElementById('admin-badge').classList.remove('hidden');
        document.getElementById('nav-admin-btn').classList.remove('hidden');
    }
    document.getElementById('landing-subtitle').style.display = 'none';

    const displayName = currentUser.isAdmin ? 'Admin' : currentUser.name.split(' ')[0];
    document.getElementById('auth-section').innerHTML = `
        <div onclick="logout()" class="flex items-center gap-2 bg-black/5 dark:bg-white/10 p-1 pr-3 rounded-full cursor-pointer hover:opacity-80 transition-all btn-press">
            <img src="${currentUser.picture}" class="w-7 h-7 rounded-full" referrerpolicy="no-referrer">
            <span class="text-xs font-semibold ${currentUser.isAdmin ? 'text-rose-500' : 'text-[#1d1d1f] dark:text-white'} truncate max-w-[80px]">${displayName}</span>
        </div>
    `;
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden'; 
    if (id === 'modal-history') switchHistoryTab('give');
    if (id === 'modal-admin' && currentUser?.isAdmin) renderAdminPanel();
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = 'auto';
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        if(input.files[0].size > 5 * 1024 * 1024) return alert(currentLang === 'th' ? "❌ รูปเกิน 5MB" : "❌ Image exceeds 5MB");
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
    e.stopPropagation(); selectedImageBase64 = null;
    document.getElementById('itemImage').value = "";
    document.getElementById('image-preview-el').classList.add('hidden');
    document.getElementById('preview-placeholder').classList.remove('hidden');
    document.getElementById('remove-img-btn').classList.add('hidden');
}

function handlePost(e) {
    e.preventDefault();
    if(!currentUser) return;
    if(!selectedImageBase64) return alert(currentLang === 'th' ? "กรุณาใส่รูปภาพประกอบ" : "Please add an image");
    if(document.getElementById('itemName').value.length < 4) return alert(currentLang === 'th' ? "ชื่อต้องยาวกว่านี้" : "Name too short");

    const newPost = {
        id: Date.now(), time: Date.now(), ownerEmail: currentUser.email, ownerName: currentUser.name,
        name: document.getElementById('itemName').value, desc: document.getElementById('itemDesc').value,
        cat: document.getElementById('itemCat').value, contact: document.getElementById('itemContact').value,
        image: selectedImageBase64, status: 'available', reservedByEmail: null, reservedByName: null
    };

    posts.unshift(newPost); saveData(); e.target.reset();
    removeImage(new Event('click')); setFilter('ทั้งหมด');
    document.getElementById('feed-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setFilter(cat) {
    currentFilter = cat;
    const tabs = document.getElementById('filter-container').children;
    for (let tab of tabs) {
        let isMatch = tab.innerText.includes(cat.replace('📚 ', '').replace('📦 ', '')) || (cat === 'ทั้งหมด' && (tab.innerText === 'ทั้งหมด' || tab.innerText === 'All'));
        tab.className = isMatch ? 'cat-tab active btn-press' : 'cat-tab btn-press';
    }
    renderFeed();
}

function renderFeed() {
    const container = document.getElementById('feed-container');
    let displayPosts = currentFilter === 'ทั้งหมด' ? posts : posts.filter(p => p.cat === currentFilter);

    if (displayPosts.length === 0) {
        container.innerHTML = `<div class="col-span-full py-16 text-center"><p class="text-[#86868b]">${currentLang === 'th' ? 'ไม่มีของในหมวดหมู่นี้' : 'No items in this category'}</p></div>`;
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
            badge = `<span class="text-[10px] font-bold text-[#86868b] bg-gray-200 dark:bg-gray-700 px-2.5 py-1 rounded-full">${currentLang === 'th' ? 'จบงาน' : 'Done'}</span>`;
            actionButton = `<span class="text-xs font-semibold text-[#86868b] block text-center py-2.5">${currentLang === 'th' ? 'ส่งมอบสำเร็จแล้ว' : 'Completed'}</span>`;
            cardClass = "opacity-50 grayscale-[50%]";
        } else if (post.status === 'reserved') {
            badge = `<span class="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full">${currentLang === 'th' ? 'รอส่งมอบ' : 'Reserved'}</span>`;
            if (isOwner) actionButton = `<button onclick="completeOrder(${post.id})" class="w-full bg-[#1d1d1f] text-white py-2.5 rounded-xl font-medium btn-press">${currentLang === 'th' ? 'ยืนยันการส่งมอบ' : 'Confirm Delivery'}</button>`;
            else if (isReservedByMe) actionButton = `<span class="text-xs font-medium text-[#1d1d1f] dark:text-white bg-black/5 dark:bg-white/10 block text-center py-2.5 rounded-xl">${currentLang === 'th' ? 'คุณจองไว้' : 'Reserved by You'}</span>`;
            else actionButton = `<button disabled class="w-full bg-gray-200 dark:bg-gray-800 text-[#86868b] py-2.5 rounded-xl font-medium cursor-not-allowed">${currentLang === 'th' ? 'มีคนจองแล้ว' : 'Unavailable'}</button>`;
        } else {
            badge = `<span class="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">${currentLang === 'th' ? 'ว่าง' : 'Available'}</span>`;
            if (isOwner) actionButton = `<span class="text-xs font-medium text-[#86868b] bg-black/5 dark:bg-white/5 block text-center py-2.5 rounded-xl">${currentLang === 'th' ? 'ของของคุณเอง' : 'Your Item'}</span>`;
            else actionButton = `<button onclick="reserveItem(${post.id})" class="w-full bg-[#1d1d1f] text-white py-2.5 rounded-xl font-medium btn-press hover:opacity-80">${currentLang === 'th' ? 'รับของชิ้นนี้' : 'Take this item'}</button>`;
        }

        const delBtn = (isAdmin || isOwner) ? `<button onclick="deletePost(${post.id})" class="absolute top-3 right-3 w-7 h-7 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-rose-500 font-bold z-10 btn-press text-xs backdrop-blur-sm">✕</button>` : '';

        return `
            <div class="glass-card flex flex-col relative ${cardClass}">
                ${delBtn}
                ${post.image ? `<img src="${post.image}" class="w-full h-48 object-cover rounded-t-[24px] shrink-0">` : `<div class="w-full h-48 bg-black/5 flex items-center justify-center rounded-t-[24px]">NO IMAGE</div>`}
                <div class="p-5 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-2"><span class="text-[10px] font-bold text-[#86868b]">${post.cat}</span>${badge}</div>
                    <h4 class="font-bold text-lg text-[#1d1d1f] line-clamp-1 mb-1">${post.name}</h4>
                    ${post.desc ? `<p class="text-xs text-[#86868b] mb-3 line-clamp-2">${post.desc}</p>` : ''}
                    <p class="text-[11px] text-[#86868b] font-medium mb-3">${currentLang === 'th' ? 'โดย' : 'By'} ${displayOwnerName}</p>
                    <div class="bg-black/5 dark:bg-white/5 p-3 rounded-xl mb-4 mt-auto relative">
                        ${!showContact ? `<div class="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-xl"><span class="text-[10px] font-bold text-[#86868b]">🔒 ${currentLang === 'th' ? 'สงวนสิทธิ์' : 'Hidden'}</span></div>` : ''}
                        <p class="text-[9px] font-bold text-[#86868b] mb-1">${currentLang === 'th' ? 'ติดต่อ' : 'Contact'}</p>
                        <p class="text-xs font-medium text-[#1d1d1f] break-all select-all">${post.contact}</p>
                    </div>
                    ${actionButton}
                </div>
            </div>`;
    }).join('');
}

function reserveItem(id) {
    if (confirm(currentLang === 'th' ? "ยืนยันการรับสิ่งของนี้ใช่ไหม?" : "Confirm reservation?")) {
        let p = posts.find(x => x.id === id);
        p.status = 'reserved'; p.reservedByEmail = currentUser.email; p.reservedByName = currentUser.name;
        saveData(); renderFeed();
    }
}
function completeOrder(id) {
    if (confirm(currentLang === 'th' ? "ส่งมอบสิ่งของเรียบร้อยแล้วใช่ไหม?" : "Confirm item delivered?")) {
        let p = posts.find(x => x.id === id); p.status = 'completed';
        saveData(); renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}
function deletePost(id) {
    if (confirm(currentLang === 'th' ? "ต้องการลบโพสต์นี้ใช่ไหม?" : "Delete this post?")) {
        posts = posts.filter(x => x.id !== id);
        saveData(); renderFeed(); renderAdminPanel();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}
function saveData() { localStorage.setItem('ntun_system_db', JSON.stringify(posts)); }

// เติมฟังก์ชันที่ถูกตัดจบให้สมบูรณ์
function switchHistoryTab(tab) {
    const list = document.getElementById('history-list');
    
    // อัปเดต UI แถบที่เลือก
    const activeClass = "pb-2 text-[#1d1d1f] dark:text-white font-medium border-b-[2px] border-[#1d1d1f] dark:border-white text-sm btn-press transition-colors";
    const inactiveClass = "pb-2 text-[#86868b] font-medium border-b-[2px] border-transparent hover:text-[#1d1d1f] dark:hover:text-white text-sm btn-press transition-colors";
    
    document.getElementById('tab-give').className = (tab === 'give') ? activeClass : inactiveClass;
    document.getElementById('tab-take').className = (tab === 'take') ? activeClass : inactiveClass;

    // กรองประวัติตามผู้ใช้
    const displayPosts = tab === 'give' 
        ? posts.filter(p => p.ownerEmail === currentUser.email)
        : posts.filter(p => p.reservedByEmail === currentUser.email);

    if (displayPosts.length === 0) {
        list.innerHTML = `<div class="py-10 text-center text-[#86868b]">${currentLang === 'th' ? 'ไม่มีประวัติในส่วนนี้' : 'No history found here.'}</div>`;
        return;
    }

    list.innerHTML = displayPosts.map(post => `
        <div class="flex gap-4 p-3 border border-gray-100 dark:border-gray-800 rounded-xl items-center bg-black/5 dark:bg-white/5">
            <img src="${post.image}" class="w-16 h-16 object-cover rounded-lg bg-black/5 shrink-0">
            <div class="flex-1 overflow-hidden">
                <h4 class="font-bold text-sm text-[#1d1d1f] truncate">${post.name}</h4>
                <p class="text-[11px] text-[#86868b] mt-1">${currentLang === 'th' ? 'สถานะ:' : 'Status:'} ${post.status}</p>
            </div>
            ${(tab === 'give' && post.status === 'reserved') ? `<button onclick="completeOrder(${post.id})" class="text-xs bg-[#1d1d1f] text-white px-3 py-1.5 rounded-lg btn-press whitespace-nowrap">${currentLang === 'th' ? 'ยืนยันส่ง' : 'Confirm'}</button>` : ''}
        </div>
    `).join('');
}

// แผงควบคุมแอดมิน
function renderAdminPanel() {
    if (!currentUser?.isAdmin) return;
    document.getElementById('admin-count').innerText = `โพสต์ทั้งหมด: ${posts.length}`;
    const list = document.getElementById('admin-list');
    
    if (posts.length === 0) {
        list.innerHTML = `<div class="py-10 text-center text-[#86868b]">ยังไม่มีโพสต์ในระบบ</div>`;
        return;
    }
    
    list.innerHTML = posts.map(post => `
        <div class="flex gap-4 p-3 border border-gray-100 dark:border-gray-800 rounded-xl items-center bg-black/5 dark:bg-white/5">
            <div class="flex-1 overflow-hidden">
                <h4 class="font-bold text-sm text-[#1d1d1f] truncate">${post.name}</h4>
                <p class="text-[11px] text-[#86868b] mt-1">โดย: ${post.ownerEmail}</p>
            </div>
            <button onclick="deletePost(${post.id})" class="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg btn-press whitespace-nowrap">ลบโพสต์</button>
        </div>
    `).join('');
}

function clearAllData() {
    if(prompt("พิมพ์คำว่า 'DELETE' เพื่อยืนยันการลบข้อมูลทั้งหมดในระบบ (กู้คืนไม่ได้)") === 'DELETE') {
        posts = [];
        saveData(); renderFeed(); renderAdminPanel();
        alert("ล้างข้อมูลสำเร็จ");
    }
}
