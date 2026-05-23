// ==============================================
// BORDERCONTROL.JS  —  Border Control View
// ==============================================
// Professional screen for showing at the border.
// Passport background (border.png), dark overlay,
// fixed header + current trip + totals, scrollable past trips table.

function updateBorderView(trips) {
    const today = todayStr();
    const now   = new Date(`${today}T12:00:00`);

    // -- 180-day window start --
    const windowStart    = new Date(now);
    windowStart.setDate(windowStart.getDate() - 179);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    // -- Separate current trip from past trips --
    const currentTrip = trips.find(t => today >= t.entry && today <= t.exit) || null;
    const pastTrips   = trips
        .filter(t => t.exit < today && t.exit >= windowStartStr)
        .sort((a, b) => new Date(b.entry) - new Date(a.entry)); // most recent first

    // ---- SECTION: CURRENT TRIP ----
    const ctEl = document.getElementById('bc-current-trip');
    if (ctEl) {
        if (currentTrip) {
            const ctStart    = new Date(`${currentTrip.entry}T12:00:00`);
            const ctEnd      = new Date(`${currentTrip.exit}T12:00:00`);
            const countedFrom = currentTrip.entry < windowStartStr ? windowStartStr : currentTrip.entry;
            const ctDays     = daysBetween(
                new Date(`${countedFrom}T12:00:00`),
                now
            ) + 1; // days used so far in this trip (entry to today inclusive)
            const totalDays  = daysBetween(ctStart, ctEnd) + 1;
            const partial    = currentTrip.entry < windowStartStr;

            ctEl.innerHTML = `
                <span class="bc-ct-label">Current Visit</span>
                <span class="bc-ct-dates">${toUKDate(currentTrip.entry)} — ${toUKDate(currentTrip.exit)}</span>
                <span class="bc-ct-days">
                    Day ${ctDays} of ${totalDays}${partial ? ' (partial window)' : ''}
                </span>
            `;
        } else {
            ctEl.innerHTML = `
                <span class="bc-ct-none">Not currently in Schengen Zone</span>
            `;
        }
    }

    // ---- SECTION: PRIOR DAYS TALLY (past trips only, not current trip) ----
    let priorDays = 0;
    pastTrips.forEach(t => {
        const countedFrom  = t.entry < windowStartStr ? windowStartStr : t.entry;
        const schengenDays = daysBetween(
            new Date(`${countedFrom}T12:00:00`),
            new Date(`${t.exit}T12:00:00`)
        ) + 1;
        priorDays += schengenDays;
    });

    // Overall remaining uses full engine (includes current trip if any)
    const res = SchengenEngine.calculateStatus(trips, now);

    const usedEl      = document.getElementById('bc-days-used');
    const remainingEl = document.getElementById('bc-days-remaining');

    if (usedEl) usedEl.innerText = priorDays;
    if (remainingEl) {
        remainingEl.innerText   = res.remaining;
        remainingEl.style.color = res.remaining >= 50 ? '#2ED573'
                                : res.remaining >= 20 ? '#f97316'
                                : '#ef4444';
    }

    // ---- SECTION: PAST TRIPS TABLE ----
    const listEl = document.getElementById('bc-trip-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (pastTrips.length === 0) {
        listEl.innerHTML = `
            <div style="padding:20px 0; text-align:center;
                        font-size:0.7rem; font-weight:700;
                        text-transform:uppercase; letter-spacing:0.08em;
                        color:rgba(255,255,255,0.35);">
                No previous trips in this window
            </div>`;
        return;
    }

    pastTrips.forEach(t => {
        const countedFrom  = t.entry < windowStartStr ? windowStartStr : t.entry;
        const schengenDays = daysBetween(
            new Date(`${countedFrom}T12:00:00`),
            new Date(`${t.exit}T12:00:00`)
        ) + 1;
        const partial = t.entry < windowStartStr;

        const row = document.createElement('div');
        row.className = 'bc-trip-row';
        row.innerHTML = `
            <div style="flex:1;">
                <div style="font-size:0.85rem; font-weight:900;
                            color:#fff; letter-spacing:-0.01em;">
                    ${toUKDate(t.entry)} — ${toUKDate(t.exit)}
                </div>
                ${partial ? `
                <div style="font-size:0.48rem; font-weight:700;
                            text-transform:uppercase; letter-spacing:0.08em;
                            color:rgba(255,255,255,0.5); margin-top:3px;">
                    partial window
                </div>` : ''}
            </div>
            <div style="font-size:1.05rem; font-weight:900;
                        color:rgba(255,255,255,0.85); text-align:right;
                        flex-shrink:0; min-width:36px;">
                ${schengenDays}d
            </div>
        `;
        listEl.appendChild(row);
    });
}

// ---- EVENT LISTENERS ----

window.addEventListener('tripsUpdated', () => {
    if (currentView === 'border') updateBorderView(window.allTrips);
});

window.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'border' && window.allTrips) {
        updateBorderView(window.allTrips);
    }
});
