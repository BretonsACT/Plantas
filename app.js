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
const plantPhotoInput = document.getElementById('plantPhotoInput'); // Input for plant photo

let plants = []; // Array to store plant objects
let editingPlantId = null; // To track if we are editing an existing plant
let nutritionLog = []; // Array to store nutrition log entries
let lastGlobalNutritionDate = null;
let lastGlobalVitaminDate = null;

// --- Service Worker and Notifications ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('ws.js') // Make sure ws.js is in the root
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

        // Display plant photo if available
        if (plant.photo) {
            const imgEl = document.createElement('img');
            imgEl.src = plant.photo;
            imgEl.alt = `Photo of ${plant.name}`;
            imgEl.style.maxWidth = '100%';
            imgEl.style.height = 'auto';
            imgEl.style.borderRadius = '8px'; // Consistent with card
            imgEl.style.marginBottom = '10px';
            plantCard.appendChild(imgEl); // Insert photo at the beginning of the card or after name
        }

        const lastWateredText = plant.lastWateredDate ? new Date(plant.lastWateredDate).toLocaleDateString() : 'Nunca';
        const nextReminderText = plant.nextReminderDate ? new Date(plant.nextReminderDate).toLocaleDateString() : 'Pendiente';

        const wateringInfoEl = document.createElement('p');
        wateringInfoEl.classList.add('watering-info');
        wateringInfoEl.textContent = `Riego: ${lastWateredText} / Próximo: ${nextReminderText}`;

        const baseFreqEl = document.createElement('p');
        baseFreqEl.classList.add('base-frequency');
        baseFreqEl.textContent = `Frec. base: ${plant.baseWateringFrequencyDays} días`; // Shorter label

        const tempInfoEl = document.createElement('p');
        tempInfoEl.classList.add('temp-info');
        if (plant.temperatureAtLastWatering !== null && plant.temperatureAtLastWatering !== "Error API") {
            tempInfoEl.textContent = `Max Temp (ciclo): ${plant.temperatureAtLastWatering}°C`; // Shorter label
        } else if (plant.temperatureAtLastWatering === "Error API") {
            tempInfoEl.textContent = `Max Temp (ciclo): Error API`; // Shorter label
        }


        const waterButton = document.createElement('button');
        waterButton.classList.add('water-button');
        waterButton.textContent = '💧 Regada'; // Shorter label
        waterButton.addEventListener('click', () => handleWaterPlant(plant.id));

        const editButton = document.createElement('button');
        editButton.classList.add('edit-plant-button');
        editButton.textContent = '✏️'; // Icon only
        editButton.title = 'Editar'; // Tooltip for accessibility

        const deleteButton = document.createElement('button');
        deleteButton.classList.add('delete-plant-button');
        deleteButton.textContent = '🗑️'; // Icon only
        deleteButton.title = 'Eliminar'; // Tooltip for accessibility

        plantCard.appendChild(nameEl);
        plantCard.appendChild(wateringInfoEl);
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
    if (plantPhotoInput) plantPhotoInput.value = ''; // Clear photo input
    plantModal.style.display = 'block';
}

function openEditModal(plant) {
    editingPlantId = plant.id;
    modalTitle.textContent = 'Editar Planta';
    plantIdInput.value = plant.id; // Set hidden ID for saving
    plantNameInput.value = plant.name;
    plantFrequencyInput.value = plant.baseWateringFrequencyDays;
    if (plantPhotoInput) plantPhotoInput.value = ''; // Clear photo input for re-selection
    plantModal.style.display = 'block';
}

function closeModal() {
    plantModal.style.display = 'none';
}

// New function to handle the actual saving of plant data
function savePlantData(name, frequency, photoDataURL, currentEditingPlantId) {
    if (currentEditingPlantId) { // Editing existing plant
        const plantIndex = plants.findIndex(p => p.id === currentEditingPlantId);
        if (plantIndex > -1) {
            plants[plantIndex].name = name;
            plants[plantIndex].baseWateringFrequencyDays = frequency;
            plants[plantIndex].photo = photoDataURL; // Update photo
            // Note: If frequency changes, nextReminderDate might ideally be recalculated
            // or cleared, prompting a re-watering to set a new schedule.
        }
    } else { // Adding new plant
        const newPlant = {
            id: 'plant_' + Date.now(), // Simple unique ID
            name: name,
            baseWateringFrequencyDays: frequency,
            lastWateredDate: null,
            nextReminderDate: null,
            temperatureAtLastWatering: null,
            photo: photoDataURL, // Store photo data
        };
        plants.push(newPlant);
    }

    localStorage.setItem('plants', JSON.stringify(plants));
    renderPlants();
    closeModal();
    editingPlantId = null; // Reset editing state (moved here from handleSavePlant)
}

function handleSavePlant() {
    const name = plantNameInput.value.trim();
    const frequency = parseInt(plantFrequencyInput.value);
    const photoFile = plantPhotoInput.files[0];

    if (!name || isNaN(frequency) || frequency < 1) {
        alert('Por favor, introduce un nombre y una frecuencia de riego base válida (número de días mayor a 0).');
        return;
    }

    let photoDataURL = null;
    // Preserve existing photo if editing and no new file is chosen
    if (editingPlantId) {
        const existingPlant = plants.find(p => p.id === editingPlantId);
        if (existingPlant) {
            photoDataURL = existingPlant.photo;
        }
    }

    if (photoFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
            photoDataURL = reader.result;
            savePlantData(name, frequency, photoDataURL, editingPlantId);
        };
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            alert('Error al leer la imagen. La planta se guardará sin foto.');
            savePlantData(name, frequency, photoDataURL, editingPlantId); // Save without new photo on error
        };
        reader.readAsDataURL(photoFile);
    } else {
        // No new photo file selected, save with existing (or null if new plant)
        savePlantData(name, frequency, photoDataURL, editingPlantId);
    }
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
        const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY_WEATHERAPI}&q=Valencia&days=2&aqi=no&alerts=no`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        console.log('WeatherAPI Forecast Response (2-day):', data); // Good for debugging

        let maxTemp;
        let tempSource = "today"; // To log the source of temperature

        // Try to get tomorrow's forecast
        if (data.forecast && data.forecast.forecastday && data.forecast.forecastday[1] && data.forecast.forecastday[1].day && typeof data.forecast.forecastday[1].day.maxtemp_c !== 'undefined') {
            maxTemp = data.forecast.forecastday[1].day.maxtemp_c;
            tempSource = "tomorrow's forecast";
            console.log(`Forecasted Max Temperature for ${tempSource} in Valencia (WeatherAPI):`, maxTemp + '°C');
        } 
        // Fallback to today's forecast if tomorrow's is not available
        else if (data.forecast && data.forecast.forecastday && data.forecast.forecastday[0] && data.forecast.forecastday[0].day && typeof data.forecast.forecastday[0].day.maxtemp_c !== 'undefined') {
            maxTemp = data.forecast.forecastday[0].day.maxtemp_c;
            tempSource = "today's forecast (fallback)";
            console.warn(`Tomorrow's forecast not available. Using ${tempSource} in Valencia (WeatherAPI):`, maxTemp + '°C');
        } 
        // If neither is available, throw an error
        else {
            throw new Error('Max temperature data (maxtemp_c) not found in WeatherAPI forecast response for today or tomorrow.');
        }
        
        plant.temperatureAtLastWatering = maxTemp; // Store forecasted max temp

        const dayAdjustment = maxTemp < 25 ? 1 : -1; // If maxTemp < 25, add 1 day, else subtract 1 day
        let effectiveFrequency = plant.baseWateringFrequencyDays + dayAdjustment;
        effectiveFrequency = Math.max(1, effectiveFrequency); // Ensure frequency is at least 1 day

        const reminderDate = new Date(now.getTime() + effectiveFrequency * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();

        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}!`,
            `Es hora de regar tu ${plant.name}. Max Temp. (${tempSource}): ${maxTemp}°C. (Base: ${plant.baseWateringFrequencyDays} días, Ajustado: ${effectiveFrequency} días)`
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
            `¡A regar tu ${plant.name}! (Error API Temp)`,
            `Es hora de regar tu ${plant.name}. No se pudo obtener la temperatura. Usando frecuencia base.`
        );
    } finally {
        // Always save plants array and re-render, regardless of API success/failure for watering part
        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants();
    }
}

// --- Schedule Local Notification ---
function scheduleLocalNotification(date, title, body, tag = `notification-${new Date(date).getTime()}`) { // ADDED tag parameter with default
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
                body,
                tag // Use the provided or generated tag
            }
        });
        console.log(`Notification schedule request for "${title}" with tag "${tag}" sent to SW.`);
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
document.addEventListener('DOMContentLoaded', async () => {
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
    loadNutritionLog(); // Load nutrition log from localStorage
    renderGlobalNutritionSummary(); // ADDED - Initial render of global nutrition summary
    await checkAndScheduleGeneralNutritionReminder(); // UPDATED
    await checkAndScheduleVitaminReminder(); // ADDED
    // populatePlantSelect(); // Populate the plant select dropdown in the nutrition tab - REMOVED

    // --- Nutrition Form Event Listener ---
    const nutritionForm = document.getElementById('nutritionForm');
    if (nutritionForm) {
        nutritionForm.addEventListener('submit', saveNutritionEntry);
    } else {
        console.error("Nutrition form not found.");
    }

    // --- Tab Switching Logic ---
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and hide all content
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none'; // Ensure content is hidden
            });

            // Add active class to clicked button
            button.classList.add('active');

            // Show corresponding tab content
            const tabId = button.getAttribute('data-tab');
            const activeTabContent = document.getElementById(tabId);
            if (activeTabContent) {
                activeTabContent.classList.add('active');
                activeTabContent.style.display = 'block'; // Or 'flex', etc. as needed
                // if (tabId === 'nutritionTab') { // REMOVED populatePlantSelect and renderVitaminSummary
                //     populatePlantSelect(); 
                //     renderVitaminSummary(); 
                // }
            }
        });
    });

    // --- Quick Log Nutrient Button Event Listener ---
    const quickLogNutrientButton = document.getElementById('quickLogNutrientButton');
    if (quickLogNutrientButton) {
        quickLogNutrientButton.addEventListener('click', () => {
            // Deactivate current active tab & content
            const currentActiveButton = document.querySelector('.tab-button.active');
            const currentActiveContent = document.querySelector('.tab-content.active');
            if (currentActiveButton) currentActiveButton.classList.remove('active');
            if (currentActiveContent) {
                currentActiveContent.style.display = 'none';
                currentActiveContent.classList.remove('active');
            }

            // Activate nutrition tab
            const nutritionTabButton = document.querySelector('.tab-button[data-tab="nutritionTab"]');
            const nutritionTabContent = document.getElementById('nutritionTab');
            if (nutritionTabButton) nutritionTabButton.classList.add('active');
            if (nutritionTabContent) {
                nutritionTabContent.classList.add('active');
                nutritionTabContent.style.display = 'block'; // Or 'flex', etc.
            }
        });
    } else {
        console.error("Quick Log Nutrient Button not found");
    }
});

// --- Nutrition Log Functions ---
function renderGlobalNutritionSummary() {
    const nutritionDateDisplay = document.getElementById('lastGlobalNutritionDateDisplay');
    const vitaminDateDisplay = document.getElementById('lastGlobalVitaminDateDisplay');

    if (nutritionDateDisplay) {
        nutritionDateDisplay.textContent = lastGlobalNutritionDate 
            ? new Date(lastGlobalNutritionDate).toLocaleDateString() 
            : 'Nunca';
    }
    if (vitaminDateDisplay) {
        vitaminDateDisplay.textContent = lastGlobalVitaminDate 
            ? new Date(lastGlobalVitaminDate).toLocaleDateString() 
            : 'Nunca';
    }
}
// function renderVitaminSummary() { ... } // REMOVED

function populatePlantSelect() { // This function might become orphaned. Will review later.
    const selectElement = document.getElementById('nutritionPlantSelect');
    if (!selectElement) {
        // This is expected now as the element is removed from HTML
        // console.error("Nutrition plant select element not found."); 
        return;
    }
    // ... rest of the function remains for now, though it won't be called in nutrition context
    const currentPlantId = selectElement.value; 
    selectElement.innerHTML = ''; 

    const defaultOption = document.createElement('option');
    defaultOption.textContent = 'Seleccionar planta...';
    defaultOption.value = '';
    defaultOption.disabled = true;
    defaultOption.selected = !currentPlantId; 
    selectElement.appendChild(defaultOption);

    if (plants.length === 0) {
        const noPlantsOption = document.createElement('option');
        noPlantsOption.textContent = 'No hay plantas añadidas';
        noPlantsOption.disabled = true;
        selectElement.appendChild(noPlantsOption);
    } else {
        plants.forEach(plant => {
            const option = document.createElement('option');
            option.value = plant.id;
            option.textContent = plant.name;
            if (plant.id === currentPlantId) {
                option.selected = true; 
            }
            selectElement.appendChild(option);
        });
    }
}

function loadNutritionLog() {
    const storedLog = localStorage.getItem('nutritionLog');
    if (storedLog) {
        nutritionLog = JSON.parse(storedLog);
        if (nutritionLog.length > 0) {
            const sortedLog = [...nutritionLog].sort((a, b) => new Date(b.date) - new Date(a.date));
            // Find the most recent overall nutrition application
            if (sortedLog.length > 0) {
                lastGlobalNutritionDate = sortedLog[0].date;
            }
            // Find the most recent vitamin application
            const lastVitamin = sortedLog.find(entry => entry.type === 'vitaminas');
            if (lastVitamin) {
                lastGlobalVitaminDate = lastVitamin.date;
            }
        }
    }
    renderNutritionLog();
    renderGlobalNutritionSummary(); // ADDED - Update summary after loading
}

async function saveNutritionEntry(event) {
    event.preventDefault(); // Prevent default form submission

    // const plantId = document.getElementById('nutritionPlantSelect').value; // REMOVED
    const date = document.getElementById('nutritionDate').value;
    const type = document.getElementById('nutritionType').value;
    const notes = document.getElementById('nutritionNotes').value.trim();

    if (!date) { // MODIFIED: Only date is mandatory now
        alert('Por favor, selecciona una fecha.');
        return;
    }

    // const plantName = plants.find(p => p.id === plantId)?.name || 'Nombre Desconocido'; // REMOVED

    const newEntry = {
        id: 'nutri_' + Date.now(),
        // plantId: plantId, // REMOVED
        // plantName: plantName, // REMOVED
        date: date,
        type: type,
        notes: notes
    };

    nutritionLog.push(newEntry);
    localStorage.setItem('nutritionLog', JSON.stringify(nutritionLog));

    // Update global timestamps
    lastGlobalNutritionDate = newEntry.date;
    if (newEntry.type === 'vitaminas') {
        lastGlobalVitaminDate = newEntry.date;
    }

    renderNutritionLog();
    renderGlobalNutritionSummary(); // ADDED - Update summary after saving new entry
    // renderVitaminSummary(); // REMOVED
    document.getElementById('nutritionForm').reset();
    // populatePlantSelect(); // REMOVED
    await checkAndScheduleGeneralNutritionReminder(); 
    await checkAndScheduleVitaminReminder(); 
}

function renderNutritionLog() {
    const logListDiv = document.getElementById('nutritionLogList');
    if (!logListDiv) {
        console.error("Nutrition log list element not found.");
        return;
    }
    logListDiv.innerHTML = ''; // Clear current list

    if (nutritionLog.length === 0) {
        logListDiv.innerHTML = '<p>Aún no hay registros de nutrición.</p>';
        return;
    }

    // Sort by date descending (most recent first)
    const sortedLog = [...nutritionLog].sort((a, b) => new Date(b.date) - new Date(a.date));

    sortedLog.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('nutrition-entry'); // For styling
        if (entry.type === 'vitaminas') {
            entryDiv.classList.add('vitamin-entry-highlight');
        }

        const title = document.createElement('h3');
        // MODIFIED: Display a global entry title
        title.textContent = `Nutrientes Aplicados: ${new Date(entry.date).toLocaleDateString()}`;
        entryDiv.appendChild(title);

        const typeP = document.createElement('p');
        if (entry.type === 'vitaminas') {
            typeP.innerHTML = `<strong>Tipo:</strong> ✨ ${entry.type}`;
        } else {
            typeP.innerHTML = `<strong>Tipo:</strong> ${entry.type}`;
        }
        entryDiv.appendChild(typeP);

        if (entry.notes) {
            const notesP = document.createElement('p');
            notesP.innerHTML = `<strong>Notas:</strong> ${entry.notes}`;
            entryDiv.appendChild(notesP);
        }
        // Optional: Add delete button per entry here if desired in future
        logListDiv.appendChild(entryDiv);
    });
}

// --- Nutrition Reminder Functions ---
async function checkAndScheduleGeneralNutritionReminder() { // RENAMED
    if (Notification.permission !== 'granted') {
        console.log('Notification permission not granted for general nutrition reminder.');
        return;
    }

    // MODIFIED: Use global lastGlobalNutritionDate, excluding vitamin-specific entries
    if (!lastGlobalNutritionDate || nutritionLog.filter(e => e.type !== 'vitaminas').length === 0) {
        console.log('No general nutrition applications found or lastGlobalNutritionDate is not set. No general reminder to schedule.');
        return;
    }
    
    // Find the last non-vitamin entry to get its type for the message
    const nonVitaminLog = nutritionLog.filter(entry => entry.type !== 'vitaminas').sort((a,b) => new Date(b.date) - new Date(a.date));
    const lastNonVitaminEntryDetails = nonVitaminLog.length > 0 ? nonVitaminLog[0] : {type: 'nutrición general', date: lastGlobalNutritionDate};


    const lastApplicationDate = new Date(lastNonVitaminEntryDetails.date); // Use the date of the specific last non-vitamin entry
    const reminderDate = new Date(lastApplicationDate);
    reminderDate.setMonth(reminderDate.getMonth() + 1); 
    reminderDate.setHours(10, 0, 0, 0);

    if (reminderDate > new Date()) {
        const tag = `global-general-nutrition-reminder-${new Date(reminderDate).getTime()}`; // MODIFIED tag
        scheduleLocalNotification(
            reminderDate,
            'Recordatorio de Nutrición General Global 🌿', 
            `Ha pasado aproximadamente un mes desde la última aplicación de ${lastNonVitaminEntryDetails.type} el ${new Date(lastNonVitaminEntryDetails.date).toLocaleDateString()}. ¡Considera nutrir tus plantas!`, // MODIFIED message
            tag
        );
        console.log(`Global general nutrition reminder scheduled: ${reminderDate.toLocaleString()}`);
    } else {
        console.log(`Global general nutrition reminder date is in the past or not applicable.`);
    }
}

async function checkAndScheduleVitaminReminder() { 
    if (Notification.permission !== 'granted') {
        console.log('Notification permission not granted for vitamin reminder.');
        return;
    }

    // MODIFIED: Use global lastGlobalVitaminDate
    if (!lastGlobalVitaminDate) {
        console.log('lastGlobalVitaminDate is not set. No vitamin reminder to schedule.');
        return;
    }

    const lastApplicationDate = new Date(lastGlobalVitaminDate);
    const reminderDate = new Date(lastApplicationDate);
    reminderDate.setDate(reminderDate.getDate() + (4 * 7)); // Add 4 weeks
    reminderDate.setHours(10, 0, 0, 0); 

    if (reminderDate > new Date()) {
        const tag = `global-vitamin-reminder-${new Date(reminderDate).getTime()}`; // MODIFIED tag
        scheduleLocalNotification(
            reminderDate,
            `Recordatorio Global de Vitaminas ✨`, // MODIFIED title
            `Han pasado aproximadamente 4 semanas desde la última aplicación global de vitaminas el ${new Date(lastGlobalVitaminDate).toLocaleDateString()}.`, // MODIFIED message
            tag
        );
        console.log(`Global vitamin reminder scheduled: ${reminderDate.toLocaleString()}`);
    } else {
        console.log(`Global vitamin reminder date is in the past or not applicable.`);
    }
}

// The duplicated renderPlants function and its trailing comment are removed.
// The primary renderPlants function (defined earlier in the file) is the one being used.
