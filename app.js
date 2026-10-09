let state = {
    user: JSON.parse(localStorage.getItem('user_session')) || null,
    role: 'client',
    location: { lat: 28.6139, lng: 77.2090 },
    selectedShop: null,
    cart: []
};

function getUserGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                state.location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                document.getElementById('headerSub').innerText = `GPS Active: ${state.location.lat.toFixed(3)}, ${state.location.lng.toFixed(3)}`;
                if (state.user && state.user.role === 'client') loadNearbyShops();
            },
            () => {
                document.getElementById('headerSub').innerText = "Location permission denied. Showing default stores.";
            }
        );
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
}

function selectRole(r) {
    state.role = r;
    document.getElementById('btnRoleClient').className = r === 'client' ? 'py-2 border text-xs font-bold rounded-lg border-green-600 text-green-600 bg-green-50' : 'py-2 border text-xs font-bold text-gray-500 rounded-lg border-gray-200';
    document.getElementById('btnRoleShop').className = r === 'shopkeeper' ? 'py-2 border text-xs font-bold rounded-lg border-green-600 text-green-600 bg-green-50' : 'py-2 border text-xs font-bold text-gray-500 rounded-lg border-gray-200';
    document.getElementById('shopNameContainer').className = r === 'shopkeeper' ? 'block' : 'hidden';
}

async function loginUser() {
    const phone = document.getElementById('inputPhone').value.trim();
    const shopName = document.getElementById('inputShopName').value.trim();

    if (phone.length !== 10) return alert("Please enter a valid 10-digit mobile number.");
    if (state.role === 'shopkeeper' && !shopName) return alert("Please enter your shop name.");

    state.user = { phone, role: state.role, shopName };
    localStorage.setItem('user_session', JSON.stringify(state.user));

    if (window.backend) {
        await window.backend.saveUser(phone, state.role, shopName, state.location.lat, state.location.lng);
    }

    initApp();
}

function logout() {
    localStorage.removeItem('user_session');
    state.user = null;
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('mainScreen').classList.add('hidden');
}

function initApp() {
    if (!state.user) return;
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    getUserGPS();

    if (state.user.role === 'client') {
        document.getElementById('headerTitle').innerText = "Nearby Kirana Stores";
        loadNearbyShops();
    } else {
        document.getElementById('headerTitle').innerText = `Shopkeeper Portal (${state.user.shopName})`;
        loadShopkeeperDashboard();
    }
}

function loadNearbyShops() {
    const main = document.getElementById('viewArea');
    main.innerHTML = `<p class="text-xs text-center text-gray-500 py-6">Scanning nearby stores...</p>`;

    if (!window.backend) return;

    window.backend.listenShops((shops) => {
        if (shops.length === 0) {
            main.innerHTML = `<p class="text-xs text-center text-gray-500 py-6">No shopkeepers registered nearby yet.</p>`;
            return;
        }

        main.innerHTML = `
            <h3 class="text-xs font-bold text-gray-600 mb-3">Stores Near Your Location</h3>
            <div class="space-y-3">
                ${shops.map(s => {
                    const dist = calculateDistance(state.location.lat, state.location.lng, s.lat || 28.6139, s.lng || 77.2090);
                    return `
                        <div onclick="openStoreFront('${s.phone}', '${s.shopName}')" class="border p-3 rounded-lg bg-white shadow-sm hover:border-green-600 cursor-pointer flex justify-between items-center active-card">
                            <div>
                                <h4 class="font-bold text-sm text-gray-800">${s.shopName}</h4>
                                <p class="text-[11px] text-gray-500"><i class="fa-solid fa-location-dot text-red-500"></i> ${dist} km away</p>
                            </div>
                            <span class="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">View Store &rarr;</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    });
}

function openStoreFront(shopPhone, shopName) {
    state.selectedShop = { phone: shopPhone, name: shopName };
    const main = document.getElementById('viewArea');

    window.backend.listenInventory(shopPhone, (items) => {
        main.innerHTML = `
            <div class="flex items-center gap-2 mb-4 border-b pb-2">
                <button onclick="loadNearbyShops()" class="text-xs bg-gray-200 px-2 py-1 rounded">&larr; Back</button>
                <h3 class="font-bold text-sm text-gray-800">${shopName} Inventory</h3>
            </div>
            <div class="grid grid-cols-2 gap-3">
                ${items.map(i => `
                    <div class="border p-2 rounded bg-white shadow-sm flex flex-col justify-between">
                        <div>
                            <h4 class="font-bold text-xs">${i.name}</h4>
                            <p class="text-[10px] text-gray-500">₹${i.price} /${i.unit}</p>
                        </div>
                        <button onclick="addToCart('${i.name}', ${i.price})" ${!i.inStock ? 'disabled' : ''} class="mt-2 w-full bg-green-600 text-white text-xs py-1 rounded font-bold disabled:bg-gray-300">
                            ${i.inStock ? 'Add Item' : 'Out of Stock'}
                        </button>
                    </div>
                `).join('')}
            </div>
            <div class="mt-6 border-t pt-3">
                <button onclick="placeCustomerOrder()" class="w-full bg-green-700 text-white py-2 rounded text-xs font-bold shadow">
                    Place Order to Shopkeeper
                </button>
            </div>
        `;
    });
}

function addToCart(name, price) {
    state.cart.push({ name, price });
    alert(`${name} added to order list.`);
}

async function placeCustomerOrder() {
    if (state.cart.length === 0) return alert("Cart is empty!");
    const total = state.cart.reduce((s, i) => s + i.price, 0);

    await window.backend.placeOrder({
        shopPhone: state.selectedShop.phone,
        clientPhone: state.user.phone,
        items: state.cart,
        totalAmount: total
    });

    alert("Order sent to shopkeeper successfully!");
    state.cart = [];
    loadNearbyShops();
}

function loadShopkeeperDashboard() {
    const main = document.getElementById('viewArea');
    
    window.backend.listenShopOrders(state.user.phone, (orders) => {
        main.innerHTML = `
            <div class="bg-gray-50 p-3 rounded-lg border mb-4">
                <h3 class="font-bold text-xs text-gray-700 mb-2">Add Product to Your Store</h3>
                <div class="space-y-2">
                    <input id="pName" type="text" placeholder="Item Name" class="w-full p-2 border text-xs rounded">
                    <input id="pPrice" type="number" placeholder="Price (₹)" class="w-full p-2 border text-xs rounded">
                    <input id="pUnit" type="text" placeholder="Unit (e.g. 1 kg)" class="w-full p-2 border text-xs rounded">
                    <button onclick="addShopItem()" class="w-full bg-blue-600 text-white text-xs py-2 rounded font-bold">Add to Live Store</button>
                </div>
            </div>

            <h3 class="font-bold text-xs text-gray-700 mb-2">Incoming Client Orders (${orders.length})</h3>
            <div class="space-y-3">
                ${orders.map(o => `
                    <div class="border p-3 rounded-lg bg-white shadow-sm space-y-2">
                        <div class="flex justify-between items-center border-b pb-1">
                            <span class="text-xs font-bold text-gray-800">Client: +91 ${o.clientPhone}</span>
                            <span class="text-[10px] px-2 py-0.5 rounded font-bold ${o.status === 'READY' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}">${o.status}</span>
                        </div>
                        <div class="text-xs text-gray-600">
                            Total Amount: <span class="font-bold text-green-700">₹${o.totalAmount}</span>
                        </div>
                        <div class="flex gap-2 pt-1">
                            <a href="tel:+91${o.clientPhone}" class="flex-1 text-center bg-blue-600 text-white py-1.5 rounded text-xs font-bold hover:bg-blue-700">
                                <i class="fa-solid fa-phone"></i> Call Client
                            </a>
                            <button onclick="sendPickupNotification('${o.id}')" class="flex-1 bg-green-600 text-white py-1.5 rounded text-xs font-bold hover:bg-green-700">
                                <i class="fa-solid fa-bell"></i> Notify Ready
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    });
}

async function addShopItem() {
    const name = document.getElementById('pName').value;
    const price = parseFloat(document.getElementById('pPrice').value);
    const unit = document.getElementById('pUnit').value;

    if(!name || isNaN(price)) return alert("Please fill out item details.");
    await window.backend.addItem(state.user.phone, { name, price, unit, inStock: true });
    alert("Item added to live customer view.");
}

async function sendPickupNotification(orderId) {
    await window.backend.updateOrderStatus(orderId, "READY");
    alert("Notification sent: Customer alerted that order is ready for collection!");
}

window.addEventListener('DOMContentLoaded', () => {
    if (state.user) initApp();
});