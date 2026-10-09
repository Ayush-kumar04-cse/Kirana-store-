\window.state = {
    role: 'client',
    user: null,
    location: { lat: 0, lng: 0 },
    inventory: [],
    shops: []
};

// Calculate distance between two coordinates in km
function getDistanceKm(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
}

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

    // Switch views
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (authScreen) authScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');

    const appHeaderTitle = document.getElementById('appHeaderTitle');
    if (appHeaderTitle) {
        appHeaderTitle.textContent = window.state.role === 'shopkeeper' ? shopName : 'Nearby Kirana Stores';
    }

    renderDashboard();
};

window.logout = function() {
    localStorage.removeItem('user_session');
    window.state.user = null;
    const authScreen = document.getElementById('authScreen');
    const mainApp = document.getElementById('mainApp');
    if (mainApp) mainApp.classList.add('hidden');
    if (authScreen) authScreen.classList.remove('hidden');
};

function renderDashboard() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;

    if (window.state.role === 'shopkeeper') {
        renderShopkeeperDashboard(container);
    } else {
        renderClientDashboard(container);
    }
}

function renderShopkeeperDashboard(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="border-b pb-3">
                <h3 class="text-lg font-bold text-gray-800">Shopkeeper Controls</h3>
                <p class="text-xs text-gray-500">Manage items & stock availability</p>
            </div>

            <!-- Add Item Form -->
            <div class="bg-indigo-50 p-3 rounded-lg space-y-2">
                <h4 class="text-xs font-bold text-indigo-700 uppercase">Add New Item</h4>
                <input id="itemName" type="text" placeholder="Item Name (e.g., Aloo, Milk)" class="w-full px-3 py-1.5 text-sm border rounded">
                <input id="itemPrice" type="number" placeholder="Price (₹)" class="w-full px-3 py-1.5 text-sm border rounded">
                <button onclick="addInventoryItem()" class="w-full bg-indigo-600 text-white py-1.5 rounded text-sm font-semibold hover:bg-indigo-700">Add Item</button>
            </div>

            <!-- Inventory List -->
            <div>
                <h4 class="text-sm font-bold text-gray-700 mb-2">Current Inventory</h4>
                <div id="inventoryList" class="space-y-2">
                    ${window.state.inventory.length === 0 ? '<p class="text-xs text-gray-500">No items added yet.</p>' : ''}
                </div>
            </div>
        </div>
    `;
}

function renderClientDashboard(container) {
    container.innerHTML = `
        <div class="space-y-4">
            <div class="border-b pb-3">
                <h3 class="text-lg font-bold text-gray-800">Nearby Kirana Shops</h3>
                <p class="text-xs text-gray-500">Discover shops around your location</p>
            </div>

            <div id="shopList" class="space-y-3">
                <div class="p-3 border rounded-lg bg-gray-50 text-center">
                    <p class="text-sm text-gray-600 font-medium">Searching nearby stores...</p>
                    <p class="text-xs text-gray-400 mt-1">If no remote shops appear, mock stores will load below.</p>
                </div>
            </div>
        </div>
    `;

    // Load shops
    if (window.backend && typeof window.backend.listenShops === 'function') {
        window.backend.listenShops((shops) => {
            renderShopList(shops);
        });
    } else {
        // Fallback demo shops if Firebase isn't connected
        renderShopList([
            { id: '1', shopName: 'Sharma General Store', phone: '9876543210', lat: window.state.location.lat + 0.005, lng: window.state.location.lng + 0.005 },
            { id: '2', shopName: 'Verma Kirana & Provisions', phone: '9123456789', lat: window.state.location.lat - 0.003, lng: window.state.location.lng - 0.002 }
        ]);
    }
}

function renderShopList(shops) {
    const listEl = document.getElementById('shopList');
    if (!listEl) return;

    if (shops.length === 0) {
        listEl.innerHTML = `<p class="text-xs text-gray-500 text-center">No shops registered nearby yet.</p>`;
        return;
    }

    listEl.innerHTML = shops.map(shop => {
        const dist = getDistanceKm(window.state.location.lat, window.state.location.lng, shop.lat, shop.lng);
        return `
            <div class="p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm hover:border-indigo-300">
                <div>
                    <h4 class="font-bold text-sm text-gray-800">${shop.shopName || 'Kirana Shop'}</h4>
                    <p class="text-xs text-gray-500"><i class="fa-solid font-bold text-indigo-500">📍</i> ${dist} km away</p>
                </div>
                <a href="tel:${shop.phone}" class="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-green-700">
                    📞 Call Shop
                </a>
            </div>
        `;
    }).join('');
}

window.addInventoryItem = function() {
    const nameEl = document.getElementById('itemName');
    const priceEl = document.getElementById('itemPrice');
    
    if (!nameEl || !priceEl) return;
    const name = nameEl.value.trim();
    const price = priceEl.value.trim();

    if (!name || !price) return alert("Please fill in item name and price.");

    const newItem = { id: Date.now().toString(), name, price: Number(price), inStock: true };
    window.state.inventory.push(newItem);

    nameEl.value = '';
    priceEl.value = '';

    const listEl = document.getElementById('inventoryList');
    if (listEl) {
        listEl.innerHTML = window.state.inventory.map(item => `
            <div class="flex justify-between items-center p-2 border rounded text-xs bg-white">
                <span class="font-semibold text-gray-700">${item.name} - ₹${item.price}</span>
                <span class="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">In Stock</span>
            </div>
        `).join('');
    }
};

// Initialize location
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            window.state.location.lat = pos.coords.latitude;
            window.state.location.lng = pos.coords.longitude;
        },
        (err) => console.warn("Geolocation permission denied/unavailable.")
    );
}