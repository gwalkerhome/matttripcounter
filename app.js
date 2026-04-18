const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
window.db = db;

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
            if (data.entry && data.exit) trips.push({key: child.key, ...data}); 
        });
        const status = calculateStatus(trips);
        updateUI(status);
    });
}

function calculateStatus(trips) {
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const todayStr = now.toISOString().split('T')[0];
    const sorted = trips.sort((a, b) => new Date(a.entry) - new Date(b.entry));
    
    const engineStatus = SchengenEngine.calculateStatus(sorted, now);
    const recovery = SchengenEngine.getNextIncrease(sorted, now);

    let currentTrip = null; 
    sorted.forEach(t => {
        if (todayStr >= t.entry && todayStr <= t.exit) currentTrip = t;
    });

    return {
        remaining: engineStatus.remaining,
        recovery: recovery,
        inSpain: !!currentTrip,
        currentTrip: currentTrip,
        todayStr: todayStr
    };
}

function updateUI(status) {
    // 1. Background Image Logic
    // (Note: getMattMoodImage function remains the same as your previous version)
    const imgPath = getMattMoodImage(status); 
    document.body.style.backgroundImage = `url('${imgPath}')`;

    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');
    const recoveryEl = document.getElementById('recovery-tagline');

    // 2. Numeric Counter
    if (countEl) countEl.innerText = status.remaining;

    // 3. Travel Day & Status Message
    if (msgEl) {
        const isTravelDay = status.currentTrip && (status.todayStr === status.currentTrip.entry || status.todayStr === status.currentTrip.exit);
        if (isTravelDay) {
            msgEl.innerText = "Travel Day!";
        } else {
            msgEl.innerText = status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.";
        }
    }
    
    // 4. Gauge Color & Progress
    if (gauge) {
        const circumference = 345.5; 
        const offset = circumference - (status.remaining / 90) * circumference;
        gauge.style.strokeDashoffset = offset;

        // Traffic Light Logic
        if (status.remaining >= 50) gauge.style.stroke = "#22c55e"; // Green
        else if (status.remaining >= 20) gauge.style.stroke = "#f97316"; // Orange
        else gauge.style.stroke = "#ef4444"; // Red
    }

    // 5. Recovery Text with Line Break
    if (recoveryEl) {
        if (status.recovery && status.remaining < 90) {
            const date = formatUKDate(status.recovery.date);
            recoveryEl.innerHTML = `${status.recovery.days} DAYS TO BE ADDED <br> BEGINNING ${date}`;
        } else {
            recoveryEl.innerHTML = "";
        }
    }
}

window.onload = initializeApp;
