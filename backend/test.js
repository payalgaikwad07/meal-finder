import assert from "assert";
import { parseMeasure, normalizeUnit, normalizeIngredientName, aggregateIngredients } from "./utils/aggregator.js";
import { getTypoSuggestion } from "./utils/typo.js";
import { classifyDiet, enrichMealWithDiet } from "./utils/classifier.js";

console.log("🧪 Running Meal Finder (YumPlan) Backend Tests...\n");

// 1. Aggregator & Measure Parsing Tests
console.log("▶ Testing Measure Parsing & Aggregation:");

// Test 1½ cups -> 1.5 cups
const parsed1 = parseMeasure("1½ cups");
assert.strictEqual(parsed1.quantity, 1.5, "1½ cups should parse to quantity 1.5");
assert.strictEqual(parsed1.unit, "cup", "1½ cups should parse to unit 'cup'");
console.log("  ✔ '1½ cups' correctly parsed to 1.5 cup (not quantity 1 with unit '0.5 cups')");

// Test glass unit normalization
const parsedGlass = parseMeasure("2 glasses");
assert.strictEqual(parsedGlass.unit, "glass", "2 glasses should normalize to 'glass', not 'glas'");
const parsedGlassSingle = parseMeasure("1 glass");
assert.strictEqual(parsedGlassSingle.unit, "glass", "1 glass should remain 'glass'");
console.log("  ✔ 'glass' / 'glasses' preserves 'glass' and never turns into 'glas'");

// Test tbsp and tablespoon merging
const testMealsForUnits = [
  {
    strMeal: "Meal 1",
    strIngredient1: "Olive Oil",
    strMeasure1: "1 tablespoon",
  },
  {
    strMeal: "Meal 2",
    strIngredient1: "Olive Oil",
    strMeasure1: "2 tbsp",
  },
];
const aggregatedUnits = aggregateIngredients(testMealsForUnits);
assert.strictEqual(aggregatedUnits.length, 1, "Olive Oil should aggregate into 1 entry");
assert.ok(aggregatedUnits[0].lines.some((l) => l.includes("3 tbsp")), "1 tablespoon + 2 tbsp should merge into 3 tbsp");
console.log("  ✔ '1 tablespoon' and '2 tbsp' successfully merge into '3 tbsp'");

// Test 'chicken breast' and 'chicken breasts' singularization & merging
const testMealsForSingularization = [
  {
    strMeal: "Meal 1",
    strIngredient1: "Chicken Breast",
    strMeasure1: "200 g",
  },
  {
    strMeal: "Meal 2",
    strIngredient1: "Chicken Breasts",
    strMeasure1: "300 g",
  },
];
const aggregatedChicken = aggregateIngredients(testMealsForSingularization);
assert.strictEqual(aggregatedChicken.length, 1, "Chicken Breast and Chicken Breasts must merge into 1 entry");
assert.ok(aggregatedChicken[0].lines.some((l) => l.includes("500 g")), "200 g + 300 g should merge into 500 g");
console.log("  ✔ 'Chicken Breast' and 'Chicken Breasts' successfully merged into 1 item (500 g)");

// 2. Typo Correction Tests
console.log("\n▶ Testing Typo Correction (Levenshtein & Did You Mean):");
const typoBrad = getTypoSuggestion("brad");
assert.strictEqual(typoBrad, "bread", "Typo 'brad' should suggest 'bread'");
console.log("  ✔ Typo 'brad' suggests 'bread'");

const typoPotatos = getTypoSuggestion("potatos");
assert.ok(typoPotatos === "potato" || typoPotatos === "potatoes", "Typo 'potatos' should suggest 'potato' or 'potatoes'");
console.log(`  ✔ Typo 'potatos' suggests '${typoPotatos}'`);

const typoChikcen = getTypoSuggestion("chikcen");
assert.strictEqual(typoChikcen, "chicken", "Typo 'chikcen' should suggest 'chicken'");
console.log("  ✔ Typo 'chikcen' suggests 'chicken'");

// 3. Dietary Classification Tests
console.log("\n▶ Testing Dietary Badges Classification:");

const vegMeal = {
  strMeal: "Veggie Salad",
  strCategory: "Vegetarian",
  strIngredient1: "Tomato",
  strIngredient2: "Cucumber",
  strIngredient3: "Olive Oil",
};
const vegBadges = classifyDiet(vegMeal);
assert.ok(vegBadges.includes("Vegetarian"), "Veggie Salad should have Vegetarian badge");
assert.ok(vegBadges.includes("Vegan"), "Veggie Salad should have Vegan badge");
assert.ok(vegBadges.includes("Gluten-Free"), "Veggie Salad should have Gluten-Free badge");
console.log("  ✔ Vegetarian salad correctly classified as Vegetarian, Vegan, and Gluten-Free");

const chickenMeal = {
  strMeal: "Grilled Chicken",
  strCategory: "Chicken",
  strIngredient1: "Chicken Breast",
  strIngredient2: "Olive Oil",
};
const chickenBadges = classifyDiet(chickenMeal);
assert.ok(!chickenBadges.includes("Vegetarian"), "Chicken should NOT have Vegetarian badge");
assert.ok(chickenBadges.includes("High-Protein"), "Chicken should have High-Protein badge");
assert.ok(chickenBadges.includes("Gluten-Free"), "Plain Chicken should have Gluten-Free badge");
console.log("  ✔ Chicken dish correctly classified as High-Protein, Gluten-Free, and NOT Vegetarian");

// 4. Word-boundary Leftovers Matching Test
console.log("\n▶ Testing Word-boundary Leftovers Matching:");
function testMatches(userIng, recipeIng) {
  const u = userIng.toLowerCase().trim();
  const r = recipeIng.toLowerCase().trim();
  const regex = new RegExp(`\\b${u}s?\\b`, "i");
  return regex.test(r);
}

assert.strictEqual(testMatches("egg", "eggplant"), false, "'egg' must NOT match 'eggplant'");
assert.strictEqual(testMatches("egg", "boiled egg"), true, "'egg' must match 'boiled egg'");
assert.strictEqual(testMatches("egg", "eggs"), true, "'egg' must match 'eggs'");
console.log("  ✔ Word-boundary check: 'egg' matches 'eggs' & 'boiled egg', but does NOT match 'eggplant'");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉\n");
