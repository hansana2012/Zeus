// 1. Firebase Configuration (ඔයාගේ Firebase Console එකෙන් ලැබුණු Keys)
const firebaseConfig = {
    apiKey: "AIzaSyD65umudy1mA93ciAoFWd_SGY7lnxZwthw",
    authDomain: "zeus-61c18.firebaseapp.com",
    projectId: "zeus-61c18",
    storageBucket: "zeus-61c18.firebasestorage.app",
    messagingSenderId: "635167505395",
    appId: "1:635167505395:web:7c012aea54fac41a077086",
    measurementId: "G-0J6YLH9G45"
};

// 2. Initialize Firebase & Services
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    
    // UI Elements
    const tlog = document.getElementById('tlog');
    const treg = document.getElementById('treg');
    const flog = document.getElementById('flog');
    const freg = document.getElementById('freg');
    const gbtn = document.getElementById('gbtn');

    // Tab Switch Functionality
    tlog.addEventListener('click', () => {
        flog.classList.remove('hidn');
        freg.classList.add('hidn');
        tlog.classList.add('actv');
        treg.classList.remove('actv');
    });

    treg.addEventListener('click', () => {
        freg.classList.remove('hidn');
        flog.classList.add('hidn');
        treg.classList.add('actv');
        tlog.classList.remove('actv');
    });

    // ----------------------------------------------------
    // 1. LOGIN SUBMIT FUNCTION
    // ----------------------------------------------------
    flog.addEventListener('submit', async (e) => {
        e.preventDefault();
        const leml = document.getElementById('leml').value;
        const lpwd = document.getElementById('lpwd').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(leml, lpwd);
            alert("Login Successful! Welcome Back.");
            console.log("Logged User:", userCredential.user);
            // window.location.href = "dashboard.html"; // Dashboard එක සාදා ඇති විට මේක active කරන්න
        } catch (error) {
            alert("Login Error: " + error.message);
        }
    });

    // ----------------------------------------------------
    // 2. REGISTER SUBMIT FUNCTION
    // ----------------------------------------------------
    freg.addEventListener('submit', async (e) => {
        e.preventDefault();
        const rnam = document.getElementById('rnam').value;
        const reml = document.getElementById('reml').value;
        const rpwd = document.getElementById('rpwd').value;
        const rrol = document.getElementById('rrol').value;

        try {
            // Firebase Auth එකෙන් User සෑදීම
            const userCredential = await auth.createUserWithEmailAndPassword(reml, rpwd);
            const user = userCredential.user;

            // Firestore Database එකට Name & Role එකතු කිරීම
            await db.collection('users').doc(user.uid).set({
                name: rnam,
                email: reml,
                role: rrol,
                createdAt: new Date()
            });

            alert("Account Created Successfully!");
            // window.location.href = "dashboard.html";
        } catch (error) {
            alert("Registration Error: " + error.message);
        }
    });

    // ----------------------------------------------------
    // 3. GOOGLE SIGN-IN FUNCTION
    // ----------------------------------------------------
    if (gbtn) {
        gbtn.addEventListener('click', async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const result = await auth.signInWithPopup(provider);
                const user = result.user;

                // Default Role එකක් විදිහට Parent ලෙස Firestore හි Save කිරීම (අවශ්‍ය නම්)
                await db.collection('users').doc(user.uid).set({
                    name: user.displayName,
                    email: user.email,
                    role: "parent",
                    createdAt: new Date()
                }, { merge: true });

                alert("Google Sign-In Successful!");
                console.log("Google User:", user);
            } catch (error) {
                alert("Google Sign-in Error: " + error.message);
            }
        });
    }

});
