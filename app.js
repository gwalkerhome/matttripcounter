// ==============================================
// APP.JS  —  Firebase · Router · Shared Utilities
// ==============================================
// This file does three things:
//   1. Connects to Firebase and listens for trip data
//   2. Controls which view (screen) is shown
//   3. Provides small helper functions used by all views

// ---- FIREBASE SETUP ----

const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

window.db = firebase.database();

// ---- SHARED UTILITY FUNCTIONS ----

// Returns today's date as a YYYY-MM-DD string
function todayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Converts YYYY-MM-DD to DD/MM/YYYY for display
function toUKDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// Returns the number of whole days between two Date objects
function daysBetween(a, b) {
    return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// ---- ROUTER ----

const VALID_VIEWS = ['home', 'calendar', 'trips', 'plan', 'border'];
let currentView = 'home';

function showView(name) {
    if (!VALID_VIEWS.includes(name)) name = 'home';

    // Show the correct view, hide the rest
    document.querySelectorAll('.view').forEach(v => v.classList.remove('view-active'));
    document.getElementById(`view-${name}`).classList.add('view-active');

    // Highlight the correct nav tab
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.nav-tab[data-view="${name}"]`).classList.add('active');

    currentView = name;
    history.replaceState(null, '', `#${name}`);

    // Tell all view scripts which view just became active
    window.dispatchEvent(new CustomEvent('viewChanged', { detail: { view: name } }));
}

// ---- FIREBASE LISTENER ----
// Fires whenever trip data changes in the database

window.db.ref('trips').on('value', (snap) => {
    const trips = [];
    snap.forEach(child => {
        const val = child.val();
        if (val.entry) trips.push({ ...val, id: child.key });
    });

    window.allTrips = trips;

    // Tell all view scripts that trip data has updated
    window.dispatchEvent(new CustomEvent('tripsUpdated'));
});

// ---- INITIALISE ON PAGE LOAD ----

window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.replace('#', '');
    showView(VALID_VIEWS.includes(hash) ? hash : 'home');

    // Register the service worker (enables future push notifications)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.warn('Service worker registration failed:', err));
    }
});
