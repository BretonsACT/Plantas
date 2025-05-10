// --- Variables Globales y Constantes ---
const API_KEY = 'TU_API_KEY_DE_OPENWEATHERMAP';
const plantsListDiv = document.getElementById('plantsList');
const addPlantButton = document.getElementById('addPlantButton');
const plantModal = document.getElementById('plantModal');
const modalTitle = document.getElementById('modalTitle');
const closeButton = document.querySelector('.close-button');
const savePlantButton = document.getElementById('savePlantButton');
const plantIdInput = document.getElementById('plantIdInput');
const plantNameInput = document.getElementById('plantName');
const plantFrequencyInput = document.getElementById('plantFrequency');

let plants = []; // Array para guardar las plantas
let editingPlantId = null; // Para saber si estamos editando

// --- Service Worker y Notificaciones (similar a antes) ---
if ('serviceWorker' in navigator) { /* ... */ }
function requestNotificationPermission() { /* ... */ }
requestNotificationPermission();

// --- Cargar y Mostrar Plantas ---
function loadPlants() {
    const storedPlants = localStorage.getItem('plants');
    if (storedPlants) {
        plants = JSON.parse(storedPlants);
    }
    renderPlants();
}

function renderPlants() {
    plantsListDiv.innerHTML = ''; // Limpiar lista
    if (plants.length === 0) {
        plantsListDiv.innerHTML = '<p>Aún no has añadido ninguna planta.</p>';
        return;
    }
    plants.forEach(plant => {
        const plantCard = document.createElement('div');
        plantCard.classList.add('plant-card');
        plantCard.dataset.id = plant.id;

        const nameEl = document.createElement('h2');
        nameEl.textContent = plant.name;

        const lastWateredEl = document.createElement('p');
        lastWateredEl.classList.add('last-watered');
        lastWateredEl.textContent = `Último riego: ${plant.lastWateredDate ? new Date(plant.lastWateredDate).toLocaleString() : 'Nunca'}`;

        const nextReminderEl = document.createElement('p');
        nextReminderEl.classList.add('next-reminder');
        nextReminderEl.textContent = `Próximo aviso: ${plant.nextReminderDate ? new Date(plant.nextReminderDate).toLocaleString() : 'Pendiente'}`;

        const baseFreqEl = document.createElement('p');
        baseFreqEl.classList.add('base-frequency');
        baseFreqEl.textContent = `Frecuencia base: ${plant.baseWateringFrequencyDays} días`;
        
        const tempInfoEl = document.createElement('p'); // Opcional, para mostrar temp. del último riego
        tempInfoEl.classList.add('temp-info');
        if (plant.temperatureAtLastWatering !== undefined) {
            tempInfoEl.textContent = `Temp. último riego: ${plant.temperatureAtLastWatering}°C`;
        }


        const waterButton = document.createElement('button');
        waterButton.classList.add('water-button');
        waterButton.textContent = '💧 Regada Hoy';
        waterButton.addEventListener('click', () => handleWaterPlant(plant.id));

        const editButton = document.createElement('button');
        editButton.classList.add('edit-plant-button');
        editButton.textContent = '✏️ Editar';
        editButton.addEventListener('click', () => openEditModal(plant));
        
        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-plant-button');
        deleteButton.textContent = '🗑️ Eliminar';
        deleteButton.addEventListener('click', () => handleDeletePlant(plant.id));

        plantCard.appendChild(nameEl);
        plantCard.appendChild(lastWateredEl);
        plantCard.appendChild(nextReminderEl);
        plantCard.appendChild(baseFreqEl);
        plantCard.appendChild(tempInfoEl);
        plantCard.appendChild(waterButton);
        plantCard.appendChild(editButton);
        plantCard.appendChild(deleteButton);
        plantsListDiv.appendChild(plantCard);
    });
}

// --- Lógica del Modal (Añadir/Editar) ---
addPlantButton.addEventListener('click', () => {
    editingPlantId = null;
    modalTitle.textContent = 'Añadir Nueva Planta';
    plantIdInput.value = '';
    plantNameInput.value = '';
    plantFrequencyInput.value = '';
    plantModal.style.display = 'block';
});

closeButton.addEventListener('click', () => {
    plantModal.style.display = 'none';
});

window.addEventListener('click', (event) => { // Cerrar modal si se clica fuera
    if (event.target == plantModal) {
        plantModal.style.display = 'none';
    }
});

savePlantButton.addEventListener('click', () => {
    const name = plantNameInput.value.trim();
    const frequency = parseInt(plantFrequencyInput.value);

    if (!name || isNaN(frequency) || frequency < 1) {
        alert('Por favor, introduce un nombre y una frecuencia de riego válida.');
        return;
    }

    if (editingPlantId) { // Editando planta existente
        const plantIndex = plants.findIndex(p => p.id === editingPlantId);
        if (plantIndex > -1) {
            plants[plantIndex].name = name;
            plants[plantIndex].baseWateringFrequencyDays = frequency;
            // Si se edita la frecuencia, se podría recalcular el próximo riego,
            // pero para simplificar, solo actualizamos los datos base.
            // El próximo riego se calculará cuando se marque como regada.
        }
    } else { // Añadiendo nueva planta
        const newPlant = {
            id: 'plant_' + Date.now(),
            name: name,
            photo: null, // Implementar subida de fotos es un paso adicional
            baseWateringFrequencyDays: frequency,
            lastWateredDate: null,
            nextReminderDate: null,
            temperatureAtLastWatering: null
        };
        plants.push(newPlant);
    }

    localStorage.setItem('plants', JSON.stringify(plants));
    renderPlants();
    plantModal.style.display = 'none';
    editingPlantId = null;
});

function openEditModal(plant) {
    editingPlantId = plant.id;
    modalTitle.textContent = 'Editar Planta';
    plantIdInput.value = plant.id;
    plantNameInput.value = plant.name;
    plantFrequencyInput.value = plant.baseWateringFrequencyDays;
    plantModal.style.display = 'block';
}

function handleDeletePlant(plantId) {
    if (confirm('¿Seguro que quieres eliminar esta planta?')) {
        plants = plants.filter(p => p.id !== plantId);
        localStorage.setItem('plants', JSON.stringify(plants));
        // Aquí también deberías cancelar cualquier notificación pendiente para esta planta si es posible.
        // Es más complejo si las notificaciones son solo timeouts en el SW sin IDs.
        // Por simplicidad, la notificación podría saltar pero el usuario verá que la planta ya no está.
        renderPlants();
    }
}


// --- Lógica de Riego (Adaptada) ---
async function handleWaterPlant(plantId) {
    const plantIndex = plants.findIndex(p => p.id === plantId);
    if (plantIndex === -1) return;

    const plant = plants[plantIndex];
    const now = new Date();
    plant.lastWateredDate = now.toISOString();

    console.log(`Regando ${plant.name} el:`, now.toLocaleString());

    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Valencia,ES&appid=${API_KEY}&units=metric`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const temp = data.main.temp;
        console.log('Temperatura actual en Valencia:', temp + '°C');

        plant.temperatureAtLastWatering = temp;

        const dayAdjustment = temp < 25 ? 1 : -1; // +1 día si <25, -1 día si >=25
        let effectiveFrequency = plant.baseWateringFrequencyDays + dayAdjustment;
        effectiveFrequency = Math.max(1, effectiveFrequency); // Asegurar al menos 1 día

        const reminderDate = new Date(now.getTime() + effectiveFrequency * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();

        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants(); // Actualiza la UI para esta planta

        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}!`,
            `Es hora de regar tu ${plant.name}. Temp. último riego: ${temp}°C. Frecuencia base: ${plant.baseWateringFrequencyDays} días.`
        );

    } catch (error) {
        console.error('Error fetching temperature or scheduling:', error);
        // Podrías poner un mensaje en la UI de la planta indicando el error
        // y quizás usar solo la frecuencia base sin ajuste de temperatura.
        const reminderDate = new Date(now.getTime() + plant.baseWateringFrequencyDays * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();
        plant.temperatureAtLastWatering = "Error";
        
        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants();
        
        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}! (sin ajuste de temp.)`,
            `Es hora de regar tu ${plant.name}. No se pudo obtener la temperatura.`
        );
    }
}

// --- Programar Notificación (sin cambios mayores, solo el mensaje) ---
function scheduleLocalNotification(date, title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Notifications not permitted or not supported.');
        return;
    }

    if (navigator.serviceWorker.controller) {
         navigator.serviceWorker.controller.postMessage({
             type: 'SCHEDULE_NOTIFICATION',
             // Asegúrate de que el SW pueda manejar un ID si quieres cancelar notificaciones.
             // Por ahora, el payload sigue siendo simple.
             payload: { reminderDate: date.toISOString(), title, body }
         });
         console.log(`Notification schedule request for "${title}" sent to SW.`);
    } else {
        const delay = new Date(date).getTime() - Date.now();
        if (delay > 0) {
            console.log(`Notification for "${title}" scheduled in ${delay / 1000 / 60} minutes (via page setTimeout)`);
            setTimeout(() => {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: 'icons/icon-192x192.png',
                        badge: 'icons/badge-72x72.png',
                        vibrate: [200, 100, 200]
                    });
                });
            }, delay);
        }
    }
}


// --- Carga Inicial ---
window.addEventListener('load', () => {
    loadPlants();
    // (Opcional) Chequear si hay recordatorios pasados al cargar la app
    // y notificar si el SW no lo hizo (aunque el SW debería ser el principal).
});
