// --- CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
  authDomain: "matttrip-56a17.firebaseapp.com",
  projectId: "matttrip-56a17",
  storageBucket: "matttrip-56a17.firebasestorage.app",
  messagingSenderId: "1046960982511",
  appId: "1:1046960982511:web:9d4e506dbc94b52fab8e1a",
  databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function checkSetup() {
    const aiKey = localStorage.getItem('gemini_api_key');
    if (!aiKey) {
        document.getElementById('dashboard-screen').classList.add('hidden');
        document.getElementById('setup-screen').classList.remove('hidden');
    } else {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        fetchDataAndRender();
    }
}

async function fetchDataAndRender() {
    db.ref('trips').on('value', (snapshot) => {
        let trips = [];
        snapshot.forEach(child => { trips.push(child.val()); });
        
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // 1. Calculate Schengen Days (Standard 180-day rolling window)
        const hundredEightyDaysAgo = new Date();
        hundredEightyDaysAgo.setDate(now.getDate() - 180);
        let daysUsed = 0;
        trips.forEach(trip => {
            let start = new Date(trip.entry);
            let end = new Date(trip.exit);
            if (end > hundredEightyDaysAgo) {
                let actualStart = start < hundredEightyDaysAgo ? hundredEightyDaysAgo : start;
                let diff = Math.ceil((end - actualStart) / (1000 * 60 * 60 * 24)) + 1;
                daysUsed += diff;
            }
        });

        // 2. Determine Background Image based on Gary's Rules
        let bgImage = "uk1.jpg"; // Default
        let activeTrip = trips.find(t => todayStr >= t.entry && todayStr <= t.exit);
        let nextTrip = trips.filter(t => t.entry > todayStr).sort((a,b) => new Date(a.entry) - new Date(b.entry))[0];
        
        if (activeTrip) {
            if (todayStr === activeTrip.entry) bgImage = "uk-sp.jpg";
            else if (todayStr === activeTrip.exit) bgImage = "sp-uk.jpg";
            else if (tomorrowStr === activeTrip.exit) bgImage = "sp4.jpg";
            else {
                // Percentage of trip completed
                const start = new Date(activeTrip.entry);
                const end = new Date(activeTrip.exit);
                const progress = (now - start) / (end - start);
                if (progress < 0.33) bgImage = "sp1.jpg";
                else if (progress < 0.66) bgImage = "sp2.jpg";
                else bgImage = "sp3.jpg";
            }
        } else {
            // In UK
            if (nextTrip && tomorrowStr === nextTrip.entry) {
                bgImage = "uk4.jpg";
            } else {
                // If no next trip, just cycle UK images based on day of month
                const day = now.getDate();
                if (day <= 10) bgImage = "uk1.jpg";
                else if (day <= 20) bgImage = "uk2.jpg";
                else bgImage = "uk3.jpg";
            }
        }

        updateUI(90 - daysUsed, bgImage);
    });
}

function updateUI(days, bg) {
    document.getElementById('days-count').innerText = days;
    const circle = document.getElementById('gauge-progress');
    const offset = 263.9 - (Math.max(0, days) / 90) * 263.9;
    circle.style.strokeDashoffset = offset;

    // Apply the smart background
    document.getElementById('main-body').style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4)), url('assets/${bg}')`;
    
    // Quick status message
    const msg = document.getElementById('status-message');
    if (bg.includes('sp')) msg.innerText = "Disfrutando de España!";
    else msg.innerText = "Back in the UK...";
}

function saveSettings() {
    const aiKey = document.getElementById('ai-key-input').value;
    if (aiKey) {
        localStorage.setItem('gemini_api_key', aiKey);
        window.location.reload();
    }
}

window.onload = checkSetup;
