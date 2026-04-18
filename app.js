const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

// Fix 7: Explicitly attach db to window so all pages see it
window.db = firebase.database();

function updateUI(status) {
    // Determine Image
    let img = "assets/uk2.jpg";
    if (status.isTravelDay) {
        img = "assets/sp-uk.jpg"; 
    } else if (status.inSpain) {
        img = "assets/sp2.jpg";
    }

    // Ensure elements exist before updating (prevents errors on sub-pages)
    if (document.body) document.body.style.backgroundImage = `url('${img}')`;
    
    const daysCountEl = document.getElementById('days-count');
    if (daysCountEl) daysCountEl.innerText = status.remaining;
    
    const msgEl = document.getElementById('status-message');
    if (msgEl) msgEl.innerText = status.isTravelDay ? "Travel Day!" : (status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.");

    const gauge = document.getElementById('gauge-progress');
    if (gauge) {
        const circ = 439.8;
        gauge.style.strokeDashoffset = circ - (status.remaining / 90) * circ;
        gauge.style.stroke = status.remaining >= 50 ? "#22c55e" : (status.remaining >= 20 ? "#f97316" : "#ef4444");
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
        if(val.entry) trips.push(val); 
    });
    
    // Fix 1 & 7: Export to global window object for other pages to use
    window.allTrips = trips;
    
    const now = new Date();
    now.setHours(12, 0, 0, 0);
    const todayStr = now.toISOString().split('T')[0];
    
    const res = SchengenEngine.calculateStatus(trips, now);
    const recovery = SchengenEngine.getNextIncrease(trips, now);
    const currentTrip = trips.find(t => todayStr >= t.entry && todayStr <= t.exit);
    
    const isTravelDay = currentTrip && (todayStr === currentTrip.entry || todayStr === currentTrip.exit);

    updateUI({
        remaining: res.remaining,
        recovery: recovery,
        inSpain: !!currentTrip,
        isTravelDay: isTravelDay
    });

    // Fix 4: Signal to sub-pages that data is now ready
    window.dispatchEvent(new CustomEvent('tripsUpdated'));
});
