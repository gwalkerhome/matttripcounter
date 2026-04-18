const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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
            if (data.entry && data.exit) trips.push(data); 
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
    const engineStatus = SchengenEngine.calculateStatus(sorted, now);
    const recovery = SchengenEngine.getNextIncrease(sorted, now);

    let currentTrip = sorted.find(t => todayStr >= t.entry && todayStr <= t.exit);
    let nextTrip = sorted.find(t => new Date(t.entry + 'T12:00:00') > now);

    return { remaining: engineStatus.remaining, recovery, inSpain: !!currentTrip, currentTrip, nextTrip, todayStr, tomorrowStr };
}

function getMattMoodImage(status) {
    const { inSpain, currentTrip, nextTrip, todayStr, tomorrowStr } = status;
    
    // Priority 1: Travel Day Today
    if (currentTrip && todayStr === currentTrip.exit) return "assets/sp-uk.jpg";
    if (currentTrip && todayStr === currentTrip.entry) return "assets/uk-sp.jpg";
    if (nextTrip && todayStr === nextTrip.entry) return "assets/uk-sp.jpg";

    // Priority 2: Imminent travel tomorrow
    if (nextTrip && tomorrowStr === nextTrip.entry) return "assets/uk4.jpg";
    if (currentTrip && tomorrowStr === currentTrip.exit) return "assets/sp4.jpg";

    // Priority 3: General State
    const prefix = inSpain ? "sp" : "uk";
    if (currentTrip) {
        const start = new Date(currentTrip.entry + 'T12:00:00');
        const end = new Date(currentTrip.exit + 'T12:00:00');
        const today = new Date(todayStr + 'T12:00:00');
        const total = Math.ceil(Math.abs(end - start) / 86400000) + 1;
        const spent = Math.ceil(Math.abs(today - start) / 86400000) + 1;
        const percent = (spent / total) * 100;
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

    document.getElementById('days-count').innerText = status.remaining;
    
    const msgEl = document.getElementById('status-message');
    const isTravel = status.currentTrip && (status.todayStr === status.currentTrip.entry || status.todayStr === status.currentTrip.exit);
    msgEl.innerText = isTravel ? "Travel Day!" : (status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.");

    const gauge = document.getElementById('gauge-progress');
    const circ = 439.8; // Updated for larger radius
    gauge.style.strokeDashoffset = circ - (status.remaining / 90) * circ;
    
    if (status.remaining >= 50) gauge.style.stroke = "#22c55e"; 
    else if (status.remaining >= 20) gauge.style.stroke = "#f97316"; 
    else gauge.style.stroke = "#ef4444"; 

    const recoveryEl = document.getElementById('recovery-tagline');
    if (status.recovery && status.remaining < 90) {
        recoveryEl.innerHTML = `${status.recovery.days} DAYS TO BE ADDED <br> BEGINNING ${formatUKDate(status.recovery.date)}`;
    } else {
        recoveryEl.innerHTML = "";
    }
}
window.onload = initializeApp;
