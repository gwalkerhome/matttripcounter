// Firebase Configuration (Ensure this matches your other pages)
const firebaseConfig = {
    apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
    authDomain: "matttrip-56a17.firebaseapp.com",
    projectId: "matttrip-56a17",
    databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// THE HANDSHAKE: Listen for trip data and update the whole app
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
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    let daysUsed = 0;
    let currentlyInSpain = false;

    // 180-day window start
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 180);

    trips.forEach(trip => {
        const entry = new Date(trip.entry);
        const exit = new Date(trip.exit);

        // Check if Matt is currently there
        if (todayStr >= trip.entry && todayStr <= trip.exit) {
            currentlyInSpain = true;
        }

        // Calculate days in the last 180 days
        if (exit >= windowStart) {
            const actualStart = entry < windowStart ? windowStart : entry;
            const diffTime = Math.abs(exit - actualStart);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            daysUsed += diffDays;
        }
    });

    return {
        daysRemaining: 90 - daysUsed,
        inSpain: currentlyInSpain
    };
}

function updateUI(status) {
    // 1. Update Background Image
    // If in Spain, use sp1, sp2, or sp3. If in UK, use uk1, uk2, or uk3.
    const body = document.body;
    if (status.inSpain) {
        body.style.backgroundImage = "url('sp1.jpg')"; // You can randomize this later
        console.log("Status: Matt is in Spain.");
    } else {
        body.style.backgroundImage = "url('uk1.jpg')";
        console.log("Status: Matt is in the UK.");
    }

    // 2. Update the Counters (only if we are on index.html)
    const dayCountEl = document.getElementById('day-count');
    const statusTextEl = document.getElementById('status-text');

    if (dayCountEl) dayCountEl.innerText = status.daysRemaining;
    if (statusTextEl) {
        statusTextEl.innerText = status.inSpain ? "Days Left in Spain" : "Days Available";
    }
}

// Fire it up
initializeAppLogic();
