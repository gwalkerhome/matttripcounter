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
        now.setHours(0,0,0,0);
        const todayStr = now.toISOString().split('T')[0];
        
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // 1. Rolling 180-day Window Calculation
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

        // 2. Background Director Logic
        let bgImage = "uk1.jpg"; // Absolute fallback
        
        let activeTrip = trips.find(t => todayStr >= t.entry && todayStr <= t.exit);
        let nextTrip = trips.filter(t => t.entry > todayStr).sort((a,b) => new Date(a.entry) - new Date(b.entry))[0];

        if (activeTrip) {
            // SCENARIO: IN SPAIN (OR TRANSIT)
            if (todayStr === activeTrip.entry) {
                bgImage = "uk-sp.jpg"; // Day of travel to Spain
            } else if (todayStr === activeTrip.exit) {
                bgImage = "sp-uk.jpg"; // Day of travel to UK
            } else if (tomorrowStr === activeTrip.exit) {
                bgImage = "sp4.jpg"; // Day before leaving Spain
            } else {
                // Determine 1, 2, or 3 based on percentage of trip completed
                const start = new Date(activeTrip.entry);
                const end = new Date(activeTrip.exit);
                const totalDur = end - start;
                const elapsed = now - start;
                const percent = elapsed / totalDur;

                if (percent <= 0.33) bgImage = "sp1.jpg";
                else if (percent <= 0.66) bgImage = "sp2.jpg";
                else bgImage = "sp3.jpg";
            }
        } else {
            // SCENARIO: IN UK
            if (nextTrip && tomorrowStr === nextTrip.entry) {
                bgImage = "uk4.jpg"; // Day before travel to Spain
            } else if (nextTrip) {
                // He's in the UK but has a trip planned. 
                // We use your 1-3 logic for the "wait" time.
                // Or if you prefer simple rotation:
                const day = now.getDate();
                if (day <= 10) bgImage = "uk1.jpg";
                else if (day <= 20) bgImage = "uk2.jpg";
                else bgImage = "uk3.jpg";
            } else {
                // NO TRIP PLANNED
                bgImage = "uk1.jpg";
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
    const body = document.getElementById('main-body');
    body.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.1), rgba(0,0,0,0.4)), url('assets/${bg}')`;
    
    // Dynamic Status Message
    const msg = document.getElementById('status-message');
    if (bg === "uk-sp.jpg") msg.innerText = "Safe travels to Spain, Matt!";
    else if (bg === "sp-uk.jpg") msg.innerText = "Heading home today!";
    else if (bg.startsWith('sp')) msg.innerText = "Enjoying the Spanish sun!";
    else if (bg === "uk4.jpg") msg.innerText = "Exciting! You leave tomorrow.";
    else msg.innerText = "Relaxing in the UK.";
}

function saveSettings() {
    const aiKey = document.getElementById('ai-key-input').value;
    if (aiKey) {
        localStorage.setItem('gemini_api_key', aiKey);
        window.location.reload();
    }
}

function clearSettings() {
    if(confirm("Reset API Key?")) {
        localStorage.clear();
        window.location.reload();
    }
}

window.onload = checkSetup;
