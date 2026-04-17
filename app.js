const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
window.db = db;

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
    today.setHours(12, 0, 0, 0); // Set to Noon for stability
    const todayStr = today.toISOString().split('T')[0];
    
    let daysUsed = 0;
    let inSpain = false;
    
    // 180-day window
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 179);

    trips.forEach(t => {
        // Force Noon to prevent day-slip
        const entry = new Date(t.entry + 'T12:00:00');
        const exit = new Date(t.exit + 'T12:00:00');

        if (todayStr >= t.entry && todayStr <= t.exit) inSpain = true;

        if (exit >= windowStart) {
            const actualStart = entry < windowStart ? windowStart : entry;
            const diffTime = Math.abs(exit - actualStart);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            daysUsed += diffDays;
        }
    });
    return { remaining: Math.max(0, 90 - daysUsed), inSpain: inSpain };
}

function updateUI(status) {
    const img = status.inSpain ? "assets/sp1.jpg" : "assets/uk1.jpg";
    document.body.style.backgroundImage = `url('${img}')`;

    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');

    if (countEl) countEl.innerText = status.remaining;
    if (msgEl) msgEl.innerText = status.inSpain ? "You are currently in Spain" : "You are currently in the UK";

    if (gauge) {
        const circumference = 251.2;
        const offset = circumference - (status.remaining / 90) * circumference;
        gauge.style.strokeDashoffset = offset;
    }
}
window.onload = initializeApp;
