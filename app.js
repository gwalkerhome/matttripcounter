const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

// Singleton initialization
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
window.db = db; // Export for other pages

function initializeApp() {
    db.ref('trips').on('value', (snapshot) => {
        const trips = [];
        snapshot.forEach(child => { trips.push(child.val()); });
        const status = calculateStatus(trips);
        updateUI(status);
    });
}

function calculateStatus(trips) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    
    let daysUsed = 0;
    let inSpain = false;
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 180);

    trips.forEach(t => {
        if (todayStr >= t.entry && todayStr <= t.exit) inSpain = true;
        const entry = new Date(t.entry);
        const exit = new Date(t.exit);
        if (exit >= windowStart) {
            const start = entry < windowStart ? windowStart : entry;
            const diff = Math.ceil(Math.abs(exit - start) / (1000 * 60 * 60 * 24)) + 1;
            daysUsed += diff;
        }
    });
    return { remaining: Math.max(0, 90 - daysUsed), inSpain: inSpain };
}

function updateUI(status) {
    // 1. Background (using assets folder)
    const img = status.inSpain ? "assets/sp1.jpg" : "assets/uk1.jpg";
    document.body.style.backgroundImage = `url('${img}')`;
    document.body.style.backgroundSize = "cover";

    // 2. ID Match for Index.html
    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');

    if (countEl) countEl.innerText = status.remaining;
    if (msgEl) msgEl.innerText = status.inSpain ? "Matt is currently in Spain!" : "Matt is currently in the UK.";

    // 3. Gauge Animation (SVG circle)
    if (gauge) {
        const circumference = 251.2;
        const offset = circumference - (status.remaining / 90) * circumference;
        gauge.style.strokeDashoffset = offset;
    }
}
window.onload = initializeApp;
