const ALLOWED_DOMAIN = "ntun.ac.th";
const ADMIN_EMAIL = "aceaa372@ntun.ac.th"; // อัปเดตอีเมลแอดมินตามที่ขอครับ

let posts = JSON.parse(localStorage.getItem('ntun_system_db')) || [];
let currentUser = null;
let selectedImageBase64 = null;
let currentFilter = 'ทั้งหมด';
let currentPage = 'landing';
let currentLang = 'th';

const guideData = {
    giver: ["photo/giver-1.jpg", "photo/giver-2.jpg", "photo/giver-3.jpg", "photo/giver-4.jpg"],
    taker: ["photo/taker-1.jpg", "photo/taker-2.jpg", "photo/taker-3.jpg"]
};
let currentGuideMode = 'giver';
let currentSlideIdx = 0;

// พจนานุกรมแปลภาษา
const langDict = {
    "nav-home": { th: "หน้าแรก", en: "Home" },
    "nav-board": { th: "กระดาน", en: "Board" },
    "nav-guide": { th: "คู่มือ", en: "Guide" },
    "nav-history": { th: "ประวัติ", en: "History" },
    "nav-admin": { th: "แผงควบคุม", en: "Admin" },
    "hero-badge": { th: "NTUN SHARING SPACE", en: "NTUN SHARING SPACE" },
    "hero-title": { th: "แบ่งปัน<br><span class=\"text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600\">สร้างคุณค่าใหม่</span>", en: "Share &<br><span class=\"text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600\">Create Value</span>" },
    "hero-desc": { th: "เปลี่ยนของที่ไม่ได้ใช้ ให้กลายเป็นของมีค่าสำหรับเพื่อน", en: "Turn unused items into valuable gifts for friends." },
    "hero-login-req": { th: "🔒 กรุณาล็อกอินด้วยอีเมลโรงเรียนเพื่อเริ่มใช้งาน", en: "🔒 Please login with school email to start" },
    "btn-guide": { th: "<span class=\"text-xl group-hover:rotate-12 transition-transform\">📖</span> วิธีใช้งานระบบ", en: "<span class=\"text-xl group-hover:rotate-12 transition-transform\">📖</span> How to use" },
    "post-title": { th: "ลงของส่งต่อ", en: "Post Item" },
    "post-img": { th: "เพิ่มรูปภาพ", en: "Add Photo" },
    "post-btn": { th: "ประกาศส่งต่อ", en: "Post Now" },
    "filter-all": { th: "ทั้งหมด", en: "All" },
    "hist-give": { th: "ของที่ฝาก", en: "Given" },
    "hist-take": { th: "ของที่รับ", en: "Taken" },
    "guide-giver": { th: "คนให้", en: "Giver" },
    "guide-taker": { th: "คนรับ", en: "Taker" },
    "admin-title": { th: "🛠️ แผงควบคุม (Admin Panel)", en: "🛠️ Admin Control Panel" },
    "admin-th-name": { th: "ชื่อของ", en: "Item Name" },
    "admin-th-owner": { th: "เจ้าของ", en: "Owner" },
    "admin-th-status": { th: "สถานะ", en: "Status" },
    "admin-th-action": { th: "จัดการ", en: "Action" },
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
        for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
        return JSON.parse(new TextDecoder('utf-8').decode(bytes));
    } catch (e) {
        return null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const session = localStorage.getItem('ntun_session');
    if (session) {
        currentUser = JSON.parse(session);
        currentUser.name = fixMojibake(currentUser.name);
        renderAuthUI();
        switchPage('app');
    } else {
        switchPage('landing');
    }
    applyLanguage();
});

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
}

function toggleLang() {
    currentLang = currentLang === 'th' ? 'en' : 'th';
    document.getElementById('lang-btn').innerText = currentLang === 'th' ? 'EN' : 'TH';
    applyLanguage();
}

function applyLanguage() {
    document.querySelectorAll('[data-t]').forEach(el => {
        const key = el.getAttribute('data-t');
        if (langDict[key]) el.innerHTML = langDict[key][currentLang];
    });
    
    // อัปเดต Placeholder
    document.getElementById('itemName').placeholder = currentLang === 'th' ? "ชื่อสิ่งของ" : "Item Name";
    document.getElementById('itemDesc').placeholder = currentLang === 'th' ? "รายละเอียด (สภาพ, ตำหนิ)" : "Description (Condition, Flaws)";
    document.getElementById('itemContact').placeholder = currentLang === 'th' ? "ข้อมูลติดต่อ (Line, FB)" : "Contact Info (Line, FB)";
    
    renderFeed();
    if(currentUser && currentUser.isAdmin && currentPage === 'admin') renderAdminTable();
}

function switchPage(targetPage) {
    if (currentPage === targetPage && currentUser) return;
    
    const landing = document.getElementById('page-landing');
    const app = document.getElementById('page-app');
    const admin = document.getElementById('page-admin');
    
    document.querySelectorAll('section').forEach(sec => sec.classList.add('page-leave'));

    setTimeout(() => {
        document.querySelectorAll('section').forEach(sec => {
            sec.style.display = 'none';
            sec.classList.remove('page-leave', 'page-enter');
        });

        if (targetPage === 'landing') {
            landing.style.display = 'flex';
            landing.classList.add('page-enter');
        } else if (targetPage === 'app') {
            app.style.display = 'block';
            app.classList.add('page-enter');
            renderFeed();
        } else if (targetPage === 'admin' && currentUser && currentUser.isAdmin) {
            admin.style.display = 'block';
            admin.classList.add('page-enter');
            renderAdminTable();
        }
        currentPage = targetPage;
    }, 250); 
}

function handleSignIn(response) {
    const payload = parseJwt(response.credential);
    if(!payload) return alert(currentLang === 'th' ? "เกิดข้อผิดพลาด" : "Error reading account info");

    const email = payload.email;
    const domain = payload.hd || email.split('@')[1];

    if (domain === ALLOWED_DOMAIN || email === ADMIN_EMAIL) {
        currentUser = { 
            name: fixMojibake(payload.name), 
            email: email, 
            picture: payload.picture,
            isAdmin: (email === ADMIN_EMAIL) 
        };
        localStorage.setItem('ntun_session', JSON.stringify(currentUser));
        renderAuthUI();
        switchPage('app');
    } else {
        alert(currentLang === 'th' ? `❌ ระบบนี้รับเฉพาะ @${ALLOWED_DOMAIN} และ Admin เท่านั้น` : `❌ Access limited to @${ALLOWED_DOMAIN} and Admin only`);
        location.reload();
    }
}

function logout() {
    if(confirm(currentLang === 'th' ? 'ออกจากระบบใช่หรือไม่?' : 'Are you sure you want to log out?')) {
        localStorage.removeItem('ntun_session');
        location.reload();
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
    document.getElementById('landing-guide-btn').style.display = 'none'; 

    const displayName = currentUser.isAdmin ? 'Admin' : currentUser.name.split(' ')[0];
    document.getElementById('auth-section').innerHTML = `
        <div onclick="logout()" class="flex items-center gap-2 border-main border p-1 pr-3 rounded-full cursor-pointer hover:bg-black/5 transition-all btn-press">
            <img src="${currentUser.picture}" class="w-7 h-7 rounded-full" referrerpolicy="no-referrer">
            <span class="text-xs font-semibold ${currentUser.isAdmin ? 'text-rose-500' : 'text-main'} truncate max-w-[80px] md:max-w-[120px]">${displayName}</span>
        </div>
    `;
}

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
    const activeClass = "pb-2 text-main font-medium border-b-[2px] border-current text-sm btn-press transition-colors";
    const inactiveClass = "pb-2 text-[#86868b] font-medium border-b-[2px] border-transparent hover:text-main text-sm btn-press transition-colors";
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
        imgEl.onerror = () => { imgEl.src = `https://via.placeholder.com/800x500/f3f4f6/86868b?text=Image+Not+Found`; };
        imgEl.style.opacity = '1';
    }, 150);
    document.getElementById('slide-counter').innerText = `${currentSlideIdx + 1} / ${images.length}`;
}
function nextSlide() { currentSlideIdx = (currentSlideIdx + 1) % guideData[currentGuideMode].length; updateSliderUI(); }
function prevSlide() { currentSlideIdx = (currentSlideIdx - 1 + guideData[currentGuideMode].length) % guideData[currentGuideMode].length; updateSliderUI(); }

function previewImage(input) {
    if (input.files && input.files[0]) {
        if(input.files[0].size > 5 * 1024 * 1024) return alert(currentLang === 'th' ? "❌ รูปใหญ่เกินไป กรุณาใช้รูปขนาดไม่เกิน 5MB" : "❌ Image too large. Max 5MB.");
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
    if(!selectedImageBase64) return alert(currentLang === 'th' ? "กรุณาใส่รูปภาพประกอบ" : "Please attach an image.");
    if(document.getElementById('itemName').value.length < 4) return alert(currentLang === 'th' ? "กรุณาตั้งชื่อสิ่งของให้ชัดเจนกว่านี้ครับ" : "Name too short.");

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
    document.getElementById('feed-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setFilter(cat) {
    currentFilter = cat;
    const tabs = document.getElementById('filter-container').children;
    for (let tab of tabs) {
        tab.className = (tab.innerText === cat || (cat === 'ทั้งหมด' && tab.innerText === 'ทั้งหมด' || cat === 'All')) ? 'cat-tab active btn-press' : 'cat-tab btn-press';
    }
    renderFeed();
}

function renderFeed() {
    const container = document.getElementById('feed-container');
    let displayPosts = (currentFilter === 'ทั้งหมด' || currentFilter === 'All') ? posts : posts.filter(p => p.cat === currentFilter);

    if (displayPosts.length === 0) {
        container.innerHTML = `<div class="col-span-full py-16 text-center"><p class="font-medium text-lg text-[#86868b]">${currentLang === 'th' ? 'ยังไม่มีของในหมวดหมู่นี้' : 'No items in this category'}</p></div>`;
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
            badge = `<span class="text-[10px] font-bold text-[#86868b] bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">${currentLang === 'th' ? 'จบงาน' : 'Completed'}</span>`;
            actionButton = `<span class="text-xs font-semibold text-[#86868b] block text-center py-2.5">${currentLang === 'th' ? 'ส่งมอบสำเร็จแล้ว' : 'Successfully Delivered'}</span>`;
            cardClass = "opacity-50 grayscale-[50%]";
        } else if (post.status === 'reserved') {
            badge = `<span class="text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-700/50 px-2.5 py-1 rounded-full">${currentLang === 'th' ? 'รอส่งมอบ' : 'Reserved'}</span>`;
            if (isOwner) {
                actionButton = `<button onclick="completeOrder(${post.id})" class="w-full btn-main py-2.5 rounded-xl font-medium btn-press">${currentLang === 'th' ? 'ยืนยันการส่งมอบ' : 'Confirm Delivery'}</button>`;
            } else if (isReservedByMe) {
                actionButton = `<span class="text-xs font-medium text-main bg-black/5 dark:bg-white/10 border-main border block text-center py-2.5 rounded-xl">${currentLang === 'th' ? 'คุณจองไว้ (ทักนัดรับเลย)' : 'Reserved by You'}</span>`;
            } else {
                actionButton = `<button disabled class="w-full bg-gray-100 dark:bg-gray-800 text-[#86868b] py-2.5 rounded-xl font-medium cursor-not-allowed">${currentLang === 'th' ? 'มีคนจองแล้ว' : 'Already Reserved'}</button>`;
            }
        } else {
            badge = `<span class="text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-700/50 px-2.5 py-1 rounded-full">${currentLang === 'th' ? 'ว่าง' : 'Available'}</span>`;
            if (isOwner) {
                actionButton = `<span class="text-xs font-medium text-[#86868b] bg-black/5 dark:bg-white/10 block text-center py-2.5 rounded-xl border border-main">${currentLang === 'th' ? 'ของของคุณเอง' : 'Your Item'}</span>`;
            } else {
                actionButton = `<button onclick="reserveItem(${post.id})" class="w-full btn-main py-2.5 rounded-xl font-medium hover:opacity-90 transition-all btn-press">${currentLang === 'th' ? 'รับของชิ้นนี้' : 'Take this item'}</button>`;
            }
        }

        const delBtn = (isAdmin || isOwner) ? `<button onclick="deletePost(${post.id})" class="absolute top-3 right-3 w-7 h-7 bg-black/40 text-white rounded-full flex items-center justify-center hover:bg-rose-500 font-bold z-10 btn-press transition-colors backdrop-blur-md text-xs border border-white/20">✕</button>` : '';

        return `
            <div class="glass-card flex flex-col relative ${cardClass}">
                ${delBtn}
                ${post.image ? `<img src="${post.image}" class="w-full h-48 object-cover rounded-t-[24px] shrink-0 border-b border-main">` : `<div class="w-full h-48 bg-black/5 flex items-center justify-center text-[#86868b] text-xs font-bold rounded-t-[24px] shrink-0 border-b border-main">NO IMAGE</div>`}
                <div class="p-5 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] font-bold text-[#86868b]">${post.cat}</span>
                        ${badge}
                    </div>
                    <h4 class="font-bold text-lg text-main line-clamp-1 mb-1">${post.name}</h4>
                    ${post.desc ? `<p class="text-xs text-[#86868b] mb-3 line-clamp-2">${post.desc}</p>` : ''}
                    
                    <p class="text-[11px] text-[#86868b] font-medium mb-3">${currentLang === 'th' ? 'โดย' : 'By'} ${displayOwnerName}</p>
                    
                    <div class="bg-black/5 dark:bg-white/10 p-3 rounded-xl mb-4 mt-auto border border-main relative">
                        ${!showContact ? `<div class="absolute inset-0 bg-white/70 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center rounded-xl"><span class="text-[10px] font-bold text-main">🔒 ${currentLang === 'th' ? 'สงวนสิทธิ์' : 'Hidden'}</span></div>` : ''}
                        <p class="text-[9px] font-bold text-[#86868b] mb-1">${currentLang === 'th' ? 'ติดต่อ' : 'Contact'}</p>
                        <p class="text-xs font-medium text-main break-all select-all">${post.contact}</p>
                    </div>
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

// ---------------- Admin Functions ----------------
function renderAdminTable() {
    const tbody = document.getElementById('admin-table-body');
    if(posts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-[#86868b]">${currentLang === 'th' ? 'ยังไม่มีข้อมูล' : 'No Data'}</td></tr>`;
        return;
    }
    
    tbody.innerHTML = posts.map(p => `
        <tr class="border-b border-main hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <td class="p-4 font-medium">${p.name}</td>
            <td class="p-4 text-xs">${fixMojibake(p.ownerName)}<br><span class="text-[#86868b]">${p.ownerEmail}</span></td>
            <td class="p-4"><span class="px-2 py-1 bg-black/5 dark:bg-white/10 rounded-full text-[10px] font-bold">${p.status}</span></td>
            <td class="p-4">
                <button onclick="deletePost(${p.id}); renderAdminTable();" class="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-600 btn-press">${currentLang === 'th' ? 'ลบ' : 'Delete'}</button>
            </td>
        </tr>
    `).join('');
}

function reserveItem(id) {
    if (confirm(currentLang === 'th' ? "ยืนยันการรับสิ่งของนี้ใช่ไหม?" : "Confirm reservation?")) {
        let p = posts.find(x => x.id === id);
        p.status = 'reserved';
        p.reservedByEmail = currentUser.email;
        p.reservedByName = currentUser.name;
        saveData(); renderFeed();
    }
}
function completeOrder(id) {
    if (confirm(currentLang === 'th' ? "ส่งมอบสิ่งของให้เพื่อนเรียบร้อยแล้วใช่ไหม?" : "Confirm item delivery?")) {
        let p = posts.find(x => x.id === id);
        p.status = 'completed';
        saveData(); renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}
function deletePost(id) {
    if (confirm(currentLang === 'th' ? "ต้องการลบโพสต์นี้ใช่ไหม?" : "Delete this post?")) {
        posts = posts.filter(x => x.id !== id);
        saveData(); renderFeed();
        if(currentPage === 'admin') renderAdminTable();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}
function saveData() { localStorage.setItem('ntun_system_db', JSON.stringify(posts)); }

function switchHistoryTab(tab) {
    const list = document.getElementById('history-list');
    
    const activeClass = "pb-2 text-main font-medium border-b-[2px] border-current text-sm btn-press transition-colors";
    const inactiveClass = "pb-2 text-[#86868b] font-medium border-b-[2px] border-transparent hover:text-main text-sm btn-press transition-colors";
    
    document.getElementById('tab-give').className = (tab === 'give') ? activeClass : inactiveClass;
    document.getElementById('tab-take').className = (tab === 'take') ? activeClass : inactiveClass;

    const filtered = posts.filter(p => tab === 'give' ? p.ownerEmail === currentUser.email : p.reservedByEmail === currentUser.email);
    
    if(filtered.length === 0) {
        list.innerHTML = `<div class="text-center py-8 text-[#86868b] text-sm">${currentLang === 'th' ? 'ยังไม่มีประวัติในหมวดนี้' : 'No history found.'}</div>`;
        return;
    }

    list.innerHTML = filtered.map(p => `
        <div class="flex items-center gap-4 bg-black/5 dark:bg-white/10 p-3 rounded-2xl border border-main">
            ${p.image ? `<img src="${p.image}" class="w-16 h-16 object-cover rounded-xl shrink-0">` : `<div class="w-16 h-16 bg-black/10 dark:bg-white/20 rounded-xl flex items-center justify-center text-[10px] font-bold text-[#86868b]">NO IMG</div>`}
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm text-main truncate">${p.name}</h4>
                <p class="text-[10px] text-[#86868b] mb-1">${p.cat}</p>
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${p.status === 'completed' ? 'bg-gray-200 dark:bg-gray-700 text-[#86868b]' : (p.status === 'reserved' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50')}">${p.status.toUpperCase()}</span>
            </div>
            ${p.status !== 'completed' && ((tab === 'give' && p.ownerEmail === currentUser.email) || currentUser.isAdmin) ? `<button onclick="deletePost(${p.id})" class="text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 p-2 rounded-full font-bold btn-press">✕</button>` : ''}
        </div>
    `).join('');
}
