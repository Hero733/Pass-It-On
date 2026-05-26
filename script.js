const ALLOWED_DOMAIN = "ntun.ac.th";
const ADMIN_EMAIL = "aceaa372@gmail.com";

let posts = JSON.parse(localStorage.getItem('ntun_system_db')) || [];
let currentUser = null;
let selectedImageBase64 = null;
let currentFilter = 'ทั้งหมด';
let currentPage = 'landing';

const guideData = {
    giver: ["photo/giver-1.jpg", "photo/giver-2.jpg", "photo/giver-3.jpg", "photo/giver-4.jpg"],
    taker: ["photo/taker-1.jpg", "photo/taker-2.jpg", "photo/taker-3.jpg"]
};
let currentGuideMode = 'giver';
let currentSlideIdx = 0;

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
    } catch (e) {
        console.error("JWT Parse Error:", e);
        return null;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById('page-loader');
    if(loader) { loader.style.opacity = '0'; setTimeout(() => loader.style.display = 'none', 500); }

    const session = localStorage.getItem('ntun_session');
    if (session) {
        currentUser = JSON.parse(session);
        currentUser.name = fixMojibake(currentUser.name);
        renderAuthUI();
        switchPage('app');
    } else {
        switchPage('landing');
    }
});

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

// 🌑 อัปเกรด Profile UI ให้เข้ากับ Navbar สีดำ
function renderAuthUI() {
    document.getElementById('g_id_onload').remove();
    document.querySelector('.g_id_signin').style.display = 'none';
    document.getElementById('nav-actions').classList.remove('hidden');
    document.getElementById('nav-actions').classList.add('flex');
    
    if(currentUser.isAdmin) document.getElementById('admin-badge').classList.remove('hidden');
    document.getElementById('landing-subtitle').style.display = 'none';
    document.getElementById('landing-guide-btn').style.display = 'none'; 

    const displayName = currentUser.isAdmin ? 'Admin' : currentUser.name.split(' ')[0];
    
    // เปลี่ยนจาก bg-white เป็นแบบโปร่งแสงสีขาวสำหรับ Navbar สีดำ
    document.getElementById('auth-section').innerHTML = `
        <div onclick="logout()" class="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1 pr-3 rounded-full border border-white/20 cursor-pointer hover:bg-white/20 transition-all btn-press shadow-inner">
            <img src="${currentUser.picture}" class="w-7 h-7 rounded-full border border-white/30" referrerpolicy="no-referrer">
            <span class="text-xs font-medium ${currentUser.isAdmin ? 'text-rose-400' : 'text-white'} truncate max-w-[80px] md:max-w-[120px]">${displayName}</span>
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
    const activeClass = "pb-2 text-[#1d1d1f] font-bold border-b-[2px] border-[#1d1d1f] text-sm btn-press transition-colors";
    const inactiveClass = "pb-2 text-[#86868b] font-medium border-b-[2px] border-transparent hover:text-[#1d1d1f] text-sm btn-press transition-colors";
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
    document.getElementById('feed-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

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
        container.innerHTML = `<div class="col-span-full py-16 text-center bg-white/50 rounded-2xl border border-gray-100"><p class="font-medium text-lg text-[#86868b]">ยังไม่มีของในหมวดหมู่นี้</p></div>`;
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
            badge = `<span class="text-[10px] font-bold text-[#86868b] bg-gray-100 px-2.5 py-1 rounded-full">จบงาน</span>`;
            actionButton = `<span class="text-xs font-semibold text-[#86868b] block text-center py-3">ส่งมอบสำเร็จแล้ว</span>`;
            cardClass = "opacity-60 grayscale-[40%]";
        } else if (post.status === 'reserved') {
            badge = `<span class="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shadow-sm">รอส่งมอบ</span>`;
            if (isOwner) {
                actionButton = `<button onclick="completeOrder(${post.id})" class="w-full bg-[#1d1d1f] text-white py-3 rounded-xl font-medium btn-press hover:bg-black hover:shadow-lg transition-all">ยืนยันการส่งมอบ</button>`;
            } else if (isReservedByMe) {
                actionButton = `<span class="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 block text-center py-3 rounded-xl shadow-sm">คุณจองไว้ (ทักนัดรับเลย)</span>`;
            } else {
                actionButton = `<button disabled class="w-full bg-gray-100 text-[#86868b] py-3 rounded-xl font-medium cursor-not-allowed">มีคนจองแล้ว</button>`;
            }
        } else {
            badge = `<span class="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full shadow-sm">ว่าง</span>`;
            if (isOwner) {
                actionButton = `<span class="text-xs font-medium text-[#86868b] bg-gray-50 block text-center py-3 rounded-xl border border-gray-100">ของของคุณเอง</span>`;
            } else {
                actionButton = `<button onclick="reserveItem(${post.id})" class="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all btn-press">รับของชิ้นนี้</button>`;
            }
        }

        const delBtn = (isAdmin || isOwner) ? `<button onclick="deletePost(${post.id})" class="absolute top-3 right-3 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-rose-500 font-bold z-10 btn-press transition-colors backdrop-blur-md text-sm shadow-md">✕</button>` : '';

        return `
            <div class="glass-card flex flex-col relative ${cardClass}">
                ${delBtn}
                ${post.image ? `<img src="${post.image}" class="w-full h-56 object-cover rounded-t-[24px] shrink-0 border-b border-gray-100">` : `<div class="w-full h-56 bg-gray-50 flex items-center justify-center text-[#86868b] text-xs font-bold rounded-t-[24px] shrink-0 border-b border-gray-100">NO IMAGE</div>`}
                <div class="p-5 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[11px] font-bold text-[#86868b] bg-gray-100 px-2 py-0.5 rounded-md">${post.cat}</span>
                        ${badge}
                    </div>
                    <h4 class="font-bold text-xl text-[#1d1d1f] line-clamp-1 mb-1">${post.name}</h4>
                    ${post.desc ? `<p class="text-[13px] text-[#86868b] mb-4 line-clamp-2 leading-relaxed">${post.desc}</p>` : '<div class="mb-4"></div>'}
                    
                    <p class="text-[11px] text-[#86868b] font-medium mb-3 flex items-center gap-1">
                        <span class="w-4 h-4 bg-gray-200 rounded-full inline-block flex items-center justify-center text-[8px]">👤</span>
                        โดย ${displayOwnerName}
                    </p>
                    
                    <div class="bg-gray-50/80 p-3.5 rounded-xl mb-4 mt-auto border border-gray-100 relative">
                        ${!showContact ? '<div class="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center rounded-xl"><span class="text-[11px] font-bold text-[#86868b] flex items-center gap-1">🔒 สงวนสิทธิ์การติดต่อ</span></div>' : ''}
                        <p class="text-[10px] font-bold text-[#86868b] mb-1 uppercase tracking-wider">ช่องทางติดต่อ</p>
                        <p class="text-[13px] font-medium text-[#1d1d1f] break-all select-all">${post.contact}</p>
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
    }
}
function deletePost(id) {
    if (confirm("ต้องการลบโพสต์นี้ใช่ไหม?")) {
        posts = posts.filter(x => x.id !== id);
        saveData(); renderFeed();
        if(document.getElementById('modal-history').classList.contains('active')) switchHistoryTab('give');
    }
}
function saveData() { localStorage.setItem('ntun_system_db', JSON.stringify(posts)); }

function switchHistoryTab(tab) {
    const list = document.getElementById('history-list');
    document.getElementById('tab-give').className = (tab === 'give') ? "pb-2 text-[#1d1d1f] font-bold border-b-[2px] border-[#1d1d1f] text-sm btn-press transition-colors" : "pb-2 text-[#86868b] font-medium border-b-[2px] border-transparent hover:text-[#1d1d1f] text-sm btn-press transition-colors";
    document.getElementById('tab-take').className = (tab === 'take') ? "pb-2 text-[#1d1d1f] font-bold border-b-[2px] border-[#1d1d1f] text-sm btn-press transition-colors" : "pb-2 text-[#86868b] font-medium border-b-[2px] border-transparent hover:text-[#1d1d1f] text-sm btn-press transition-colors";
    
    let target = tab === 'give' ? posts.filter(p => p.ownerEmail === currentUser.email) : posts.filter(p => p.reservedByEmail === currentUser.email);

    if (target.length === 0) return list.innerHTML = `<div class="text-center py-8 text-sm font-medium text-[#86868b] bg-gray-50 rounded-xl border border-gray-100">ไม่มีข้อมูล</div>`;

    list.innerHTML = target.map((p) => {
        let status = p.status === 'available' ? 'ว่าง' : (p.status === 'reserved' ? 'รอส่ง' : 'จบงาน');
        let color = p.status === 'available' ? 'text-indigo-600' : (p.status === 'reserved' ? 'text-amber-600' : 'text-[#86868b]');
        let actionBtn = (tab === 'give' && p.status === 'reserved') ? `<button onclick="completeOrder(${p.id})" class="text-[10px] bg-[#1d1d1f] text-white px-3 py-1.5 rounded-lg font-medium btn-press hover:bg-black">ส่งแล้ว</button>` : '';

        return `
            <div class="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                ${p.image ? `<img src="${p.image}" class="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100">` : `<div class="w-14 h-14 bg-gray-50 rounded-xl shrink-0 border border-gray-100 flex items-center justify-center text-[10px] text-gray-400">NO IMG</div>`}
                <div class="flex-1 overflow-hidden">
                    <h4 class="font-bold text-sm text-[#1d1d1f] truncate">${p.name}</h4>
                    <p class="text-[11px] font-bold mt-1 ${color} bg-${color.split('-')[1]}-50 inline-block px-2 py-0.5 rounded-md">${status}</p>
                </div>
                ${actionBtn}
            </div>`;
    }).join('');
}
