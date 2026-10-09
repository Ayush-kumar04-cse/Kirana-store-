async function loginUser() {
    const phone = document.getElementById('inputPhone').value.trim();
    const shopName = document.getElementById('inputShopName').value.trim();

    if (phone.length !== 10) return alert("Please enter a valid 10-digit mobile number.");
    if (state.role === 'shopkeeper' && !shopName) return alert("Please enter your shop name.");

    state.user = { phone, role: state.role, shopName };
    localStorage.setItem('user_session', JSON.stringify(state.user));

    // Safely attempt backend connection without crashing if Firebase keys are missing
    try {
        if (window.backend && typeof window.backend.saveUser === 'function') {
            await window.backend.saveUser(phone, state.role, shopName, state.location.lat, state.location.lng);
        }
    } catch (err) {
        console.warn("Backend sync skipped (Firebase not configured yet):", err);
    }

    initApp();
}