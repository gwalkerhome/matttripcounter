// ==============================================
// BORDERCONTROL.JS  —  Border Control View
// ==============================================
// Professional screen for showing at the border.
// Passport background (border.png), dark overlay,
// fixed header + totals, scrollable trip table.

function updateBorderView(trips) {
    const today = todayStr();
    const now   = new Date(`${today}T12:00:00`);

    // -- Today's date --
    const dateEl = document.getElementById('bc-today-date');
    if (dateEl) {
        dateEl.innerText = now.toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // -- Totals (days used / remaining) --
    const res         = SchengenEngine.calculateStatus(trips, now);
    const usedEl      = document.getElementById('bc-days-used');
    const remainingEl = document.getElementById('bc-days-remaining');

    if (usedEl) usedEl.innerText = res.used;
    if (remainingEl) {
        remainingEl.innerText   = res.remaining;
        remainingEl.style.color = res.remaining >= 50 ? '#2ED573'
                                : res.remaining >= 20 ? '#f97316'
                                : '#ef4444';
    }

    // -- 180-day window --
    const windowStart    = new Date(now);
    windowStart.setDate(windowStart.getDate() - 179);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    // -- Trip table --
    const sorted      = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
    const windowTrips = sorted.filter(t => t.exit >= windowStartStr);
    const listEl      = document.getElementById('bc-trip-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (windowTrips.length === 0) {
        listEl.innerHTML = `
            <div style="padding:20px 0; text-align:center;
                        font-size:0.7rem; font-weight:700;
                        text-transform:uppercase; letter-spacing:0.08em;
                        color:rgba(255,255,255,0.35);">
                No trips recorded in this window
            </div>`;
        return;
    }

    // Most recent trip first
    [...windowTrips].reverse().forEach(t => {
        const isCurrent = today >= t.entry && today <= t.exit;
        const nights    = daysBetween(
            new Date(`${t.entry}T12:00:00`),
            new Date(`${t.exit}T12:00:00`)
        );
        // Schengen days: clamp entry to window start, include both entry and exit day
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
                ${(partial || isCurrent) ? `
                <div style="font-size:0.48rem; font-weight:700;
                            text-transform:uppercase; letter-spacing:0.08em;
                            color:rgba(255,255,255,0.5); margin-top:3px;
                            display:flex; align-items:center; gap:6px;">
                    ${partial ? 'partial window' : ''}
                    ${isCurrent
                        ? `<span style="background:#2ED573; color:#000; padding:1px 7px;
                                       border-radius:5px; font-size:0.42rem; font-weight:900;
                                       letter-spacing:0.1em; text-transform:uppercase;">
                               Current Visit
                           </span>`
                        : ''}
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
