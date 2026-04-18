const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
window.db = db;

// Utility: Format YYYY-MM-DD to DD-MM-YYYY
function formatUKDate(dateStr) {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
}

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

    // Sort for the UI and global use
    const sorted = trips.sort((a, b) => new Date(a.entry) - new Date(b.entry));
    window.allTrips = sorted;

    // Use Engine for core numbers
    const engineStatus = SchengenEngine.calculateStatus(sorted, now);
    const recovery = SchengenEngine.getNextIncrease(sorted, now);

    // Identify current and next trips for mood logic
    let currentTrip = null; 
    let nextTrip = null;    

    sorted.forEach(t => {
        if (todayStr >= t.entry && todayStr <= t.exit) {
            currentTrip = t;
        } 
        else if (new Date(t.entry + 'T12:00:00') > now && !nextTrip) {
            nextTrip = t;
        }
    });

    return {
        remaining: engineStatus.remaining,
        recovery: recovery, // { days, date }
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

    if (currentTrip && todayStr === currentTrip.entry) return "assets/uk-sp.jpg";
    if (currentTrip && todayStr === currentTrip.exit) return "assets/sp-uk.jpg";
    if (nextTrip && todayStr === nextTrip.entry) return "assets/uk-sp.jpg";

    if (nextTrip && tomorrowStr === nextTrip.entry) return "assets/uk4.jpg";
    if (currentTrip && tomorrowStr === currentTrip.exit) return "assets/sp4.jpg";

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

    return "assets/uk2.jpg"; 
}

function updateUI(status) {
    const imgPath = getMattMoodImage(status);
    
    document.body.style.backgroundImage = `url('${imgPath}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center center";
    document.body.style.backgroundAttachment = "fixed";

    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');
    const recoveryEl = document.getElementById('recovery-tagline');

    if (countEl) countEl.innerText = status.remaining;
    if (msgEl) msgEl.innerText = status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.";
    
    if (gauge) {
        const circumference = 251.2;
        const offset = circumference - (status.remaining / 90) * circumference;
        gauge.style.strokeDashoffset = offset;
    }

    // Handle the new Recovery Tagline
    if (recoveryEl) {
        if (status.recovery && status.remaining < 90) {
            const formattedDate = formatUKDate(status.recovery.date);
            recoveryEl.innerText = `${status.recovery.days} days to be added beginning ${formattedDate}`;
        } else {
            recoveryEl.innerText = ""; // Hide if allowance is full
        }
    }
}

window.onload = initializeApp;
