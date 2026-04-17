const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
window.db = db;

function initializeApp() {
    db.ref('trips').on('value', (snapshot) => {
        const trips = [];
        snapshot.forEach(child => { trips.push({key: child.key, ...child.val()}); });
        const status = calculateStatus(trips);
        updateUI(status);
    });
}

function calculateStatus(trips) {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const todayStr = now.toISOString().split('T')[0];
    
    // Sort trips chronologically
    const sorted = trips.sort((a, b) => new Date(a.entry) - new Date(b.entry));
    window.allTrips = sorted;

    let currentTrip = null;
    let nextTrip = null;
    let daysUsed90 = 0;
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 179);

    sorted.forEach(t => {
        const entry = new Date(t.entry + 'T12:00:00');
        const exit = new Date(t.exit + 'T12:00:00');
        
        // 1. Identify where Matt is right now
        if (todayStr >= t.entry && todayStr <= t.exit) {
            currentTrip = t;
        } 
        // 2. Identify the very next trip in the future
        else if (entry > now && !nextTrip) {
            nextTrip = t;
        }

        // 3. Keep the Schengen 90-day math running in the background for the gauge
        if (exit >= windowStart) {
            const start = entry < windowStart ? windowStart : entry;
            const diff = Math.ceil(Math.abs(exit - start) / (1000 * 60 * 60 * 24)) + 1;
            daysUsed90 += diff;
        }
    });

    return {
        remaining: Math.max(0, 90 - daysUsed90),
        inSpain: !!currentTrip,
        currentTrip,
        nextTrip,
        todayStr
    };
}

function getMattMoodImage(status) {
    const { inSpain, currentTrip, nextTrip, todayStr } = status;
    const prefix = inSpain ? "sp" : "uk";
    
    // 1. TRAVEL DAY (sp-uk or uk-sp)
    if (currentTrip && todayStr === currentTrip.exit) {
        return inSpain ? "assets/sp-uk.jpg" : "assets/uk-sp.jpg";
    }

    // 2. DAY BEFORE TRAVEL (sp4 or uk4)
    if (nextTrip) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        if (tomorrowStr === nextTrip.entry) {
            return `${prefix}4.jpg`;
        }
    }

    // 3. PROGRESSION LOGIC (1, 2, or 3)
    if (currentTrip) {
        const start = new Date(currentTrip.entry + 'T12:00:00');
        const end = new Date(currentTrip.exit + 'T12:00:00');
        const today = new Date(todayStr + 'T12:00:00');
        
        const totalDuration = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        const daysIn = Math.ceil(Math.abs(today - start) / (1000 * 60 * 60 * 24)) + 1;
        const percent = (daysIn / totalDuration) * 100;

        if (percent <= 33) return `${prefix}1.jpg`;
        if (percent <= 66) return `${prefix}2.jpg`;
        return `${prefix}3.jpg`;
    }

    // 4. NO TRIP CURRENTLY SET (Default to mood 2)
    return `${prefix}2.jpg`;
}

function updateUI(status) {
    const imgName = getMattMoodImage(status);
    
    document.body.style.backgroundImage = `url('${imgName}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";

    // Standard UI Updates
    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');

    if (countEl) countEl.innerText = status.remaining;
    if (msgEl) msgEl.innerText = status.inSpain ? "Matt is currently in Spain!" : "Matt is currently in the UK.";

    if (gauge) {
        const circumference = 251.2;
        const offset = circumference - (status.remaining / 90) * circumference;
        gauge.style.strokeDashoffset = offset;
    }
}

window.onload = initializeApp;
