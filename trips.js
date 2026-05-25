// ==============================================
// TRIPS.JS  —  Trips List View
// ==============================================
// Shows a scrollable list of all of Matt's trips:
//   - Past trips (dimmed)
//   - Current trip (green highlight)
//   - Upcoming trips (blue highlight)
// Each card shows the dates, night count, and a delete button.

// ---- TRIP LIST RENDER ----

function renderTripsList(trips) {
    const today = todayStr();
    const list  = document.getElementById('trips-list');
    if (!list) return;

    list.innerHTML = '';

    if (!trips || trips.length === 0) {
        list.innerHTML = `
            <p style="color:rgba(255,255,255,0.3); font-size:0.75rem; font-weight:900;
                      text-transform:uppercase; letter-spacing:0.15em;
                      margin-top:40px; text-align:center;">
                No trips logged yet
            </p>`;
        return;
    }

    // 180-day window — trips with exit before this are off the radar
    const windowStart = new Date(`${today}T12:00:00`);
    windowStart.setDate(windowStart.getDate() - 179);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    // Most recent trip first
    const sorted = [...trips].sort((a, b) => new Date(b.entry) - new Date(a.entry));

    sorted.forEach(t => {
        // Determine category
        let label  = 'Past';
        let bg     = '#FF4DFF'; // pink  — past but still in 180-day window

        if (today >= t.entry && today <= t.exit) {
            label = 'Now';
            bg    = '#00A8FF'; // blue — current
        } else if (t.entry > today) {
            label = 'Upcoming';
            bg    = '#00A8FF'; // blue — future
        } else if (t.exit < windowStartStr) {
            label = 'Archived';
            bg    = '#c084fc'; // purple — off the 180-day radar
        }

        // Schengen days = nights + 1 (both entry and exit day count)
        const nights     = daysBetween(
            new Date(`${t.entry}T12:00:00`),
            new Date(`${t.exit}T12:00:00`)
        );
        const schengenDays = nights + 1;

        const card = document.createElement('div');
        card.style.cssText = `
            width: 100%; max-width: 300px;
            display: flex; align-items: center;
            padding: 12px 14px;
            border-radius: 14px;
            border: 3px solid #000;
            background: ${bg};
            box-shadow: 4px 4px 0 #000;
            margin-bottom: 12px;
            -webkit-font-smoothing: antialiased;
        `;

        // Delete button on the LEFT — away from Matt's scrolling thumb
        card.innerHTML = `
            <button onclick="deleteTripFromList('${t.id}')"
                style="background:none; border:none;
                       color:rgba(0,0,0,0.45); cursor:pointer;
                       padding:6px 12px 6px 0; flex-shrink:0;
                       display:flex; align-items:center;
                       -webkit-tap-highlight-color:transparent;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2.5"
                     stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
            </button>
            <div style="display:flex; flex-direction:column; gap:4px; flex:1;">
                <span style="
                    display:inline-block; width:fit-content;
                    font-size:0.48rem; font-weight:900;
                    text-transform:uppercase; letter-spacing:0.12em;
                    padding:2px 8px; border-radius:6px;
                    background:rgba(0,0,0,0.2); color:#000;
                ">${label}</span>
                <span style="color:#000; font-weight:900; font-size:0.88rem; letter-spacing:-0.01em;">
                    ${toUKDate(t.entry)} — ${toUKDate(t.exit)}
                </span>
                <span style="color:rgba(0,0,0,0.55); font-size:0.62rem; font-weight:800;
                             text-transform:uppercase; letter-spacing:0.08em;">
                    ${schengenDays} day${schengenDays !== 1 ? 's' : ''}
                </span>
            </div>
        `;
        list.appendChild(card);
    });
}

function deleteTripFromList(tripId) {
    if (!tripId || tripId === 'undefined') return;
    if (confirm('Permanently delete this trip?')) {
        window.db.ref('trips').child(tripId).remove();
    }
}

// ---- STATUS LINE ----

function updateTripsHeader(trips) {
    const today = todayStr();
    const now   = new Date(`${today}T12:00:00`);
    const sorted = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));

    const currentTrip = sorted.find(t => today >= t.entry && today <= t.exit);
    const nextTrip    = sorted.find(t => t.entry > today);
    const statusEl    = document.getElementById('trips-status-line');
    if (!statusEl) return;

    if (currentTrip) {
        const days = daysBetween(now, new Date(`${currentTrip.exit}T12:00:00`));
        statusEl.innerText = days === 0
            ? 'Matt returns to England today!'
            : `${days} day${days !== 1 ? 's' : ''} until Matt returns to England`;
    } else if (nextTrip) {
        const days = daysBetween(now, new Date(`${nextTrip.entry}T12:00:00`));
        statusEl.innerText = days === 0
            ? 'Matt heads to Spain today!'
            : `${days} day${days !== 1 ? 's' : ''} until next trip to Spain`;
    } else {
        statusEl.innerText = 'No future trips logged';
    }

    // Also update the remaining-days pill in the trips header
    const res    = SchengenEngine.calculateStatus(trips);
    const remEl  = document.getElementById('trips-remaining');
    if (remEl) {
        remEl.innerText   = res.remaining;
        remEl.style.color = res.remaining >= 50 ? '#2ED573'
                          : res.remaining >= 20 ? '#f97316'
                          : '#ef4444';
    }
}

// ---- EVENT LISTENERS ----

window.addEventListener('tripsUpdated', () => {
    if (currentView === 'trips') {
        updateTripsHeader(window.allTrips);
        renderTripsList(window.allTrips);
    }
});

window.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'trips' && window.allTrips) {
        updateTripsHeader(window.allTrips);
        renderTripsList(window.allTrips);
    }
});
