import ejs from "ejs";
import fs from "fs";
import path from "path";

const VIEWS_DIR = "./views";

function testRender(filename, data) {
  console.log(`Compiling ${filename}...`);
  try {
    const filePath = path.join(VIEWS_DIR, filename);
    const template = fs.readFileSync(filePath, "utf-8");
    
    const mockData = {
      ...data,
      filename: filePath,
    };
    
    ejs.render(template, mockData, {
      views: [VIEWS_DIR]
    });
    console.log(`✓ ${filename} rendered successfully!`);
  } catch (error) {
    console.error(`✗ Error rendering ${filename}:`, error.message);
  }
}

const mockMeal = {
  idMeal: "52772",
  strMeal: "Teriyaki Chicken Casserole",
  strMealThumb: "https://www.themealdb.com/images/media/meals/wv87ss1511504975.jpg",
  strCategory: "Chicken",
  strArea: "Japanese",
  strInstructions: "Steps to cook...",
  strYoutube: "https://youtube.com/...",
  strIngredient1: "chicken", strMeasure1: "1 lb",
  strIngredient2: "soy sauce", strMeasure2: "1 cup",
};

const mockLocals = {
  user: { id: 1, name: "Test User" },
  savedMealIds: ["52772"],
  wishlistMealIds: ["52772"],
  meals: [mockMeal],
  query: "chicken",
};

testRender("result.ejs", mockLocals);
console.log("-".repeat(40));
testRender("detail.ejs", { ...mockLocals, meal: mockMeal });
