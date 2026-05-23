// ==============================================
// PLAN.JS  —  Plan View Hub
// ==============================================
// Three sections, shown contextually:
//
//   1. ETIAS BANNER — always visible (launch imminent)
//   2. PRE-TRIP CHECKLIST — appears when next trip
//      is within 7 days. Resets each new trip.
//      State saved in localStorage per trip date.
//   3. NIGHT SUGGESTOR — always visible.
//      Enter desired nights, get earliest valid date.

// ---- ETIAS ----
// ETIAS is the EU pre-travel authorisation for UK citizens.
// Expected to launch Q4 2026. After that date the banner
// message changes to prompt Matt to actually apply.

const ETIAS_LAUNCH_DATE = new Date('2026-10-01');
const ETIAS_APPLY_URL   = 'https://travel-europe.europa.eu/etias_en';

function updateEtiasSection() {
    const isLive   = new Date() >= ETIAS_LAUNCH_DATE;
    const titleEl  = document.getElementById('plan-etias-title');
    const bodyEl   = document.getElementById('plan-etias-body');
    const linkEl   = document.getElementById('plan-etias-link');
    if (!titleEl) return;

    if (isLive) {
        titleEl.innerText = '⚠️ ETIAS Required';
        bodyEl.innerText  = 'You now need an ETIAS authorisation before travelling to Spain. Apply online — it takes a few minutes and costs €7.';
        linkEl.style.display = 'block';
    } else {
        titleEl.innerText = 'ℹ️ ETIAS — Coming Soon';
        bodyEl.innerText  = 'From Q4 2026, UK travellers will need an ETIAS pre-travel authorisation (like the US ESTA) before entering Spain. No action needed yet — but worth knowing.';
        linkEl.style.display = 'none';
    }
}

// ---- PRE-TRIP CHECKLIST ----

const CHECKLIST_ITEMS = [
    { id: 1,  text: 'Check passport is valid'          },
    { id: 2,  text: 'Apply for ETIAS'                  },
    { id: 3,  text: 'Check travel insurance is current'},
    { id: 4,  text: 'Online check-in done'             },
    { id: 5,  text: 'Boarding passes downloaded'       },
    { id: 6,  text: 'Airport parking booked'           },
    { id: 7,  text: 'Benji care arranged'              },
    { id: 8,  text: 'Let bank know travel dates'       },
    { id: 9,  text: "Renée's shopping list sorted"     },
    { id: 10, text: 'Transport from airport arranged'  },
    { id: 11, text: 'GHIC card packed'                 },
];

// localStorage key is based on trip entry date so the checklist
// automatically resets for each new trip
function storageKey(tripEntry) {
    return `checklist_${tripEntry}`;
}

function getCheckedIds(tripEntry) {
    const raw = localStorage.getItem(storageKey(tripEntry));
    return raw ? JSON.parse(raw) : [];
}

function saveCheckedIds(tripEntry, ids) {
    localStorage.setItem(storageKey(tripEntry), JSON.stringify(ids));
}

function toggleItem(tripEntry, itemId) {
    const ids = getCheckedIds(tripEntry);
    const idx = ids.indexOf(itemId);
    if (idx >= 0) ids.splice(idx, 1);
    else ids.push(itemId);
    saveCheckedIds(tripEntry, ids);
    renderChecklist(tripEntry);
}

function renderChecklist(tripEntry) {
    const container = document.getElementById('plan-checklist-items');
    if (!container) return;

    const checked = getCheckedIds(tripEntry);
    container.innerHTML = '';

    CHECKLIST_ITEMS.forEach(item => {
        const isDone = checked.includes(item.id);
        const el     = document.createElement('div');
        el.className = `checklist-item${isDone ? ' done' : ''}`;
        el.onclick   = () => toggleItem(tripEntry, item.id);
        el.innerHTML = `
            <div class="checklist-box">
                ${isDone
                    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="#000" stroke-width="3.5"
                            stroke-linecap="round" stroke-linejoin="round">
                           <polyline points="20 6 9 17 4 12"/>
                       </svg>`
                    : ''}
            </div>
            <span class="checklist-label">${item.text}</span>
        `;
        container.appendChild(el);
    });

    // Update the progress count
    const countEl = document.getElementById('plan-checklist-count');
    if (countEl) {
        countEl.innerText = `${checked.length} of ${CHECKLIST_ITEMS.length} done`;
    }
}

// ---- SUGGESTOR ----

let planDesiredNights = 14;
let planFoundEntry    = null;
let planFoundExit     = null;

function changePlanNights(delta) {
    planDesiredNights = Math.max(1, Math.min(90, planDesiredNights + delta));
    document.getElementById('plan-nights-display').innerText = planDesiredNights;
    findEarliestDeparture();
}

function findEarliestDeparture() {
    if (!window.allTrips) return;

    planFoundEntry = null;
    planFoundExit  = null;

    const resultCard = document.getElementById('plan-result-card');
    if (resultCard) resultCard.style.opacity = '0.3';

    let testDate = new Date();
    testDate.setHours(12, 0, 0, 0);

    for (let i = 0; i < 365; i++) {
        const entryStr = testDate.toISOString().split('T')[0];
        const exitDate = new Date(testDate);
        exitDate.setDate(exitDate.getDate() + planDesiredNights - 1);
        const exitStr  = exitDate.toISOString().split('T')[0];

        const status = SchengenEngine.calculateStatus(
            [...window.allTrips, { entry: entryStr, exit: exitStr }],
            exitDate
        );

        if (status.used <= 90) {
            planFoundEntry = entryStr;
            planFoundExit  = exitStr;
            displayPlanResult(testDate, exitDate);
            return;
        }
        testDate.setDate(testDate.getDate() + 1);
    }

    // No window found in the next year
    document.getElementById('plan-result-date').innerText  = 'No window found';
    document.getElementById('plan-result-range').innerText = 'Try a shorter stay';
    if (resultCard) resultCard.style.opacity = '1';
}

function displayPlanResult(entry, exit) {
    document.getElementById('plan-result-date').innerText =
        entry.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('plan-result-range').innerText =
        `Return on ${exit.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const card = document.getElementById('plan-result-card');
    if (card) card.style.opacity = '1';
}

function savePlanSuggestion() {
    if (!planFoundEntry || !planFoundExit || !window.db) return;
    if (confirm(`Save trip?\n${toUKDate(planFoundEntry)} — ${toUKDate(planFoundExit)}`)) {
        window.db.ref('trips').push({
            entry:     planFoundEntry,
            exit:      planFoundExit,
            timestamp: Date.now()
        });
        showView('calendar');
    }
}

// ---- UPDATE PLAN VIEW ----

function updatePlanView(trips) {
    const today  = todayStr();
    const now    = new Date(`${today}T12:00:00`);
    const sorted = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
    const nextTrip = sorted.find(t => t.entry > today);

    // Update remaining days pill
    const res   = SchengenEngine.calculateStatus(trips, now);
    const remEl = document.getElementById('plan-remaining');
    if (remEl) {
        remEl.innerText   = res.remaining;
        remEl.style.color = res.remaining >= 50 ? '#2ED573'
                          : res.remaining >= 20 ? '#f97316'
                          : '#ef4444';
    }

    // ETIAS section
    updateEtiasSection();

    // Checklist section — show when next trip is within 7 days
    const checklistSection  = document.getElementById('plan-checklist-section');
    const checklistTitle    = document.getElementById('plan-checklist-title');
    if (checklistSection) {
        if (nextTrip) {
            const daysToTrip = daysBetween(now, new Date(`${nextTrip.entry}T12:00:00`));
            if (daysToTrip >= 0 && daysToTrip <= 7) {
                checklistSection.style.display = 'contents';
                if (checklistTitle) {
                    checklistTitle.innerText = daysToTrip === 0
                        ? '✈️ Travel day checklist'
                        : `✈️ ${daysToTrip} day${daysToTrip !== 1 ? 's' : ''} to go — checklist`;
                }
                renderChecklist(nextTrip.entry);
            } else {
                checklistSection.style.display = 'none';
            }
        } else {
            checklistSection.style.display = 'none';
        }
    }

    // Suggestor
    document.getElementById('plan-nights-display').innerText = planDesiredNights;
    findEarliestDeparture();
}

// ---- EVENT LISTENERS ----

window.addEventListener('tripsUpdated', () => {
    if (currentView === 'plan') updatePlanView(window.allTrips);
});

window.addEventListener('viewChanged', (e) => {
    if (e.detail.view === 'plan' && window.allTrips) {
        updatePlanView(window.allTrips);
    }
});
