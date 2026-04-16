// --- STORAGE LOGIC ---

// --- YOUR FIXED FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
  authDomain: "matttrip-56a17.firebaseapp.com",
  projectId: "matttrip-56a17",
  storageBucket: "matttrip-56a17.firebasestorage.app",
  messagingSenderId: "1046960982511",
  appId: "1:1046960982511:web:9d4e506dbc94b52fab8e1a"
};

// Initialize Firebase immediately
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- SETUP LOGIC ---

function checkSetup() {
    const aiKey = localStorage.getItem('gemini_api_key');
    if (!aiKey) {
        document.getElementById('dashboard-screen').classList.add('hidden');
        document.getElementById('setup-screen').classList.remove('hidden');
    } else {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        calculateAndDisplayStatus();
    }
}

function saveSettings() {
    const aiKey = document.getElementById('ai-key-input').value;

    if (aiKey) {
        localStorage.setItem('gemini_api_key', aiKey);
        window.location.reload();
    } else {
        alert("Please paste your Gemini API Key.");
    }
}

function clearSettings() {
    if(confirm("Are you sure you want to reset your API key?")) {
        localStorage.clear();
        window.location.reload();
    }
}

// --- CORE CALCULATIONS ---

async function calculateAndDisplayStatus() {
    const snapshot = await db.collection('trips').get();
    let trips = [];
    snapshot.forEach(doc => trips.push(doc.data()));

    // Total days in last 180 days logic
    const today = new Date();
    const hundredEightyDaysAgo = new Date();
    hundredEightyDaysAgo.setDate(today.getDate() - 180);

    let daysUsed = 0;
    trips.forEach(trip => {
        let start = new Date(trip.entry);
        let end = new Date(trip.exit);
        
        // Only count if within the 180-day window
        if (end > hundredEightyDaysAgo) {
            let actualStart = start < hundredEightyDaysAgo ? hundredEightyDaysAgo : start;
            let diff = Math.ceil((end - actualStart) / (1000 * 60 * 60 * 24)) + 1;
            daysUsed += diff;
        }
    });

    const daysRemaining = 90 - daysUsed;
    updateUI(daysRemaining);
}

function updateUI(days) {
    const countElement = document.getElementById('days-count');
    const circle = document.getElementById('gauge-progress');
    const statusMsg = document.getElementById('status-message');
    const body = document.getElementById('main-body');

    countElement.innerText = days;
    const offset = 251.2 - (days / 90) * 251.2;
    circle.style.strokeDashoffset = offset;

    // Change Background based on days left
    if (days > 60) {
        body.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('assets/uk4.jpg')";
        statusMsg.innerText = "Looking good, Matt! Lots of time left.";
    } else if (days > 20) {
        body.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('assets/sp1.jpg')";
        statusMsg.innerText = "Enjoying the sun!";
    } else {
        body.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('assets/sp4.jpg')";
        statusMsg.innerText = "Running low! Better start packing...";
        circle.classList.replace('text-orange-400', 'text-red-500');
    }
}

window.onload = checkSetup;
