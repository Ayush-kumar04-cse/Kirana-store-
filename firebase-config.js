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

// Your Firebase Configuration (Replace placeholders with your Firebase keys)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

window.backend = {
    db,
    saveUser: async (phone, role, shopName = "", lat = 0, lng = 0) => {
        const userRef = doc(db, "users", phone);
        await setDoc(userRef, { phone, role, shopName, lat, lng, createdAt: serverTimestamp() }, { merge: true });
    },
    listenShops: (callback) => {
        const q = query(collection(db, "users"), where("role", "==", "shopkeeper"));
        return onSnapshot(q, (snap) => {
            const shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(shops);
        });
    },
    listenInventory: (shopPhone, callback) => {
        return onSnapshot(collection(db, "users", shopPhone, "inventory"), (snap) => {
            const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(items);
        });
    },
    addItem: async (shopPhone, item) => {
        await addDoc(collection(db, "users", shopPhone, "inventory"), item);
    },
    toggleStock: async (shopPhone, itemId, status) => {
        await updateDoc(doc(db, "users", shopPhone, "inventory", itemId), { inStock: status });
    },
    placeOrder: async (orderData) => {
        await addDoc(collection(db, "orders"), { ...orderData, status: "RECEIVED", createdAt: serverTimestamp() });
    },
    listenShopOrders: (shopPhone, callback) => {
        const q = query(collection(db, "orders"), where("shopPhone", "==", shopPhone));
        return onSnapshot(q, (snap) => {
            const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            callback(orders);
        });
    },
    updateOrderStatus: async (orderId, newStatus) => {
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
    }
};