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

function resolveBackgroundImage(trips, todayStr) {
    const now = new Date(`${todayStr}T12:00:00`);
    const sorted = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
    const currentTrip = sorted.find(t => todayStr >= t.entry && todayStr <= t.exit);
    const nextTrip = sorted.find(t => t.entry > todayStr);

    const tomorrowDate = new Date(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth()+1).padStart(2,'0')}-${String(tomorrowDate.getDate()).padStart(2,'0')}`;

    if (currentTrip) {
        if (todayStr === currentTrip.entry) return "assets/uk-sp.png";
        if (todayStr === currentTrip.exit) return "assets/sp-uk.png";

        const entryDate = new Date(`${currentTrip.entry}T12:00:00`);
        const exitDate = new Date(`${currentTrip.exit}T12:00:00`);
        const totalDays = Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24));
        const daysSoFar = Math.ceil((now - entryDate) / (1000 * 60 * 60 * 24));

        const dayBeforeExit = new Date(exitDate);
        dayBeforeExit.setDate(dayBeforeExit.getDate() - 1);
        const dayBeforeExitStr = `${dayBeforeExit.getFullYear()}-${String(dayBeforeExit.getMonth()+1).padStart(2,'0')}-${String(dayBeforeExit.getDate()).padStart(2,'0')}`;
        if (todayStr === dayBeforeExitStr) return "assets/sp4.png";

        const pct = totalDays > 0 ? daysSoFar / totalDays : 0;
        if (pct < 0.34) return "assets/sp1.png";
        if (pct < 0.67) return "assets/sp2.png";
        return "assets/sp3.png";
    }

    if (nextTrip && tomorrowStr === nextTrip.entry) return "assets/uk4.png";

    const pastTrips = sorted.filter(t => t.exit < todayStr);
    if (pastTrips.length > 0) {
        const lastTrip = pastTrips[pastTrips.length - 1];
        const lastExitDate = new Date(`${lastTrip.exit}T12:00:00`);
        const nextEntryDate = nextTrip ? new Date(`${nextTrip.entry}T12:00:00`) : null;

        if (nextEntryDate) {
            const totalUKDays = Math.ceil((nextEntryDate - lastExitDate) / (1000 * 60 * 60 * 24));
            const ukDaysSoFar = Math.ceil((now - lastExitDate) / (1000 * 60 * 60 * 24));
            const pct = totalUKDays > 0 ? ukDaysSoFar / totalUKDays : 0;
            if (pct < 0.34) return "assets/uk1.png";
            if (pct < 0.67) return "assets/uk2.png";
            return "assets/uk3.png";
        }
    }

    return "assets/uk2.png";
}

function updateUI(status, bgImage) {
    const bgLayer = document.getElementById('bg-layer');
    if (bgLayer) bgLayer.style.backgroundImage = `url('${bgImage}')`;

    const daysCountEl = document.getElementById('days-count');
    if (daysCountEl) daysCountEl.innerText = status.remaining;

    const msgEl = document.getElementById('status-message');
    if (msgEl) {
        if (status.isTravelDay === 'entry') msgEl.innerText = "Travel Day! ✈️ Spain";
        else if (status.isTravelDay === 'exit') msgEl.innerText = "Travel Day! ✈️ UK";
        else if (status.inSpain) msgEl.innerText = "Matt is in Spain!";
        else msgEl.innerText = "Matt is in the UK.";
    }

    const gauge = document.getElementById('gauge-progress');
    const gaugeBorder = document.getElementById('gauge-progress-border');
    if (gauge) {
        const circ = 439.8;
        const offset = circ - (status.remaining / 90) * circ;
        gauge.style.strokeDashoffset = offset;
        gauge.style.stroke = status.remaining >= 50 ? "#22c55e" : (status.remaining >= 20 ? "#f97316" : "#ef4444");
        if (gaugeBorder) gaugeBorder.style.strokeDashoffset = offset;
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
        if (val.entry) trips.push({ ...val, id: c.key });
    });

    window.allTrips = trips;

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const calcDate = new Date(`${todayStr}T12:00:00`);

    // Find the last future planned trip exit date for gauge calculation
    const futureTrips = trips
        .filter(t => t.entry > todayStr)
        .sort((a, b) => new Date(a.exit) - new Date(b.exit));

    const gaugeDate = futureTrips.length > 0
        ? new Date(`${futureTrips[futureTrips.length - 1].exit}T12:00:00`)
        : calcDate;

    const res = SchengenEngine.calculateStatus(trips, gaugeDate);
    const recovery = SchengenEngine.getNextIncrease(trips, calcDate);
    const currentTrip = trips.find(t => todayStr >= t.entry && todayStr <= t.exit);
    const isTravelDay = currentTrip
        ? (todayStr === currentTrip.entry ? 'entry' : todayStr === currentTrip.exit ? 'exit' : false)
        : false;

    const bgImage = resolveBackgroundImage(trips, todayStr);

    updateUI({
        remaining: res.remaining,
        recovery: recovery,
        inSpain: !!currentTrip,
        isTravelDay: isTravelDay
    }, bgImage);

    window.dispatchEvent(new CustomEvent('tripsUpdated'));
});
