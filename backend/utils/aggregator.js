const fractionMap = {
  "½": 0.5,
  "¼": 0.25,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

/**
 * Normalizes an ingredient name for canonical aggregation (singularizing words).
 * Prevents "chicken breast" and "chicken breasts" from separating.
 */
export function normalizeIngredientName(rawName) {
  if (!rawName) return "";
  let name = rawName.toLowerCase().trim();
  name = name.replace(/\s+/g, " ");

  const irregulars = {
    leaves: "leaf",
    halves: "half",
    tomatoes: "tomato",
    potatoes: "potato",
    chillies: "chilli",
    chives: "chives",
    berries: "berry",
    cherries: "cherry",
    strawberries: "strawberry",
    blueberries: "blueberry",
    raspberries: "raspberry",
    molasses: "molasses",
  };

  const words = name.split(" ");
  const singularized = words.map((w) => {
    if (irregulars[w]) return irregulars[w];
    if (w.endsWith("sses") || w.endsWith("ss")) return w; // watercress, grass, swiss
    if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
    if (w.endsWith("oes") && w.length > 4) return w.slice(0, -2);
    if (w.endsWith("es") && (w.endsWith("ches") || w.endsWith("shes") || w.endsWith("xes"))) {
      return w.slice(0, -2);
    }
    if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is") && w.length > 3) {
      return w.slice(0, -1);
    }
    return w;
  });

  return singularized.join(" ");
}

/**
 * Normalizes a unit string and guards against over-stemming (e.g. "glass" -> "glass", NOT "glas").
 */
export function normalizeUnit(rawUnit) {
  if (!rawUnit) return "";
  let u = rawUnit.toLowerCase().trim();

  const unitMap = {
    tbsp: "tbsp",
    tbs: "tbsp",
    tb: "tbsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",

    tsp: "tsp",
    ts: "tsp",
    teaspoon: "tsp",
    teaspoons: "tsp",

    cup: "cup",
    cups: "cup",
    c: "cup",

    oz: "oz",
    ounce: "oz",
    ounces: "oz",

    "fl oz": "fl oz",
    "fluid ounce": "fl oz",
    "fluid ounces": "fl oz",

    g: "g",
    gram: "g",
    grams: "g",

    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",

    ml: "ml",
    milliliter: "ml",
    milliliters: "ml",

    l: "l",
    liter: "l",
    liters: "l",

    lb: "lb",
    lbs: "lb",
    pound: "lb",
    pounds: "lb",

    pinch: "pinch",
    pinches: "pinch",

    handful: "handful",
    handfuls: "handful",

    clove: "clove",
    cloves: "clove",

    can: "can",
    cans: "can",

    slice: "slice",
    slices: "slice",

    piece: "piece",
    pieces: "piece",

    glass: "glass",
    glasses: "glass",

    stalk: "stalk",
    stalks: "stalk",

    head: "head",
    heads: "head",

    sprig: "sprig",
    sprigs: "sprig",

    package: "package",
    packages: "package",
    pkg: "package",
  };

  if (unitMap[u]) return unitMap[u];

  // Plural removal with safety checks
  if (u.endsWith("sses")) {
    return u.slice(0, -2); // glasses -> glass
  }
  if (u.endsWith("ss")) {
    return u; // glass -> glass
  }
  if (u.endsWith("ches") || u.endsWith("shes") || u.endsWith("xes") || u.endsWith("zes")) {
    return u.slice(0, -2);
  }
  if (u.endsWith("s") && !u.endsWith("is") && !u.endsWith("us") && u.length > 3) {
    return u.slice(0, -1);
  }
  return u;
}

/**
 * Parses a measure string into a numeric quantity and a normalized unit.
 * Handles mixed numbers with unicode fractions (1½ -> 1.5, not 1 with unit '0.5').
 * @param {string} measureStr 
 * @returns {object} { quantity: number|null, unit: string }
 */
export function parseMeasure(measureStr) {
  if (!measureStr) return { quantity: 0, unit: "" };
  let str = measureStr.trim();

  // First handle number + unicode fraction (e.g. 1½, 2 ¼)
  for (const [unicode, val] of Object.entries(fractionMap)) {
    const mixedUnicode = new RegExp(`(\\d+)\\s*${unicode}`, "g");
    str = str.replace(mixedUnicode, (_, whole) => `${parseInt(whole, 10) + val}`);
    // Standalone unicode fraction
    str = str.replace(new RegExp(unicode, "g"), ` ${val} `);
  }
  str = str.replace(/\s+/g, " ").trim();

  // Handle standard fractions
  const mixedFractionRegex = /^(\d+)(?:\s+|-)(\d+)\s*\/\s*(\d+)(.*)$/;
  const fractionRegex = /^(\d+)\s*\/\s*(\d+)(.*)$/;
  const rangeRegex = /^(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)(.*)$/i;
  const decimalRegex = /^(\d+(?:\.\d+)?)(.*)$/;

  let quantity = null;
  let unit = "";

  let match = str.match(mixedFractionRegex);
  if (match) {
    const whole = parseInt(match[1], 10);
    const num = parseInt(match[2], 10);
    const denom = parseInt(match[3], 10);
    quantity = whole + num / denom;
    unit = match[4].trim();
  } else if ((match = str.match(fractionRegex))) {
    const num = parseInt(match[1], 10);
    const denom = parseInt(match[2], 10);
    quantity = num / denom;
    unit = match[3].trim();
  } else if ((match = str.match(rangeRegex))) {
    const start = parseFloat(match[1]);
    const end = parseFloat(match[2]);
    quantity = (start + end) / 2; // Use midpoint of range
    unit = match[3].trim();
  } else if ((match = str.match(decimalRegex))) {
    quantity = parseFloat(match[1]);
    unit = match[2].trim();
  } else {
    quantity = null;
    unit = str;
  }

  const normalizedUnit = normalizeUnit(unit);
  return { quantity, unit: normalizedUnit };
}

/**
 * Converts compatible units to standard forms (e.g. tsp -> tbsp when >= 3, or grams -> kg when >= 1000).
 */
function convertUnits(unitGroups) {
  // Convert tsp to tbsp if both exist or if tsp >= 3
  if (unitGroups["tsp"]) {
    const tspItem = unitGroups["tsp"].find((item) => item.quantity !== null);
    if (tspItem) {
      if (unitGroups["tbsp"]) {
        const tbspItem = unitGroups["tbsp"].find((item) => item.quantity !== null);
        if (tbspItem) {
          tbspItem.quantity += tspItem.quantity / 3;
          delete unitGroups["tsp"];
        }
      } else if (tspItem.quantity >= 3) {
        unitGroups["tbsp"] = [{ quantity: tspItem.quantity / 3, originalUnit: "tbsp" }];
        delete unitGroups["tsp"];
      }
    }
  }

  // Convert tbsp to cups if tbsp >= 16
  if (unitGroups["tbsp"]) {
    const tbspItem = unitGroups["tbsp"].find((item) => item.quantity !== null);
    if (tbspItem && tbspItem.quantity >= 16) {
      const cups = tbspItem.quantity / 16;
      unitGroups["cup"] = unitGroups["cup"] || [];
      const cupItem = unitGroups["cup"].find((item) => item.quantity !== null);
      if (cupItem) {
        cupItem.quantity += cups;
      } else {
        unitGroups["cup"].push({ quantity: cups, originalUnit: "cup" });
      }
      delete unitGroups["tbsp"];
    }
  }

  // Convert g to kg if g >= 1000
  if (unitGroups["g"]) {
    const gItem = unitGroups["g"].find((item) => item.quantity !== null);
    if (gItem && gItem.quantity >= 1000) {
      const kg = gItem.quantity / 1000;
      unitGroups["kg"] = unitGroups["kg"] || [];
      const kgItem = unitGroups["kg"].find((item) => item.quantity !== null);
      if (kgItem) {
        kgItem.quantity += kg;
      } else {
        unitGroups["kg"].push({ quantity: kg, originalUnit: "kg" });
      }
      delete unitGroups["g"];
    }
  }

  // Convert ml to l if ml >= 1000
  if (unitGroups["ml"]) {
    const mlItem = unitGroups["ml"].find((item) => item.quantity !== null);
    if (mlItem && mlItem.quantity >= 1000) {
      const l = mlItem.quantity / 1000;
      unitGroups["l"] = unitGroups["l"] || [];
      const lItem = unitGroups["l"].find((item) => item.quantity !== null);
      if (lItem) {
        lItem.quantity += l;
      } else {
        unitGroups["l"].push({ quantity: l, originalUnit: "l" });
      }
      delete unitGroups["ml"];
    }
  }

  return unitGroups;
}

/**
 * Converts an AI custom recipe's ingredients array into mock MealDB ingredient & measure properties.
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

    const numberMatch = trimmed.match(/^([\d\s\/\.\-½¼¾⅓⅔⅛⅜⅝⅞]+)(.*)$/);
    if (numberMatch) {
      const numPart = numberMatch[1].trim();
      const rest = numberMatch[2].trim();

      const unitMatch = rest.match(/^(cup|cups|tbsp|tsp|g|kg|ml|oz|clove|cloves|piece|pieces|slice|slices|can|cans|pinch|pinches|handful|handfuls|head|heads|stalk|stalks)\b(.*)$/i);
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
 * Handles singularization, unicode fractions, and unit conversions.
 * @param {Array} meals 
 * @returns {Array} Consolidated shopping list.
 */
export function aggregateIngredients(meals) {
  const ingredientsMap = {};

  (meals || []).forEach((meal) => {
    if (!meal) return;
    const processedMeal = (meal.is_ai_generated && meal.recipe_details)
      ? convertAICustomToMealDB(meal)
      : meal;

    for (let i = 1; i <= 20; i++) {
      const ingredient = processedMeal[`strIngredient${i}`];
      const measure = processedMeal[`strMeasure${i}`];

      if (ingredient && ingredient.trim()) {
        const canonicalKey = normalizeIngredientName(ingredient.trim());
        const parsed = parseMeasure(measure);

        if (!ingredientsMap[canonicalKey]) {
          // Use nice display name
          const displayName = ingredient.trim().charAt(0).toUpperCase() + ingredient.trim().slice(1);
          ingredientsMap[canonicalKey] = {
            displayName,
            measures: [],
          };
        }

        ingredientsMap[canonicalKey].measures.push(parsed);
      }
    }
  });

  const consolidatedList = [];

  for (const [key, data] of Object.entries(ingredientsMap)) {
    const { displayName, measures } = data;

    let unitGroups = {};
    measures.forEach(({ quantity, unit }) => {
      if (quantity === null || isNaN(quantity)) {
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

    // Run unit conversion rules
    unitGroups = convertUnits(unitGroups);

    const displayLines = [];
    Object.entries(unitGroups).forEach(([unit, list]) => {
      list.forEach((item) => {
        if (item.quantity === null || isNaN(item.quantity)) {
          displayLines.push(item.originalUnit || "To taste");
        } else {
          const qVal = Math.round(item.quantity * 100) / 100;
          const displayUnit = item.originalUnit ? ` ${item.originalUnit}` : "";
          displayLines.push(`${qVal}${displayUnit}`);
        }
      });
    });

    consolidatedList.push({
      name: displayName,
      lines: displayLines.length > 0 ? displayLines : ["As needed"],
    });
  }

  // Sort alphabetically
  consolidatedList.sort((a, b) => a.name.localeCompare(b.name));

  return consolidatedList;
}
