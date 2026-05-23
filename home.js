// ==============================================
// HOME.JS  —  Home View (Gauge + Background Image)
// ==============================================
// Controls everything on the home screen:
//   - The circular gauge showing Schengen days remaining
//   - The background image that changes based on Matt's location
//   - The status message and recovery tagline

// ---- BACKGROUND IMAGE ----
// Picks the correct background image based on whether Matt
// is in Spain, the UK, travelling, or somewhere in between.

function resolveBackgroundImage(trips, today) {
    const now = new Date(`${today}T12:00:00`);
    const sorted = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));

    const currentTrip = sorted.find(t => today >= t.entry && today <= t.exit);
    const nextTrip    = sorted.find(t => t.entry > today);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (currentTrip) {
        // Travel days get special images
        if (today === currentTrip.entry) return 'assets/uk-sp.png';
        if (today === currentTrip.exit)  return 'assets/sp-uk.png';

        // Day before leaving Spain
        const exitDate = new Date(`${currentTrip.exit}T12:00:00`);
        const dayBefore = new Date(exitDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        if (today === dayBefore.toISOString().split('T')[0]) return 'assets/sp4.png';

        // Progress through the Spain trip (early / mid / late)
        const entryDate = new Date(`${currentTrip.entry}T12:00:00`);
        const totalDays = Math.ceil((exitDate - entryDate) / (1000 * 60 * 60 * 24));
        const daysSoFar = Math.ceil((now - entryDate)      / (1000 * 60 * 60 * 24));
        const pct = totalDays > 0 ? daysSoFar / totalDays : 0;

        if (pct < 0.34) return 'assets/sp1.png';
        if (pct < 0.67) return 'assets/sp2.png';
        return 'assets/sp3.png';
    }

    // Day before heading to Spain
    if (nextTrip && tomorrowStr === nextTrip.entry) return 'assets/uk4.png';

    // In the UK between trips — progress through the UK stay
    const pastTrips = sorted.filter(t => t.exit < today);
    if (pastTrips.length > 0 && nextTrip) {
        const lastExit  = new Date(`${pastTrips[pastTrips.length - 1].exit}T12:00:00`);
        const nextEntry = new Date(`${nextTrip.entry}T12:00:00`);
        const totalUKDays = Math.ceil((nextEntry - lastExit) / (1000 * 60 * 60 * 24));
        const ukDaysSoFar = Math.ceil((now - lastExit)       / (1000 * 60 * 60 * 24));
        const pct = totalUKDays > 0 ? ukDaysSoFar / totalUKDays : 0;

        if (pct < 0.34) return 'assets/uk1.png';
        if (pct < 0.67) return 'assets/uk2.png';
        return 'assets/uk3.png';
    }

    return 'assets/uk2.png';
}

// ---- UPDATE HOME VIEW ----

function updateHomeView(trips) {
    const today = todayStr();
    const now   = new Date(`${today}T12:00:00`);

    // Always update the shared background layer
    const bgImage = resolveBackgroundImage(trips, today);
    const bgLayer = document.getElementById('bg-layer');
    if (bgLayer) bgLayer.style.backgroundImage = `url('${bgImage}')`;

    // -- Schengen status calculation --
    // Use the last future trip's exit date for the gauge, so planned
    // trips show how many days will remain after they're all done.
    const futureTrips = trips
        .filter(t => t.entry > today)
        .sort((a, b) => new Date(a.exit) - new Date(b.exit));

    const gaugeDate = futureTrips.length > 0
        ? new Date(`${futureTrips[futureTrips.length - 1].exit}T12:00:00`)
        : now;

    const status   = SchengenEngine.calculateStatus(trips, gaugeDate);
    const recovery = SchengenEngine.getNextIncrease(trips, now);

    // -- Current trip and travel day detection --
    const currentTrip = trips.find(t => today >= t.entry && today <= t.exit);
    const isTravelDay = currentTrip
        ? (today === currentTrip.entry ? 'entry' : today === currentTrip.exit ? 'exit' : false)
        : false;

    // -- Status message --
    const msgEl = document.getElementById('home-status-msg');
    if (msgEl) {
        if      (isTravelDay === 'entry') msgEl.innerText = 'Travel Day! ✈️ Spain';
        else if (isTravelDay === 'exit')  msgEl.innerText = 'Travel Day! ✈️ UK';
        else if (currentTrip)             msgEl.innerText = 'Matt is in Spain!';
        else                              msgEl.innerText = 'Matt is in the UK.';
    }

    // -- Days remaining count --
    const daysEl = document.getElementById('home-days-count');
    if (daysEl) daysEl.innerText = status.remaining;

    // -- Circular gauge --
    const gauge       = document.getElementById('home-gauge-progress');
    const gaugeBorder = document.getElementById('home-gauge-border');
    if (gauge) {
        const circumference = 439.8;
        const offset = circumference - (status.remaining / 90) * circumference;
        gauge.style.strokeDashoffset = offset;
        gauge.style.stroke = status.remaining >= 50 ? '#22c55e'
                           : status.remaining >= 20 ? '#f97316'
                           : '#ef4444';
        if (gaugeBorder) gaugeBorder.style.strokeDashoffset = offset;
    }

    // -- Recovery tagline --
    const recEl = document.getElementById('home-recovery');
    if (recEl) {
        if (recovery && status.remaining < 90) {
            const d = recovery.date.split('-');
            recEl.innerHTML = `${recovery.days} DAYS TO BE ADDED<br>FROM ${d[2]}/${d[1]}/${d[0]}`;
        } else {
            recEl.innerHTML = '';
        }
    }
}

// ---- ALERT BANNER ----
// Shows a prominent banner on the home screen when:
//   - Schengen days remaining drops below 15
//   - Matt's next trip is within 7 days

function checkHomeAlerts(trips) {
    const today  = todayStr();
    const now    = new Date(`${today}T12:00:00`);
    const alertEl  = document.getElementById('home-alert');
    const alertText = document.getElementById('home-alert-text');
    if (!alertEl || !alertText) return;

    const status   = SchengenEngine.calculateStatus(trips, now);
    const sorted   = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
    const nextTrip = sorted.find(t => t.entry > today);

    let message   = null;
    let bgColour  = 'rgba(249,115,22,0.15)';
    let bdColour  = '#f97316';

    // Priority 1: trip within 7 days (blue alert)
    if (nextTrip) {
        const daysToTrip = daysBetween(now, new Date(`${nextTrip.entry}T12:00:00`));
        if (daysToTrip >= 0 && daysToTrip <= 7) {
            message   = daysToTrip === 0
                ? '✈️ Travel day today!'
                : `✈️ ${daysToTrip} day${daysToTrip !== 1 ? 's' : ''} until next trip`;
            bgColour  = 'rgba(0,168,255,0.15)';
            bdColour  = '#00A8FF';
        }
    }

    // Priority 2: low Schengen days (orange/red alert)
    if (!message && status.remaining > 0 && status.remaining <= 15) {
        message   = `Only ${status.remaining} Schengen day${status.remaining !== 1 ? 's' : ''} remaining`;
        bgColour  = status.remaining <= 5 ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)';
        bdColour  = status.remaining <= 5 ? '#ef4444' : '#f97316';
    }

    if (!message) {
        alertEl.style.display = 'none';
        return;
    }

    // Don't re-show an alert the user already dismissed this session
    const dismissed = sessionStorage.getItem('home-alert-dismissed');
    if (dismissed === message) {
        alertEl.style.display = 'none';
        return;
    }

    alertText.innerText          = message;
    alertEl.style.background     = bgColour;
    alertEl.style.borderColor    = bdColour;
    alertEl.style.display        = 'flex';
}

function dismissHomeAlert() {
    const alertText = document.getElementById('home-alert-text');
    if (alertText) sessionStorage.setItem('home-alert-dismissed', alertText.innerText);
    const alertEl = document.getElementById('home-alert');
    if (alertEl) alertEl.style.display = 'none';
}

// ---- EVENT LISTENERS ----

// Update whenever Firebase sends new trip data (regardless of active view,
// because the background image is shared across all views)
window.addEventListener('tripsUpdated', () => {
    updateHomeView(window.allTrips);
    checkHomeAlerts(window.allTrips);
});

// Re-run when switching back to home (data may have changed while away)
window.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'home' && window.allTrips) {
        updateHomeView(window.allTrips);
        checkHomeAlerts(window.allTrips);
    }
});
