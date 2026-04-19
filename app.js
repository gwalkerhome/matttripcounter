const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.db = firebase.database();

function updateUI(status) {
    // Determine Image - Updated to .png
    let img = "assets/uk2.png"; 
    if (status.isTravelDay) {
        img = "assets/sp-uk.png"; 
    } else if (status.inSpain) {
        img = "assets/sp2.png";
    }

    if (document.body) {
        document.body.style.backgroundImage = `url('${img}')`;
    }
    
    const daysCountEl = document.getElementById('days-count');
    if (daysCountEl) daysCountEl.innerText = status.remaining;
    
    const msgEl = document.getElementById('status-message');
    if (msgEl) msgEl.innerText = status.isTravelDay ? "Travel Day!" : (status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.");

    const gauge = document.getElementById('gauge-progress');
    const gaugeBorder = document.getElementById('gauge-progress-border');
    
    if (gauge) {
        const circ = 439.8;
        const offset = circ - (status.remaining / 90) * circ;
        
        // Update Green Ring
        gauge.style.strokeDashoffset = offset;
        gauge.style.stroke = status.remaining >= 50 ? "#22c55e" : (status.remaining >= 20 ? "#f97316" : "#ef4444");
        
        // Update Black Border Ring to match progress
        if (gaugeBorder) {
            gaugeBorder.style.strokeDashoffset = offset;
        }
    }

    const recEl = document.getElementById('recovery-tagline');
    if (recEl) {
        if (status.recovery && status.remaining < 90) {
            const d = status.recovery.date.split('-');
            recEl.innerHTML = `${status.recovery.days} DAYS TO BE ADDED <br> BEGINNING ${d[2]}-${d[1]}-${d[0]}`;
        } else {
            recEl.innerHTML = "";
        }
    }
}

window.db.ref('trips').on('value', (snap) => {
    const trips = [];
    snap.forEach(c => { 
        const val = c.val();
        if(val.entry) {
            trips.push({ ...val, id: c.key });
        }
    });
    
    window.allTrips = trips;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`; 
    
    const calcDate = new Date(`${todayStr}T12:00:00`);
    
    const res = SchengenEngine.calculateStatus(trips, calcDate);
    const recovery = SchengenEngine.getNextIncrease(trips, calcDate);
    const currentTrip = trips.find(t => todayStr >= t.entry && todayStr <= t.exit);
    
    const isTravelDay = currentTrip && (todayStr === currentTrip.entry || todayStr === currentTrip.exit);

    updateUI({
        remaining: res.remaining,
        recovery: recovery,
        inSpain: !!currentTrip,
        isTravelDay: isTravelDay
    });

    window.dispatchEvent(new CustomEvent('tripsUpdated'));
});
