/**
 * Classifies a recipe for dietary preferences and nutrition badges using keywords.
 * Works with TheMealDB meal objects and custom recipe objects.
 * @param {object} meal 
 * @returns {Array<string>} Array of dietary tags/badges (e.g. ['Vegetarian', 'Gluten-Free'])
 */
export function classifyDiet(meal) {
  if (!meal) return [];

  // Extract all ingredients
  const ingredients = [];
  if (meal.recipe_details && Array.isArray(meal.recipe_details.ingredients)) {
    ingredients.push(...meal.recipe_details.ingredients.map((i) => String(i).toLowerCase()));
  } else {
    for (let i = 1; i <= 20; i++) {
      const ing = meal[`strIngredient${i}`];
      if (ing && ing.trim()) {
        ingredients.push(ing.trim().toLowerCase());
      }
    }
  }

  const category = (meal.strCategory || "").toLowerCase();
  const textBlob = (
    ingredients.join(" ") +
    " " +
    category +
    " " +
    (meal.strMeal || meal.meal_name || "")
  ).toLowerCase();

  const meatKeywords = [
    "beef", "pork", "chicken", "lamb", "bacon", "sausage", "ham",
    "turkey", "duck", "veal", "mutton", "steak", "mince", "prosciutto",
    "pancetta", "chorizo", "salami", "pepperoni", "gelatin"
  ];

  const seafoodKeywords = [
    "fish", "salmon", "tuna", "cod", "shrimp", "prawn", "crab",
    "lobster", "squid", "calamari", "mussel", "oyster", "clam",
    "anchovy", "halibut", "trout", "haddock", "sardine"
  ];

  const dairyKeywords = [
    "milk", "cheese", "butter", "cream", "yogurt", "parmesan",
    "cheddar", "mozzarella", "ricotta", "feta", "ghee", "mascarpone",
    "sour cream", "heavy cream"
  ];

  const glutenKeywords = [
    "flour", "wheat", "bread", "pasta", "spaghetti", "noodle",
    "macaroni", "lasagna", "breadcrumbs", "barley", "rye",
    "couscous", "semolina", "soy sauce", "tortilla"
  ];

  const eggKeywords = [
    "egg", "eggs", "egg yolk", "egg white", "mayonnaise"
  ];

  const highProteinKeywords = [
    "chicken", "beef", "tuna", "salmon", "egg", "eggs", "turkey",
    "steak", "lentil", "lentils", "tofu", "tempeh", "chickpea", "beans",
    "greek yogurt", "cottage cheese", "protein", "pork"
  ];

  const highCarbKeywords = [
    "sugar", "flour", "bread", "rice", "potato", "potatoes", "pasta",
    "noodles", "corn", "syrup", "honey"
  ];

  const hasMeat = meatKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(textBlob));
  const hasSeafood = seafoodKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(textBlob));
  const hasDairy = dairyKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(textBlob));
  const hasGluten = glutenKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(textBlob));
  const hasEgg = eggKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(textBlob));
  const hasHighProtein = highProteinKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(textBlob));
  const hasHighCarb = highCarbKeywords.some((k) => new RegExp(`\\b${k}\\b`, "i").test(textBlob));

  const badges = [];

  // Vegetarian: No meat, no seafood
  const isVegetarian = !hasMeat && !hasSeafood && (category === "vegetarian" || !hasMeat);
  if (isVegetarian) {
    badges.push("Vegetarian");
  }

  // Vegan: Vegetarian + no dairy + no egg
  if (isVegetarian && !hasDairy && !hasEgg && category !== "dessert") {
    badges.push("Vegan");
  }

  // Dairy-Free
  if (!hasDairy) {
    badges.push("Dairy-Free");
  }

  // Gluten-Free
  if (!hasGluten) {
    badges.push("Gluten-Free");
  }

  // High-Protein
  if (hasHighProtein) {
    badges.push("High-Protein");
  }

  // Low-Carb / Keto
  if (!hasHighCarb && (hasHighProtein || hasDairy)) {
    badges.push("Low-Carb");
  }

  return badges;
}

/**
 * Attaches diet badges and nutrition classification to a meal object.
 */
export function enrichMealWithDiet(meal) {
  if (!meal) return meal;
  const badges = classifyDiet(meal);
  return {
    ...meal,
    dietaryBadges: badges,
  };
}
