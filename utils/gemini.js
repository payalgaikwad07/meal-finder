import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

/**
 * Calls the Gemini 1.5 Flash API to suggest 2-3 creative recipe ideas based on the given ingredients.
 * @param {Array<string>} ingredients 
 * @returns {Promise<Array>} List of generated recipes.
 */
export async function suggestRecipesWithGemini(ingredients) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not defined in the environment variables. Skipping Gemini suggestions.");
    return [];
  }
  

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

  const prompt = `You are a creative culinary chef. The user has the following leftover ingredients: ${ingredients.join(", ")}.
Generate 2-3 creative recipe ideas that use primarily these ingredients.
Return the output as a JSON array of recipe objects. Do not include any markdown formatting (like \`\`\`json) in your response, return ONLY the raw JSON string.
Each recipe object must have this exact structure:
{
  "name": "Recipe Name",
  "description": "Short creative description",
  "ingredients": ["1 cup ingredient1", "2 tbsp ingredient2", ...],
  "instructions": "Step 1: ... Step 2: ... Step 3: ..."
}`;

  try {
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
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10-second timeout
      }
    );

    const candidates = response.data.candidates;
    if (
      candidates &&
      candidates[0] &&
      candidates[0].content &&
      candidates[0].content.parts &&
      candidates[0].content.parts[0]
    ) {
      let rawText = candidates[0].content.parts[0].text.trim();

      // Clean up markdown block if Gemini wraps it
      if (rawText.startsWith("```")) {
        rawText = rawText
          .replace(/^```(?:json)?\n?/, "")
          .replace(/\n?```$/, "")
          .trim();
      }

      const parsed = JSON.parse(rawText);
      return Array.isArray(parsed) ? parsed : [];
    }

    return [];
  } catch (error) {
    console.error("Gemini API suggestion call failed:", error.message);
    // Graceful error handling - return empty array
    return [];
  }
}
