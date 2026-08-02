// ========== FIREBASE CONFIG ==========
const firebaseConfig = {
    apiKey: "AIzaSyD65umudy1mA93ciAoFWd_SGY7lnxZwthw",
    authDomain: "zeus-61c18.firebaseapp.com",
    projectId: "zeus-61c18",
    storageBucket: "zeus-61c18.firebasestorage.app",
    messagingSenderId: "635167505395",
    appId: "1:635167505395:web:7c012aea54fac41a077086",
    measurementId: "G-0J6YLH9G45"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

let custId = null;

// ========== AUTH STATE ==========
auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    const doc = await db.collection('users').doc(user.uid).get();
    if (!doc.exists || doc.data().role !== 'customer') {
        window.location.href = "caregiver.html";
        return;
    }
    custId = user.uid;
    loadCustomer(user.uid);
    loadCaregivers('babysitter');
});

// ========== LOAD CUSTOMER ==========
async function loadCustomer(uid) {
    const doc = await db.collection('customers').doc(uid).get();
    if (doc.exists) {
        const data = doc.data();
        document.getElementById('custName').textContent = data.fullName || 'Customer';
        document.getElementById('custEmail').textContent = data.email || '';
        if (data.profileImage) document.getElementById('custProfileImage').src = data.profileImage;
    } else {
        const userDoc = await db.collection('users').doc(uid).get();
        const uData = userDoc.data();
        await db.collection('customers').doc(uid).set({
            userId: uid, fullName: uData.name || 'Customer', email: uData.email, createdAt: new Date()
        });
        loadCustomer(uid);
    }
}

// ========== LOAD CAREGIVERS ==========
async function loadCaregivers(category) {
    const grid = document.getElementById('caregiverGrid');
    grid.innerHTML = '<div style="color:#aaa;text-align:center;padding:30px;">Loading...</div>';
    try {
        const snap = await db.collection('caregivers')
            .where('category', '==', category)
            .where('isApproved', '==', true)
            .get();
        if (snap.empty) {
            grid.innerHTML = '<div style="color:#aaa;text-align:center;padding:30px;">No caregivers found</div>';
            return;
        }
        grid.innerHTML = '';
        snap.forEach(doc => {
            const d = doc.data();
            const card = document.createElement('div');
            card.className = 'cg-card';
            card.innerHTML = `
                <div class="cg-img">
                    <img src="${d.profileImage || 'https://ui-avatars.com/api/?name='+encodeURIComponent(d.fullName||'CG')+'&background=random'}" alt="${d.fullName}">
                    <span class="cg-badge avail">Available</span>
                </div>
                <div class="cg-info">
                    <h4>${d.fullName || 'Caregiver'}</h4>
                    <div class="cg-cat">${d.category || 'Babysitter'}</div>
                    <div class="cg-rate">⭐ ${d.rating || 'N/A'} | $${d.rate || 0}/day</div>
                    <div class="cg-about">${(d.about||'').substring(0,60)}${(d.about||'').length>60?'...':''}</div>
                    <div class="cg-actions">
                        <button class="btn-view" onclick="viewDetail('${doc.id}')">View</button>
                        <button class="btn-call" onclick="callNow('${d.phone||''}')"><i class="fa-solid fa-phone"></i> Call</button>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (e) {
        grid.innerHTML = '<div style="color:#ef4444;text-align:center;padding:30px;">Error loading</div>';
        console.error(e);
    }
}

// ========== VIEW DETAIL ==========
async function viewDetail(id) {
    const modal = document.getElementById('detailModal');
    const body = document.getElementById('detailBody');
    body.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">Loading...</div>';
    modal.style.display = 'flex';

    try {
        const doc = await db.collection('caregivers').doc(id).get();
        if (!doc.exists) { body.innerHTML = '<p>Not found</p>'; return; }
        const d = doc.data();
        body.innerHTML = `
            <div class="detail-header">
                <img src="${d.profileImage || 'https://ui-avatars.com/api/?name='+encodeURIComponent(d.fullName||'CG')+'&background=random'}" alt="${d.fullName}">
                <div>
                    <h2>${d.fullName || 'Caregiver'}</h2>
                    <p style="color:#c084fc;">${d.category || 'Babysitter'}</p>
                    <p>⭐ ${d.rating || 'N/A'} | $${d.rate || 0}/day</p>
                </div>
            </div>
            <div class="detail-body">
                <h4>About</h4>
                <p>${d.about || 'No description'}</p>
                <h4>Experience</h4>
                <p>${d.experience || 0} years</p>
                <h4>Skills</h4>
                <p>${d.skills || 'No skills listed'}</p>
            </div>
            <div class="detail-actions">
                <button class="btn-call-big" onclick="callNow('${d.phone||''}')"><i class="fa-solid fa-phone"></i> Call Now</button>
                <button class="btn-book" onclick="bookCaregiver('${id}')"><i class="fa-solid fa-calendar-check"></i> Book</button>
            </div>
        `;
    } catch (e) { body.innerHTML = '<p style="color:#ef4444;">Error</p>'; console.error(e); }
}

function closeDetail() {
    document.getElementById('detailModal').style.display = 'none';
}

// ========== CALL ==========
function callNow(phone) {
    if (!phone) { alert('Phone number not available.'); return; }
    window.location.href = 'tel:' + phone;
}

// ========== BOOK ==========
async function bookCaregiver(id) {
    if (!custId) { alert('Please login.'); return; }
    if (!confirm('Book this caregiver?')) return;
    try {
        await db.collection('bookings').add({
            caregiverId: id, customerId: custId, status: 'pending', createdAt: new Date()
        });
        alert('Booking request sent!');
    } catch (e) { alert('Error: ' + e.message); }
}

// ========== EDIT PROFILE ==========
function toggleEditModal() {
    const modal = document.getElementById('editModal');
    if (modal.style.display === 'none') {
        // Load current data
        db.collection('customers').doc(custId).get().then(doc => {
            if (doc.exists) {
                const d = doc.data();
                document.getElementById('editName').value = d.fullName || '';
                document.getElementById('editPhone').value = d.phone || '';
                document.getElementById('editAddress').value = d.address || '';
                document.getElementById('editAbout').value = d.about || '';
            }
        });
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
    }
}

document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;
    const address = document.getElementById('editAddress').value;
    const about = document.getElementById('editAbout').value;
    try {
        await db.collection('customers').doc(custId).update({
            fullName, phone, address, about, updatedAt: new Date()
        });
        document.getElementById('custName').textContent = fullName;
        toggleEditModal();
        alert('Profile updated!');
    } catch (e) { alert('Error: ' + e.message); }
});

// ========== PROFILE IMAGE UPLOAD ==========
document.getElementById('custProfileUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const ref = storage.ref(`customers/${custId}/profile_${Date.now()}`);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await db.collection('customers').doc(custId).update({ profileImage: url });
        document.getElementById('custProfileImage').src = url;
        alert('Profile picture updated!');
    } catch (e) { alert('Upload error: ' + e.message); }
});

// ========== LOGOUT ==========
document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Logout?')) { auth.signOut().then(() => window.location.href = 'login.html'); }
});

// ========== CLOSE MODAL ON OUTSIDE CLICK ==========
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.style.display = 'none';
});
