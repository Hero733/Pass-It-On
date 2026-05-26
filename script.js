// ==========================================
// ⚙️ THE CORE (การตั้งค่าและตัวแปรหลัก)
// ==========================================
const ALLOWED_DOMAIN = "ntun.ac.th";
const ADMIN_EMAIL = "aceaa372@gmail.com";

let posts = JSON.parse(localStorage.getItem('ntun_system_db')) || [];
let currentUser = null;
let selectedImageBase64 = null;
let currentFilter = 'ทั้งหมด';

// ==========================================
// 📸 GUIDE DATA (คู่มือการใช้งาน - ใส่ลิงก์รูปได้เลย!)
// ==========================================
// แนะนำ: ถ้านายมีรูป อัปโหลดใส่ imgur แล้วเอาลิงก์มาวางแทนได้เลย
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
// 🛡️ INITIALIZATION & FAILSAFE LOADER
// ==========================================
window.onload = () => {
    // ตัด Loader ทิ้งอย่างสมูท
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if(loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 300);
        }
    }, 400);

    // เช็ค Session
    const session = localStorage.getItem('ntun_session');
    if (session) {
        currentUser = JSON.parse(session);
        renderAuthUI();
        switchPage('app');
    } else {
        switchPage('landing');
    }
};

// สลับหน้าแบบ SPA
function switchPage(page) {
    if (page === 'landing') {
        document.getElementById('page-landing').style.display = 'flex';
        document.getElementById('page-app').style.display = 'none';
    } else {
        document.getElementById('page-landing').style.display = 'none';
        document.getElementById('page-app').style.display = 'block';
        renderFeed(); // โหลด Feed ทันทีที่เข้าหน้าแอป
    }
}

// ==========================================
// 🔑 AUTHENTICATION & ROLE SYSTEM
// ==========================================
function handleSignIn(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const email = payload.email;
        const domain = payload.hd || email.split('@')[1];

        // 🛡️ เช็คสิทธิ์เคร่งครัด
        if (domain === ALLOWED_DOMAIN || email === ADMIN_EMAIL) {
            currentUser = { 
                name: payload.name, 
                email: email, 
                picture: payload.picture,
                isAdmin: (email === ADMIN_EMAIL) // กำหนดพลัง Admin
            };
            localStorage.setItem('ntun_session', JSON.stringify(currentUser));
            renderAuthUI();
            switchPage('app');
        } else {
            alert(`❌ ไม่อนุญาต! บัญชีของคุณคือ ${email}\nระบบนี้รับเฉพาะ @${ALLOWED_DOMAIN} และแอดมินเท่านั้นครับ`);
            location.reload(); // รีเซ็ต Google Login
        }
    } catch (e) {
        console.error("Login Error", e);
    }
}

function logout() {
    if(confirm('ต้องการออกจากระบบใช่หรือไม่?')) {
        localStorage.removeItem('ntun_session');
        location.reload();
    }
}

function renderAuthUI() {
    document.getElementById('nav-actions').classList.remove('hidden');
    document.getElementById('nav-actions').classList.add('flex');
    
    // โชว์ป้าย Admin ถ้าใช่
    if(currentUser.isAdmin) {
        document.getElementById('admin-badge').classList.remove('hidden');
    }

    document.getElementById('auth-section').innerHTML = `
        <div onclick="logout()" class="flex items-center gap-2 bg-slate-50 p-1 pr-3 rounded-full border border-slate-200 cursor-pointer hover:bg-red-50 btn-press transition-colors" title="คลิกเพื่อออกจากระบบ">
            <img src="${currentUser.picture}" class="w-8 h-8 rounded-full border border-slate-200 bg-white" referrerpolicy="no-referrer">
            <span class="text-xs font-bold ${currentUser.isAdmin ? 'text-red-600' : 'text-slate-800'} hidden md:block">
                ${currentUser.isAdmin ? 'Admin' : currentUser.name.split(' ')[0]}
            </span>
        </div>
    `;
}

// ==========================================
// 🖼️ MODALS & SLIDER LOGIC
// ==========================================
function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // กันหน้าหลักเลื่อน
    
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
    
    // อัปเดตสีแท็บ
    const activeClass = "pb-2 text-indigo-600 font-bold border-b-2 border-indigo-600 text-sm btn-press";
    const inactiveClass = "pb-2 text-slate-400 font-bold border-b-2 border-transparent text-sm btn-press";
    
    document.getElementById('gtab-giver').className = (mode === 'giver') ? activeClass : inactiveClass;
    document.getElementById('gtab-taker').className = (mode === 'taker') ? activeClass : inactiveClass;
    
    updateSliderUI();
}

function updateSliderUI() {
    const images = guideData[currentGuideMode];
    document.getElementById('guide-slider-img').src = images[currentSlideIdx];
    document.getElementById('slide-counter').innerText = `${currentSlideIdx + 1} / ${images.length}`;
}

function nextSlide() {
    const images = guideData[currentGuideMode];
    currentSlideIdx = (currentSlideIdx + 1) % images.length;
    updateSliderUI();
}

function prevSlide() {
    const images = guideData[currentGuideMode];
    currentSlideIdx = (currentSlideIdx - 1 + images.length) % images.length;
    updateSliderUI();
}

// ==========================================
// 📝 FORM & IMAGE HANDLING
// ==========================================
function previewImage(input) {
    if (input.files && input.files[0]) {
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

    const newPost = {
        id: Date.now(),
        time: Date.now(),
        ownerEmail: currentUser.email,
        ownerName: currentUser.name,
        name: document.getElementById('itemName').value,
        desc: document.getElementById('itemDesc').value, // ข้อมูลเพิ่มเติม
        cat: document.getElementById('itemCat').value,
        contact: document.getElementById('itemContact').value,
        image: selectedImageBase64,
        status: 'available', // available, reserved, completed
        reservedByEmail: null,
        reservedByName: null
    };

    posts.unshift(newPost);
    saveData();
    e.target.reset();
    removeImage(new Event('click'));
    setFilter('ทั้งหมด');
}

// ==========================================
// 🚀 FEED & RENDER ENGINE (จุดโชว์พลัง)
// ==========================================
function setFilter(cat) {
    currentFilter = cat;
    const tabs = document.getElementById('filter-container').children;
    for (let tab of tabs) {
        tab.className = (tab.innerText === cat || (cat === 'ทั้งหมด' && tab.innerText === 'ทั้งหมด')) 
            ? 'cat-tab active btn-press' : 'cat-tab btn-press';
    }
    renderFeed();
}

function renderFeed() {
    const container = document.getElementById('feed-container');
    let displayPosts = currentFilter === 'ทั้งหมด' ? posts : posts.filter(p => p.cat === currentFilter);

    if (displayPosts.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-16 text-center bg-white rounded-[24px] border border-slate-100 shadow-sm">
                <span class="text-4xl mb-3 block opacity-50">📭</span>
                <p class="font-bold text-slate-500">ยังไม่มีสิ่งของในหมวดหมู่นี้</p>
            </div>`;
        return;
    }

    container.innerHTML = displayPosts.map((post, idx) => {
        // กฏกางอาณาเขต (Roles Logic)
        const isOwner = currentUser.email === post.ownerEmail;
        const isAdmin = currentUser.isAdmin;
        const isReservedByMe = post.reservedByEmail === currentUser.email;
        
        // 🛡️ Contact Shield Logic: ใครเห็นช่องทางติดต่อได้บ้าง?
        const showContact = post.status === 'available' || isOwner || isReservedByMe || isAdmin;

        // UI Setup
        let badge, actionButton, cardClass = "";

        if (post.status === 'completed') {
            badge = `<span class="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">✅ จบงาน</span>`;
            actionButton = `<span class="text-xs font-bold text-slate-400 block text-center py-2">ส่งมอบสำเร็จแล้ว</span>`;
            cardClass = "opacity-60 grayscale-[30%]";
        } else if (post.status === 'reserved') {
            badge = `<span class="text-[10px] font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md">⏳ รอส่งมอบ</span>`;
            
            if (isOwner) {
                actionButton = `<button onclick="completeOrder(${post.id})" class="w-full bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-sm btn-press shadow-md hover:bg-emerald-600 transition-colors">ยืนยันการส่งมอบ</button>`;
            } else if (isReservedByMe) {
                actionButton = `<span class="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 block text-center py-2.5 rounded-xl">คุณจองชิ้นนี้ไว้ (ทักหาเจ้าของเลย)</span>`;
            } else {
                actionButton = `<button disabled class="w-full bg-slate-100 text-slate-400 py-2.5 rounded-xl font-bold text-sm cursor-not-allowed">มีคนรับแล้ว</button>`;
            }
        } else {
            badge = `<span class="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2.5 py-1 rounded-md">✨ ว่าง</span>`;
            
            if (isOwner) {
                actionButton = `<span class="text-xs font-bold text-indigo-500 bg-indigo-50 block text-center py-2.5 rounded-xl border border-indigo-100">ของของคุณเอง</span>`;
            } else {
                actionButton = `<button onclick="reserveItem(${post.id})" class="w-full bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-indigo-600 transition-colors btn-press shadow-md">รับของชิ้นนี้</button>`;
            }
        }

        // ปุ่มลบ: แอดมินลบได้หมด / เจ้าของลบได้ถ้ายังไม่จบงาน
        const canDelete = (isAdmin || isOwner) && post.status !== 'completed';
        const delBtn = canDelete ? `<button onclick="deletePost(${post.id})" class="absolute top-3 right-3 w-8 h-8 bg-white/90 text-red-500 rounded-full flex items-center justify-center shadow-sm hover:bg-red-500 hover:text-white text-xs z-10 btn-press transition-colors backdrop-blur">✕</button>` : '';

        return `
            <div class="ios-card flex flex-col relative fade-up ${cardClass}" style="animation-delay: ${idx * 0.05}s">
                ${delBtn}
                ${post.image ? `<img src="${post.image}" class="w-full h-44 object-cover rounded-t-[20px] shrink-0">` : `<div class="w-full h-44 bg-slate-100 flex items-center justify-center text-slate-400 text-xs rounded-t-[20px] font-bold shrink-0">NO IMAGE</div>`}
                
                <div class="p-5 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[10px] font-black text-slate-400 tracking-wider">${post.cat}</span>
                        ${badge}
                    </div>
                    
                    <h4 class="font-black text-lg text-slate-900 line-clamp-1 mb-1">${post.name}</h4>
                    
                    ${post.desc ? `<p class="text-xs text-slate-500 mb-3 line-clamp-2 font-medium leading-relaxed">${post.desc}</p>` : ''}
                    
                    <p class="text-[10px] text-slate-400 mb-4 font-medium">โดย ${post.ownerName}</p>
                    
                    <div class="bg-slate-50 p-3 rounded-xl mb-5 mt-auto border border-slate-100">
                        <p class="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-widest">ข้อมูลติดต่อ</p>
                        <p class="text-sm font-bold text-slate-800 break-all select-all">
                            ${showContact ? post.contact : '<span class="text-slate-400 font-medium">*** ปิดบังข้อมูลไว้ ***</span>'}
                        </p>
                    </div>
                    
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// ⚔️ ACTIONS (จอง, จบงาน, ลบ)
// ==========================================
function reserveItem(id) {
    if (confirm("ยืนยันการรับสิ่งของนี้ใช่ไหม?\nเมื่อกดยืนยันแล้ว กรุณาทักหาเจ้าของเพื่อนัดรับด้วยนะครับ")) {
        let p = posts.find(x => x.id === id);
        p.status = 'reserved';
        p.reservedByEmail = currentUser.email;
        p.reservedByName = currentUser.name;
        saveData();
        renderFeed();
    }
}

function completeOrder(id) {
    if (confirm("คุณได้ส่งมอบสิ่งของชิ้นนี้ให้เพื่อนเรียบร้อยแล้วใช่ไหม?")) {
        let p = posts.find(x => x.id === id);
        p.status = 'completed';
        saveData();
        renderFeed();
        
        // ถ้ายืนยันจากหน้าประวัติ ให้รีเฟรชหน้าประวัติด้วย
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}

function deletePost(id) {
    if (confirm("ต้องการลบโพสต์นี้ใช่ไหม? (ลบแล้วกู้คืนไม่ได้นะ)")) {
        posts = posts.filter(x => x.id !== id);
        saveData();
        renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}

function saveData() { 
    localStorage.setItem('ntun_system_db', JSON.stringify(posts)); 
}

// ==========================================
// 📁 HISTORY SYSTEM
// ==========================================
function switchHistoryTab(tab) {
    const list = document.getElementById('history-list');
    const activeClass = "pb-2 text-indigo-600 font-bold border-b-2 border-indigo-600 text-sm btn-press";
    const inactiveClass = "pb-2 text-slate-400 font-bold border-b-2 border-transparent text-sm btn-press";
    
    document.getElementById('tab-give').className = (tab === 'give') ? activeClass : inactiveClass;
    document.getElementById('tab-take').className = (tab === 'take') ? activeClass : inactiveClass;
    
    let target = tab === 'give' ? posts.filter(p => p.ownerEmail === currentUser.email) : posts.filter(p => p.reservedByEmail === currentUser.email);

    if (target.length === 0) {
        list.innerHTML = `<div class="text-center py-10 text-sm font-medium text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">ไม่มีข้อมูลในส่วนนี้</div>`;
        return;
    }

    list.innerHTML = target.map(p => {
        let status = p.status === 'available' ? 'ว่าง' : (p.status === 'reserved' ? 'รอส่งมอบ' : 'จบงาน');
        let color = p.status === 'available' ? 'text-indigo-600' : (p.status === 'reserved' ? 'text-amber-600' : 'text-slate-500');
        
        let actionBtn = "";
        if (tab === 'give' && p.status === 'reserved') {
            actionBtn = `<button onclick="completeOrder(${p.id})" class="text-[10px] bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-bold btn-press shadow-sm">ส่งแล้ว</button>`;
        }

        return `
            <div class="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                ${p.image ? `<img src="${p.image}" class="w-14 h-14 rounded-lg object-cover shrink-0">` : `<div class="w-14 h-14 bg-slate-100 rounded-lg shrink-0"></div>`}
                <div class="flex-1 overflow-hidden">
                    <h4 class="font-bold text-sm text-slate-800 truncate">${p.name}</h4>
                    <p class="text-[11px] font-bold mt-1 ${color}">สถานะ: ${status}</p>
                    ${p.status === 'reserved' ? `<p class="text-[10px] text-slate-500 mt-0.5 truncate">${tab === 'give' ? 'จองโดย: '+p.reservedByName : 'ติดต่อ: '+p.contact}</p>` : ''}
                </div>
                ${actionBtn}
            </div>
        `;
    }).join('');
}
