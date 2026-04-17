const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
window.db = db;

// Standard Calculation (Today)
function calculateStatus(trips, targetDate = new Date()) {
    targetDate.setHours(12, 0, 0, 0);
    const targetStr = targetDate.toISOString().split('T')[0];
    const windowStart = new Date(targetDate);
    windowStart.setDate(windowStart.getDate() - 179);
    
    let daysUsed = 0;
    let inSpain = false;

    trips.forEach(t => {
        const entry = new Date(t.entry + 'T12:00:00');
        const exit = new Date(t.exit + 'T12:00:00');
        if (targetStr >= t.entry && targetStr <= t.exit) inSpain = true;
        if (exit >= windowStart) {
            const actualStart = entry < windowStart ? windowStart : entry;
            const diffDays = Math.ceil(Math.abs(exit - actualStart) / (1000 * 60 * 60 * 24)) + 1;
            daysUsed += diffDays;
        }
    });
    return { remaining: Math.max(0, 90 - daysUsed), inSpain: inSpain };
}

// Logic to find when the next day "drops off" the 180-day window
function getNextRecovery(trips) {
    const today = new Date();
    today.setHours(12,0,0,0);
    // Sort trips to find the oldest relevant one
    const relevantTrips = trips.filter(t => {
        const exit = new Date(t.exit + 'T12:00:00');
        return exit > new Date(today.getTime() - (180 * 24 * 60 * 60 * 1000));
    }).sort((a,b) => new Date(a.entry) - new Date(b.entry));

    if (relevantTrips.length === 0) return null;
    const oldestEntry = new Date(relevantTrips[0].entry + 'T12:00:00');
    const recoveryDate = new Date(oldestEntry.getTime() + (180 * 24 * 60 * 60 * 1000));
    return recoveryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function updateUI(status) {
    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');
    if (countEl) countEl.innerText = status.remaining;
    if (msgEl) msgEl.innerText = status.inSpain ? "You are currently in Spain" : "You are currently in the UK";
    if (gauge) {
        const offset = 251.2 - (status.remaining / 90) * 251.2;
        gauge.style.strokeDashoffset = offset;
    }
    // Update background
    const img = status.inSpain ? "assets/sp1.jpg" : "assets/uk1.jpg";
    document.body.style.backgroundImage = `url('${img}')`;
}

window.onload = () => {
    db.ref('trips').on('value', snap => {
        const trips = [];
        snap.forEach(c => trips.push(c.val()));
        window.allTrips = trips; // Store for other pages
        updateUI(calculateStatus(trips));
    });
};
