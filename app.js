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
    const engineStatus = SchengenEngine.calculateStatus(trips, now);
    const recovery = SchengenEngine.getNextIncrease(trips, now);

    let currentTrip = trips.find(t => todayStr >= t.entry && todayStr <= t.exit);
    
    return { 
        remaining: engineStatus.remaining, 
        recovery, 
        inSpain: !!currentTrip, 
        currentTrip, 
        todayStr 
    };
}

function updateUI(status) {
    // Set background via JS to ensure it updates with mood
    const img = getMattMoodImage(status);
    document.body.style.backgroundImage = `url('${img}')`;

    document.getElementById('days-count').innerText = status.remaining;
    
    const msgEl = document.getElementById('status-message');
    const isTravel = status.currentTrip && (status.todayStr === status.currentTrip.entry || status.todayStr === status.currentTrip.exit);
    msgEl.innerText = isTravel ? "Travel Day!" : (status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.");

    const gauge = document.getElementById('gauge-progress');
    const circ = 408.4;
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

function getMattMoodImage(status) {
    // Default mood logic
    if (status.inSpain) return "assets/sp2.jpg"; 
    return "assets/uk2.jpg";
}

window.onload = initializeApp;
