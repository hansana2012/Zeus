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

// ========== AUTH STATE ==========
auth.onAuthStateChanged(async (user) => {
    if (!user) { window.location.href = "login.html"; return; }
    const doc = await db.collection('users').doc(user.uid).get();
    if (!doc.exists || doc.data().role !== 'caregiver') {
        window.location.href = "customer.html";
        return;
    }
    loadCaregiver(user.uid);
});

// ========== LOAD CAREGIVER ==========
async function loadCaregiver(uid) {
    try {
        const doc = await db.collection('caregivers').doc(uid).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('caregiverName').textContent = data.fullName || 'Caregiver';
            document.getElementById('caregiverRole').textContent = data.category || 'Babysitter';
            if (data.profileImage) document.getElementById('profileImage').src = data.profileImage;

            const badge = document.getElementById('statusBadge');
            if (data.isApproved) {
                badge.textContent = 'Approved';
                badge.className = 'status-badge approved';
                document.getElementById('profileAlert').style.display = 'none';
                document.getElementById('formSection').style.display = 'none';
            } else {
                badge.textContent = 'Pending';
                badge.className = 'status-badge pending';
                document.getElementById('profileAlert').style.display = 'flex';
                document.getElementById('formSection').style.display = 'block';
                // Fill form
                document.getElementById('cgFullName').value = data.fullName || '';
                document.getElementById('cgPhone').value = data.phone || '';
                document.getElementById('cgNIC').value = data.nic || '';
                document.getElementById('cgCategory').value = data.category || '';
                document.getElementById('cgExperience').value = data.experience || '';
                document.getElementById('cgRate').value = data.rate || '';
                document.getElementById('cgAbout').value = data.about || '';
                document.getElementById('cgSkills').value = data.skills || '';
                updateProgress(data);
            }
        } else {
            await db.collection('caregivers').doc(uid).set({ userId: uid, isApproved: false, createdAt: new Date() });
        }
    } catch (e) { console.error("Load error:", e); }
}

// ========== PROGRESS ==========
function updateProgress(data) {
    const fields = ['fullName','phone','nic','category','about','cv'];
    let done = fields.filter(f => data[f]).length;
    const pct = Math.round((done / fields.length) * 100);
    document.getElementById('progressBar').style.width = pct + '%';
    document.getElementById('progressText').textContent = pct + '%';
}

// ========== STEP NAV ==========
function nextStep(n) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById('step'+n).classList.add('active');
}
function prevStep(n) {
    document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
    document.getElementById('step'+n).classList.add('active');
}
function scrollToForm() {
    document.getElementById('formSection').scrollIntoView({ behavior: 'smooth' });
}

// ========== SUBMIT ==========
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;
    const btn = document.getElementById('submitBtn');
    btn.textContent = 'Saving...'; btn.disabled = true;

    try {
        const fullName = document.getElementById('cgFullName').value;
        const phone = document.getElementById('cgPhone').value;
        const nic = document.getElementById('cgNIC').value;
        const category = document.getElementById('cgCategory').value;
        const experience = parseInt(document.getElementById('cgExperience').value) || 0;
        const rate = parseInt(document.getElementById('cgRate').value) || 0;
        const about = document.getElementById('cgAbout').value;
        const skills = document.getElementById('cgSkills').value;
        const cvFile = document.getElementById('cgCV').files[0];

        let cvUrl = '';
        if (cvFile) {
            const ref = storage.ref(`caregivers/${user.uid}/cv_${Date.now()}`);
            await ref.put(cvFile);
            cvUrl = await ref.getDownloadURL();
        }

        await db.collection('caregivers').doc(user.uid).update({
            fullName, phone, nic, category, experience, rate, about, skills,
            cv: cvUrl, isSetupComplete: true, updatedAt: new Date()
        });
        await db.collection('users').doc(user.uid).update({ isSetupComplete: true, displayName: fullName });

        alert('Profile submitted! Waiting for admin approval.');
        window.location.reload();
    } catch (e) {
        alert('Error: ' + e.message);
    } finally {
        btn.textContent = 'Submit Profile'; btn.disabled = false;
    }
});

// ========== PROFILE IMAGE UPLOAD ==========
document.getElementById('profileUpload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const user = auth.currentUser;
    try {
        const ref = storage.ref(`caregivers/${user.uid}/profile_${Date.now()}`);
        await ref.put(file);
        const url = await ref.getDownloadURL();
        await db.collection('caregivers').doc(user.uid).update({ profileImage: url });
        document.getElementById('profileImage').src = url;
        alert('Profile picture updated!');
    } catch (e) { alert('Upload error: ' + e.message); }
});

// ========== LOGOUT ==========
document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Logout?')) { auth.signOut().then(() => window.location.href = 'login.html'); }
});
