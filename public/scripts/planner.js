/**
 * Adds a meal to a weekly plan slot (AJAX).
 */
async function addToPlan(day, type, weekStart) {
  const selectEl = document.getElementById(`select-${day}-${type}`);
  if (!selectEl) return;

  const mealId = selectEl.value;
  if (!mealId) {
    alert("Please select a meal from your cookbook first.");
    return;
  }

  const selectedOption = selectEl.options[selectEl.selectedIndex];
  const mealName = selectedOption.getAttribute("data-name") || selectedOption.text.trim();

  const slotContainer = document.querySelector(`#slot-${day}-${type} .slot-content`);
  if (!slotContainer) return;

  slotContainer.innerHTML = '<span class="planner-loading">Adding...</span>';

  try {
    const response = await fetch("/planner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        meal_id: mealId,
        meal_name: mealName,
        day_of_week: day,
        meal_type: type,
        week_start_date: weekStart,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      slotContainer.innerHTML = `
        <div class="planned-meal-card">
          <a href="/meal/${mealId}" class="planned-meal-link">${mealName}</a>
          <button 
            onclick="removeFromPlan('${day}', '${type}', '${weekStart}')" 
            class="btn-delete-slot" 
            title="Remove meal"
          >
            &times;
          </button>
        </div>
      `;
    } else {
      alert(data.error || "Failed to add meal to planner.");
      rebuildDropdown(slotContainer, day, type, weekStart);
    }
  } catch (error) {
    console.error("Error adding to plan:", error);
    alert("A connection error occurred. Please try again.");
    rebuildDropdown(slotContainer, day, type, weekStart);
  }
}

/**
 * Removes a meal from a weekly plan slot (AJAX).
 */
async function removeFromPlan(day, type, weekStart) {
  const slotContainer = document.querySelector(`#slot-${day}-${type} .slot-content`);
  if (!slotContainer) return;

  const originalContent = slotContainer.innerHTML;
  slotContainer.innerHTML = '<span class="planner-loading">Removing...</span>';

  try {
    const response = await fetch("/planner", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        day_of_week: day,
        meal_type: type,
        week_start_date: weekStart,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      rebuildDropdown(slotContainer, day, type, weekStart);
    } else {
      alert(data.error || "Failed to remove meal from planner.");
      slotContainer.innerHTML = originalContent;
    }
  } catch (error) {
    console.error("Error removing from plan:", error);
    alert("A connection error occurred. Please try again.");
    slotContainer.innerHTML = originalContent;
  }
}

/**
 * Helper function to rebuild the dropdown select in the planner slot.
 */
function rebuildDropdown(container, day, type, weekStart) {
  if (window.savedMeals && window.savedMeals.length > 0) {
    let optionsHtml = '<option value="">-- Choose Meal --</option>';
    window.savedMeals.forEach((meal) => {
      optionsHtml += `<option value="${meal.meal_id}" data-name="${meal.meal_name}">${meal.meal_name}</option>`;
    });

    container.innerHTML = `
      <div class="add-meal-form">
        <select id="select-${day}-${type}" class="planner-select">
          ${optionsHtml}
        </select>
        <button 
          onclick="addToPlan('${day}', '${type}', '${weekStart}')" 
          class="btn-add-slot"
        >
          +
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <span class="no-favs-alert">
        No saved meals. <a href="/">Search recipes</a>
      </span>
    `;
  }
}
