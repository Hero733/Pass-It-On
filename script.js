// ==========================================
// ⚙️ THE CORE SETTINGS
// ==========================================
const ALLOWED_DOMAIN = "ntun.ac.th";
const ADMIN_EMAIL = "aceaa372@gmail.com";

let posts = JSON.parse(localStorage.getItem('ntun_system_db')) || [];
let currentUser = null;
let selectedImageBase64 = null;
let currentFilter = 'ทั้งหมด';
let currentPage = 'landing'; // 'landing' or 'app'

// ==========================================
// 📸 GUIDE DATA (สไลด์คู่มือ)
// ==========================================
const guideData = {
    giver: [
        "https://via.placeholder.com/1000x600/EEF2FF/4338CA?text=1.+ถ่ายรูปและกรอกข้อมูลสิ่งของให้ครบถ้วน",
        "https://via.placeholder.com/1000x600/EEF2FF/4338CA?text=2.+กดประกาศ+และรอให้เพื่อนมากดรับ",
        "https://via.placeholder.com/1000x600/EEF2FF/4338CA?text=3.+เมื่อส่งของแล้ว+ให้กดปุ่ม+%27ยืนยันการส่งมอบ%27"
    ],
    taker: [
        "https://via.placeholder.com/1000x600/F0FDF4/15803D?text=1.+เลือกหาสิ่งของที่ต้องการในกระดาน",
        "https://via.placeholder.com/1000x600/F0FDF4/15803D?text=2.+กดปุ่ม+%27รับของชิ้นนี้%27+เพื่อจองคิว",
        "https://via.placeholder.com/1000x600/F0FDF4/15803D?text=3.+ทักไปหาเจ้าของตาม+ข้อมูลติดต่อ+เพื่อนัดรับ"
    ]
};
let currentGuideMode = 'giver';
let currentSlideIdx = 0;

// ==========================================
// 🛡️ INITIALIZATION (แก้บั๊กค้างหน้าโหลด)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // ซ่อน Loader ทันทีที่ DOM โหลดเสร็จ ไม่ต้องรอ Script นอก
    const loader = document.getElementById('page-loader');
    if(loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }

    const session = localStorage.getItem('ntun_session');
    if (session) {
        currentUser = JSON.parse(session);
        renderAuthUI();
        switchPage('app'); // เข้าสู่ระบบแล้วเด้งไปกระดานเลย
    } else {
        switchPage('landing');
    }
});

// ==========================================
// 🎬 PAGE TRANSITIONS (ระบบเปลี่ยนหน้าแบบมีอนิเมชัน)
// ==========================================
function switchPage(targetPage) {
    if (currentPage === targetPage && currentUser) return; // กันกดซ้ำ
    
    const landing = document.getElementById('page-landing');
    const app = document.getElementById('page-app');
    
    // ใส่คลาส Leave ให้หน้าปัจจุบัน
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
    }, 300); // รอให้ Fade Out เสร็จก่อน
}

// ==========================================
// 🔑 AUTHENTICATION & ADMIN POWERS
// ==========================================
function handleSignIn(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const email = payload.email;
        const domain = payload.hd || email.split('@')[1];

        if (domain === ALLOWED_DOMAIN || email === ADMIN_EMAIL) {
            currentUser = { 
                name: payload.name, 
                email: email, 
                picture: payload.picture,
                isAdmin: (email === ADMIN_EMAIL) 
            };
            localStorage.setItem('ntun_session', JSON.stringify(currentUser));
            renderAuthUI();
            switchPage('app'); // ล็อกอินปุ๊บ ไปหน้ากระดานปั๊บ
        } else {
            alert(`❌ ไม่อนุญาต! ระบบนี้รับเฉพาะ @${ALLOWED_DOMAIN} และ Admin เท่านั้น`);
            location.reload();
        }
    } catch (e) { console.error(e); }
}

function logout() {
    if(confirm('ออกจากระบบใช่หรือไม่?')) {
        localStorage.removeItem('ntun_session');
        location.reload();
    }
}

function renderAuthUI() {
    // 1. ซ่อนปุ่ม Google Login
    document.getElementById('g_id_onload').remove();
    document.querySelector('.g_id_signin').style.display = 'none';
    
    // 2. โชว์เมนูบาร์ด้านบน
    document.getElementById('nav-actions').classList.remove('hidden');
    document.getElementById('nav-actions').classList.add('flex');
    
    // 3. โชว์ป้าย Admin และซ่อนซับไตเติ้ลหน้าแรก + ซ่อน Guide ในหน้าแรก
    if(currentUser.isAdmin) document.getElementById('admin-badge').classList.remove('hidden');
    document.getElementById('landing-subtitle').style.display = 'none';
    document.getElementById('landing-guide').style.display = 'none'; // ซ่อนวิธีใช้ตรงกลางหน้าจอ

    // 4. โชว์โปรไฟล์
    document.getElementById('auth-section').innerHTML = `
        <div onclick="logout()" class="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-full shadow-sm border border-slate-200 cursor-pointer hover:bg-rose-50 hover:border-rose-200 transition-all btn-press group">
            <img src="${currentUser.picture}" class="w-8 h-8 rounded-full shadow-sm" referrerpolicy="no-referrer">
            <div class="flex flex-col">
                <span class="text-xs font-black ${currentUser.isAdmin ? 'text-rose-600' : 'text-indigo-900'} leading-tight group-hover:text-rose-600">${currentUser.isAdmin ? '👑 ADMIN' : currentUser.name.split(' ')[0]}</span>
                <span class="text-[9px] text-slate-400 font-bold group-hover:text-rose-400">Logout</span>
            </div>
        </div>
    `;
}

// ==========================================
// 🖼️ MODALS & SLIDER LOGIC
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
    const activeClass = "pb-3 text-indigo-600 font-bold border-b-[3px] border-indigo-600 text-sm btn-press transition-colors";
    const inactiveClass = "pb-3 text-slate-400 font-bold border-b-[3px] border-transparent hover:text-slate-600 text-sm btn-press transition-colors";
    document.getElementById('gtab-giver').className = (mode === 'giver') ? activeClass : inactiveClass;
    document.getElementById('gtab-taker').className = (mode === 'taker') ? activeClass : inactiveClass;
    updateSliderUI();
}

function updateSliderUI() {
    const images = guideData[currentGuideMode];
    const imgEl = document.getElementById('guide-slider-img');
    imgEl.style.transform = 'scale(0.95)';
    imgEl.style.opacity = '0.5';
    setTimeout(() => {
        imgEl.src = images[currentSlideIdx];
        imgEl.style.transform = 'scale(1)';
        imgEl.style.opacity = '1';
    }, 150);
    document.getElementById('slide-counter').innerText = `${currentSlideIdx + 1} / ${images.length}`;
}
function nextSlide() { currentSlideIdx = (currentSlideIdx + 1) % guideData[currentGuideMode].length; updateSliderUI(); }
function prevSlide() { currentSlideIdx = (currentSlideIdx - 1 + guideData[currentGuideMode].length) % guideData[currentGuideMode].length; updateSliderUI(); }

// ==========================================
// 🤖 FORM & FAKE AI VALIDATION
// ==========================================
function previewImage(input) {
    if (input.files && input.files[0]) {
        // Validation: เช็คขนาดไฟล์ (ไม่เกิน 5MB)
        if(input.files[0].size > 5 * 1024 * 1024) {
            alert("❌ รูปภาพใหญ่เกินไป กรุณาใช้รูปขนาดไม่เกิน 5MB");
            input.value = "";
            return;
        }
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

    const name = document.getElementById('itemName').value;
    const cat = document.getElementById('itemCat').value;
    
    // AI Mock Validation
    if(!selectedImageBase64) {
        alert("🤖 ระบบขอความร่วมมือ: กรุณาใส่รูปภาพประกอบเพื่อให้เพื่อนๆ ตัดสินใจได้ง่ายขึ้นครับ");
        return;
    }
    if(name.length < 4) {
        alert("🤖 ระบบขอความร่วมมือ: กรุณาตั้งชื่อสิ่งของให้ชัดเจนกว่านี้ครับ (อย่างน้อย 4 ตัวอักษร)");
        return;
    }

    // เปิดหน้าโหลดจำลอง AI ตรวจสอบ 1.5 วินาที
    const aiLoader = document.getElementById('ai-loading');
    aiLoader.classList.remove('hidden');

    setTimeout(() => {
        aiLoader.classList.add('hidden');

        const newPost = {
            id: Date.now(),
            time: Date.now(),
            ownerEmail: currentUser.email,
            ownerName: currentUser.name,
            name: name,
            desc: document.getElementById('itemDesc').value,
            cat: cat,
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
        
        // เลื่อนจอไปดูของใหม่
        document.getElementById('feed-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1500);
}

// ==========================================
// 🚀 FEED & ENGINE (หมวดหมู่ตรงเป๊ะ)
// ==========================================
function setFilter(cat) {
    currentFilter = cat;
    const tabs = document.getElementById('filter-container').children;
    for (let tab of tabs) {
        if(tab.innerText === cat || (cat === 'ทั้งหมด' && tab.innerText === 'ทั้งหมด')) {
            tab.className = 'cat-tab active btn-press';
        } else {
            tab.className = 'cat-tab btn-press';
        }
    }
    renderFeed();
}

function renderFeed() {
    const container = document.getElementById('feed-container');
    let displayPosts = currentFilter === 'ทั้งหมด' ? posts : posts.filter(p => p.cat === currentFilter);

    if (displayPosts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-20 text-center bg-white rounded-[32px] border border-slate-100 shadow-sm card-enter">
                <span class="text-6xl mb-4 block opacity-50">📭</span>
                <p class="font-bold text-xl text-slate-400">ยังไม่มีของในหมวดหมู่นี้</p>
                <p class="text-sm text-slate-400 mt-2">มาเป็นคนแรกที่ส่งต่อสิ่งดีๆ กันเถอะ!</p>
            </div>`;
        return;
    }

    container.innerHTML = displayPosts.map((post, idx) => {
        const isOwner = currentUser.email === post.ownerEmail;
        const isAdmin = currentUser.isAdmin; // พลังแอดมินลบได้หมด ดู Contact ได้หมด
        const isReservedByMe = post.reservedByEmail === currentUser.email;
        const showContact = post.status === 'available' || isOwner || isReservedByMe || isAdmin;

        let badge, actionButton, cardClass = "";

        if (post.status === 'completed') {
            badge = `<span class="text-[10px] font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">✅ จบงาน</span>`;
            actionButton = `<span class="text-sm font-bold text-slate-400 block text-center py-3">ส่งมอบสำเร็จแล้ว</span>`;
            cardClass = "opacity-60 grayscale-[40%]";
        } else if (post.status === 'reserved') {
            badge = `<span class="text-[10px] font-black text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">⏳ รอส่งมอบ</span>`;
            if (isOwner) {
                actionButton = `<button onclick="completeOrder(${post.id})" class="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold btn-press shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors">✔ ยืนยันการส่งมอบ</button>`;
            } else if (isReservedByMe) {
                actionButton = `<span class="text-sm font-bold text-amber-600 bg-amber-50 border border-amber-200 block text-center py-3 rounded-xl shadow-inner">คุณจองไว้ (ทักนัดรับเลย)</span>`;
            } else {
                actionButton = `<button disabled class="w-full bg-slate-100 text-slate-400 py-3 rounded-xl font-bold cursor-not-allowed">มีคนจองแล้ว</button>`;
            }
        } else {
            badge = `<span class="text-[10px] font-black text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full border border-indigo-200">✨ ว่าง</span>`;
            if (isOwner) {
                actionButton = `<span class="text-sm font-bold text-indigo-500 bg-indigo-50 block text-center py-3 rounded-xl border border-indigo-100">ของของคุณเอง</span>`;
            } else {
                actionButton = `<button onclick="reserveItem(${post.id})" class="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-indigo-600 transition-colors btn-press shadow-xl shadow-slate-900/20">🎁 รับของชิ้นนี้</button>`;
            }
        }

        const canDelete = (isAdmin || isOwner); // แอดมินลบได้ตลอดเวลา เจ้าของลบได้
        const delBtn = canDelete ? `<button onclick="deletePost(${post.id})" class="absolute top-4 right-4 w-9 h-9 bg-white/90 text-rose-500 rounded-full flex items-center justify-center shadow-lg hover:bg-rose-500 hover:text-white font-bold z-10 btn-press transition-colors backdrop-blur-md">✕</button>` : '';

        return `
            <div class="ios-card flex flex-col relative card-enter ${cardClass}" style="animation-delay: ${idx * 0.05}s">
                ${delBtn}
                ${post.image ? `<img src="${post.image}" class="w-full h-52 object-cover rounded-t-[20px] shrink-0">` : `<div class="w-full h-52 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold rounded-t-[20px] shrink-0">NO IMAGE</div>`}
                
                <div class="p-6 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[11px] font-black text-indigo-500 tracking-wider bg-indigo-50 px-2 py-1 rounded">${post.cat}</span>
                        ${badge}
                    </div>
                    
                    <h4 class="font-black text-xl text-slate-900 line-clamp-1 mb-2">${post.name}</h4>
                    ${post.desc ? `<p class="text-sm text-slate-500 mb-4 line-clamp-2 font-medium leading-relaxed">${post.desc}</p>` : ''}
                    
                    <div class="flex items-center gap-2 mb-4">
                        <div class="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500">${post.ownerName.charAt(0)}</div>
                        <p class="text-xs text-slate-500 font-bold">โดย ${post.ownerName}</p>
                    </div>
                    
                    <div class="bg-slate-50 p-3 rounded-xl mb-6 mt-auto border border-slate-100 relative overflow-hidden">
                        ${!showContact ? '<div class="absolute inset-0 bg-slate-100/50 backdrop-blur-[2px] flex items-center justify-center"><span class="text-xs font-bold text-slate-400 flex items-center gap-1">🔒 สงวนสิทธิ์</span></div>' : ''}
                        <p class="text-[10px] font-black text-slate-400 mb-1 uppercase tracking-widest">ข้อมูลติดต่อ</p>
                        <p class="text-sm font-bold text-slate-800 break-all select-all">${post.contact}</p>
                    </div>
                    
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// ⚔️ ACTIONS 
// ==========================================
function reserveItem(id) {
    if (confirm("ยืนยันการรับสิ่งของนี้ใช่ไหม?\nกรุณาทักหาเจ้าของเพื่อนัดรับด้วยนะครับ 🎁")) {
        let p = posts.find(x => x.id === id);
        p.status = 'reserved';
        p.reservedByEmail = currentUser.email;
        p.reservedByName = currentUser.name;
        saveData();
        renderFeed();
    }
}
function completeOrder(id) {
    if (confirm("ส่งมอบสิ่งของเรียบร้อยแล้วใช่ไหม? ✅")) {
        let p = posts.find(x => x.id === id);
        p.status = 'completed';
        saveData();
        renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}
function deletePost(id) {
    if (confirm("🚨 ต้องการลบโพสต์นี้ใช่ไหม? (ลบแล้วกู้คืนไม่ได้นะ)")) {
        posts = posts.filter(x => x.id !== id);
        saveData();
        renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}
function saveData() { localStorage.setItem('ntun_system_db', JSON.stringify(posts)); }

// ==========================================
// 📁 HISTORY SYSTEM
// ==========================================
function switchHistoryTab(tab) {
    const list = document.getElementById('history-list');
    const activeClass = "pb-3 text-indigo-600 font-bold border-b-[3px] border-indigo-600 text-sm btn-press transition-colors";
    const inactiveClass = "pb-3 text-slate-400 font-bold border-b-[3px] border-transparent hover:text-slate-600 text-sm btn-press transition-colors";
    
    document.getElementById('tab-give').className = (tab === 'give') ? activeClass : inactiveClass;
    document.getElementById('tab-take').className = (tab === 'take') ? activeClass : inactiveClass;
    
    let target = tab === 'give' ? posts.filter(p => p.ownerEmail === currentUser.email) : posts.filter(p => p.reservedByEmail === currentUser.email);

    if (target.length === 0) {
        list.innerHTML = `<div class="text-center py-12 text-sm font-bold text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">📭 ไม่มีข้อมูลในส่วนนี้</div>`;
        return;
    }

    list.innerHTML = target.map((p, idx) => {
        let status = p.status === 'available' ? 'ว่าง' : (p.status === 'reserved' ? 'รอส่งมอบ' : 'จบงาน');
        let color = p.status === 'available' ? 'text-indigo-600' : (p.status === 'reserved' ? 'text-amber-600' : 'text-slate-500');
        
        let actionBtn = "";
        if (tab === 'give' && p.status === 'reserved') {
            actionBtn = `<button onclick="completeOrder(${p.id})" class="text-xs bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold btn-press shadow-md hover:bg-emerald-600 transition-colors">ส่งแล้ว</button>`;
        }

        return `
            <div class="flex items-center gap-4 bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all card-enter" style="animation-delay: ${idx * 0.05}s">
                ${p.image ? `<img src="${p.image}" class="w-16 h-16 rounded-xl object-cover shrink-0">` : `<div class="w-16 h-16 bg-slate-100 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400">NO IMG</div>`}
                <div class="flex-1 overflow-hidden">
                    <h4 class="font-black text-sm md:text-base text-slate-800 truncate">${p.name}</h4>
                    <p class="text-xs font-black mt-1 ${color}">สถานะ: ${status}</p>
                    ${p.status === 'reserved' ? `<p class="text-[11px] text-slate-500 font-medium mt-1 truncate">${tab === 'give' ? 'จองโดย: '+p.reservedByName : 'ติดต่อ: '+p.contact}</p>` : ''}
                </div>
                ${actionBtn}
            </div>
        `;
    }).join('');
}
