// ... [Firebase Config remains the same] ...

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

    return { 
        remaining: engineStatus.remaining, 
        recovery, 
        inSpain: !!currentTrip, 
        currentTrip, 
        nextTrip, 
        todayStr, 
        tomorrowStr 
    };
}

function getMattMoodImage(status) {
    const { inSpain, currentTrip, nextTrip, todayStr, tomorrowStr } = status;

    // 1. Travel Day Check (PRIORITY)
    if (currentTrip && todayStr === currentTrip.exit) return "assets/sp-uk.jpg";
    if ((currentTrip && todayStr === currentTrip.entry) || (nextTrip && todayStr === nextTrip.entry)) return "assets/uk-sp.jpg";

    // 2. Imminent Travel
    if (nextTrip && tomorrowStr === nextTrip.entry) return "assets/uk4.jpg";
    if (currentTrip && tomorrowStr === currentTrip.exit) return "assets/sp4.jpg";

    // 3. General Location
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
    document.body.style.backgroundImage = `url('${getMattMoodImage(status)}')`;
    
    const countEl = document.getElementById('days-count');
    const msgEl = document.getElementById('status-message');
    const gauge = document.getElementById('gauge-progress');
    const recoveryEl = document.getElementById('recovery-tagline');

    countEl.innerText = status.remaining;
    
    const isTravel = status.currentTrip && (status.todayStr === status.currentTrip.entry || status.todayStr === status.currentTrip.exit);
    msgEl.innerText = isTravel ? "Travel Day!" : (status.inSpain ? "Matt is in Spain!" : "Matt is in the UK.");

    const circ = 408.4;
    gauge.style.strokeDashoffset = circ - (status.remaining / 90) * circ;
    
    if (status.remaining >= 50) gauge.style.stroke = "#22c55e"; 
    else if (status.remaining >= 20) gauge.style.stroke = "#f97316"; 
    else gauge.style.stroke = "#ef4444"; 

    if (status.recovery && status.remaining < 90) {
        recoveryEl.innerHTML = `${status.recovery.days} DAYS TO BE ADDED <br> BEGINNING ${formatUKDate(status.recovery.date)}`;
    } else {
        recoveryEl.innerHTML = "";
    }
}
// ... [initializeApp and onload remain the same] ...
