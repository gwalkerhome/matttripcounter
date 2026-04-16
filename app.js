// Firebase Configuration (Ensure this matches your other pages)
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
        
        // Use a tiny timeout to ensure the HTML elements exist before updating
        setTimeout(() => {
            updateUI(status);
        }, 100);
    });
}

function calculateSchengenStatus(trips) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = formatDate(today);

    let daysUsed = 0;
    let currentlyInSpain = false;

    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - 180);

    trips.forEach(trip => {
        // Handle Matt being in Spain today
        if (todayStr >= trip.entry && todayStr <= trip.exit) {
            currentlyInSpain = true;
        }

        // 180-day calculation
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
    // 1. FIX BACKGROUND: Target the 'bg-home' class specifically
    const body = document.body;
    
    // Ensure the path to the images is correct. 
    // If they are in the root folder, use the filenames directly.
    const bgImage = status.inSpain ? "sp1.jpg" : "uk1.jpg";
    body.style.backgroundImage = `url('${bgImage}')`;
    body.style.backgroundSize = "cover";
    body.style.backgroundPosition = "center";

    // 2. Update Circle Numbers
    const dayCountEl = document.getElementById('day-count');
    const statusTextEl = document.getElementById('status-text');

    if (dayCountEl) {
        dayCountEl.innerText = status.daysRemaining;
    }
    if (statusTextEl) {
        statusTextEl.innerText = status.inSpain ? "Days Left in Spain" : "Days Available";
    }
}

// Helper to match YYYY-MM-DD format
function formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
}

// Start the logic
initializeAppLogic();
