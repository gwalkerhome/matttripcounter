// --- STORAGE LOGIC ---

function checkSetup() {
    const config = localStorage.getItem('firebase_config');
    if (!config) {
        document.getElementById('dashboard-screen').classList.add('hidden');
        document.getElementById('setup-screen').classList.remove('hidden');
    } else {
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('dashboard-screen').classList.remove('hidden');
        startApp(JSON.parse(config));
    }
}

function saveSettings() {
    const configInput = document.getElementById('firebase-config-input').value;
    const aiKey = document.getElementById('ai-key-input').value;

    if (configInput && aiKey) {
        localStorage.setItem('firebase_config', configInput);
        localStorage.setItem('ai_api_key', aiKey);
        window.location.reload();
    } else {
        alert("Please fill in both fields.");
    }
}

function clearSettings() {
    if(confirm("Are you sure you want to clear your keys?")) {
        localStorage.clear();
        window.location.reload();
    }
}

// --- APP LOGIC ---

function startApp(config) {
    // Initialize Firebase
    firebase.initializeApp(config);
    const db = firebase.firestore();
    
    // For now, let's assume 45 days remaining for the visual test
    updateGauge(45);
    document.getElementById('status-message').innerText = "You have plenty of time left, Matt!";
}

function updateGauge(daysRemaining) {
    const totalLimit = 90;
    const countElement = document.getElementById('days-count');
    const circle = document.getElementById('gauge-progress');
    
    // Update Number
    countElement.innerText = daysRemaining;

    // Update Circle (251.2 is the full circumference)
    const offset = 251.2 - (daysRemaining / totalLimit) * 251.2;
    circle.style.strokeDashoffset = offset;

    // Change color based on urgency
    if (daysRemaining < 15) {
        circle.classList.replace('text-orange-400', 'text-red-500');
    }
}

// Run check on load
window.onload = checkSetup;
