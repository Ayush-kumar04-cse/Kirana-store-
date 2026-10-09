import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    doc, 
    setDoc, 
    updateDoc, 
    onSnapshot, 
    query, 
    where, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

let db = null;

// Initialize Firebase safely without breaking JavaScript if keys are missing
try {
    if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
    } else {
        console.warn("Firebase running in offline/placeholder mode.");
    }
} catch (err) {
    console.error("Firebase initialization failed:", err);
}

// Always attach backend object so button clicks in app.js never fail
window.backend = {
    db,
    saveUser: async (phone, role, shopName = "", lat = 0, lng = 0) => {
        if (!db) return;
        const userRef = doc(db, "users", phone);
        await setDoc(userRef, { phone, role, shopName, lat, lng, createdAt: serverTimestamp() }, { merge: true });
    },
    listenShops: (callback) => {
        if (!db) return () => {};
        const q = query(collection(db, "users"), where("role", "==", "shopkeeper"));
        return onSnapshot(q, (snap) => {
            const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(shops);
        });
    },
    listenInventory: (shopPhone, callback) => {
        if (!db) return () => {};
        return onSnapshot(collection(db, "users", shopPhone, "inventory"), (snap) => {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(items);
        });
    },
    addItem: async (shopPhone, item) => {
        if (!db) return;
        await addDoc(collection(db, "users", shopPhone, "inventory"), item);
    },
    toggleStock: async (shopPhone, itemId, status) => {
        if (!db) return;
        await updateDoc(doc(db, "users", shopPhone, "inventory", itemId), { inStock: status });
    },
    placeOrder: async (orderData) => {
        if (!db) return;
        await addDoc(collection(db, "orders"), { ...orderData, status: "RECEIVED", createdAt: serverTimestamp() });
    },
    listenShopOrders: (shopPhone, callback) => {
        if (!db) return () => {};
        const q = query(collection(db, "orders"), where("shopPhone", "==", shopPhone));
        return onSnapshot(q, (snap) => {
            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(orders);
        });
    },
    updateOrderStatus: async (orderId, newStatus) => {
        if (!db) return;
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    }
};