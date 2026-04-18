const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function updateUI(status) {
    // Determine Image
    let img = "assets/uk2.jpg";
    if (status.isTravelDay) {
        // Today is Sp-Uk day based on your description
        img = "assets/sp-uk.jpg"; 
    } else if (status.inSpain) {
        img = "assets/sp2.jpg";
    }

    document.body.style.backgroundImage = `url('${img}')`;
    document.getElementById('days-count').innerText = status.remaining;
    
    const msgEl = document.getElementById('status-message');
    msgEl.innerText = status.isTravelDay ? "Travel Day!" : (status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.");

    const gauge = document.getElementById('gauge-progress');
    const circ = 439.8;
    gauge.style.strokeDashoffset = circ - (status.remaining / 90) * circ;
    gauge.style.stroke = status.remaining >= 50 ? "#22c55e" : (status.remaining >= 20 ? "#f97316" : "#ef4444");

    const recEl = document.getElementById('recovery-tagline');
    if (status.recovery && status.remaining < 90) {
        const d = status.recovery.date.split('-');
        recEl.innerHTML = `${status.recovery.days} DAYS TO BE ADDED <br> BEGINNING ${d[2]}-${d[1]}-${d[0]}`;
    } else {
        recEl.innerHTML = "";
    }
}

db.ref('trips').on('value', (snap) => {
    const trips = [];
    snap.forEach(c => { if(c.val().entry) trips.push(c.val()); });
    
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const todayStr = now.toISOString().split('T')[0];
    
    const res = SchengenEngine.calculateStatus(trips, now);
    const recovery = SchengenEngine.getNextIncrease(trips, now);
    const currentTrip = trips.find(t => todayStr >= t.entry && todayStr <= t.exit);
    
    // Check if today is specifically the arrival or departure date
    const isTravelDay = currentTrip && (todayStr === currentTrip.entry || todayStr === currentTrip.exit);

    updateUI({
        remaining: res.remaining,
        recovery: recovery,
        inSpain: !!currentTrip,
        isTravelDay: isTravelDay
    });
});

