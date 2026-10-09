window.state = {
    role: 'client',
    user: null,
    location: { lat: 0, lng: 0 }
};

window.setRole = function(role) {
    window.state.role = role;
    
    const clientBtn = document.getElementById('btnRoleClient');
    const shopBtn = document.getElementById('btnRoleShopkeeper');
    const shopNameContainer = document.getElementById('shopNameContainer');

    if (role === 'shopkeeper') {
        if (shopNameContainer) shopNameContainer.classList.remove('hidden');
        if (shopBtn) shopBtn.className = "flex-1 py-2 text-center text-sm font-semibold rounded-md bg-indigo-600 text-white transition";
        if (clientBtn) clientBtn.className = "flex-1 py-2 text-center text-sm font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition";
    } else {
        if (shopNameContainer) shopNameContainer.classList.add('hidden');
        if (clientBtn) clientBtn.className = "flex-1 py-2 text-center text-sm font-semibold rounded-md bg-indigo-600 text-white transition";
        if (shopBtn) shopBtn.className = "flex-1 py-2 text-center text-sm font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition";
    }
};

window.loginUser = async function() {
    const phoneInput = document.getElementById('inputPhone');
    const shopNameInput = document.getElementById('inputShopName');

    const phone = phoneInput ? phoneInput.value.trim() : '';
    const shopName = shopNameInput ? shopNameInput.value.trim() : '';

    if (phone.length !== 10) return alert("Please enter a valid 10-digit mobile number.");
    if (window.state.role === 'shopkeeper' && !shopName) return alert("Please enter your shop name.");

    window.state.user = { phone, role: window.state.role, shopName };
    localStorage.setItem('user_session', JSON.stringify(window.state.user));

    try {
        if (window.backend && typeof window.backend.saveUser === 'function') {
            await window.backend.saveUser(phone, window.state.role, shopName, window.state.location.lat, window.state.location.lng);
        }
    } catch (err) {
        console.warn("Backend sync skipped:", err);
    }

    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (authScreen) authScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');

    const appHeaderTitle = document.getElementById('appHeaderTitle');
    if (appHeaderTitle) {
        appHeaderTitle.textContent = window.state.role === 'shopkeeper' ? shopName : 'Client Dashboard';
    }
};

window.logout = function() {
    localStorage.removeItem('user_session');
    window.state.user = null;
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    if (mainApp) mainApp.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');
};

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            window.state.location.lat = pos.coords.latitude;
            window.state.location.lng = pos.coords.longitude;
        },
        (err) => console.warn("Geolocation skipped or denied.")
    );
}