// ==============================================
// BORDERCONTROL.JS  —  Border Control View
// ==============================================
// A clean, read-only summary screen designed to
// be shown to an immigration officer at the border.
//
// Shows:
//   - Traveller name
//   - Today's date
//   - Current status (IN / OUTSIDE Schengen)
//   - Days used and days remaining (out of 90)
//   - The current 180-day rolling window dates
//   - All trips that fall within that window

function updateBorderView(trips) {
    const today = todayStr();
    const now   = new Date(`${today}T12:00:00`);

    // -- Today's date display --
    const dateEl = document.getElementById('bc-today-date');
    if (dateEl) {
        dateEl.innerText = now.toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // -- Current trip detection (is Matt in Schengen right now?) --
    const sorted      = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
    const currentTrip = sorted.find(t => today >= t.entry && today <= t.exit);
    const inSchengen  = !!currentTrip;

    // -- Status card colour and label --
    const statusLabelEl = document.getElementById('bc-status-label');
    const statusDotEl   = document.getElementById('bc-status-dot');
    const statusCardEl  = document.getElementById('bc-status-card');

    const statusColour = inSchengen ? '#2ED573' : '#00A8FF';
    const glowColour   = inSchengen
        ? 'rgba(46,213,115,0.5)'
        : 'rgba(0,168,255,0.5)';

    if (statusLabelEl) statusLabelEl.innerText  = inSchengen ? 'In Schengen Zone' : 'Outside Schengen';
    if (statusDotEl) {
        statusDotEl.style.background  = statusColour;
        statusDotEl.style.boxShadow   = `0 0 12px ${glowColour}`;
    }
    if (statusCardEl) {
        statusCardEl.style.borderColor = statusColour;
        statusCardEl.style.boxShadow   = `0 0 20px ${glowColour}`;
    }

    // -- Schengen days used / remaining --
    const res = SchengenEngine.calculateStatus(trips, now);

    const usedEl      = document.getElementById('bc-days-used');
    const remainingEl = document.getElementById('bc-days-remaining');

    if (usedEl) usedEl.innerText = res.used;
    if (remainingEl) {
        remainingEl.innerText   = res.remaining;
        remainingEl.style.color = res.remaining >= 50 ? '#2ED573'
                                : res.remaining >= 20 ? '#f97316'
                                : '#ef4444';
    }

    // -- 180-day rolling window --
    // The window runs from (today − 179 days) to today
    const windowStart    = new Date(now);
    windowStart.setDate(windowStart.getDate() - 179);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    const windowStartEl = document.getElementById('bc-window-start');
    const windowEndEl   = document.getElementById('bc-window-end');
    if (windowStartEl) windowStartEl.innerText = toUKDate(windowStartStr);
    if (windowEndEl)   windowEndEl.innerText   = toUKDate(today);

    // -- Trip list: only trips that overlap the 180-day window --
    // A trip overlaps if its exit date falls on or after the window start
    const windowTrips = sorted.filter(t => t.exit >= windowStartStr);

    const listEl = document.getElementById('bc-trip-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (windowTrips.length === 0) {
        listEl.innerHTML = `
            <p style="color:rgba(255,255,255,0.3); font-size:0.7rem; font-weight:700;
                      text-align:center; padding:16px 0; text-transform:uppercase;
                      letter-spacing:0.08em;">
                No trips in this window
            </p>`;
        return;
    }

    // Most recent trip at the top
    [...windowTrips].reverse().forEach(t => {
        const isCurrent = today >= t.entry && today <= t.exit;

        // Night count (exit minus entry in days)
        const nights = daysBetween(
            new Date(`${t.entry}T12:00:00`),
            new Date(`${t.exit}T12:00:00`)
        );

        // Schengen-counted days: clamp entry to window start if trip started before
        // Schengen counts both entry and exit day so +1
        const countedFrom = t.entry < windowStartStr ? windowStartStr : t.entry;
        const schengenDays = daysBetween(
            new Date(`${countedFrom}T12:00:00`),
            new Date(`${t.exit}T12:00:00`)
        ) + 1;

        const partial = t.entry < windowStartStr;

        const row = document.createElement('div');
        row.className = 'bc-trip-row';
        row.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:3px; flex:1;">
                <span style="font-size:0.82rem; font-weight:900; color:#fff; letter-spacing:-0.01em;">
                    ${toUKDate(t.entry)} — ${toUKDate(t.exit)}
                </span>
                <span style="font-size:0.52rem; font-weight:700; text-transform:uppercase;
                             letter-spacing:0.08em; color:rgba(255,255,255,0.4);">
                    ${nights} night${nights !== 1 ? 's' : ''}${partial ? ' · partial window' : ''}
                </span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                ${isCurrent
                    ? `<span style="font-size:0.42rem; font-weight:900; text-transform:uppercase;
                                   letter-spacing:0.1em; background:#2ED573; color:#000;
                                   padding:3px 8px; border-radius:6px;">Now</span>`
                    : ''}
                <span style="font-size:0.95rem; font-weight:900;
                             color:rgba(255,255,255,0.55); min-width:28px; text-align:right;">
                    ${schengenDays}d
                </span>
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
