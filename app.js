// app.js

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