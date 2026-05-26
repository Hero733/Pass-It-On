// ==========================================
// CONFIGURATION & STATE
// ==========================================
const SCHOOL_DOMAIN = "ntun.ac.th";
let posts = JSON.parse(localStorage.getItem('ntun_system_posts')) || [];
let currentUser = null;
let selectedImageBase64 = null;
let currentFilter = 'ทั้งหมด';

// ==========================================
// INITIALIZATION & LOADER
// ==========================================
window.addEventListener('load', () => {
    // ให้เวลา Loader ทำงานอย่างน้อย 600ms ให้ดูสมูท
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);
    }, 600);
});

// Failsafe: ถ้าเว็บเอ๋อ โหลดไม่เสร็จใน 2 วิ ตัดจบ Loader ทันที
setTimeout(() => {
    const loader = document.getElementById('page-loader');
    if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400);
    }
}, 2000);

window.onload = () => {
    const session = localStorage.getItem('ntun_session');
    if (session) {
        currentUser = JSON.parse(session);
        renderAuthUI();
        unlockSystem(false);
    }
    cleanUpOldPosts(); // ลบโพสต์ที่ส่งมอบสำเร็จเกิน 2 วัน
};

// ==========================================
// AUTHENTICATION (Google)
// ==========================================
function handleSignIn(response) {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const domain = payload.hd || payload.email.split('@')[1];

        // อนุญาต @ntun.ac.th และอีเมล Admin (แก้เป็นอีเมลตัวเองได้)
        if (domain === SCHOOL_DOMAIN || payload.email === "aceaa372@gmail.com") {
            currentUser = { name: payload.name, email: payload.email, picture: payload.picture };
            localStorage.setItem('ntun_session', JSON.stringify(currentUser));
            renderAuthUI();
            unlockSystem(true);
        } else {
            alert(`❌ ระบบนี้อนุญาตเฉพาะนักเรียนโดเมน @${SCHOOL_DOMAIN} เท่านั้นครับ`);
        }
    } catch (e) {
        console.error("Login failed", e);
    }
}

function logout() {
    localStorage.removeItem('ntun_session');
    location.reload();
}

// ==========================================
// UI RENDERING
// ==========================================
function renderAuthUI() {
    // ซ่อนปุ่มล็อกอินเดิม
    document.getElementById('auth-section').innerHTML = `
        <div onclick="if(confirm('ต้องการออกจากระบบใช่หรือไม่?')) logout()" class="flex items-center gap-3 bg-white p-1 pr-4 rounded-full border border-gray-200 shadow-sm cursor-pointer hover:bg-rose-50 transition-colors btn-press" title="คลิกเพื่อออกจากระบบ">
            <img src="${currentUser.picture}" class="w-8 h-8 rounded-full border border-gray-200" referrerpolicy="no-referrer">
            <span class="text-xs font-bold text-gray-800 hidden sm:block">${currentUser.name.split(' ')[0]}</span>
        </div>
    `;

    const navButtons = `
        <button onclick="document.getElementById('top').scrollIntoView()" class="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-white hover:text-black hover:shadow-sm transition-all btn-press">🏠 หน้าแรก</button>
        <button onclick="document.getElementById('app-content').scrollIntoView()" class="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-white hover:text-black hover:shadow-sm transition-all btn-press">✨ กระดาน</button>
        <button onclick="toggleModal('modal-history')" class="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-white hover:text-black hover:shadow-sm transition-all btn-press">📁 ประวัติ</button>
        <button onclick="toggleModal('modal-guide')" class="px-4 py-2 rounded-full text-xs font-bold text-gray-600 hover:bg-white hover:text-black hover:shadow-sm transition-all btn-press">📖 คู่มือ</button>
    `;

    document.getElementById('nav-actions').innerHTML = navButtons;
    document.getElementById('nav-actions').classList.remove('hidden');
    
    document.getElementById('mobile-nav').innerHTML = navButtons;
    document.getElementById('mobile-nav').classList.remove('hidden');
}

function unlockSystem(animateScroll) {
    const appContent = document.getElementById('app-content');
    appContent.style.display = 'block';
    appContent.classList.add('fade-up');
    
    renderFeed();

    if (animateScroll) {
        setTimeout(() => appContent.scrollIntoView({ behavior: 'smooth' }), 300);
    }
}

// ==========================================
// MODAL SYSTEM
// ==========================================
function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto'; // คืนค่า Scroll
    } else {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // ล็อก Scroll ฉากหลัง
        if (id === 'modal-history') switchHistoryTab('give'); // โหลดหน้าประวัติ
    }
}

// ==========================================
// FORM & IMAGE HANDLING
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
    e.stopPropagation(); // ไม่ให้เด้งไปกดอัปโหลดซ้ำ
    selectedImageBase64 = null;
    document.getElementById('itemImage').value = "";
    document.getElementById('image-preview-el').classList.add('hidden');
    document.getElementById('preview-placeholder').classList.remove('hidden');
    document.getElementById('remove-img-btn').classList.add('hidden');
}

function handlePost(e) {
    e.preventDefault();
    if (!currentUser) return alert("กรุณาล็อกอินก่อนครับ!");

    const name = document.getElementById('itemName').value;
    const cat = document.getElementById('itemCat').value;
    const contact = document.getElementById('itemContact').value;

    if (!selectedImageBase64) {
        if (!confirm("ไม่ได้ใส่รูปภาพแน่ใจนะ? (มีรูปเพื่อนจะสนใจมากกว่านะ!)")) return;
    }

    const newPost = {
        id: Date.now(),
        time: Date.now(),
        ownerEmail: currentUser.email,
        ownerName: currentUser.name,
        ownerAvatar: currentUser.picture,
        name, cat, contact,
        image: selectedImageBase64,
        status: 'available', // available, reserved, completed
        reservedByEmail: null,
        reservedByName: null
    };

    posts.unshift(newPost);
    saveData();
    
    // Reset Form
    e.target.reset();
    removeImage(new Event('click'));
    setFilter('ทั้งหมด');
    
    alert("🎉 ประกาศลงกระดานเรียบร้อยแล้ว!");
}

// ==========================================
// FEED & FILTER SYSTEM
// ==========================================
function setFilter(cat) {
    currentFilter = cat;
    
    // Update active tab UI
    const tabs = document.getElementById('filter-container').children;
    for (let tab of tabs) {
        if (tab.innerText === cat || (cat === 'ทั้งหมด' && tab.innerText === 'รวมทั้งหมด')) {
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
            <div class="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200">
                <span class="text-4xl mb-3 opacity-50">📭</span>
                <p class="font-bold">ยังไม่มีของในหมวดหมู่นี้</p>
                <p class="text-xs mt-1">เป็นคนแรกที่ลงของสิ!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = displayPosts.map((post, idx) => {
        const isOwner = currentUser && post.ownerEmail === currentUser.email;
        let badge, actionButton, cardOpacity = "";

        // Status Logic
        if (post.status === 'completed') {
            badge = `<span class="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold">✅ ส่งมอบแล้ว</span>`;
            actionButton = `<span class="text-xs font-bold text-gray-400">จบงานแล้ว</span>`;
            cardOpacity = "opacity-60 grayscale scale-[0.98]";
        } 
        else if (post.status === 'reserved') {
            badge = `<span class="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-[10px] font-bold">⏳ จองแล้ว</span>`;
            cardOpacity = "opacity-90";
            
            if (isOwner) {
                actionButton = `<button onclick="completeOrder(${post.id})" class="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm btn-press shadow-md hover:bg-emerald-600 animate-pulse">ยืนยันว่าส่งของแล้ว</button>`;
            } else if (post.reservedByEmail === currentUser.email) {
                actionButton = `<span class="text-xs font-bold text-amber-500 bg-amber-50 px-4 py-2 rounded-lg w-full text-center inline-block border border-amber-100">คุณจองชิ้นนี้ไว้ (รอรับของ)</span>`;
            } else {
                actionButton = `<button disabled class="w-full bg-gray-200 text-gray-400 py-3 rounded-xl font-bold text-sm cursor-not-allowed">ไม่ว่าง</button>`;
            }
        } 
        else {
            // Available
            badge = `<span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">✨ ว่าง</span>`;
            if (isOwner) {
                actionButton = `<span class="text-xs font-bold text-indigo-400 bg-indigo-50/50 px-4 py-2 rounded-lg w-full text-center inline-block">ของของคุณเอง</span>`;
            } else {
                actionButton = `<button onclick="reserveItem(${post.id})" class="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm btn-press shadow-lg hover:bg-indigo-600 transition-colors">รับของชิ้นนี้</button>`;
            }
        }

        // Delete button only for owner (and if not completed yet)
        const delBtn = (isOwner && post.status !== 'completed') 
            ? `<button onclick="deletePost(${post.id})" class="absolute top-4 right-4 w-8 h-8 bg-black/50 hover:bg-rose-500 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors btn-press z-10">🗑️</button>` 
            : '';

        return `
            <div class="ios-card overflow-hidden flex flex-col fade-up ${cardOpacity} relative" style="animation-delay: ${idx * 0.05}s">
                ${delBtn}
                ${post.image ? `<img src="${post.image}" class="w-full h-48 object-cover shrink-0">` : `<div class="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-300 text-sm font-bold">NO IMAGE</div>`}
                
                <div class="p-6 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-3">
                        <span class="text-[10px] font-black text-gray-400 uppercase tracking-wider truncate mr-2">${post.cat}</span>
                        ${badge}
                    </div>
                    
                    <h4 class="text-xl font-black mb-1 text-gray-900 line-clamp-1">${post.name}</h4>
                    <p class="text-[10px] text-gray-400 mb-4">ลงโดย ${post.ownerName.split(' ')[0]} • ${timeAgo(post.time)}</p>
                    
                    <div class="bg-gray-50/80 p-3 rounded-xl mb-5 border border-gray-100/80 mt-auto">
                        <p class="text-[9px] font-bold text-gray-400 mb-1 uppercase tracking-wider">ติดต่อรับของที่:</p>
                        <p class="text-sm font-bold text-gray-800 truncate">${post.status === 'available' || (post.status === 'reserved' && (isOwner || post.reservedByEmail === currentUser.email)) ? post.contact : '*** ปิดบังข้อมูล ***'}</p>
                    </div>
                    
                    ${actionButton}
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================
// ACTIONS (Reserve, Complete, Delete)
// ==========================================
function reserveItem(id) {
    if (!currentUser) return alert("ล็อกอินก่อนจองนะครับ!");
    const p = posts.find(x => x.id === id);
    
    if (confirm(`ยืนยันการรับ "${p.name}" ใช่ไหม?\n\n📌 สิ่งที่ต้องทำต่อ: คุณต้องทักไปหาเจ้าของผ่านช่องทางที่เขาระบุไว้เพื่อนัดรับของนะครับ`)) {
        p.status = 'reserved';
        p.reservedByEmail = currentUser.email;
        p.reservedByName = currentUser.name;
        saveData();
        renderFeed();
        alert(`🎉 จองสำเร็จ! รีบติดต่อไปที่: ${p.contact}`);
    }
}

function completeOrder(id) {
    if (confirm("ส่งมอบของให้เพื่อนเรียบร้อยแล้วใช่ไหม? (เมื่อยืนยันแล้วจะแก้ไขไม่ได้)")) {
        const p = posts.find(x => x.id === id);
        p.status = 'completed';
        p.completedTime = Date.now();
        saveData();
        renderFeed();
        
        // ถ้ากดจากหน้าประวัติ ให้รีเฟรชหน้าประวัติด้วย
        if(document.getElementById('modal-history').style.display === 'flex') {
            switchHistoryTab('give');
        }
    }
}

function deletePost(id) {
    if (confirm("แน่ใจนะว่าต้องการลบโพสต์นี้ทิ้ง?")) {
        posts = posts.filter(x => x.id !== id);
        saveData();
        renderFeed();
        
        if(document.getElementById('modal-history').style.display === 'flex') {
            switchHistoryTab('give');
        }
    }
}

// ==========================================
// HISTORY SYSTEM
// ==========================================
function switchHistoryTab(tab) {
    const tabGive = document.getElementById('tab-give');
    const tabTake = document.getElementById('tab-take');
    const list = document.getElementById('history-list');
    
    let targetPosts = [];

    if (tab === 'give') {
        tabGive.className = "pb-3 text-indigo-600 font-bold border-b-2 border-indigo-600 text-sm md:text-base btn-press";
        tabTake.className = "pb-3 text-gray-400 font-bold border-b-2 border-transparent text-sm md:text-base btn-press";
        targetPosts = posts.filter(p => p.ownerEmail === currentUser.email);
    } else {
        tabTake.className = "pb-3 text-indigo-600 font-bold border-b-2 border-indigo-600 text-sm md:text-base btn-press";
        tabGive.className = "pb-3 text-gray-400 font-bold border-b-2 border-transparent text-sm md:text-base btn-press";
        targetPosts = posts.filter(p => p.reservedByEmail === currentUser.email);
    }

    if (targetPosts.length === 0) {
        list.innerHTML = `<div class="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">ยังไม่มีประวัติในหน้านี้ครับ</div>`;
        return;
    }

    list.innerHTML = targetPosts.map((p, idx) => {
        let statusText = p.status === 'available' ? '✨ ว่าง' : (p.status === 'reserved' ? '⏳ รอส่งมอบ' : '✅ จบงาน');
        let statusColor = p.status === 'available' ? 'text-indigo-500' : (p.status === 'reserved' ? 'text-amber-500' : 'text-emerald-500');
        
        let action = "";
        if (tab === 'give' && p.status === 'reserved') {
            action = `<button onclick="completeOrder(${p.id})" class="text-xs bg-emerald-500 text-white px-3 py-2 rounded-lg font-bold btn-press shadow-sm">ยืนยันว่าส่งแล้ว</button>`;
        } else if (tab === 'give' && p.status !== 'completed') {
            action = `<button onclick="deletePost(${p.id})" class="text-xs bg-rose-50 text-rose-500 px-3 py-2 rounded-lg font-bold btn-press">ลบทิ้ง</button>`;
        }

        return `
            <div class="flex items-center gap-4 bg-gray-50/80 p-3 rounded-2xl border border-gray-100 hover:shadow-md transition-shadow fade-up" style="animation-delay: ${idx * 0.05}s">
                ${p.image ? `<img src="${p.image}" class="w-16 h-16 rounded-xl object-cover shrink-0">` : `<div class="w-16 h-16 rounded-xl bg-gray-200 shrink-0"></div>`}
                <div class="flex-1 overflow-hidden">
                    <h4 class="font-bold text-sm text-gray-800 truncate leading-tight">${p.name}</h4>
                    <p class="text-[11px] font-bold mt-1 ${statusColor}">สถานะ: ${statusText}</p>
                    ${p.status === 'reserved' ? `<p class="text-[10px] text-gray-500 truncate mt-0.5">${tab === 'give' ? 'จองโดย: ' + p.reservedByName : 'ติดต่อเจ้าของ: ' + p.contact}</p>` : ''}
                </div>
                <div>${action}</div>
            </div>
        `;
    }).join('');
}

// ==========================================
// UTILS
// ==========================================
function saveData() { localStorage.setItem('ntun_system_posts', JSON.stringify(posts)); }

function timeAgo(timestamp) {
    const mins = Math.floor((Date.now() - timestamp) / 60000);
    if (mins >= 1440) return `${Math.floor(mins / 1440)} วันที่แล้ว`;
    if (mins >= 60) return `${Math.floor(mins / 60)} ชม. ที่แล้ว`;
    return mins > 0 ? `${mins} นาทีที่แล้ว` : "เมื่อสักครู่";
}

function cleanUpOldPosts() {
    // ลบโพสต์ที่สถานะ completed และเวลาผ่านไปเกิน 2 วัน (48 ชั่วโมง = 172800000 ms)
    const oldLength = posts.length;
    posts = posts.filter(p => !(p.status === 'completed' && p.completedTime && (Date.now() - p.completedTime > 172800000)));
    if (posts.length !== oldLength) saveData();
}
