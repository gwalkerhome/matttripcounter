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

// ---- ETIAS NOTIFICATION ----
// Dismissible banner. Dismissed state is per-session only.
// When ETIAS goes live the notification is forced visible and cannot be dismissed.

const ETIAS_LAUNCH_DATE = new Date('2026-10-01');
const ETIAS_APPLY_URL   = 'https://travel-europe.europa.eu/etias_en';

// Session-only dismiss (resets each time app is opened)
let etiasNotifDismissed = false;

// Permanent dismiss key — cleared when ETIAS goes live so the live alert
// always breaks through regardless of prior dismissal
const ETIAS_PERM_KEY = 'etias_perm_dismiss_pre_launch';

function dismissEtiasNotification() {
    // Hides for this session only — shows again next time app opens
    etiasNotifDismissed = true;
    const notif = document.getElementById('plan-etias-notification');
    if (notif) notif.style.display = 'none';
}

function permanentlyDismissEtias() {
    localStorage.setItem(ETIAS_PERM_KEY, 'true');
    etiasNotifDismissed = true;
    const notif = document.getElementById('plan-etias-notification');
    if (notif) notif.style.display = 'none';
}

function updateEtiasSection() {
    const isLive  = new Date() >= ETIAS_LAUNCH_DATE;
    const titleEl = document.getElementById('plan-etias-title');
    const bodyEl  = document.getElementById('plan-etias-body');
    const linkEl  = document.getElementById('plan-etias-link');
    const notif   = document.getElementById('plan-etias-notification');
    if (!titleEl || !notif) return;

    if (isLive) {
        // ETIAS live — force visible regardless of any prior dismissal,
        // hide the "don't show again" option since action is now required
        titleEl.innerText    = '⚠️ ETIAS Required';
        bodyEl.innerText     = 'You now need an ETIAS authorisation before travelling to Spain. Apply online — it takes a few minutes and costs €7.';
        linkEl.style.display = 'block';
        notif.style.display  = 'flex';
        localStorage.removeItem(ETIAS_PERM_KEY); // clear pre-launch dismissal
        const permBtn = notif.querySelector('.plan-notif-permanent-dismiss');
        if (permBtn) permBtn.style.display = 'none';
    } else {
        titleEl.innerText    = 'ℹ️ ETIAS — Coming Soon';
        bodyEl.innerText     = 'From Q4 2026, UK travellers will need an ETIAS pre-travel authorisation (like the US ESTA) before entering Spain. No action needed yet — but worth knowing.';
        linkEl.style.display = 'none';
        // Hide if permanently dismissed OR session-dismissed
        const permDismissed = localStorage.getItem(ETIAS_PERM_KEY) === 'true';
        notif.style.display = (permDismissed || etiasNotifDismissed) ? 'none' : 'flex';
    }
}

// ---- DROPDOWN TOGGLE ----

function togglePlanDropdown(id) {
    const bodyId    = id === 'checklist' ? 'plan-checklist-body' : 'plan-help-body';
    const chevronId = id === 'checklist' ? 'checklist-chevron'   : 'help-chevron';
    const body      = document.getElementById(bodyId);
    const chevron   = document.getElementById(chevronId);
    if (!body) return;

    const isOpen = body.classList.toggle('open');
    if (chevron) chevron.classList.toggle('open', isOpen);
}

// ---- PLAN HELP OVERLAY ----

function openPlanHelpOverlay(title, contentHTML) {
    document.getElementById('plan-help-overlay-title').textContent = title;
    document.getElementById('plan-help-overlay-body').innerHTML = contentHTML;
    document.getElementById('plan-help-overlay').classList.add('open');
}

function closePlanHelpOverlay() {
    document.getElementById('plan-help-overlay').classList.remove('open');
}

function planHelpTap(item) {
    switch (item) {
        case 'schengen': showTripData();     break;
        case 'flights':  showFlightSearch(); break;
        case 'ryanair':  showRyanair();      break;
        case 'carhire':  showCarHire();      break;
        case 'news':     showTravelNews();   break;
        case 'claudia':  showClaudia();      break;
    }
}

// ---- HELPER: default date strings ----

function defaultDates() {
    const today = todayStr();
    const dep = new Date(); dep.setDate(dep.getDate() + 7);
    const ret = new Date(); ret.setDate(ret.getDate() + 21);
    return {
        today,
        dep: dep.toISOString().split('T')[0],
        ret: ret.toISOString().split('T')[0]
    };
}

// ---- HELPER: save / restore notepad ----

function saveHelpNotes(key) {
    const el = document.getElementById(`${key}-notepad`);
    if (!el) return;
    localStorage.setItem(`help_notes_${key}`, el.value);
    const btn = el.nextElementSibling;
    if (btn) { btn.textContent = 'Saved ✓'; setTimeout(() => { btn.textContent = 'Save Notes'; }, 1600); }
}

// ---- 1. MY SCHENGEN TRIP DATA ----

function showTripData() {
    const trips  = window.allTrips || [];
    const today  = todayStr();
    const now    = new Date(`${today}T12:00:00`);

    // Days remaining right now (past + current trips only)
    const pastAndCurrent = trips.filter(t => t.entry <= today);
    const nowStatus      = SchengenEngine.calculateStatus(pastAndCurrent, now);

    // Days remaining after all future planned trips complete
    const futureTrips = trips.filter(t => t.entry > today)
                             .sort((a, b) => new Date(a.exit) - new Date(b.exit));
    let afterStatus = nowStatus;
    if (futureTrips.length > 0) {
        const lastExit = new Date(`${futureTrips[futureTrips.length - 1].exit}T12:00:00`);
        afterStatus = SchengenEngine.calculateStatus(trips, lastExit);
    }

    // Trips inside the current 180-day window
    const windowStart = nowStatus.windowStart;
    const windowTrips = trips
        .filter(t => t.exit >= windowStart)
        .sort((a, b) => new Date(a.entry) - new Date(b.entry));

    // Build the two-number cards
    let cards = `
        <div class="schengen-numbers">
            <div class="schengen-number-card card-now">
                <span class="schengen-big-num">${nowStatus.remaining}</span>
                <span class="schengen-num-label">Right Now</span>
                <span class="schengen-num-desc">Based on trips already taken</span>
            </div>`;

    if (futureTrips.length > 0) {
        cards += `
            <div class="schengen-number-card card-after">
                <span class="schengen-big-num">${afterStatus.remaining}</span>
                <span class="schengen-num-label">After Planned Trips</span>
                <span class="schengen-num-desc">Once all booked trips are done</span>
            </div>`;
    }
    cards += `</div>`;

    // Plain-English explanation
    const explain = `
        <div class="help-section">
            <p class="help-section-title">How It Works</p>
            <p class="help-body-text">The Schengen rule allows a maximum of <strong>90 days</strong> in any rolling <strong>180-day window</strong>. Every time you check, the app counts every day spent in Spain over the last 180 days. Your remaining allowance is 90 minus that total.</p>
            ${futureTrips.length > 0
                ? `<p class="help-body-text">You have ${futureTrips.length} planned trip${futureTrips.length > 1 ? 's' : ''} ahead. The second number shows what will be left once those are done — useful for planning trips further ahead.</p>`
                : ''}
        </div>`;

    // Trip breakdown rows
    let rows = '';
    let usedInWindow = 0;
    windowTrips.forEach(t => {
        const entry   = new Date(`${t.entry}T12:00:00`);
        const exit    = new Date(`${t.exit}T12:00:00`);
        const capExit = exit > now ? now : exit;
        const days    = t.entry > today ? 0
                      : Math.ceil(Math.abs(capExit - (entry < new Date(`${windowStart}T12:00:00`) ? new Date(`${windowStart}T12:00:00`) : entry)) / 86400000) + 1;
        usedInWindow += days;

        const isCurrent = t.entry <= today && t.exit >= today;
        const isFuture  = t.entry > today;
        const badge     = isCurrent ? '🟢 Current' : isFuture ? '🔵 Planned' : '⚫ Past';
        const daysLabel = isFuture ? '–' : `${days}d`;

        rows += `
            <div class="trip-breakdown-row">
                <div>
                    <span class="trip-breakdown-badge">${badge}</span>
                    <span class="trip-breakdown-dates">${toUKDate(t.entry)} → ${toUKDate(t.exit)}</span>
                </div>
                <span class="trip-breakdown-days">${daysLabel}</span>
            </div>`;
    });

    const breakdown = windowTrips.length > 0 ? `
        <div class="help-section">
            <p class="help-section-title">Trips in Your 180-Day Window</p>
            <p class="help-body-text" style="font-size:0.58rem; color:rgba(255,255,255,0.35);">
                Window: ${toUKDate(windowStart)} → Today
            </p>
            <div class="trip-breakdown-list">${rows}</div>
            <div class="trip-breakdown-total">
                <span>Days Used</span>
                <span>${nowStatus.used} / 90</span>
            </div>
        </div>` : `
        <div class="help-section">
            <p class="help-body-text" style="color:rgba(255,255,255,0.35); text-align:center;">
                No Schengen trips in the last 180 days.
            </p>
        </div>`;

    openPlanHelpOverlay('My Schengen Data', `
        <div class="help-section">
            <p class="help-section-title">Your Days Remaining</p>
            ${cards}
        </div>
        ${explain}
        ${breakdown}
    `);
}

// ---- 2. CHECK FLIGHTS ----

function showFlightSearch() {
    const d = defaultDates();
    const saved = localStorage.getItem('help_notes_flights') || '';
    openPlanHelpOverlay('Check Flights', `
        <div class="help-section">
            <p class="help-section-title">East Midlands → Alicante</p>
            <div class="date-row">
                <div class="date-field">
                    <label>Depart</label>
                    <input type="date" id="fl-dep" value="${d.dep}" min="${d.today}">
                </div>
                <div class="date-field">
                    <label>Return</label>
                    <input type="date" id="fl-ret" value="${d.ret}" min="${d.today}">
                </div>
            </div>
        </div>
        <div class="help-section">
            <p class="help-section-title">Search</p>
            <div class="help-btn-stack">
                <button class="help-action-btn bg-blue" onclick="openFlightUrl('skyscanner')">Skyscanner</button>
                <button class="help-action-btn bg-green" onclick="openFlightUrl('google')">Google Flights</button>
            </div>
        </div>
        <div class="help-section">
            <p class="help-section-title">My Notes</p>
            <textarea id="flights-notepad" class="help-notepad" placeholder="Paste flight details, prices or reference numbers here…">${saved}</textarea>
            <button class="help-action-btn bg-yellow" onclick="saveHelpNotes('flights')">Save Notes</button>
        </div>
    `);
}

function openFlightUrl(provider) {
    const dep = document.getElementById('fl-dep').value;
    const ret = document.getElementById('fl-ret').value;
    if (!dep || !ret) return;
    let url;
    if (provider === 'skyscanner') {
        const d = dep.replace(/-/g, '').slice(2);
        const r = ret.replace(/-/g, '').slice(2);
        url = `https://www.skyscanner.net/transport/flights/ema/alc/${d}/${r}/`;
    } else {
        url = `https://www.google.com/travel/flights#flt=EMA.ALC.${dep}*ALC.EMA.${ret};c:GBP;e:1;sd:1;t:f`;
    }
    window.open(url, '_blank');
}

// ---- 3. RYANAIR ----

function showRyanair() {
    const d = defaultDates();
    const saved = localStorage.getItem('help_notes_ryanair') || '';
    openPlanHelpOverlay('Ryanair', `
        <div class="help-section">
            <p class="help-section-title">EMA → ALC</p>
            <p class="help-body-text">Opens Ryanair pre-filled with your dates. If you're already signed in on Safari, your account will be recognised automatically.</p>
            <div class="date-row">
                <div class="date-field">
                    <label>Outbound</label>
                    <input type="date" id="ry-dep" value="${d.dep}" min="${d.today}">
                </div>
                <div class="date-field">
                    <label>Return</label>
                    <input type="date" id="ry-ret" value="${d.ret}" min="${d.today}">
                </div>
            </div>
            <button class="help-action-btn" style="background:#073590;color:#fff;border-color:#000;box-shadow:3px 3px 0 #000; margin-top:4px;" onclick="openRyanairUrl()">
                Open Ryanair
            </button>
        </div>
        <div class="help-section">
            <p class="help-section-title">My Notes</p>
            <textarea id="ryanair-notepad" class="help-notepad" placeholder="Save flight reference numbers or prices here…">${saved}</textarea>
            <button class="help-action-btn bg-yellow" onclick="saveHelpNotes('ryanair')">Save Notes</button>
        </div>
    `);
}

function openRyanairUrl() {
    const dep = document.getElementById('ry-dep').value;
    const ret = document.getElementById('ry-ret').value;
    if (!dep || !ret) return;
    const url = `https://www.ryanair.com/gb/en/trip/flights/select?adults=1&teens=0&children=0&infants=0&dateOut=${dep}&dateIn=${ret}&isConnectedFlight=false&isReturn=true&discount=0&promoCode=&originIata=EMA&destinationIata=ALC&tpAdults=1&tpTeens=0&tpChildren=0&tpInfants=0&tpStartDate=${dep}&tpEndDate=${ret}&tpDiscount=0&tpPromoCode=&tpOriginIata=EMA&tpDestinationIata=ALC`;
    window.open(url, '_blank');
}

// ---- 4. CAR HIRE ----

function showCarHire() {
    const d = defaultDates();
    const saved = localStorage.getItem('help_notes_carhire') || '';
    openPlanHelpOverlay('Car Hire', `
        <div class="help-section">
            <p class="help-section-title">Alicante Airport</p>
            <div class="date-row">
                <div class="date-field">
                    <label>Pick Up</label>
                    <input type="date" id="ch-pick" value="${d.dep}" min="${d.today}">
                </div>
                <div class="date-field">
                    <label>Drop Off</label>
                    <input type="date" id="ch-drop" value="${d.ret}" min="${d.today}">
                </div>
            </div>
        </div>
        <div class="help-section">
            <p class="help-section-title">Search</p>
            <div class="help-btn-stack">
                <button class="help-action-btn bg-blue"  onclick="openCarUrl('rentalcars')">Rentalcars.com</button>
                <button class="help-action-btn bg-pink"  onclick="openCarUrl('kayak')">Kayak Car Hire</button>
            </div>
        </div>
        <div class="help-section">
            <p class="help-section-title">My Notes</p>
            <textarea id="carhire-notepad" class="help-notepad" placeholder="Save car hire quotes or booking references here…">${saved}</textarea>
            <button class="help-action-btn bg-yellow" onclick="saveHelpNotes('carhire')">Save Notes</button>
        </div>
    `);
}

function openCarUrl(provider) {
    const pick = document.getElementById('ch-pick').value;
    const drop = document.getElementById('ch-drop').value;
    if (!pick || !drop) return;
    const [py, pm, pd] = pick.split('-');
    const [dy, dm, dd] = drop.split('-');
    let url;
    if (provider === 'rentalcars') {
        url = `https://www.rentalcars.com/SearchResults.do?puCountry=ES&puStation=ALC&puDay=${pd}&puMonth=${pm}&puYear=${py}&doDay=${dd}&doMonth=${dm}&doYear=${dy}&puHour=12&puMinute=00&doHour=12&doMinute=00&driverAge=30&currency=GBP`;
    } else {
        url = `https://www.kayak.co.uk/cars/ALC-airport/${pick}/${drop}/`;
    }
    window.open(url, '_blank');
}

// ---- 5. TRAVEL NEWS ----

function showTravelNews() {
    openPlanHelpOverlay('Travel News', `
        <div class="help-section" style="align-items:center; padding-top:40px;">
            <p class="help-body-text" style="text-align:center; color:rgba(255,255,255,0.4);">
                Fetching latest news…
            </p>
        </div>
    `);
    fetchTravelNews();
}

async function fetchTravelNews() {
    const feeds = [
        'https://feeds.bbci.co.uk/news/world/europe/rss.xml',
        'https://www.theguardian.com/travel/rss'
    ];
    const relevantWords = ['spain','schengen','alicante','travel','passport','visa','border','flight','etias','uk','british','strike','airport'];
    const urgentWords   = ['strike','ban','emergency','closed','suspended','danger','warning','crisis','terror'];
    const cautionWords  = ['delay','change','new rules','update','advice','disruption','queue','congestion'];

    const results = [];

    for (const feed of feeds) {
        try {
            const resp = await fetch(
                `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}&count=25`
            );
            const data = await resp.json();
            if (data.status !== 'ok' || !data.items) continue;

            data.items.forEach(item => {
                const text = (item.title + ' ' + (item.description || '')).toLowerCase();
                if (!relevantWords.some(w => text.includes(w))) return;
                const isUrgent  = urgentWords.some(w => text.includes(w));
                const isCaution = cautionWords.some(w => text.includes(w));
                results.push({
                    title:  item.title,
                    link:   item.link,
                    date:   new Date(item.pubDate),
                    colour: isUrgent ? 'var(--pink)' : isCaution ? '#f97316' : 'var(--green)'
                });
            });
        } catch (e) { /* feed unavailable — skip silently */ }
    }

    const body = document.getElementById('plan-help-overlay-body');
    if (!body) return;

    if (results.length === 0) {
        body.innerHTML = `
            <div class="help-section" style="align-items:center; padding-top:40px;">
                <p class="help-body-text" style="text-align:center; color:rgba(255,255,255,0.35);">
                    No relevant travel news found right now.<br>Try again later.
                </p>
            </div>`;
        return;
    }

    results.sort((a, b) => b.date - a.date);

    let html = `
        <div class="help-section">
            <p class="help-section-title">Colour Guide</p>
            <div class="news-legend">
                <span style="color:var(--pink)">● Urgent</span>
                <span style="color:#f97316">● Caution</span>
                <span style="color:var(--green)">● Info</span>
            </div>
        </div>
        <div class="news-list">`;

    results.slice(0, 15).forEach(item => {
        const dateStr = item.date.toLocaleDateString('en-GB', { day:'numeric', month:'short' });
        html += `
            <a href="${item.link}" target="_blank" class="news-item" style="border-left-color:${item.colour};">
                <div class="news-content">
                    <span class="news-title">${item.title}</span>
                    <span class="news-date">${dateStr}</span>
                </div>
            </a>`;
    });

    html += `</div>`;
    body.innerHTML = html;
}

// ---- 6. CHAT WITH CLAUDIA (placeholder) ----

function showClaudia() {
    openPlanHelpOverlay('Chat with ClaudiA', `
        <div class="help-section" style="align-items:center; padding-top:60px;">
            <p class="help-body-text" style="text-align:center; color:rgba(255,255,255,0.4);">
                ClaudiA is coming soon.
            </p>
        </div>
    `);
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
    const today    = todayStr();
    const now      = new Date(`${today}T12:00:00`);
    const sorted   = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
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

    // ETIAS notification
    updateEtiasSection();

    // Checklist dropdown — always visible; title reflects days to next trip
    const checklistTitle = document.getElementById('plan-checklist-title');
    if (checklistTitle) {
        if (nextTrip) {
            const daysToTrip = daysBetween(now, new Date(`${nextTrip.entry}T12:00:00`));
            if (daysToTrip === 0) {
                checklistTitle.innerText = '✈️ Travel Day — Checklist';
            } else if (daysToTrip > 0 && daysToTrip <= 30) {
                checklistTitle.innerText =
                    `✈️ ${daysToTrip} Day${daysToTrip !== 1 ? 's' : ''} to Go — Checklist`;
            } else {
                checklistTitle.innerText = '✈️ Pre-Trip Checklist';
            }
            renderChecklist(nextTrip.entry);
        } else {
            checklistTitle.innerText = '✈️ Pre-Trip Checklist';
            renderChecklist('no-trip');
        }
    }
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
