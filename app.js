// app.js
// app.js

// --- Global Variables and Constants ---
const API_KEY_WEATHERAPI = '4c5750f21a1a4da398c222225252602'; // Your WeatherAPI Key
const plantsListDiv = document.getElementById('plantsList');
const addPlantButton = document.getElementById('addPlantButton');
const plantModal = document.getElementById('plantModal');
const modalTitle = document.getElementById('modalTitle');
const closeButton = document.querySelector('.modal .close-button'); // More specific selector for modal's close button
const savePlantButton = document.getElementById('savePlantButton');
const plantIdInput = document.getElementById('plantIdInput'); // Hidden input for plant ID when editing
const plantNameInput = document.getElementById('plantName');
const plantFrequencyInput = document.getElementById('plantFrequency');

let plants = []; // Array to store plant objects
let editingPlantId = null; // To track if we are editing an existing plant

// --- Service Worker and Notifications ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js') // Make sure sw.js is in the root
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
                alert('Las notificaciones son necesarias para los recordatorios. Por favor, habilítalas si deseas esta función.');
            }
        });
    } else {
        console.log('This browser does not support desktop notification');
    }
}

// --- Load and Display Plants ---
function loadPlants() {
    const storedPlants = localStorage.getItem('plants');
    if (storedPlants) {
        plants = JSON.parse(storedPlants);
    }
    renderPlants();
}

function renderPlants() {
    plantsListDiv.innerHTML = ''; // Clear current list

    if (plants.length === 0) {
        plantsListDiv.innerHTML = '<p>Aún no has añadido ninguna planta. ¡Haz clic en "Añadir Nueva Planta" para empezar!</p>';
        return;
    }

    plants.forEach(plant => {
        const plantCard = document.createElement('div');
        plantCard.classList.add('plant-card');
        plantCard.dataset.id = plant.id; // Store plant ID on the card

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

        const tempInfoEl = document.createElement('p');
        tempInfoEl.classList.add('temp-info');
        if (plant.temperatureAtLastWatering !== null && plant.temperatureAtLastWatering !== "Error API") {
            tempInfoEl.textContent = `Temp. último riego: ${plant.temperatureAtLastWatering}°C`;
        } else if (plant.temperatureAtLastWatering === "Error API") {
            tempInfoEl.textContent = `Temp. último riego: Error al obtener`;
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
        // Optional: Add plant.photo rendering here if implemented
        plantCard.appendChild(lastWateredEl);
        plantCard.appendChild(nextReminderEl);
        plantCard.appendChild(baseFreqEl);
        plantCard.appendChild(tempInfoEl);
        plantCard.appendChild(waterButton);

        const buttonGroup = document.createElement('div'); // Group edit and delete buttons
        buttonGroup.classList.add('button-group');
        buttonGroup.appendChild(editButton);
        buttonGroup.appendChild(deleteButton);
        plantCard.appendChild(buttonGroup);

        plantsListDiv.appendChild(plantCard);
    });
}

// --- Modal Logic (Add/Edit Plant) ---
function openModalForNewPlant() {
    editingPlantId = null; // Ensure we are in "add new" mode
    modalTitle.textContent = 'Añadir Nueva Planta';
    plantIdInput.value = ''; // Clear hidden ID field
    plantNameInput.value = '';
    plantFrequencyInput.value = '';
    // plantPhotoInput.value = ''; // If you have a photo input
    plantModal.style.display = 'block';
}

function openEditModal(plant) {
    editingPlantId = plant.id;
    modalTitle.textContent = 'Editar Planta';
    plantIdInput.value = plant.id; // Set hidden ID for saving
    plantNameInput.value = plant.name;
    plantFrequencyInput.value = plant.baseWateringFrequencyDays;
    // Populate photo input if you have one
    plantModal.style.display = 'block';
}

function closeModal() {
    plantModal.style.display = 'none';
}

function handleSavePlant() {
    const name = plantNameInput.value.trim();
    const frequency = parseInt(plantFrequencyInput.value);

    if (!name || isNaN(frequency) || frequency < 1) {
        alert('Por favor, introduce un nombre y una frecuencia de riego base válida (número de días mayor a 0).');
        return;
    }

    if (editingPlantId) { // Editing existing plant
        const plantIndex = plants.findIndex(p => p.id === editingPlantId);
        if (plantIndex > -1) {
            plants[plantIndex].name = name;
            plants[plantIndex].baseWateringFrequencyDays = frequency;
            // Note: If frequency changes, nextReminderDate might ideally be recalculated
            // or cleared, prompting a re-watering to set a new schedule.
            // For simplicity, we'll let the next watering recalculate it.
        }
    } else { // Adding new plant
        const newPlant = {
            id: 'plant_' + Date.now(), // Simple unique ID
            name: name,
            baseWateringFrequencyDays: frequency,
            lastWateredDate: null,
            nextReminderDate: null,
            temperatureAtLastWatering: null,
            // photo: null, // Store photo data if implementing
        };
        plants.push(newPlant);
    }

    localStorage.setItem('plants', JSON.stringify(plants));
    renderPlants();
    closeModal();
    editingPlantId = null; // Reset editing state
}

function handleDeletePlant(plantId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta planta y todos sus datos?')) {
        plants = plants.filter(p => p.id !== plantId);
        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants();
        // Consider canceling any pending notifications for this plant if your SW supports it via tags
    }
}

// --- Watering Logic & API Call ---
async function handleWaterPlant(plantId) {
    const plantIndex = plants.findIndex(p => p.id === plantId);
    if (plantIndex === -1) {
        console.error("Plant not found for watering:", plantId);
        return;
    }

    const plant = plants[plantIndex];
    const now = new Date();
    plant.lastWateredDate = now.toISOString();

    console.log(`Watering ${plant.name} on:`, now.toLocaleString());

    try {
        const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${API_KEY_WEATHERAPI}&q=Valencia&aqi=no`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        console.log('WeatherAPI Response:', data); // Good for debugging

        if (!data.current || typeof data.current.temp_c === 'undefined') {
            throw new Error('Temperature data (temp_c) not found in WeatherAPI response.');
        }
        const temp = data.current.temp_c;
        console.log('Current temperature in Valencia (WeatherAPI):', temp + '°C');
        plant.temperatureAtLastWatering = temp;

        const dayAdjustment = temp < 25 ? 1 : -1; // If temp < 25, add 1 day, else subtract 1 day
        let effectiveFrequency = plant.baseWateringFrequencyDays + dayAdjustment;
        effectiveFrequency = Math.max(1, effectiveFrequency); // Ensure frequency is at least 1 day

        const reminderDate = new Date(now.getTime() + effectiveFrequency * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();

        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}!`,
            `Es hora de regar tu ${plant.name}. Temp. último riego: ${temp}°C. (Base: ${plant.baseWateringFrequencyDays} días, Ajustado: ${effectiveFrequency} días)`
        );

    } catch (error) {
        console.error('Error fetching temperature or scheduling notification:', error);
        alert(`Error al obtener la temperatura: ${error.message}. Se usará la frecuencia base para el recordatorio.`);
        plant.temperatureAtLastWatering = "Error API";

        // Fallback: schedule reminder using base frequency without temperature adjustment
        const reminderDate = new Date(now.getTime() + plant.baseWateringFrequencyDays * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();
        
        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}! (sin ajuste de temp.)`,
            `Es hora de regar tu ${plant.name}. No se pudo obtener la temperatura.`
        );
    } finally {
        // Always save plants array and re-render, regardless of API success/failure for watering part
        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants();
    }
}

// --- Schedule Local Notification ---
function scheduleLocalNotification(date, title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Notifications not permitted or not supported. Reminder not scheduled.');
        // Optionally alert the user here if they expected a notification
        // alert('Las notificaciones no están permitidas. No se pudo programar el recordatorio.');
        return;
    }

    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            payload: {
                reminderDate: date.toISOString(), // Send as ISO string
                title,
                body
                // tag: `plant-reminder-${new Date(date).getTime()}` // Optional: for managing/canceling later
            }
        });
        console.log(`Notification schedule request for "${title}" sent to SW.`);
    } else {
        // Fallback if SW is not active (less reliable if page closes)
        const delay = new Date(date).getTime() - Date.now();
        if (delay > 0) {
            console.warn(`SW not active. Scheduling notification for "${title}" via page setTimeout (less reliable).`);
            setTimeout(() => {
                // This will only work if the page is still open.
                // For PWA, the SW should handle this.
                // To actually show it via SW if page is open but SW wasn't controller initially:
                navigator.serviceWorker.ready.then(registration => {
                     registration.showNotification(title, {
                        body: body,
                        icon: 'icons/icon-192x192.png', // Ensure this icon exists
                        badge: 'icons/badge-72x72.png' // Ensure this icon exists
                    });
                });
            }, delay);
        } else {
            console.log(`Reminder for "${title}" is in the past. Not scheduling via page setTimeout.`);
        }
    }
}


// --- Event Listeners ---
// Ensure these are set up after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Modal Event Listeners
    if (addPlantButton) {
        addPlantButton.addEventListener('click', openModalForNewPlant);
    } else {
        console.error("Add Plant Button not found");
    }

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    } else {
        console.error("Modal Close Button not found");
    }

    if (savePlantButton) {
        savePlantButton.addEventListener('click', handleSavePlant);
    } else {
        console.error("Save Plant Button not found");
    }

    // Close modal if clicked outside of it
    window.addEventListener('click', (event) => {
        if (event.target === plantModal) {
            closeModal();
        }
    });

    // Initial setup
    requestNotificationPermission(); // Ask for permission early or at a more opportune time
    loadPlants(); // Load existing plants from localStorage and render them
});

// ... (resto de variables globales y funciones como loadPlants, modal logic, etc.)

function renderPlants() {
    plantsListDiv.innerHTML = ''; // Clear current list

    if (plants.length === 0) {
        plantsListDiv.innerHTML = '<p>Aún no has añadido ninguna planta. ¡Haz clic en "Añadir Nueva Planta" para empezar!</p>';
        return;
    }

    const now = new Date();
    const oneDayInMilliseconds = 24 * 60 * 60 * 1000;

    // Clonar y Ordenar el array de plantas
    const sortedPlants = [...plants].sort((a, b) => {
        const aNextReminder = a.nextReminderDate ? new Date(a.nextReminderDate) : null;
        const bNextReminder = b.nextReminderDate ? new Date(b.nextReminderDate) : null;

        // Plantas sin fecha de recordatorio van al final
        if (!aNextReminder && !bNextReminder) return 0;
        if (!aNextReminder) return 1;
        if (!bNextReminder) return -1;

        const aTimeDiff = aNextReminder.getTime() - now.getTime();
        const bTimeDiff = bNextReminder.getTime() - now.getTime();

        // Prioridad 1: Riego pasado (rojo)
        const aIsOverdue = aTimeDiff < 0;
        const bIsOverdue = bTimeDiff < 0;
        if (aIsOverdue && !bIsOverdue) return -1;
        if (!aIsOverdue && bIsOverdue) return 1;
        if (aIsOverdue && bIsOverdue) return aTimeDiff - bTimeDiff; // La más pasada primero

        // Prioridad 2: Riego mañana (amarillo)
        const aIsDueTomorrow = aTimeDiff >= 0 && aTimeDiff < oneDayInMilliseconds;
        const bIsDueTomorrow = bTimeDiff >= 0 && bTimeDiff < oneDayInMilliseconds;
        if (aIsDueTomorrow && !bIsDueTomorrow) return -1;
        if (!aIsDueTomorrow && bIsDueTomorrow) return 1;
        if (aIsDueTomorrow && bIsDueTomorrow) return aTimeDiff - bTimeDiff; // La que toca antes mañana

        // Resto: por fecha de próximo riego
        return aTimeDiff - bTimeDiff;
    });


    sortedPlants.forEach(plant => {
        const plantCard = document.createElement('div');
        plantCard.classList.add('plant-card');
        plantCard.dataset.id = plant.id;

        // Lógica de coloreado
        if (plant.nextReminderDate) {
            const nextReminderTime = new Date(plant.nextReminderDate).getTime();
            const currentTime = now.getTime();
            const timeDifference = nextReminderTime - currentTime;

            if (timeDifference < 0) {
                plantCard.classList.add('needs-water-urgent'); // Rojo - Ya pasó
            } else if (timeDifference < oneDayInMilliseconds) {
                plantCard.classList.add('needs-water-soon'); // Amarillo - Falta 1 día o menos
            }
        }

        // ... (resto del código para crear el contenido de la tarjeta: nameEl, lastWateredEl, etc. SIN CAMBIOS)
        const nameEl = document.createElement('h2');
        nameEl.textContent = plant.name;

        const lastWateredEl = document.createElement('p');
        lastWateredEl.classList.add('last-watered');
        lastWateredEl.textContent = `Último riego: ${plant.lastWateredDate ? new Date(plant.lastWateredDate).toLocaleString() : 'Nunca'}`;

        const nextReminderEl = document.createElement('p');
        nextReminderEl.classList.add('next-reminder');
        nextReminderEl.textContent = `Próximo aviso: ${plant.nextReminderDate ? new Date(plant.nextReminderDate).toLocaleString() : 'Pendiente'}`;
        
        // Aplicar estilo al texto de "Próximo aviso" si es relevante
        if (plantCard.classList.contains('needs-water-urgent') || plantCard.classList.contains('needs-water-soon')) {
            nextReminderEl.style.fontWeight = 'bold';
        }


        const baseFreqEl = document.createElement('p');
        baseFreqEl.classList.add('base-frequency');
        baseFreqEl.textContent = `Frecuencia base: ${plant.baseWateringFrequencyDays} días`;

        const tempInfoEl = document.createElement('p');
        tempInfoEl.classList.add('temp-info');
        if (plant.temperatureAtLastWatering !== null && plant.temperatureAtLastWatering !== "Error API") {
            tempInfoEl.textContent = `Temp. último riego: ${plant.temperatureAtLastWatering}°C`;
        } else if (plant.temperatureAtLastWatering === "Error API") {
            tempInfoEl.textContent = `Temp. último riego: Error al obtener`;
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

        const buttonGroup = document.createElement('div');
        buttonGroup.classList.add('button-group');
        buttonGroup.appendChild(editButton);
        buttonGroup.appendChild(deleteButton);
        plantCard.appendChild(buttonGroup);

        plantsListDiv.appendChild(plantCard);
    });
}

// No olvides que handleWaterPlant, handleSavePlant, etc., llaman a renderPlants() al final
// para que la lista se actualice con el nuevo orden y colores.
