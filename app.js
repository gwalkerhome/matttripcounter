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
    const relevantTrips = trips.filter(t => {
        const exit = new Date(t.exit + 'T12:00:00');
        return exit > new Date(today.getTime() - (180 * 24 * 60 * 60 * 1000));
    }).sort((a,b) => new Date(a.entry) - new Date(b.entry));

    if (relevantTrips.length === 0) return null;
    const oldestEntry = new Date(relevantTrips[0].entry + 'T12:00:00');
    const recoveryDate = new Date(oldestEntry.getTime() + (180 * 24 * 60 * 60 * 1000));
    return recoveryDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

// Background image logic
function getBackgroundImage(trips) {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Sort trips chronologically
    const sorted = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));

    // Find current trip (Matt is in Spain today)
    const currentTrip = sorted.find(t => todayStr >= t.entry && todayStr <= t.exit);

    // Find next future trip
    const nextTrip = sorted.find(t => t.entry > todayStr);

    // Find most recent past trip
    const pastTrips = sorted.filter(t => t.exit < todayStr);
    const lastTrip = pastTrips.length > 0 ? pastTrips[pastTrips.length - 1] : null;

    // Day of travel - Spain to UK
    if (currentTrip && currentTrip.exit === todayStr) return 'assets/sp-uk.jpg';

    // Day of travel - UK to Spain
    if (nextTrip && nextTrip.entry === todayStr) return 'assets/uk-sp.jpg';

    // Currently in Spain
    if (currentTrip) {
        const entry = new Date(currentTrip.entry + 'T12:00:00');
        const exit = new Date(currentTrip.exit + 'T12:00:00');
        const totalDays = Math.ceil((exit - entry) / (1000 * 60 * 60 * 24));
        const daysSoFar = Math.ceil((today - entry) / (1000 * 60 * 60 * 24));

        // Day before leaving Spain
        const dayBefore = new Date(exit);
        dayBefore.setDate(dayBefore.getDate() - 1);
        if (today.toISOString().split('T')[0] === dayBefore.toISOString().split('T')[0]) return 'assets/sp4.jpg';

        const pct = totalDays > 0 ? (daysSoFar / totalDays) * 100 : 0;
        if (pct <= 33) return 'assets/sp1.jpg';
        if (pct <= 66) return 'assets/sp2.jpg';
        return 'assets/sp3.jpg';
    }

    // Currently in UK - work out UK stay start and end
    const ukStart = lastTrip ? new Date(lastTrip.exit + 'T12:00:00') : null;
    const ukEnd = nextTrip ? new Date(nextTrip.entry + 'T12:00:00') : null;

    // Day before flying to Spain
    if (ukEnd) {
        const dayBefore = new Date(ukEnd);
        dayBefore.setDate(dayBefore.getDate() - 1);
        if (todayStr === dayBefore.toISOString().split('T')[0]) return 'assets/uk4.jpg';
    }

    // No next trip planned - default to uk2
    if (!ukEnd || !ukStart) return 'assets/uk2.jpg';

    const totalUkDays = Math.ceil((ukEnd - ukStart) / (1000 * 60 * 60 * 24));
    const ukDaysSoFar = Math.ceil((today - ukStart) / (1000 * 60 * 60 * 24));
    const pct = totalUkDays > 0 ? (ukDaysSoFar / totalUkDays) * 100 : 0;

    if (pct <= 33) return 'assets/uk1.jpg';
    if (pct <= 66) return 'assets/uk2.jpg';
    return 'assets/uk3.jpg';
}

function updateUI(status, trips) {
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
    const img = getBackgroundImage(trips);
    document.body.style.backgroundImage = `url('${img}')`;
}

window.onload = () => {
    db.ref('trips').on('value', snap => {
        const trips = [];
        snap.forEach(c => trips.push(c.val()));
        window.allTrips = trips;
        const status = calculateStatus(trips);
        updateUI(status, trips);
    });
};
