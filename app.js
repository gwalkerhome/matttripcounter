// --- YOUR FIXED CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyB5l2JrkNaHqpg3KBCwyDW3UTBlv1QSrZo",
  authDomain: "matttrip-56a17.firebaseapp.com",
  projectId: "matttrip-56a17",
  storageBucket: "matttrip-56a17.firebasestorage.app",
  messagingSenderId: "1046960982511",
  appId: "1:1046960982511:web:9d4e506dbc94b52fab8e1a",
  // IMPORTANT: Added your specific Realtime Database URL
  databaseURL: "https://matttrip-56a17-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database(); // Changed from firestore() to database()

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

async function calculateAndDisplayStatus() {
    // Reading from Realtime Database
    db.ref('trips').on('value', (snapshot) => {
        let trips = [];
        snapshot.forEach(child => { trips.push(child.val()); });

        const today = new Date();
        const hundredEightyDaysAgo = new Date();
        hundredEightyDaysAgo.setDate(today.getDate() - 180);

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

        updateUI(90 - daysUsed);
    });
}

function updateUI(days) {
    const countElement = document.getElementById('days-count');
    const circle = document.getElementById('gauge-progress');
    const statusMsg = document.getElementById('status-message');
    const body = document.getElementById('main-body');

    countElement.innerText = days;
    const offset = 251.2 - (Math.max(0, days) / 90) * 251.2;
    circle.style.strokeDashoffset = offset;

    // Background logic based on allowance
    if (days > 60) {
        body.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('assets/uk4.jpg')";
        statusMsg.innerText = "Looking good, Matt! Lots of time left.";
    } else if (days > 20) {
        body.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('assets/sp1.jpg')";
        statusMsg.innerText = "Enjoying the sun!";
    } else {
        body.style.backgroundImage = "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('assets/sp4.jpg')";
        statusMsg.innerText = "Running low! Better start packing...";
        circle.classList.add('text-red-500');
    }
}

window.onload = checkSetup;
