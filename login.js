document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const tlog = document.getElementById('tlog');
    const treg = document.getElementById('treg');
    const flog = document.getElementById('flog');
    const freg = document.getElementById('freg');
    const gbtn = document.getElementById('gbtn');

    // Tab Switch
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

    // ================================================================
    // 1. LOGIN FUNCTION
    // ================================================================
    flog.addEventListener('submit', async (e) => {
        e.preventDefault();
        const leml = document.getElementById('leml').value;
        const lpwd = document.getElementById('lpwd').value;

        try {
            const userCredential = await auth.signInWithEmailAndPassword(leml, lpwd);
            // Login වුනාම Role එක බලලා අදාල Dashboard එකට යවන්න
            await redirectUserByRole(userCredential.user.uid);
        } catch (error) {
            alert("Login Error: " + error.message);
        }
    });

    // ================================================================
    // 2. REGISTER FUNCTION
    // ================================================================
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
                isSetupComplete: false,
                isApproved: false,
                createdAt: new Date()
            });

            alert("Account Created Successfully!");
            
            // Role එක අනුව Dashboard එකට යවන්න
            await redirectUserByRole(user.uid);
        } catch (error) {
            alert("Registration Error: " + error.message);
        }
    });

    // ================================================================
    // 3. GOOGLE SIGN-IN FUNCTION
    // ================================================================
    if (gbtn) {
        gbtn.addEventListener('click', async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const result = await auth.signInWithPopup(provider);
                const user = result.user;

                // User Firestore හි ඇත්දැයි බලන්න
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (!userDoc.exists) {
                    // පළමු වතාවට එන User කෙනෙක් නම් Default Role එක "customer" ලෙස සකසයි
                    await db.collection('users').doc(user.uid).set({
                        name: user.displayName,
                        email: user.email,
                        role: "customer", 
                        isSetupComplete: false,
                        isApproved: false,
                        createdAt: new Date()
                    });
                }

                // Role එක අනුව Redirect කිරීම
                await redirectUserByRole(user.uid);

            } catch (error) {
                alert("Google Sign-in Error: " + error.message);
            }
        });
    }
});

// ================================================================
// 4. REDIRECT FUNCTION (ඔබේ අලුත් ෆයිල් නම් වලට යවන්න)
// ================================================================
async function redirectUserByRole(uid) {
    try {
        // පළමුව caregiver collection එකේ check කරන්න (Caregiver නම්)
        const caregiverDoc = await db.collection('caregivers').doc(uid).get();
        
        // නැත්නම් users collection එකෙන් role එක ගන්න
        const userDoc = await db.collection('users').doc(uid).get();
        
        let role = 'customer'; // Default role

        if (caregiverDoc.exists) {
            // Caregiver කෙනෙක් නම්
            role = 'caregiver';
        } else if (userDoc.exists) {
            // User document එකේ තියෙන role එක ගන්න
            role = userDoc.data().role || 'customer';
        }
        
        // Role එක අනුව අදාල Dashboard එකට යවන්න
        if (role === 'caregiver') {
            // Caregiver නම් caregiver.html එකට යවන්න
            window.location.href = 'caregiver.html';
        } else {
            // Customer නම් customer.html එකට යවන්න
            window.location.href = 'customer.html';
        }
    } catch (error) {
        console.error("Redirect Error:", error);
        // Error එකක් ආවොත් default එක customer එකට යවන්න
        window.location.href = 'customer.html';
    }
}
