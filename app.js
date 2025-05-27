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

// Helper function to create a plant card element
function createPlantCardElement(plant) {
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
        // imgEl.style.marginBottom = '10px'; // Removed for compactness
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
    editButton.addEventListener('click', () => openEditModal(plant)); // Correctly pass the plant object

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-plant-button');
    deleteButton.textContent = '🗑️'; // Icon only
    deleteButton.title = 'Eliminar'; // Tooltip for accessibility
    deleteButton.addEventListener('click', () => handleDeletePlant(plant.id)); // Correctly pass plant.id

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

    return plantCard;
}

function renderPlants() {
    plantsListDiv.innerHTML = ''; // Clear current list

    if (plants.length === 0) {
        plantsListDiv.innerHTML = '<p>Aún no has añadido ninguna planta. ¡Haz clic en "Añadir Nueva Planta" para empezar!</p>';
        return;
    }

    const groupedPlants = {};
    const unscheduledKey = 'Unscheduled'; // Plants with no nextReminderDate

    plants.forEach(plant => {
        if (plant.nextReminderDate) {
            const date = new Date(plant.nextReminderDate);
            // Format date as YYYY-MM-DD for consistent grouping and sorting
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
            const day = String(date.getDate()).padStart(2, '0');
            const dateKey = `${year}-${month}-${day}`;

            if (!groupedPlants[dateKey]) {
                groupedPlants[dateKey] = [];
            }
            groupedPlants[dateKey].push(plant);
        } else {
            if (!groupedPlants[unscheduledKey]) {
                groupedPlants[unscheduledKey] = [];
            }
            groupedPlants[unscheduledKey].push(plant);
        }
    });

    const dateKeys = Object.keys(groupedPlants).filter(key => key !== unscheduledKey);
    dateKeys.sort(); // Sorts YYYY-MM-DD strings chronologically

    const sortedGroupKeys = [...dateKeys];
    if (groupedPlants[unscheduledKey]) {
        sortedGroupKeys.push(unscheduledKey); // Add unscheduled group at the end
    }

    sortedGroupKeys.forEach(key => {
        const header = document.createElement('h3'); // Using h3 for date headers
        header.classList.add('date-group-header'); 

        if (key === unscheduledKey) {
            header.textContent = 'Recordatorio no programado';
        } else {
            // Format for display, e.g., "Tuesday, October 26, 2023"
            const dateParts = key.split('-');
            const displayDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            header.textContent = `Próximo riego: ${displayDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
        }
        plantsListDiv.appendChild(header);

        groupedPlants[key].forEach(plant => {
            const plantCardElement = createPlantCardElement(plant);
            plantsListDiv.appendChild(plantCardElement);
        });
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

    console.log(`Watering ${plant.name} on: ${now.toLocaleString()}`);

    try {
        const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY_WEATHERAPI}&q=Valencia&days=2&aqi=no&alerts=no`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        // console.log('WeatherAPI Forecast Response (2-day):', data); // REMOVE

        let maxTemp;
        let tempSource = "today"; // To log the source of temperature

        // Try to get tomorrow's forecast
        if (data.forecast && data.forecast.forecastday && data.forecast.forecastday[1] && data.forecast.forecastday[1].day && typeof data.forecast.forecastday[1].day.maxtemp_c !== 'undefined') {
            maxTemp = data.forecast.forecastday[1].day.maxtemp_c;
            tempSource = "tomorrow's forecast";
        } 
        // Fallback to today's forecast if tomorrow's is not available
        else if (data.forecast && data.forecast.forecastday && data.forecast.forecastday[0] && data.forecast.forecastday[0].day && typeof data.forecast.forecastday[0].day.maxtemp_c !== 'undefined') {
            maxTemp = data.forecast.forecastday[0].day.maxtemp_c;
            tempSource = "today's forecast (fallback)";
            console.warn(`Tomorrow's forecast not available. Using ${tempSource} in Valencia (WeatherAPI): ${maxTemp}°C`);
        } 
        // If neither is available, throw an error
        else {
            throw new Error('Max temperature data (maxtemp_c) not found in WeatherAPI forecast response for today or tomorrow.');
        }
        
        plant.temperatureAtLastWatering = maxTemp; // Store forecasted max temp

        let effectiveFrequency = plant.baseWateringFrequencyDays; // Start with base frequency
        let adjustmentReason = "Base frequency";

        if (maxTemp > 32) {
            effectiveFrequency = plant.baseWateringFrequencyDays - 1; 
            adjustmentReason = `Temp > 32°C (${maxTemp}°C), -1 day`;
        } else if (maxTemp < 20) { 
            effectiveFrequency = plant.baseWateringFrequencyDays + 1;
            adjustmentReason = `Temp < 20°C (${maxTemp}°C), +1 day`;
        } else {
            // Base frequency is used, adjustmentReason remains "Base frequency"
        }

        effectiveFrequency = Math.max(1, effectiveFrequency); // Ensure frequency is at least 1 day
        // console.log(`Plant: ${plant.name}, Temp: ${maxTemp}°C, Adj. Freq: ${effectiveFrequency}d (${adjustmentReason})`); // Retaining this commented as an example of a concise debug log

        const reminderDate = new Date(now.getTime() + effectiveFrequency * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();

        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}!`,
            `Es hora de regar tu ${plant.name}. Max Temp. (${tempSource}): ${maxTemp}°C. (Base: ${plant.baseWateringFrequencyDays}d, Ajustado: ${effectiveFrequency}d. Razón: ${adjustmentReason})`
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
        // console.log(`Notification schedule request for "${title}" with tag "${tag}" sent to SW.`); // REMOVE
    } else {
        // Fallback if SW is not active (less reliable if page closes)
        const delay = new Date(date).getTime() - Date.now();
        if (delay > 0) {
            console.warn(`SW not active. Scheduling notification for "${title}" via page setTimeout (less reliable).`); // KEEP console.warn
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
            // console.log(`Reminder for "${title}" is in the past. Not scheduling via page setTimeout.`); // REMOVE
        }
    }
}


// --- Event Listeners ---
// Ensure these are set up after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    // One-time cleanup of old nutrition data from localStorage
    // localStorage.removeItem('nutritionLog'); 

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
                if (tabId === 'nutritionTab') {
                    populatePlantSelect();
                    renderNutritionSummary(); // Updated call
                    loadNutritionLog(); // Also load the full log when tab is switched to
                    displayNextNutritionDate(); // Call to display the next nutrition date
                }
            }
        });
    });

    const saveNutritionButton = document.getElementById('saveNutritionEntryButton');
    if (saveNutritionButton) {
        saveNutritionButton.addEventListener('click', handleSaveNutritionEntry);
    } else {
        console.error("Save Nutrition Entry Button not found");
    }

    // console.error("Quick Log Nutrient Button not found"); // This element is already removed from HTML.
});

// --- Nutrition Tab Functions ---
let nutritionLog = []; // Array to store nutrition entries

function renderNutritionSummary() { // Renamed function
    const summaryList = document.getElementById('nutritionSummaryList'); // Changed ID
    if (!summaryList) {
        console.error('nutritionSummaryList element not found'); // Updated error message
        return;
    }

    let potasaCount = 0;
    let ironCount = 0;

    if (nutritionLog && nutritionLog.length > 0) {
        nutritionLog.forEach(entry => {
            if (entry.type === "Potasa") {
                potasaCount++;
            } else if (entry.type === "Iron") {
                ironCount++;
            }
        });
    }

    if (potasaCount > 0 || ironCount > 0) {
        summaryList.innerHTML = `<li>Aplicaciones de Potasa: ${potasaCount}</li><li>Aplicaciones de Iron: ${ironCount}</li>`;
    } else {
        summaryList.innerHTML = '<li>No se han registrado aplicaciones de nutrientes.</li>';
    }
    console.log(`renderNutritionSummary called - Potasa: ${potasaCount}, Iron: ${ironCount}`); // Updated console log
}

function handleSaveNutritionEntry() {
    console.log('handleSaveNutritionEntry called - this will save nutrition data.');
    const date = document.getElementById('nutritionDate').value;
    const type = document.getElementById('nutritionTypeSelect').value; // Changed to nutritionTypeSelect
    const notes = document.getElementById('nutritionNotes').value.trim();

    if (!date || !type) { // Removed plantId from condition
        alert('Por favor, introduce la fecha y el tipo de aditivo.'); // Updated alert message
        return;
    }

    const newEntry = {
        id: 'nutri_' + Date.now(),
        // plantId removed
        // plantName removed
        date,
        type,
        notes
    };

    nutritionLog.push(newEntry);
    localStorage.setItem('nutritionLog', JSON.stringify(nutritionLog));
    console.log('Nutrition entry saved:', newEntry);
    
    // Re-render the log and summary
    loadNutritionLog(); 
    renderNutritionSummary(); // Updated call
    displayNextNutritionDate(); // Call to display the next nutrition date

    // Clear the form
    document.getElementById('nutritionForm').reset();
    // document.getElementById('nutritionPlantSelect').value = ""; // Reset select - This element is no longer part of the form
}

function loadNutritionLog() {
    const storedLog = localStorage.getItem('nutritionLog');
    if (storedLog) {
        nutritionLog = JSON.parse(storedLog);
    } else {
        nutritionLog = []; // Initialize if nothing in storage
    }

    const logListDiv = document.getElementById('nutritionLogList');
    logListDiv.innerHTML = ''; // Clear current list

    if (nutritionLog.length === 0) {
        logListDiv.innerHTML = '<p>No hay entradas de nutrición todavía.</p>';
        return;
    }

    nutritionLog.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, newest first

    nutritionLog.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('nutrition-entry');
        // Highlight if it contains 'vitamin' (case-insensitive)
        if (entry.type.toLowerCase().includes('vitamin')) {
            entryDiv.classList.add('vitamin-entry-highlight');
        }

        entryDiv.innerHTML = `
            <h3>Aplicación Global - ${entry.type}</h3>
            <p><strong>Fecha:</strong> ${new Date(entry.date).toLocaleDateString()}</p>
            ${entry.notes ? `<p><strong>Notas:</strong> ${entry.notes}</p>` : ''}
        `;
        logListDiv.appendChild(entryDiv);
    });
    console.log('loadNutritionLog called - log displayed.');
    displayNextNutritionDate(); // Call to display the next nutrition date
}

// --- Next Nutrition Date Prediction ---
function calculateNextNutritionDate() {
    if (!nutritionLog || nutritionLog.length === 0) {
        return null;
    }

    // Assuming nutritionLog is already sorted by date descending by loadNutritionLog()
    // If not, uncomment and adapt:
    // const sortedLog = [...nutritionLog].sort((a, b) => new Date(b.date) - new Date(a.date));
    // const lastEntryDate = sortedLog[0].date;

    const lastEntryDate = nutritionLog[0].date; // nutritionLog is sorted by loadNutritionLog
    const newDate = new Date(lastEntryDate);
    
    // Add 2 months
    newDate.setMonth(newDate.getMonth() + 2);
    
    return newDate;
}

function displayNextNutritionDate() {
    const nextDateElement = document.getElementById('nextNutritionDateText');
    if (!nextDateElement) {
        console.error('nextNutritionDateText element not found');
        return;
    }

    const nextDate = calculateNextNutritionDate();

    if (nextDate === null) {
        nextDateElement.textContent = "Aplica la primera dosis de nutrientes para iniciar las predicciones.";
    } else {
        // Format date as dd/mm/yyyy
        const day = String(nextDate.getDate()).padStart(2, '0');
        const month = String(nextDate.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const year = nextDate.getFullYear();
        const formattedDate = `${day}/${month}/${year}`;
        nextDateElement.textContent = `Próxima aplicación estimada: ${formattedDate}`;
    }
}

// The duplicated renderPlants function and its trailing comment are removed.
// The primary renderPlants function (defined earlier in the file) is the one being used.
