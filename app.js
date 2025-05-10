/// --- Variables Globales y Constantes ---
// const API_KEY_OPENWEATHERMAP = 'TU_API_KEY_DE_OPENWEATHERMAP'; // Ya no se usa
const API_KEY_WEATHERAPI = '4c5750f21a1a4da398c222225252602'; // ¡NUEVA API KEY!
const plantsListDiv = document.getElementById('plantsList');
const addPlantButton = document.getElementById('addPlantButton');
const plantModal = document.getElementById('plantModal');
const modalTitle = document.getElementById('modalTitle');
const closeButton = document.querySelector('.close-button');
const savePlantButton = document.getElementById('savePlantButton');
const plantIdInput = document.getElementById('plantIdInput');
const plantNameInput = document.getElementById('plantName');
const plantFrequencyInput = document.getElementById('plantFrequency');

let plants = [];
let editingPlantId = null;

// --- Service Worker y Notificaciones (sin cambios aquí, solo para mostrar contexto) ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('ServiceWorker registration successful with scope: ', registration.scope))
            .catch(error => console.log('ServiceWorker registration failed: ', error));
    });
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted.');
            } else {
                console.log('Notification permission denied.');
            }
        });
    }
}
requestNotificationPermission();

// --- Cargar y Mostrar Plantas (sin cambios aquí) ---
function loadPlants() { /* ... igual que antes ... */ }
function renderPlants() { /* ... igual que antes ... */ }

// --- Lógica del Modal (Añadir/Editar) (sin cambios aquí) ---
addPlantButton.addEventListener('click', () => { /* ... */ });
closeButton.addEventListener('click', () => { /* ... */ });
window.addEventListener('click', (event) => { /* ... */ });
savePlantButton.addEventListener('click', () => { /* ... */ });
function openEditModal(plant) { /* ... */ }
function handleDeletePlant(plantId) { /* ... */ }


// --- Lógica de Riego (Adaptada para WeatherAPI) ---
async function handleWaterPlant(plantId) {
    const plantIndex = plants.findIndex(p => p.id === plantId);
    if (plantIndex === -1) return;

    const plant = plants[plantIndex];
    const now = new Date();
    plant.lastWateredDate = now.toISOString();

    console.log(`Regando ${plant.name} el:`, now.toLocaleString());

    try {
        // CAMBIO: URL y parámetros para WeatherAPI
        const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${API_KEY_WEATHERAPI}&q=Valencia&aqi=no`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Intenta parsear el error JSON
            console.error('WeatherAPI Error Response:', errorData);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();

        // CAMBIO: Acceso a la temperatura
        const temp = data.current.temp_c;
        console.log('Temperatura actual en Valencia (WeatherAPI):', temp + '°C');

        plant.temperatureAtLastWatering = temp;

        const dayAdjustment = temp < 25 ? 1 : -1;
        let effectiveFrequency = plant.baseWateringFrequencyDays + dayAdjustment;
        effectiveFrequency = Math.max(1, effectiveFrequency);

        const reminderDate = new Date(now.getTime() + effectiveFrequency * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();

        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants();

        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}!`,
            `Es hora de regar tu ${plant.name}. Temp. último riego: ${temp}°C. Frecuencia base: ${plant.baseWateringFrequencyDays} días.`
        );

    } catch (error) {
        console.error('Error fetching temperature or scheduling:', error);
        // Fallback si la API falla
        const reminderDate = new Date(now.getTime() + plant.baseWateringFrequencyDays * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();
        plant.temperatureAtLastWatering = "Error API"; // Indicar que hubo un error

        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants();

        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}! (sin ajuste de temp.)`,
            `Es hora de regar tu ${plant.name}. No se pudo obtener la temperatura.`
        );
    }
}

// --- Programar Notificación (sin cambios aquí) ---
function scheduleLocalNotification(date, title, body) { /* ... igual que antes ... */ }

// --- Carga Inicial ---
window.addEventListener('load', () => {
    loadPlants();
});
