// 1. Declare state at the top of app.js
const state = {
    role: 'client', // default role: 'client' or 'shopkeeper'
    user: null,
    location: { lat: 0, lng: 0 }
};

// Function to handle role switching
window.setRole = function(role) {
    state.role = role;
    const shopNameContainer = document.getElementById('shopNameContainer');
    if (shopNameContainer) {
        if (role === 'shopkeeper') {
            shopNameContainer.classList.remove('hidden');
        } else {
            shopNameContainer.classList.add('hidden');
        }
    }
};

// 2. Attach loginUser to window so onclick="loginUser()" works
window.loginUser = async function() {
    const phoneInput = document.getElementById('inputPhone');
    const shopNameInput = document.getElementById('inputShopName');

    const phone = phoneInput ? phoneInput.value.trim() : '';
    const shopName = shopNameInput ? shopNameInput.value.trim() : '';

    if (phone.length !== 10) return alert("Please enter a valid 10-digit mobile number.");
    if (state.role === 'shopkeeper' && !shopName) return alert("Please enter your shop name.");

    state.user = { phone, role: state.role, shopName };
    localStorage.setItem('user_session', JSON.stringify(state.user));

    try {
        if (window.backend && typeof window.backend.saveUser === 'function') {
            await window.backend.saveUser(phone, state.role, shopName, state.location.lat, state.location.lng);
        }
    } catch (err) {
        console.warn("Backend sync skipped:", err);
    }

    // Hide login screen & show app view
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (authScreen) authScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
};

// Geolocation initialization
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            state.location.lat = pos.coords.latitude;
            state.location.lng = pos.coords.longitude;
        },
        (err) => console.warn("Geolocation permission denied or unavailable.")
    );
}