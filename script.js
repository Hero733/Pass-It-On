// ==========================================
// CONFIGURATION & STATE
// ==========================================
const ALLOWED_DOMAIN = "ntun.ac.th";
const ADMIN_EMAIL = "aceaa372@gmail.com";

let posts = JSON.parse(localStorage.getItem('ntun_posts_data')) || [];
let currentUser = null;
let selectedImageBase64 = null;
let currentFilter = 'ทั้งหมด';

// ==========================================
// GUIDE IMAGES (ใส่ URL หรือชื่อไฟล์รูปของคุณตรงนี้เลยครับ)
// ==========================================
const guideData = {
    giver: [
        "https://via.placeholder.com/800x600.png?text=Giver+Step+1:+Fill+Form",
        "https://via.placeholder.com/800x600.png?text=Giver+Step+2:+Wait+for+Contact",
        "https://via.placeholder.com/800x600.png?text=Giver+Step+3:+Mark+as+Completed"
    ],
    taker: [
        "https://via.placeholder.com/800x600.png?text=Taker+Step+1:+Browse+Feed",
        "https://via.placeholder.com/800x600.png?text=Taker+Step+2:+Click+Reserve",
        "https://via.placeholder.com/800x600.png?text=Taker+Step+3:+Contact+Owner"
    ]
};
let currentGuideMode = 'giver';
let currentSlideIdx = 0;

// ==========================================
// INITIALIZATION
// ==========================================
window.onload = () => {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if(loader) loader.style.display = 'none';
    }, 500);

    const session = localStorage.getItem('ntun_session');
    if (session) {
        currentUser = JSON.parse(session);
        renderAuthUI();
        switchPage('app');
    } else {
        switchPage('landing');
    }
};

// สลับหน้า (ซ่อนหน้า Landing, โชว์ App)
function switchPage(page) {
    if (page === 'landing') {
        document.getElementById('page-landing').style.display = 'flex';
        document.getElementById('page-app').style.display = 'none';
    } else {
        document.getElementById('page-landing').style.display = 'none';
        document.getElementById('page-app').style.display = 'block';
        document.getElementById('page-app').classList.add('fade-in');
        renderFeed();
    }
}

// ==========================================
// AUTHENTICATION
// ==========================================
function handleSignIn(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const email = payload.email;
        const domain = payload.hd || email.split('@')[1];

        // ตรวจสอบสิทธิ์แบบเคร่งครัด
        if (domain === ALLOWED_DOMAIN || email === ADMIN_EMAIL) {
            currentUser = { 
                name: payload.name, 
                email: email, 
                picture: payload.picture,
                isAdmin: (email === ADMIN_EMAIL) // กำหนดสิทธิ์แอดมิน
            };
            localStorage.setItem('ntun_session', JSON.stringify(currentUser));
            renderAuthUI();
            switchPage('app');
        } else {
            alert("❌ ระบบนี้อนุญาตเฉพาะนักเรียนโดเมน @ntun.ac.th และแอดมินเท่านั้นครับ");
            // logout google (force reload to clear state)
            location.reload(); 
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

// ==========================================
// UI & NAVIGATION
// ==========================================
function renderAuthUI() {
    const navActions = document.getElementById('nav-actions');
    navActions.innerHTML = `
        <button onclick="openModal('modal-history')" class="px-3 py-2 rounded-lg text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 btn-press">ประวัติ</button>
        <button onclick="openModal('modal-guide')" class="px-3 py-2 rounded-lg text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 btn-press">คู่มือ</button>
    `;
    navActions.classList.remove('hidden');

    document.getElementById('auth-section').innerHTML = `
        <div onclick="logout()" class="flex items-center gap-2 bg-gray-50 p-1 pr-3 rounded-full border border-gray-200 cursor-pointer hover:bg-red-50 btn-press" title="ออกจากระบบ">
            <img src="${currentUser.picture}" class="w-7 h-7 rounded-full border border-gray-200">
            <span class="text-xs font-bold text-gray-800 ${currentUser.isAdmin ? 'text-red-600' : ''}">${currentUser.isAdmin ? 'Admin' : currentUser.name.split(' ')[0]}</span>
        </div>
    `;
}

// ==========================================
// MODAL CONTROLS (Fade Only, No Bounce)
// ==========================================
function openModal(id) {
    const modal = document.getElementById(id);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (id === 'modal-history') switchHistoryTab('give');
    if (id === 'modal-guide') switchGuideTab('giver'); // โหลดรูปสไลด์แรก
}

function closeModal(id) {
    const modal = document.getElementById(id);
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ==========================================
// FORM & DATA
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
    const name = document.getElementById('itemName').value;
    const desc = document.getElementById('itemDesc').value; // ข้อมูลสิ่งของเพิ่มเติม
    const cat = document.getElementById('itemCat').value;
    const contact = document.getElementById('itemContact').value;

    const newPost = {
        id: Date.now(),
        time: Date.now(),
        ownerEmail: currentUser.email,
        ownerName: currentUser.name,
        name, desc, cat, contact,
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
}

// ==========================================
// FEED SYSTEM
// ==========================================
function setFilter(cat) {
    currentFilter = cat;
    const tabs = document.getElementById('filter-container').children;
    for (let tab of tabs) {
        tab.className = (tab.innerText === cat || (cat === 'ทั้งหมด' && tab.innerText === 'ทั้งหมด')) ? 'cat-tab active btn-press' : 'cat-tab btn-press';
    }
    renderFeed();
}

function renderFeed() {
    const container = document.getElementById('feed-container');
    let displayPosts = currentFilter === 'ทั้งหมด' ? posts : posts.filter(p => p.cat === currentFilter);

    if (displayPosts.length === 0) {
        container.innerHTML = `<div class="col-span-full py-10 text-center text-gray-400">ยังไม่มีสิ่งของในหมวดหมู่นี้</div>`;
        return;
    }

    container.innerHTML = displayPosts.map((post) => {
        const isOwner = currentUser.email === post.ownerEmail;
        const isAdmin = currentUser.isAdmin;
        let badge, actionButton, cardClass = "";

        if (post.status === 'completed') {
            badge = `<span class="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">✅ ส่งมอบแล้ว</span>`;
            actionButton = `<span class="text-xs font-bold text-gray-400">จบงาน</span>`;
            cardClass = "opacity-60";
        } else if (post.status === 'reserved') {
            badge = `<span class="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">⏳ มีคนรับแล้ว</span>`;
            
            if (isOwner) {
                actionButton = `<button onclick="completeOrder(${post.id})" class="w-full bg-emerald-500 text-white py-2 rounded-lg font-bold text-sm btn-press">ยืนยันการส่งมอบ</button>`;
            } else if (post.reservedByEmail === currentUser.email) {
                actionButton = `<span class="text-xs font-bold text-amber-600 block text-center">คุณกำลังรอรับของชิ้นนี้</span>`;
            } else {
                actionButton = `<button disabled class="w-full bg-gray-100 text-gray-400 py-2 rounded-lg font-bold text-sm">ไม่ว่าง</button>`;
            }
        } else {
            badge = `<span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">ว่าง</span>`;
            if (isOwner) {
                actionButton = `<span class="text-xs font-bold text-indigo-400 block text-center">โพสต์ของคุณ</span>`;
            } else {
                actionButton = `<button onclick="reserveItem(${post.id})" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 btn-press">รับของชิ้นนี้</button>`;
            }
        }

        // Admin หรือ เจ้าของโพสต์ ลบได้ (ถ้ายังไม่ completed)
        const canDelete = (isAdmin || isOwner) && post.status !== 'completed';
        const delBtn = canDelete ? `<button onclick="deletePost(${post.id})" class="absolute top-2 right-2 w-7 h-7 bg-white/80 text-red-500 rounded-full flex items-center justify-center shadow hover:bg-red-500 hover:text-white text-xs z-10 btn-press">✕</button>` : '';

        // ถ้าโพสต์ว่าง, หรือเป็นเจ้าของ, หรือเป็นคนรับ จะเห็นข้อมูลติดต่อ
        const showContact = post.status === 'available' || isOwner || post.reservedByEmail === currentUser.email || isAdmin;

        return `
            <div class="ios-card flex flex-col relative fade-up ${cardClass}">
                ${delBtn}
                ${post.image ? `<img src="${post.image}" class="w-full h-40 object-cover rounded-t-[24px]">` : `<div class="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-xs rounded-t-[24px]">NO IMAGE</div>`}
                <div class="p-4 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-[10px] font-bold text-gray-500">${post.cat}</span>
                        ${badge}
                    </div>
                    <h4 class="font-bold text-gray-900 line-clamp-1 mb-1">${post.name}</h4>
                    
                    ${post.desc ? `<p class="text-xs text-gray-600 mb-3 line-clamp-2">${post.desc}</p>` : ''}
                    
                    <p class="text-[10px] text-gray-400 mb-3">โดย ${post.ownerName}</p>
                    
                    <div class="bg-gray-50 p-2 rounded-lg mb-4 mt-auto border border-gray-100">
                        <p class="text-[9px] font-bold text-gray-500 mb-0.5">ติดต่อ:</p>
                        <p class="text-xs font-bold text-gray-800 break-all">${showContact ? post.contact : '*** ปิดบังข้อมูล ***'}</p>
                    </div>
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// ACTIONS
// ==========================================
function reserveItem(id) {
    if (confirm("ยืนยันรับของชิ้นนี้? กรุณาติดต่อผู้ให้ตามข้อมูลที่ระบุไว้ด้วยนะครับ")) {
        let p = posts.find(x => x.id === id);
        p.status = 'reserved';
        p.reservedByEmail = currentUser.email;
        p.reservedByName = currentUser.name;
        saveData();
        renderFeed();
    }
}

function completeOrder(id) {
    if (confirm("ยืนยันว่าส่งมอบสิ่งของเรียบร้อยแล้ว?")) {
        let p = posts.find(x => x.id === id);
        p.status = 'completed';
        saveData();
        renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}

function deletePost(id) {
    if (confirm("ต้องการลบโพสต์นี้ใช่ไหม?")) {
        posts = posts.filter(x => x.id !== id);
        saveData();
        renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}

function saveData() { localStorage.setItem('ntun_posts_data', JSON.stringify(posts)); }

// ==========================================
// HISTORY TAB
// ==========================================
function switchHistoryTab(tab) {
    const list = document.getElementById('history-list');
    document.getElementById('tab-give').className = tab === 'give' ? "pb-2 text-indigo-600 font-bold border-b-2 border-indigo-600 text-sm btn-press" : "pb-2 text-gray-500 font-bold border-b-2 border-transparent text-sm btn-press";
    document.getElementById('tab-take').className = tab === 'take' ? "pb-2 text-indigo-600 font-bold border-b-2 border-indigo-600 text-sm btn-press" : "pb-2 text-gray-500 font-bold border-b-2 border-transparent text-sm btn-press";
    
    let target = tab === 'give' ? posts.filter(p => p.ownerEmail === currentUser.email) : posts.filter(p => p.reservedByEmail === currentUser.email);

    if (target.length === 0) {
        list.innerHTML = `<div class="text-center py-6 text-sm text-gray-400">ไม่มีข้อมูล</div>`;
        return;
    }

    list.innerHTML = target.map(p => {
        let status = p.status === 'available' ? 'ว่าง' : (p.status === 'reserved' ? 'รอส่งมอบ' : 'จบงาน');
        let color = p.status === 'available' ? 'text-indigo-500' : (p.status === 'reserved' ? 'text-amber-500' : 'text-gray-400');
        return `
            <div class="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-100">
                ${p.image ? `<img src="${p.image}" class="w-12 h-12 rounded-lg object-cover">` : `<div class="w-12 h-12 bg-gray-200 rounded-lg"></div>`}
                <div class="flex-1 overflow-hidden">
                    <h4 class="font-bold text-xs truncate">${p.name}</h4>
                    <p class="text-[10px] ${color}">สถานะ: ${status}</p>
                </div>
                ${(tab === 'give' && p.status === 'reserved') ? `<button onclick="completeOrder(${p.id})" class="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded font-bold">ส่งแล้ว</button>` : ''}
            </div>
        `;
    }).join('');
}

// ==========================================
// GUIDE SLIDER SYSTEM
// ==========================================
function switchGuideTab(mode) {
    currentGuideMode = mode;
    currentSlideIdx = 0;
    
    document.getElementById('gtab-giver').className = mode === 'giver' ? "pb-2 text-indigo-600 font-bold border-b-2 border-indigo-600 text-sm btn-press" : "pb-2 text-gray-500 font-bold border-b-2 border-transparent text-sm btn-press";
    document.getElementById('gtab-taker').className = mode === 'taker' ? "pb-2 text-indigo-600 font-bold border-b-2 border-indigo-600 text-sm btn-press" : "pb-2 text-gray-500 font-bold border-b-2 border-transparent text-sm btn-press";
    
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
