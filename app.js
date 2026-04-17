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
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Sort chronologically
    const sorted = trips.sort((a, b) => new Date(a.entry) - new Date(b.entry));
    window.allTrips = sorted;

    let currentTrip = null; // A trip Matt is currently on
    let nextTrip = null;    // The very next trip on the horizon
    let daysUsed90 = 0;
    
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 179);

    sorted.forEach(t => {
        const entryDate = new Date(t.entry + 'T12:00:00');
        const exitDate = new Date(t.exit + 'T12:00:00');

        // Current Stay Logic
        if (todayStr >= t.entry && todayStr <= t.exit) {
            currentTrip = t;
        } 
        // Find next future trip
        else if (entryDate > now && !nextTrip) {
            nextTrip = t;
        }

        // Standard Schengen Math (For the Gauge only)
        if (exitDate >= windowStart) {
            const start = entryDate < windowStart ? windowStart : entryDate;
            const diff = Math.ceil(Math.abs(exitDate - start) / (1000 * 60 * 60 * 24)) + 1;
            daysUsed90 += diff;
        }
    });

    return {
        remaining: Math.max(0, 90 - daysUsed90),
        inSpain: !!currentTrip,
        currentTrip,
        nextTrip,
        todayStr,
        tomorrowStr
    };
}

function getMattMoodImage(status) {
    const { inSpain, currentTrip, nextTrip, todayStr, tomorrowStr } = status;

    // 1. TRAVEL DAYS (The crossing images)
    // Going to Spain today
    if (nextTrip && todayStr === nextTrip.entry) return "assets/uk-sp.jpg";
    // Leaving Spain today
    if (currentTrip && todayStr === currentTrip.exit) return "assets/sp-uk.jpg";

    // 2. THE DAY BEFORE (Anticipation images)
    // Tomorrow he goes to Spain
    if (nextTrip && tomorrowStr === nextTrip.entry) return "assets/uk4.jpg";
    // Tomorrow he leaves Spain
    if (currentTrip && tomorrowStr === currentTrip.exit) return "assets/sp4.jpg";

    // 3. PROGRESSION DURING A STAY (1, 2, 3)
    if (currentTrip) {
        const start = new Date(currentTrip.entry + 'T12:00:00');
        const end = new Date(currentTrip.exit + 'T12:00:00');
        const today = new Date(todayStr + 'T12:00:00');
        
        const totalDuration = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        const daysSpent = Math.ceil(Math.abs(today - start) / (1000 * 60 * 60 * 24)) + 1;
        const percent = (daysSpent / totalDuration) * 100;

        if (percent <= 33) return "assets/sp1.jpg";
        if (percent <= 66) return "assets/sp2.jpg";
        return "assets/sp3.jpg";
    }

    // 4. FALLBACK / UK TIME
    // If we have a next trip but we are still in the UK
    if (nextTrip) {
        // Here we could calculate how far away the next trip is to use uk1/2/3,
        // but per instructions: if no next trip date is "relevant" yet, use uk2.
        return "assets/uk2.jpg";
    }

    return "assets/uk2.jpg"; 
}

function updateUI(status) {
    const imgPath = getMattMoodImage(status);
    
    document.body.style.backgroundImage = `url('${imgPath}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";
    document.body.style.backgroundAttachment = "fixed";

    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');

    if (countEl) countEl.innerText = status.remaining;
    if (msgEl) {
        msgEl.innerText = status.inSpain ? "Matt is currently in Spain!" : "Matt is currently in the UK.";
    }

    if (gauge) {
        const circumference = 251.2;
        const offset = circumference - (status.remaining / 90) * circumference;
        gauge.style.strokeDashoffset = offset;
    }
}

window.onload = initializeApp;
