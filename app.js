// app.js

// --- Global Variables and Constants ---
const API_KEY_WEATHERAPI = '4c5750f21a1a4da398c222225252602'; // Your WeatherAPI Key
const plantsListDiv = document.getElementById('plantsList');
const addPlantButton = document.getElementById('addPlantButton');
const plantModal = document.getElementById('plantModal');
const modalTitle = document.getElementById('modalTitle');
const closeButton = document.querySelector('.modal .close-button');
const savePlantButton = document.getElementById('savePlantButton');
const plantIdInput = document.getElementById('plantIdInput');
const plantNameInput = document.getElementById('plantName');
const plantFrequencyInput = document.getElementById('plantFrequency');
const plantPhotoInput = document.getElementById('plantPhotoInput');
const generalWeatherDisplayDiv = document.getElementById('generalWeatherDisplay');


let plants = []; // Array to store plant objects
let editingPlantId = null; // To track if we are editing an existing plant

// --- Service Worker and Notifications ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('ws.js')
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

// --- General Weather Display ---
async function fetchAndDisplayWeather() {
    if (!generalWeatherDisplayDiv) return;
    generalWeatherDisplayDiv.innerHTML = '<p>Cargando información del tiempo...</p>';

    try {
        const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY_WEATHERAPI}&q=Valencia&days=3&aqi=no&alerts=no&lang=es`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
            throw new Error(`WeatherAPI error: ${response.status}, Message: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();

        let weatherHTML = '<h3>Tiempo en Valencia</h3>';
        
        // Current Weather
        weatherHTML += `<div class="current-weather">`;
        weatherHTML += `<img src="https:${data.current.condition.icon}" alt="${data.current.condition.text}" class="weather-icon-current">`;
        weatherHTML += `<div class="current-weather-details">`;
        weatherHTML += `<span class="current-temp">${data.current.temp_c}°C</span>`;
        weatherHTML += `<span class="current-condition">${data.current.condition.text}</span>`;
        weatherHTML += `</div></div>`; // End current-weather-details and current-weather

        // Forecast
        weatherHTML += `<h4>Próximos días:</h4>`;
        weatherHTML += `<div class="forecast-days">`;

        data.forecast.forecastday.forEach((day, index) => {
            const date = new Date(day.date_epoch * 1000); // Use epoch for reliable date parsing
            let dayName;
            const today = new Date();
            today.setHours(0,0,0,0);
            const forecastDate = new Date(date);
            forecastDate.setHours(0,0,0,0);

            if (forecastDate.getTime() === today.getTime()) {
                dayName = 'Hoy';
            } else {
                dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
            }
            
            weatherHTML += `<div class="forecast-day-card">`;
            weatherHTML += `<strong>${dayName}</strong>`;
            weatherHTML += `<img src="https:${day.day.condition.icon}" alt="${day.day.condition.text}" class="weather-icon-forecast">`;
            weatherHTML += `<p>${Math.round(day.day.mintemp_c)}° / ${Math.round(day.day.maxtemp_c)}°</p>`;
            weatherHTML += `</div>`;
        });

        weatherHTML += `</div>`; // End forecast-days
        generalWeatherDisplayDiv.innerHTML = weatherHTML;

    } catch (error) {
        console.error('Error fetching general weather:', error);
        generalWeatherDisplayDiv.innerHTML = '<p>No se pudo cargar la información del tiempo.</p>';
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

// Helper function to create a plant card element (Compact Version)
function createPlantCardElement(plant) {
    const plantCard = document.createElement('div');
    plantCard.classList.add('plant-card');
    plantCard.dataset.id = plant.id;

    const mainContent = document.createElement('div');
    mainContent.classList.add('plant-card-main');

    if (plant.photo) {
        const photoContainer = document.createElement('div');
        photoContainer.classList.add('plant-card-photo-container');
        const imgEl = document.createElement('img');
        imgEl.src = plant.photo;
        imgEl.alt = `Foto de ${plant.name}`;
        photoContainer.appendChild(imgEl);
        mainContent.appendChild(photoContainer);
    }

    const infoContainer = document.createElement('div');
    infoContainer.classList.add('plant-card-info');

    const nameEl = document.createElement('h3');
    nameEl.textContent = plant.name;
    infoContainer.appendChild(nameEl);

    const nextReminderText = plant.nextReminderDate 
        ? new Date(plant.nextReminderDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) 
        : 'N/A';
    const nextWateringEl = document.createElement('p');
    nextWateringEl.innerHTML = `📅 Próx: <strong>${nextReminderText}</strong> (Base: ${plant.baseWateringFrequencyDays}d)`;
    infoContainer.appendChild(nextWateringEl);

    const lastWateredText = plant.lastWateredDate 
        ? new Date(plant.lastWateredDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) 
        : 'Nunca';
    let tempAtLastWateringText = '';
    if (plant.temperatureAtLastWatering !== null && plant.temperatureAtLastWatering !== "Error API") {
        tempAtLastWateringText = ` (🌡️ ${plant.temperatureAtLastWatering}°C)`;
    } else if (plant.temperatureAtLastWatering === "Error API") {
        tempAtLastWateringText = ` (🌡️ Error)`;
    }
    const lastWateringEl = document.createElement('p');
    lastWateringEl.innerHTML = `💧 Último: ${lastWateredText}${tempAtLastWateringText}`;
    infoContainer.appendChild(lastWateringEl);
    
    mainContent.appendChild(infoContainer);
    plantCard.appendChild(mainContent);

    const actionsContainer = document.createElement('div');
    actionsContainer.classList.add('plant-card-actions');

    const waterButton = document.createElement('button');
    waterButton.classList.add('water-button');
    waterButton.innerHTML = '💧<span class="button-text">Regada</span>';
    waterButton.title = 'Marcar como regada hoy';
    waterButton.addEventListener('click', (e) => { e.stopPropagation(); handleWaterPlant(plant.id); });

    const editButton = document.createElement('button');
    editButton.classList.add('edit-plant-button');
    editButton.innerHTML = '✏️<span class="button-text">Editar</span>';
    editButton.title = 'Editar planta';
    editButton.addEventListener('click', (e) => { e.stopPropagation(); openEditModal(plant); });

    const deleteButton = document.createElement('button');
    deleteButton.classList.add('delete-plant-button');
    deleteButton.innerHTML = '🗑️<span class="button-text">Eliminar</span>';
    deleteButton.title = 'Eliminar planta';
    deleteButton.addEventListener('click', (e) => { e.stopPropagation(); handleDeletePlant(plant.id); });

    actionsContainer.appendChild(waterButton);
    actionsContainer.appendChild(editButton);
    actionsContainer.appendChild(deleteButton);
    plantCard.appendChild(actionsContainer);

    // Add highlight classes based on nextReminderDate
    if (plant.nextReminderDate) {
        const nextDate = new Date(plant.nextReminderDate);
        nextDate.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        if (nextDate.getTime() <= today.getTime()) {
            plantCard.classList.add('needs-water-urgent');
        } else if (nextDate.getTime() === tomorrow.getTime()) {
            plantCard.classList.add('needs-water-soon');
        }
    }


    return plantCard;
}

function renderPlants() {
    plantsListDiv.innerHTML = ''; 

    if (plants.length === 0) {
        plantsListDiv.innerHTML = '<p class="empty-state-message">Aún no has añadido ninguna planta. ¡Haz clic en "Añadir Nueva Planta" para empezar!</p>';
        return;
    }

    const groupedPlants = {};
    const unscheduledKey = 'Unscheduled';

    plants.forEach(plant => {
        if (plant.nextReminderDate) {
            const date = new Date(plant.nextReminderDate);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
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
    dateKeys.sort((a, b) => new Date(a) - new Date(b)); // Sort date keys chronologically

    const sortedGroupKeys = [...dateKeys];
    if (groupedPlants[unscheduledKey] && groupedPlants[unscheduledKey].length > 0) {
        sortedGroupKeys.push(unscheduledKey);
    }

    if (sortedGroupKeys.length === 0 || (sortedGroupKeys.length === 1 && sortedGroupKeys[0] === unscheduledKey && groupedPlants[unscheduledKey].length === 0) ) {
         plantsListDiv.innerHTML = '<p class="empty-state-message">No hay plantas con recordatorios programados. Riega una planta para establecer su próximo recordatorio o revisa las no programadas.</p>';
        // If only unscheduled and it's empty, this check handles it.
        // If unscheduled has items, it will proceed to render that group.
    }


    sortedGroupKeys.forEach(key => {
        if (key === unscheduledKey && groupedPlants[unscheduledKey].length === 0) {
            return; // Don't render empty unscheduled group
        }

        const agendaDayGroup = document.createElement('div');
        agendaDayGroup.classList.add('agenda-day-group');

        const header = document.createElement('h2');
        header.classList.add('agenda-date-header');

        if (key === unscheduledKey) {
            header.textContent = 'Riego no programado';
        } else {
            const dateParts = key.split('-');
            const displayDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
            
            const today = new Date(); today.setHours(0,0,0,0);
            const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

            if (displayDate.getTime() === today.getTime()) {
                header.textContent = `Hoy, ${displayDate.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}`;
                agendaDayGroup.classList.add('today');
            } else if (displayDate.getTime() === tomorrow.getTime()) {
                header.textContent = `Mañana, ${displayDate.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}`;
                agendaDayGroup.classList.add('tomorrow');
            } else {
                header.textContent = displayDate.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            }
        }
        agendaDayGroup.appendChild(header);

        const plantsForDayContainer = document.createElement('div');
        plantsForDayContainer.classList.add('plant-cards-for-day');
        
        groupedPlants[key].sort((a,b) => a.name.localeCompare(b.name)).forEach(plant => { // Sort plants alphabetically within each group
            const plantCardElement = createPlantCardElement(plant);
            plantsForDayContainer.appendChild(plantCardElement);
        });
        agendaDayGroup.appendChild(plantsForDayContainer);
        plantsListDiv.appendChild(agendaDayGroup);
    });
}


// --- Modal Logic (Add/Edit Plant) ---
function openModalForNewPlant() {
    editingPlantId = null;
    modalTitle.textContent = 'Añadir Nueva Planta';
    plantIdInput.value = '';
    plantNameInput.value = '';
    plantFrequencyInput.value = '';
    if (plantPhotoInput) plantPhotoInput.value = '';
    plantModal.style.display = 'block';
}

function openEditModal(plant) {
    editingPlantId = plant.id;
    modalTitle.textContent = 'Editar Planta';
    plantIdInput.value = plant.id;
    plantNameInput.value = plant.name;
    plantFrequencyInput.value = plant.baseWateringFrequencyDays;
    if (plantPhotoInput) plantPhotoInput.value = '';
    plantModal.style.display = 'block';
}

function closeModal() {
    plantModal.style.display = 'none';
}

function savePlantData(name, frequency, photoDataURL, currentEditingPlantId) {
    if (currentEditingPlantId) {
        const plantIndex = plants.findIndex(p => p.id === currentEditingPlantId);
        if (plantIndex > -1) {
            plants[plantIndex].name = name;
            plants[plantIndex].baseWateringFrequencyDays = frequency;
            if (photoDataURL !== undefined) { // Only update photo if a new one was processed or explicitly cleared
                plants[plantIndex].photo = photoDataURL;
            }
            // If frequency changes, existing nextReminderDate may become less accurate.
            // Consider prompting user to "water" the plant to reset schedule based on new frequency,
            // or automatically recalculate if lastWateredDate and temperatureAtLastWatering are available.
            // For now, keep it simple: reminder stays until next watering.
        }
    } else {
        const newPlant = {
            id: 'plant_' + Date.now(),
            name: name,
            baseWateringFrequencyDays: frequency,
            lastWateredDate: null,
            nextReminderDate: null,
            temperatureAtLastWatering: null,
            photo: photoDataURL,
        };
        plants.push(newPlant);
    }

    localStorage.setItem('plants', JSON.stringify(plants));
    renderPlants();
    closeModal();
    editingPlantId = null;
}

function handleSavePlant() {
    const name = plantNameInput.value.trim();
    const frequency = parseInt(plantFrequencyInput.value);
    const photoFile = plantPhotoInput.files[0];

    if (!name || isNaN(frequency) || frequency < 1) {
        alert('Por favor, introduce un nombre y una frecuencia de riego base válida (número de días mayor a 0).');
        return;
    }

    let photoDataURL = editingPlantId ? plants.find(p => p.id === editingPlantId)?.photo : null; // Default to existing or null

    if (photoFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
            photoDataURL = reader.result;
            savePlantData(name, frequency, photoDataURL, editingPlantId);
        };
        reader.onerror = (error) => {
            console.error('Error reading file:', error);
            alert('Error al leer la imagen. La planta se guardará con la foto anterior (si existe) o sin foto.');
            // Pass undefined for photoDataURL so savePlantData knows not to change it from existing
            savePlantData(name, frequency, editingPlantId ? plants.find(p => p.id === editingPlantId)?.photo : null, editingPlantId);
        };
        reader.readAsDataURL(photoFile);
    } else {
        // If no new file, photoDataURL already holds the existing photo (or null for new plant)
        savePlantData(name, frequency, photoDataURL, editingPlantId);
    }
}

function handleDeletePlant(plantId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta planta y todos sus datos?')) {
        plants = plants.filter(p => p.id !== plantId);
        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants();
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
        const response = await fetch(`https://api.weatherapi.com/v1/forecast.json?key=${API_KEY_WEATHERAPI}&q=Valencia&days=2&aqi=no&alerts=no&lang=es`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: "Failed to parse error response" }));
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();

        let maxTemp;
        let tempSource = "today";

        if (data.forecast?.forecastday?.[1]?.day?.maxtemp_c !== undefined) {
            maxTemp = data.forecast.forecastday[1].day.maxtemp_c;
            tempSource = "tomorrow's forecast";
        } else if (data.forecast?.forecastday?.[0]?.day?.maxtemp_c !== undefined) {
            maxTemp = data.forecast.forecastday[0].day.maxtemp_c;
            tempSource = "today's forecast (fallback)";
            console.warn(`Tomorrow's forecast not available. Using ${tempSource} in Valencia (WeatherAPI): ${maxTemp}°C`);
        } else {
            throw new Error('Max temperature data (maxtemp_c) not found in WeatherAPI forecast response for today or tomorrow.');
        }
        
        plant.temperatureAtLastWatering = parseFloat(maxTemp.toFixed(1));

        let effectiveFrequency = plant.baseWateringFrequencyDays;
        let adjustmentReason = "Base frequency";

        if (maxTemp > 32) {
            effectiveFrequency = Math.max(1, plant.baseWateringFrequencyDays - 1); 
            adjustmentReason = `Temp > 32°C (${maxTemp}°C), -1 day`;
        } else if (maxTemp < 20) { 
            effectiveFrequency = plant.baseWateringFrequencyDays + 1;
            adjustmentReason = `Temp < 20°C (${maxTemp}°C), +1 day`;
        }

        const reminderDate = new Date(now.getTime() + effectiveFrequency * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();

        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}!`,
            `Es hora de regar tu ${plant.name}. Max Temp. (${tempSource}): ${maxTemp}°C. (Base: ${plant.baseWateringFrequencyDays}d, Ajustado: ${effectiveFrequency}d. Razón: ${adjustmentReason})`,
            `plant-${plant.id}-${reminderDate.getTime()}` // More specific tag
        );

    } catch (error) {
        console.error('Error fetching temperature or scheduling notification:', error);
        alert(`Error al obtener la temperatura: ${error.message}. Se usará la frecuencia base para el recordatorio.`);
        plant.temperatureAtLastWatering = "Error API";

        const reminderDate = new Date(now.getTime() + plant.baseWateringFrequencyDays * 24 * 60 * 60 * 1000);
        plant.nextReminderDate = reminderDate.toISOString();
        
        scheduleLocalNotification(
            reminderDate,
            `¡A regar tu ${plant.name}! (Error API Temp)`,
            `Es hora de regar tu ${plant.name}. No se pudo obtener la temperatura. Usando frecuencia base.`,
            `plant-${plant.id}-${reminderDate.getTime()}-fallback` // More specific tag
        );
    } finally {
        localStorage.setItem('plants', JSON.stringify(plants));
        renderPlants();
    }
}

// --- Schedule Local Notification ---
function scheduleLocalNotification(date, title, body, tag = `notification-${new Date(date).getTime()}`) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        console.log('Notifications not permitted or not supported. Reminder not scheduled.');
        return;
    }

    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            payload: {
                reminderDate: date.toISOString(),
                title,
                body,
                tag
            }
        });
    } else {
        const delay = new Date(date).getTime() - Date.now();
        if (delay > 0) {
            console.warn(`SW not active. Scheduling notification for "${title}" via page setTimeout (less reliable).`);
            setTimeout(() => {
                navigator.serviceWorker.ready.then(registration => {
                     registration.showNotification(title, {
                        body: body,
                        icon: 'icons/icon-192x192.png',
                        badge: 'icons/badge-72x72.png',
                        tag: tag 
                    });
                });
            }, delay);
        }
    }
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    if (addPlantButton) addPlantButton.addEventListener('click', openModalForNewPlant);
    else console.error("Add Plant Button not found");

    if (closeButton) closeButton.addEventListener('click', closeModal);
    else console.error("Modal Close Button not found");

    if (savePlantButton) savePlantButton.addEventListener('click', handleSavePlant);
    else console.error("Save Plant Button not found");

    window.addEventListener('click', (event) => {
        if (event.target === plantModal) closeModal();
    });

    requestNotificationPermission();
    loadPlants(); 
    fetchAndDisplayWeather(); // Initial weather load for plants tab

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none';
            });
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            const activeTabContent = document.getElementById(tabId);
            if (activeTabContent) {
                activeTabContent.classList.add('active');
                activeTabContent.style.display = 'block';
                if (tabId === 'plantsTab') {
                    fetchAndDisplayWeather(); // Refresh weather on tab switch
                    renderPlants(); // Re-render plants in case of updates from other tabs if any in future
                } else if (tabId === 'nutritionTab') {
                    populatePlantSelect();
                    renderVitaminSummary();
                    loadNutritionLog();
                }
            }
        });
    });

    const saveNutritionButton = document.getElementById('saveNutritionEntryButton');
    if (saveNutritionButton) saveNutritionButton.addEventListener('click', handleSaveNutritionEntry);
    else console.error("Save Nutrition Entry Button not found");
});

// --- Nutrition Tab Functions ---
let nutritionLog = [];

function populatePlantSelect() {
    const selectElement = document.getElementById('nutritionPlantSelect');
    selectElement.innerHTML = '<option value="">Selecciona una planta...</option>'; 
    plants.sort((a,b) => a.name.localeCompare(b.name)).forEach(plant => { // Sort plants in dropdown
        const option = document.createElement('option');
        option.value = plant.id;
        option.textContent = plant.name;
        selectElement.appendChild(option);
    });
}

function renderVitaminSummary() {
    const summaryList = document.getElementById('vitaminSummaryList');
    if (!summaryList) return;

    let vitaminCount = 0;
    if (nutritionLog && nutritionLog.length > 0) {
        vitaminCount = nutritionLog.filter(entry => 
            entry.type && entry.type.toLowerCase().includes('vitamin')
        ).length;
    }
    summaryList.innerHTML = vitaminCount > 0 
        ? `<li>Total de aplicaciones de vitaminas: ${vitaminCount}</li>`
        : '<li>No se han registrado aplicaciones de vitaminas.</li>';
}

function handleSaveNutritionEntry() {
    const plantId = document.getElementById('nutritionPlantSelect').value;
    const date = document.getElementById('nutritionDate').value;
    const type = document.getElementById('nutritionType').value.trim();
    const notes = document.getElementById('nutritionNotes').value.trim();

    if (!plantId || !date || !type) {
        alert('Por favor, selecciona una planta, introduce la fecha y el tipo de nutriente.');
        return;
    }

    const newEntry = {
        id: 'nutri_' + Date.now(),
        plantId,
        plantName: plants.find(p => p.id === plantId)?.name || 'Nombre no encontrado',
        date,
        type,
        notes
    };

    nutritionLog.push(newEntry);
    localStorage.setItem('nutritionLog', JSON.stringify(nutritionLog));
    
    loadNutritionLog(); 
    renderVitaminSummary();

    document.getElementById('nutritionForm').reset();
    document.getElementById('nutritionPlantSelect').value = "";
}

function loadNutritionLog() {
    const storedLog = localStorage.getItem('nutritionLog');
    nutritionLog = storedLog ? JSON.parse(storedLog) : [];

    const logListDiv = document.getElementById('nutritionLogList');
    logListDiv.innerHTML = '';

    if (nutritionLog.length === 0) {
        logListDiv.innerHTML = '<p>No hay entradas de nutrición todavía.</p>';
        return;
    }

    nutritionLog.sort((a, b) => new Date(b.date) - new Date(a.date)); 

    nutritionLog.forEach(entry => {
        const entryDiv = document.createElement('div');
        entryDiv.classList.add('nutrition-entry');
        if (entry.type.toLowerCase().includes('vitamin')) {
            entryDiv.classList.add('vitamin-entry-highlight');
        }
        entryDiv.innerHTML = `
            <h3>${entry.plantName} - ${entry.type}</h3>
            <p><strong>Fecha:</strong> ${new Date(entry.date).toLocaleDateString()}</p>
            ${entry.notes ? `<p><strong>Notas:</strong> ${entry.notes}</p>` : ''}
            <button class="delete-nutrition-entry-button" data-entry-id="${entry.id}" title="Eliminar entrada">🗑️</button>
        `;
        logListDiv.appendChild(entryDiv);
    });

    // Add event listeners for new delete buttons
    logListDiv.querySelectorAll('.delete-nutrition-entry-button').forEach(button => {
        button.addEventListener('click', handleDeleteNutritionEntry);
    });
}

function handleDeleteNutritionEntry(event) {
    const entryId = event.target.closest('button').dataset.entryId;
    if (confirm('¿Estás seguro de que quieres eliminar esta entrada de nutrición?')) {
        nutritionLog = nutritionLog.filter(entry => entry.id !== entryId);
        localStorage.setItem('nutritionLog', JSON.stringify(nutritionLog));
        loadNutritionLog(); // Reload and re-render the list
        renderVitaminSummary(); // Update summary
    }
}