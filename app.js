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
        snapshot.forEach(child => { 
            const data = child.val();
            if (data.entry && data.exit) {
                trips.push({key: child.key, ...data}); 
            }
        });
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

    const sorted = trips.sort((a, b) => new Date(a.entry) - new Date(b.entry));
    window.allTrips = sorted;

    let currentTrip = null; 
    let nextTrip = null;    
    let daysUsed90 = 0;
    
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - 179);

    sorted.forEach(t => {
        const entryDate = new Date(t.entry + 'T12:00:00');
        const exitDate = new Date(t.exit + 'T12:00:00');

        if (todayStr >= t.entry && todayStr <= t.exit) {
            currentTrip = t;
        } 
        else if (entryDate > now && !nextTrip) {
            nextTrip = t;
        }

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
    const prefix = inSpain ? "sp" : "uk";

    // 1. TRAVEL DAYS (Prioritized)
    // Arrival in Spain TODAY
    if (currentTrip && todayStr === currentTrip.entry) return "assets/uk-sp.jpg";
    // Departure from Spain TODAY
    if (currentTrip && todayStr === currentTrip.exit) return "assets/sp-uk.jpg";
    // Arrival in Spain TODAY (if not yet marked as current)
    if (nextTrip && todayStr === nextTrip.entry) return "assets/uk-sp.jpg";

    // 2. THE DAY BEFORE (Anticipation)
    if (nextTrip && tomorrowStr === nextTrip.entry) return "assets/uk4.jpg";
    if (currentTrip && tomorrowStr === currentTrip.exit) return "assets/sp4.jpg";

    // 3. PROGRESSION (1, 2, 3)
    if (currentTrip) {
        const start = new Date(currentTrip.entry + 'T12:00:00');
        const end = new Date(currentTrip.exit + 'T12:00:00');
        const today = new Date(todayStr + 'T12:00:00');
        
        const totalDuration = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
        const daysSpent = Math.ceil(Math.abs(today - start) / (1000 * 60 * 60 * 24)) + 1;
        const percent = (daysSpent / totalDuration) * 100;

        if (percent <= 33) return `assets/${prefix}1.jpg`;
        if (percent <= 66) return `assets/${prefix}2.jpg`;
        return `assets/${prefix}3.jpg`;
    }

    // 4. FALLBACK (UK Default)
    return "assets/uk2.jpg"; 
}

function updateUI(status) {
    const imgPath = getMattMoodImage(status);
    
    // This part sets the background for WHATEVER page you are on
    document.body.style.backgroundImage = `url('${imgPath}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center center";
    document.body.style.backgroundAttachment = "fixed";

    // This part only updates the numbers/gauge IF they exist on the page
    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');

    if (countEl) countEl.innerText = status.remaining;
    if (msgEl) msgEl.innerText = status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.";
    if (gauge) {
        const circumference = 251.2;
        const offset = circumference - (status.remaining / 90) * circumference;
        gauge.style.strokeDashoffset = offset;
    }
}


window.onload = initializeApp;
