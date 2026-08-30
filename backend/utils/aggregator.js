const fractionMap = {
  "½": 0.5,
  "¼": 0.25,
  "¾": 0.75,
  "⅓": 0.33,
  "⅔": 0.67,
  "⅛": 0.125,
};

/**
 * Parses a measure string into a numeric quantity and a normalized unit.
 * @param {string} measureStr 
 * @returns {object} { quantity: number|null, unit: string }
 */
export function parseMeasure(measureStr) {
  if (!measureStr) return { quantity: 0, unit: "" };
  let str = measureStr.trim();

  // Replace unicode fractions
  for (const [unicode, val] of Object.entries(fractionMap)) {
    str = str.replace(new RegExp(unicode, "g"), ` ${val} `);
  }
  str = str.replace(/\s+/g, " ").trim();

  // Regexes for parsing
  const mixedFractionRegex = /^(\d+)(?:\s+|-)(\d+)\s*\/\s*(\d+)(.*)$/;
  const fractionRegex = /^(\d+)\s*\/\s*(\d+)(.*)$/;
  const decimalRegex = /^(\d+(?:\.\d+)?)(.*)$/;

  let quantity = 0;
  let unit = "";

  let match = str.match(mixedFractionRegex);
  if (match) {
    const whole = parseInt(match[1], 10);
    const num = parseInt(match[2], 10);
    const denom = parseInt(match[3], 10);
    quantity = whole + num / denom;
    unit = match[4].trim();
  } else {
    match = str.match(fractionRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      const denom = parseInt(match[2], 10);
      quantity = num / denom;
      unit = match[3].trim();
    } else {
      match = str.match(decimalRegex);
      if (match) {
        quantity = parseFloat(match[1]);
        unit = match[2].trim();
      } else {
        quantity = null;
        unit = str;
      }
    }
  }

  // Normalize unit
  if (unit) {
    unit = unit.toLowerCase();
    if (unit.endsWith("s")) {
      if (
        unit.endsWith("ches") ||
        unit.endsWith("shes") ||
        unit.endsWith("xes") ||
        unit.endsWith("zes")
      ) {
        unit = unit.slice(0, -2);
      } else {
        unit = unit.slice(0, -1);
      }
    }
  }

  return { quantity, unit };
}

/**
 * Helper to convert an AI custom recipe's ingredients array into a mock MealDB format.
 */
function convertAICustomToMealDB(meal) {
  const mockMeal = {
    idMeal: meal.meal_id || null,
    strMeal: meal.meal_name,
    strMealThumb: meal.meal_thumb || null,
  };
  
  const ingredients = (meal.recipe_details && meal.recipe_details.ingredients) || [];
  ingredients.forEach((ingStr, idx) => {
    if (idx >= 20) return;
    
    const trimmed = ingStr.trim();
    let measure = "";
    let ingredient = trimmed;
    
    const numberMatch = trimmed.match(/^([\d\s\/\.\-½¼¾⅓⅔⅛]+)(.*)$/);
    if (numberMatch) {
      const numPart = numberMatch[1].trim();
      const rest = numberMatch[2].trim();
      
      const unitMatch = rest.match(/^(cup|cups|tbsp|tsp|g|kg|ml|oz|clove|cloves|piece|pieces|slice|slices|can|cans|pinch|pinches|handful|handfuls|head|heads|clove|cloves|can|cans)\b(.*)$/i);
      if (unitMatch) {
        measure = numPart + " " + unitMatch[1];
        ingredient = unitMatch[2].trim();
      } else {
        measure = numPart;
        ingredient = rest;
      }
    }
    
    mockMeal[`strIngredient${idx + 1}`] = ingredient;
    mockMeal[`strMeasure${idx + 1}`] = measure;
  });
  
  return mockMeal;
}

/**
 * Aggregates ingredients across a list of meal objects.
 * @param {Array} meals 
 * @returns {Array} Consolidated shopping list.
 */
export function aggregateIngredients(meals) {
  const ingredientsMap = {};

  meals.forEach((meal) => {
    const processedMeal = (meal.is_ai_generated && meal.recipe_details) 
      ? convertAICustomToMealDB(meal) 
      : meal;

    for (let i = 1; i <= 20; i++) {
      const ingredient = processedMeal[`strIngredient${i}`];
      const measure = processedMeal[`strMeasure${i}`];

      if (ingredient && ingredient.trim()) {
        const name = ingredient.trim().toLowerCase();
        const parsed = parseMeasure(measure);

        if (!ingredientsMap[name]) {
          ingredientsMap[name] = {
            canonicalName: ingredient.trim(),
            measures: [],
          };
        }

        ingredientsMap[name].measures.push(parsed);
      }
    }
  });

  const consolidatedList = [];

  for (const [name, data] of Object.entries(ingredientsMap)) {
    const { canonicalName, measures } = data;

    const unitGroups = {};
    measures.forEach(({ quantity, unit }) => {
      if (quantity === null) {
        if (!unitGroups[unit]) {
          unitGroups[unit] = [];
        }
        unitGroups[unit].push({ quantity: null, originalUnit: unit });
      } else {
        if (!unitGroups[unit]) {
          unitGroups[unit] = [];
        }
        const existing = unitGroups[unit].find((item) => item.quantity !== null);
        if (existing) {
          existing.quantity += quantity;
        } else {
          unitGroups[unit].push({ quantity, originalUnit: unit });
        }
      }
    });

    const displayLines = [];
    Object.entries(unitGroups).forEach(([unit, list]) => {
      list.forEach((item) => {
        if (item.quantity === null) {
          displayLines.push(item.originalUnit);
        } else {
          const qVal = Number(item.quantity.toFixed(2));
          displayLines.push(`${qVal} ${item.originalUnit}`.trim());
        }
      });
    });

    consolidatedList.push({
      name: canonicalName,
      lines: displayLines,
    });
  }

  // Sort alphabetically
  consolidatedList.sort((a, b) => a.name.localeCompare(b.name));

  return consolidatedList;
}
