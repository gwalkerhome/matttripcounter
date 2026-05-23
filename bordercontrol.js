// ==============================================
// BORDERCONTROL.JS  —  Border Control View
// ==============================================
// A clean, professional, read-only screen for showing
// at the immigration desk. No images, no animations.
// Three language modes selectable at the bottom.

// ---- LANGUAGE STATE ----

let bcLanguage = 'en';

const BC_LABELS = {
    en: {
        title:       'Schengen Entry Record',
        inSchengen:  'In Schengen Zone',
        outSchengen: 'Outside Schengen',
        daysUsed:    'Days Used',
        daysLeft:    'Days Left',
        of90:        'of 90',
        window:      'Current 180-Day Window',
        from:        'From',
        today:       'Today',
        trips:       'Trips in Window',
        nights:      n => `${n} night${n !== 1 ? 's' : ''}`,
        partial:     'partial window',
        noTrips:     'No trips in this window',
        now:         'Now',
        locale:      'en-GB',
    },
    es: {
        title:       'Registro de Entrada Schengen',
        inSchengen:  'En Zona Schengen',
        outSchengen: 'Fuera de Schengen',
        daysUsed:    'Días Usados',
        daysLeft:    'Días Restantes',
        of90:        'de 90',
        window:      'Ventana Actual de 180 Días',
        from:        'Desde',
        today:       'Hoy',
        trips:       'Viajes en la Ventana',
        nights:      n => `${n} noche${n !== 1 ? 's' : ''}`,
        partial:     'ventana parcial',
        noTrips:     'Sin viajes en esta ventana',
        now:         'Ahora',
        locale:      'es-ES',
    },
    fr: {
        title:       'Registre d\'Entrée Schengen',
        inSchengen:  'Dans l\'Espace Schengen',
        outSchengen: 'Hors de l\'Espace Schengen',
        daysUsed:    'Jours Utilisés',
        daysLeft:    'Jours Restants',
        of90:        'sur 90',
        window:      'Fenêtre Actuelle de 180 Jours',
        from:        'Du',
        today:       'Aujourd\'hui',
        trips:       'Voyages dans la Fenêtre',
        nights:      n => `${n} nuit${n !== 1 ? 's' : ''}`,
        partial:     'fenêtre partielle',
        noTrips:     'Aucun voyage dans cette fenêtre',
        now:         'Maintenant',
        locale:      'fr-FR',
    }
};

// ---- LANGUAGE TOGGLE ----

function setBcLanguage(lang) {
    bcLanguage = lang;
    document.querySelectorAll('.bc-flag').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    if (window.allTrips) updateBorderView(window.allTrips);
}

// ---- MAIN UPDATE FUNCTION ----

function updateBorderView(trips) {
    const L     = BC_LABELS[bcLanguage];
    const today = todayStr();
    const now   = new Date(`${today}T12:00:00`);

    // Helper: set inner text of an element by id
    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };

    // -- Update all translatable labels --
    setTxt('bc-label-title',  L.title);
    setTxt('bc-label-used',   L.daysUsed);
    setTxt('bc-label-of90',   L.of90);
    setTxt('bc-label-left',   L.daysLeft);
    setTxt('bc-label-window', L.window);
    setTxt('bc-label-from',   L.from);
    setTxt('bc-label-today',  L.today);
    setTxt('bc-label-trips',  L.trips);

    // -- Today's date (localised to selected language) --
    const dateEl = document.getElementById('bc-today-date');
    if (dateEl) {
        dateEl.innerText = now.toLocaleDateString(L.locale, {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // -- Current Schengen status --
    const sorted      = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
    const currentTrip = sorted.find(t => today >= t.entry && today <= t.exit);
    const inSchengen  = !!currentTrip;

    const statusColour = inSchengen ? '#2ED573' : '#00A8FF';
    const statusBg     = inSchengen ? 'rgba(46,213,115,0.1)' : 'rgba(0,168,255,0.1)';

    const statusLabelEl = document.getElementById('bc-status-label');
    const statusDotEl   = document.getElementById('bc-status-dot');
    const statusCardEl  = document.getElementById('bc-status-card');

    if (statusLabelEl) statusLabelEl.innerText      = inSchengen ? L.inSchengen : L.outSchengen;
    if (statusDotEl)   statusDotEl.style.background = statusColour;
    if (statusCardEl) {
        statusCardEl.style.borderColor = statusColour;
        statusCardEl.style.background  = statusBg;
    }

    // -- Days used / remaining --
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

    // -- 180-day rolling window --
    const windowStart    = new Date(now);
    windowStart.setDate(windowStart.getDate() - 179);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    const windowStartEl = document.getElementById('bc-window-start');
    const windowEndEl   = document.getElementById('bc-window-end');
    if (windowStartEl) windowStartEl.innerText = toUKDate(windowStartStr);
    if (windowEndEl)   windowEndEl.innerText   = toUKDate(today);

    // -- Trip list: trips that overlap the 180-day window --
    const windowTrips = sorted.filter(t => t.exit >= windowStartStr);
    const listEl = document.getElementById('bc-trip-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (windowTrips.length === 0) {
        listEl.innerHTML = `
            <p style="color:rgba(255,255,255,0.35); font-size:0.75rem; font-weight:700;
                      text-align:center; padding:16px 0; text-transform:uppercase;
                      letter-spacing:0.08em;">
                ${L.noTrips}
            </p>`;
        return;
    }

    // Most recent trip first
    [...windowTrips].reverse().forEach(t => {
        const isCurrent = today >= t.entry && today <= t.exit;
        const nights    = daysBetween(
            new Date(`${t.entry}T12:00:00`),
            new Date(`${t.exit}T12:00:00`)
        );
        // Schengen days: clamp entry to window start, count both entry and exit day
        const countedFrom  = t.entry < windowStartStr ? windowStartStr : t.entry;
        const schengenDays = daysBetween(
            new Date(`${countedFrom}T12:00:00`),
            new Date(`${t.exit}T12:00:00`)
        ) + 1;
        const partial = t.entry < windowStartStr;

        const row = document.createElement('div');
        row.className = 'bc-trip-row';
        row.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:3px; flex:1;">
                <span style="font-size:0.85rem; font-weight:900; color:#fff; letter-spacing:-0.01em;">
                    ${toUKDate(t.entry)} — ${toUKDate(t.exit)}
                </span>
                <span style="font-size:0.52rem; font-weight:700; text-transform:uppercase;
                             letter-spacing:0.08em; color:rgba(255,255,255,0.45);">
                    ${L.nights(nights)}${partial ? ' · ' + L.partial : ''}
                </span>
            </div>
            <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
                ${isCurrent
                    ? `<span style="font-size:0.42rem; font-weight:900; text-transform:uppercase;
                                   letter-spacing:0.1em; background:#2ED573; color:#000;
                                   padding:3px 8px; border-radius:6px;">${L.now}</span>`
                    : ''}
                <span style="font-size:1rem; font-weight:900; color:rgba(255,255,255,0.65);
                             min-width:30px; text-align:right;">
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
