const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

function initializeAppLogic() {
    db.ref('trips').on('value', (snapshot) => {
        const trips = [];
        snapshot.forEach(child => {
            trips.push(child.val());
        });
        const status = calculateSchengenStatus(trips);
        updateUI(status);
    });
}

function calculateSchengenStatus(trips) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

    let daysUsed = 0;
    let currentlyInSpain = false;

    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 180);

    trips.forEach(trip => {
        if (todayStr >= trip.entry && todayStr <= trip.exit) {
            currentlyInSpain = true;
        }
        const entry = new Date(trip.entry);
        const exit = new Date(trip.exit);
        if (exit >= windowStart) {
            const actualStart = entry < windowStart ? windowStart : entry;
            const diffTime = Math.abs(exit - actualStart);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            daysUsed += diffDays;
        }
    });

    return {
        daysRemaining: Math.max(0, 90 - daysUsed),
        inSpain: currentlyInSpain
    };
}

function updateUI(status) {
    // FIX 1: Correct Image Paths
    const bgImage = status.inSpain ? "assets/sp1.jpg" : "assets/uk1.jpg";
    document.body.style.backgroundImage = `url('${bgImage}')`;
    document.body.style.backgroundSize = "cover";
    document.body.style.backgroundPosition = "center";

    // FIX 2: Explicitly target IDs
    const dayCountEl = document.getElementById('day-count');
    const statusTextEl = document.getElementById('status-text');

    if (dayCountEl) {
        dayCountEl.innerText = status.daysRemaining;
    }
    if (statusTextEl) {
        statusTextEl.innerText = status.inSpain ? "Days Left in Spain" : "Days Available";
    }
}

// Ensure the page is ready before running
window.onload = initializeAppLogic;
