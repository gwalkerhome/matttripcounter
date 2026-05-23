// ==============================================
// CALENDAR.JS  —  Calendar View
// ==============================================
// Handles everything in the calendar view:
//   - Rendering the scrollable month calendar
//   - Planning mode (tap to add a new trip)
//   - Editing and deleting existing trips
//   - The info strip showing key stats at the top
//
// All element IDs in this file are prefixed with "cal-"
// to keep them clearly separate from other views.

// ---- STATE ----

let calInitialised = false;  // has the calendar been rendered at least once?
let selectedTripId = null;   // the trip currently selected in the action sheet
let planningMode   = false;  // is the user in "add a new trip" mode?
let planStart      = null;   // first date tapped in planning mode
let planEnd        = null;   // second date tapped in planning mode
let affectedTripId = null;   // a future trip that would be broken by a new booking

// ---- PLANNING MODE ----

function enterPlanningMode() {
    planningMode = true;
    planStart = null;
    planEnd   = null;
    document.getElementById('cal-page-footer').style.display = 'none';
    document.getElementById('cal-plan-footer').style.display = 'flex';
    document.getElementById('cal-plan-status').innerText = 'Tap a start date';
    setCalSaveBtn(false);
    renderCalendar(window.allTrips);
}

function exitPlanningMode() {
    planningMode = false;
    planStart = null;
    planEnd   = null;
    document.getElementById('cal-page-footer').style.display = 'flex';
    document.getElementById('cal-plan-footer').style.display = 'none';
    renderCalendar(window.allTrips);
}

function setCalSaveBtn(enabled) {
    const btn = document.getElementById('cal-plan-save-btn');
    btn.disabled    = !enabled;
    btn.style.opacity = enabled ? '1' : '0.3';
}

function onPlanningDayTap(dateStr) {
    const today = todayStr();

    if (!planStart) {
        // First tap — set the start date
        planStart = dateStr;
        planEnd   = null;
        setCalSaveBtn(false);
        document.getElementById('cal-plan-status').innerText = 'Now tap an end date';
        renderCalendar(window.allTrips);

    } else if (dateStr === planStart) {
        // Tapping the start date again cancels the selection
        planStart = null;
        planEnd   = null;
        setCalSaveBtn(false);
        document.getElementById('cal-plan-status').innerText = 'Tap a start date';
        renderCalendar(window.allTrips);

    } else if (dateStr < planStart) {
        // Tapping before the start resets the start to this earlier date
        planStart = dateStr;
        planEnd   = null;
        setCalSaveBtn(false);
        document.getElementById('cal-plan-status').innerText = 'Now tap an end date';
        renderCalendar(window.allTrips);

    } else {
        // Second tap — set the end date
        // For future dates, check the trip wouldn't exceed 90 days used
        if (dateStr > today) {
            const tempTrip = { entry: planStart, exit: dateStr };
            const status = SchengenEngine.calculateStatus(
                [...window.allTrips, tempTrip],
                new Date(`${dateStr}T12:00:00`)
            );
            if (status.used > 90) return; // silently block — the cell shows red
        }

        planEnd = dateStr;
        const d1     = planStart.split('-');
        const d2     = planEnd.split('-');
        const nights = daysBetween(
            new Date(`${planStart}T12:00:00`),
            new Date(`${planEnd}T12:00:00`)
        );
        document.getElementById('cal-plan-status').innerText =
            `${d1[2]}/${d1[1]} — ${d2[2]}/${d2[1]} · ${nights} night${nights !== 1 ? 's' : ''}`;
        setCalSaveBtn(true);
        renderCalendar(window.allTrips);
    }
}

function saveCalPlanningTrip() {
    if (!planStart || !planEnd) return;

    const newTrip        = { entry: planStart, exit: planEnd, timestamp: Date.now() };
    const allTripsWithNew = [...window.allTrips, newTrip];
    affectedTripId = null;

    // Check if adding this trip would push any existing future trip over the limit
    const futurePlannedTrips = window.allTrips.filter(t => t.entry > todayStr());
    for (const ft of futurePlannedTrips) {
        const exitDate = new Date(`${ft.exit}T12:00:00`);
        const status   = SchengenEngine.calculateStatus(allTripsWithNew, exitDate);
        if (status.used > 90) {
            affectedTripId = ft.id;
            const d1 = ft.entry.split('-');
            const d2 = ft.exit.split('-');
            document.getElementById('cal-warn-message').innerText =
                `Your trip from ${d1[2]}/${d1[1]}/${d1[0]} to ${d2[2]}/${d2[1]}/${d2[0]} ` +
                `would now exceed your Schengen allowance. Please review and amend it.`;
            break;
        }
    }

    window.db.ref('trips').push(newTrip);
    exitPlanningMode();

    // If a conflict was found, show the warning sheet after a short delay
    if (affectedTripId) {
        setTimeout(() => {
            document.getElementById('cal-overlay').style.display = 'block';
            document.getElementById('cal-warn-sheet').style.display = 'block';
        }, 400);
    }
}

function scrollToAffectedTrip() {
    closeCalAll();
    if (!affectedTripId) return;
    const trip = window.allTrips.find(t => t.id === affectedTripId);
    if (!trip) return;

    setTimeout(() => {
        const [y, m] = trip.entry.split('-');
        for (const block of document.querySelectorAll('#cal-container .month-block')) {
            const label = block.querySelector('.month-label');
            if (label) {
                const monthDate = new Date(`${y}-${m}-01T12:00:00`);
                const monthName = monthDate.toLocaleString('default', { month: 'long' });
                if (label.innerText.includes(monthName) && label.innerText.includes(y)) {
                    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    flashAffectedTrip(trip);
                    break;
                }
            }
        }
    }, 300);
}

function flashAffectedTrip(trip) {
    document.querySelectorAll('#cal-container .day-cell').forEach(cell => {
        const ds = cell.getAttribute('data-date');
        if (ds && ds >= trip.entry && ds <= trip.exit) {
            cell.style.outline = '3px solid #f97316';
            cell.style.outlineOffset = '2px';
            setTimeout(() => {
                cell.style.outline = '';
                cell.style.outlineOffset = '';
            }, 2500);
        }
    });
}

// ---- INFO STRIP (the two stat pills at the top of the calendar) ----

function updateCalInfoStrip(trips) {
    const today = todayStr();
    const now   = new Date(`${today}T12:00:00`);
    const res   = SchengenEngine.calculateStatus(trips);

    // Days remaining pill
    const remEl = document.getElementById('cal-info-remaining');
    if (remEl) {
        remEl.innerText    = res.remaining;
        remEl.style.color  = res.remaining >= 50 ? '#2ED573'
                           : res.remaining >= 20 ? '#f97316'
                           : '#ef4444';
    }

    // Contextual status pill
    const sorted      = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
    const currentTrip = sorted.find(t => today >= t.entry && today <= t.exit);
    const nextTrip    = sorted.find(t => t.entry > today);
    const labelEl     = document.getElementById('cal-info-status-label');
    const valueEl     = document.getElementById('cal-info-status-value');

    if (currentTrip) {
        const days = daysBetween(now, new Date(`${currentTrip.exit}T12:00:00`));
        labelEl.innerText    = 'Days Left in Spain';
        valueEl.innerText    = days === 0 ? 'Last day!' : `${days} day${days !== 1 ? 's' : ''}`;
        valueEl.style.color  = '#2ED573';

    } else if (res.remaining === 0) {
        // Find the earliest date Matt could return
        let test = new Date(now);
        for (let i = 0; i < 180; i++) {
            if (SchengenEngine.calculateStatus(trips, test).remaining > 0) {
                const d = test.toISOString().split('T')[0].split('-');
                labelEl.innerText   = 'Earliest Return';
                valueEl.innerText   = `${d[2]}/${d[1]}/${d[0]}`;
                valueEl.style.color = '#ef4444';
                break;
            }
            test.setDate(test.getDate() + 1);
        }

    } else if (nextTrip) {
        const days = daysBetween(now, new Date(`${nextTrip.entry}T12:00:00`));
        labelEl.innerText   = 'Next Trip';
        valueEl.innerText   = days === 0 ? 'Today!' : `${days} day${days !== 1 ? 's' : ''}`;
        valueEl.style.color = '#00A8FF';

    } else {
        labelEl.innerText   = 'Can Travel';
        valueEl.innerText   = 'Any time!';
        valueEl.style.color = '#2ED573';
    }
}

// ---- PLANNING MODE CELL COLOURS ----

function getPlanningClass(dateStr) {
    const today = todayStr();
    if (!planStart)                                       return 'plan-blank';
    if (dateStr === planStart)                            return 'plan-selected';
    if (planEnd && dateStr > planStart && dateStr <= planEnd) return 'plan-range';
    if (dateStr < planStart)                              return 'plan-blank';

    // Future dates: check whether adding this end date would breach 90 days
    if (dateStr > today) {
        const tempTrip = { entry: planStart, exit: dateStr };
        const status   = SchengenEngine.calculateStatus(
            [...window.allTrips, tempTrip],
            new Date(`${dateStr}T12:00:00`)
        );
        return status.used > 90 ? 'plan-red' : 'plan-green';
    }

    return 'plan-green'; // past dates after the start are always selectable
}

// ---- CALENDAR RENDER ----

function renderCalendar(trips, scrollToToday = false) {
    const container = document.getElementById('cal-container');
    container.innerHTML = '';

    const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const today       = todayStr();
    const now         = new Date();

    // Render 6 months back and 12 months forward
    for (let offset = -6; offset <= 12; offset++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const year      = monthDate.getFullYear();
        const month     = monthDate.getMonth();
        const monthName = monthDate.toLocaleString('default', { month: 'long' });

        const block = document.createElement('div');
        block.className = 'month-block';
        if (offset === 0) block.id = 'cal-current-month';

        const label = document.createElement('div');
        label.className  = 'month-label';
        label.innerText  = `${monthName} ${year}`;
        block.appendChild(label);

        const grid = document.createElement('div');
        grid.className = 'day-grid';

        // Day-of-week headers
        DAY_HEADERS.forEach(h => {
            const hEl = document.createElement('div');
            hEl.className = 'day-header';
            hEl.innerText = h;
            grid.appendChild(hEl);
        });

        // Empty cells before the 1st of the month
        const firstDay = new Date(year, month, 1).getDay();
        for (let i = 0; i < firstDay; i++) {
            const empty = document.createElement('div');
            empty.className = 'day-cell day-empty';
            grid.appendChild(empty);
        }

        // Day cells
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const cell    = document.createElement('div');
            cell.setAttribute('data-date', dateStr);
            cell.innerText = d;

            const tripOnDay = trips.find(t => dateStr >= t.entry && dateStr <= t.exit);

            if (planningMode) {
                if (tripOnDay) {
                    // Existing trips shown dimmed and untappable during planning
                    let cls = dateStr < today ? 'day-past'
                            : dateStr === today ? 'day-current'
                            : 'day-future';
                    if (dateStr === today) cls += ' day-today';
                    cell.className    = `day-cell ${cls}`;
                    cell.style.opacity = '0.35';
                    cell.style.cursor  = 'not-allowed';
                } else {
                    const cls = getPlanningClass(dateStr);
                    cell.className = `day-cell ${cls}`;
                    if (cls !== 'plan-red') cell.onclick = () => onPlanningDayTap(dateStr);
                }
            } else {
                let cls = 'day-blank';
                if (tripOnDay) {
                    cls = dateStr < today ? 'day-past'
                        : dateStr === today ? 'day-current'
                        : 'day-future';
                }
                if (dateStr === today) cls += ' day-today';
                cell.className = `day-cell ${cls}`;
                if (tripOnDay) cell.onclick = () => openCalActionSheet(tripOnDay);
            }

            grid.appendChild(cell);
        }

        block.appendChild(grid);
        container.appendChild(block);
    }

    // Scroll to current month on first load or explicit request
    if (scrollToToday) {
        setTimeout(() => {
            const cur = document.getElementById('cal-current-month');
            if (cur) cur.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
}

// ---- ACTION SHEET (tap an existing trip) ----

function openCalActionSheet(trip) {
    selectedTripId = trip.id;
    const d1 = trip.entry.split('-');
    const d2 = trip.exit.split('-');
    document.getElementById('cal-action-title').innerText =
        `${d1[2]}.${d1[1]}.${d1[0]} — ${d2[2]}.${d2[1]}.${d2[0]}`;
    document.getElementById('cal-overlay').style.display    = 'block';
    document.getElementById('cal-action-sheet').style.display = 'block';
}

function deleteCalTrip() {
    if (!selectedTripId) return;
    if (confirm('Permanently delete this trip?')) {
        window.db.ref('trips').child(selectedTripId).remove();
        closeCalAll();
    }
}

function editCalTrip() {
    const trip = window.allTrips.find(t => t.id === selectedTripId);
    if (!trip) return;
    document.getElementById('cal-action-sheet').style.display = 'none';
    document.getElementById('cal-add-title').innerText        = 'Edit Trip';
    document.getElementById('cal-input-entry').value          = trip.entry;
    document.getElementById('cal-input-exit').value           = trip.exit;
    document.getElementById('cal-add-sheet').style.display    = 'block';
}

function saveCalEditTrip() {
    const entry = document.getElementById('cal-input-entry').value;
    const exit  = document.getElementById('cal-input-exit').value;
    if (!entry || !exit)  { alert('Please set both dates.');              return; }
    if (exit < entry)     { alert('Exit date must be after entry date.'); return; }
    window.db.ref('trips').child(selectedTripId).update({ entry, exit });
    closeCalAll();
}

function closeCalAll() {
    document.getElementById('cal-overlay').style.display      = 'none';
    document.getElementById('cal-action-sheet').style.display = 'none';
    document.getElementById('cal-add-sheet').style.display    = 'none';
    document.getElementById('cal-warn-sheet').style.display   = 'none';
    selectedTripId = null;
}

// ---- EVENT LISTENERS ----

window.addEventListener('tripsUpdated', () => {
    if (currentView === 'calendar') {
        updateCalInfoStrip(window.allTrips);
        renderCalendar(window.allTrips);
    }
});

window.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'calendar') {
        if (planningMode) exitPlanningMode(); // reset if coming back mid-plan
        if (window.allTrips) {
            updateCalInfoStrip(window.allTrips);
            renderCalendar(window.allTrips, !calInitialised);
            calInitialised = true;
        }
    } else if (planningMode) {
        // If the user navigates away during planning mode, reset it silently
        exitPlanningMode();
    }
});
