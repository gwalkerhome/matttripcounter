// ==============================================
// BORDERCONTROL.JS  —  Border Control View
// ==============================================
// Professional screen for showing at the immigration desk.
// passport-style background (border.png), fixed header,
// scrollable trip table, language toggle at the bottom.
//
// The current visit IS included in the table (labelled
// "Current Visit") so the guard sees the complete picture.

// ---- LANGUAGE STATE ----

let bcLanguage = 'en';

const BC_LABELS = {
    en: {
        heading:      'Border Information',
        tableTitle:   'Time Inside Schengen Area',
        tableSub:     'Previous 180 Days',
        daysUsed:     'Total Days Used',
        daysLeft:     'Days Remaining',
        thisVisit:    'Current Visit',
        nights:       n => `${n} night${n !== 1 ? 's' : ''}`,
        partial:      'partial window',
        noTrips:      'No trips recorded in this window',
        locale:       'en-GB',
    },
    es: {
        heading:      'Información de Frontera',
        tableTitle:   'Tiempo en el Área Schengen',
        tableSub:     'Últimos 180 Días',
        daysUsed:     'Total de Días Usados',
        daysLeft:     'Días Restantes',
        thisVisit:    'Visita Actual',
        nights:       n => `${n} noche${n !== 1 ? 's' : ''}`,
        partial:      'ventana parcial',
        noTrips:      'Sin viajes registrados en esta ventana',
        locale:       'es-ES',
    },
    fr: {
        heading:      'Information Frontalière',
        tableTitle:   'Temps dans l\'Espace Schengen',
        tableSub:     '180 Derniers Jours',
        daysUsed:     'Total des Jours Utilisés',
        daysLeft:     'Jours Restants',
        thisVisit:    'Visite en Cours',
        nights:       n => `${n} nuit${n !== 1 ? 's' : ''}`,
        partial:      'fenêtre partielle',
        noTrips:      'Aucun voyage enregistré dans cette fenêtre',
        locale:       'fr-FR',
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

    // Helper
    const setTxt = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };

    // -- Translatable labels --
    setTxt('bc-heading',     L.heading);
    setTxt('bc-table-title', L.tableTitle);
    setTxt('bc-table-sub',   L.tableSub);
    setTxt('bc-label-used',  L.daysUsed);
    setTxt('bc-label-left',  L.daysLeft);

    // -- Today's date (localised) --
    const dateEl = document.getElementById('bc-today-date');
    if (dateEl) {
        dateEl.innerText = now.toLocaleDateString(L.locale, {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    // -- 180-day window --
    const windowStart    = new Date(now);
    windowStart.setDate(windowStart.getDate() - 179);
    const windowStartStr = windowStart.toISOString().split('T')[0];

    const sorted      = [...trips].sort((a, b) => new Date(a.entry) - new Date(b.entry));
    const windowTrips = sorted.filter(t => t.exit >= windowStartStr);

    // -- Trip table --
    const listEl = document.getElementById('bc-trip-list');
    if (listEl) {
        listEl.innerHTML = '';

        if (windowTrips.length === 0) {
            listEl.innerHTML = `
                <div style="padding:16px 0; text-align:center;
                            font-size:0.7rem; font-weight:700;
                            text-transform:uppercase; letter-spacing:0.08em;
                            color:rgba(255,255,255,0.35);">
                    ${L.noTrips}
                </div>`;
        } else {
            // Most recent trip at the top
            [...windowTrips].reverse().forEach(t => {
                const isCurrent   = today >= t.entry && today <= t.exit;
                const nights      = daysBetween(
                    new Date(`${t.entry}T12:00:00`),
                    new Date(`${t.exit}T12:00:00`)
                );
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
                        <div style="font-size:0.48rem; font-weight:700;
                                    text-transform:uppercase; letter-spacing:0.08em;
                                    color:rgba(255,255,255,0.5); margin-top:3px; display:flex;
                                    align-items:center; gap:6px; flex-wrap:wrap;">
                            ${L.nights(nights)}${partial ? ' · ' + L.partial : ''}
                            ${isCurrent
                                ? `<span style="background:#2ED573; color:#000; padding:1px 7px;
                                               border-radius:5px; font-size:0.42rem; font-weight:900;
                                               letter-spacing:0.1em;">${L.thisVisit}</span>`
                                : ''}
                        </div>
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
    }

    // -- Totals --
    // Total = all Schengen days in the 180-day window (includes current visit)
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
