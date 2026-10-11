import axios from "axios";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

/**
 * Sanitizes an ingredient string to prevent prompt injection and garbage input.
 */
function sanitizeIngredient(input) {
  if (typeof input !== "string") return "";
  // Strip control characters, quotes, markdown characters, and limit length
  return input
    .replace(/[^\w\s-]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

/**
 * Calls the Gemini API to suggest creative recipes based on given leftover ingredients.
 * @param {Array<string>} rawIngredients 
 * @returns {Promise<Array>} List of generated recipe objects.
 */
export async function suggestRecipesWithGemini(rawIngredients) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY is not defined in environment variables. Skipping Gemini suggestions.");
    return [];
  }

  const cleanIngredients = (Array.isArray(rawIngredients) ? rawIngredients : [])
    .map(sanitizeIngredient)
    .filter((ing) => ing.length > 1);

  if (cleanIngredients.length === 0) {
    return [];
  }

  // Use current supported model (gemini-3.5-flash-lite / gemini-3.5-flash)
  const primaryModel = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const modelsToTry = [primaryModel, "gemini-3.5-flash"];

  const prompt = `You are an elite creative chef and culinary expert. 
The user has the following leftover ingredients: ${cleanIngredients.join(", ")}.

Create 2-3 delicious, easy-to-cook recipe ideas that primarily use these ingredients (you may assume basic kitchen staples like salt, pepper, oil, water).
For each recipe:
1. Provide a creative name.
2. Provide a short appetizing description.
3. List 4-7 specific ingredients with practical measurements (e.g., "1 cup sliced carrots", "2 cloves garlic").
4. Provide step-by-step clear cooking instructions.
5. Provide estimated prep time (e.g. "20 mins").

Return a valid JSON array of objects with the exact schema:
[
  {
    "name": "Recipe Name",
    "description": "Short appetizing description",
    "ingredients": ["1 cup ingredient", "2 tbsp seasoning"],
    "instructions": "Step 1: ... Step 2: ... Step 3: ...",
    "prepTime": "20 mins"
  }
]`;

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await axios.post(
        url,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: "application/json",
            temperature: 0.7,
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          timeout: 25000,
        }
      );

      const candidates = response.data?.candidates;
      if (candidates && candidates.length > 0 && candidates[0]?.content?.parts) {
        const rawText = candidates[0].content.parts
          .map((part) => part.text || "")
          .join("")
          .trim();

        if (!rawText) continue;

        const cleanJson = rawText
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item) => ({
            name: item.name || "Chef's Creation",
            description: item.description || "A delicious recipe made with your leftovers.",
            ingredients: Array.isArray(item.ingredients) ? item.ingredients : [],
            instructions: item.instructions || "Cook until ready and enjoy!",
            prepTime: item.prepTime || "25 mins",
          }));
        }
      }
    } catch (error) {
      const status = error.response ? `[${error.response.status}]` : "";
      const msg = error.response?.data?.error?.message || error.message;
      console.warn(`Gemini model ${model} failed ${status}: ${msg}. Attempting next model...`);
    }
  }

  console.error("All Gemini model attempts failed.");
  return [];
}
