/**
 * Multi-Algorithmic Typo Correction Engine
 * 
 * Combines:
 * 1. Damerau-Levenshtein Distance (transpositions, insertions, deletions, substitutions)
 * 2. Jaro-Winkler String Similarity (prefix-weighted character alignment)
 * 3. American Soundex Phonetic Encoding (matching phonetic sound signatures)
 * 4. N-Gram (Bigram) Dice Coefficient (substring overlap)
 */

/**
 * 1. Damerau-Levenshtein Distance
 * Supports adjacent transpositions (e.g. "taoc" -> "taco", "brda" -> "bread")
 */
export function damerauLevenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a || a.length === 0) return b ? b.length : 0;
  if (!b || b.length === 0) return a.length;

  const la = a.length;
  const lb = b.length;
  const d = [];

  for (let i = 0; i <= la; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= lb; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );

      // Transposition check
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }

  return d[la][lb];
}

/**
 * 2. Jaro-Winkler Similarity Metric (0.0 to 1.0)
 * Evaluates matching character windows with prefix scaling.
 */
export function jaroWinkler(s1, s2) {
  if (s1 === s2) return 1.0;
  const l1 = s1.length, l2 = s2.length;
  if (l1 === 0 || l2 === 0) return 0.0;

  const matchDistance = Math.floor(Math.max(l1, l2) / 2) - 1;
  const s1Matches = new Array(l1).fill(false);
  const s2Matches = new Array(l2).fill(false);

  let matches = 0;
  for (let i = 0; i < l1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, l2);
    for (let j = start; j < end; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < l1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }

  const transpositions = t / 2;
  const jaro = (matches / l1 + matches / l2 + (matches - transpositions) / matches) / 3.0;

  // Winkler prefix scaling bonus (up to 4 matching initial chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(l1, l2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1.0 - jaro);
}

/**
 * 3. American Soundex Phonetic Algorithm
 * Encodes words into a 4-character phonetic signature based on pronunciation.
 */
export function soundex(s) {
  if (!s || typeof s !== "string") return "";
  const clean = s.toUpperCase().replace(/[^A-Z]/g, "");
  if (!clean) return "";

  const map = {
    B: 1, F: 1, P: 1, V: 1,
    C: 2, G: 2, J: 2, K: 2, Q: 2, S: 2, X: 2, Z: 2,
    D: 3, T: 3,
    L: 4,
    M: 5, N: 5,
    R: 6
  };

  let res = clean[0];
  let prev = map[clean[0]] || 0;

  for (let i = 1; i < clean.length && res.length < 4; i++) {
    const code = map[clean[i]] || 0;
    if (code !== 0 && code !== prev) {
      res += code;
    }
    prev = code;
  }

  return (res + "000").slice(0, 4);
}

/**
 * 4. Character Bigram Dice Coefficient (0.0 to 1.0)
 * Evaluates overlapping two-character grams.
 */
export function bigramSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;

  const getBigrams = (str) => {
    const bigrams = new Map();
    for (let i = 0; i < str.length - 1; i++) {
      const bg = str.slice(i, i + 2);
      bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
    }
    return bigrams;
  };

  const bg1 = getBigrams(str1);
  const bg2 = getBigrams(str2);

  let intersection = 0;
  for (const [bg, count1] of bg1.entries()) {
    if (bg2.has(bg)) {
      intersection += Math.min(count1, bg2.get(bg));
    }
  }

  const total = (str1.length - 1) + (str2.length - 1);
  return (2.0 * intersection) / total;
}

// Extensive culinary base dictionary
const BASE_FOOD_TERMS = [
  "bread", "breads", "burger", "burgers", "chicken", "beef", "pork", "fish", "salmon", "tuna",
  "pizza", "pizzas", "pasta", "pastas", "spaghetti", "macaroni", "lasagna", "lasagne",
  "rice", "noodle", "noodles", "egg", "eggs", "omelette", "omelet", "pancake", "pancakes",
  "waffle", "waffles", "soup", "soups", "stew", "stews", "salad", "salads", "sandwich",
  "sandwiches", "curry", "curries", "pie", "pies", "cake", "cakes", "cookie", "cookies",
  "brownie", "brownies", "chocolate", "cheese", "cheddar", "mozzarella", "parmesan",
  "potato", "potatoes", "fries", "tomato", "tomatoes", "onion", "onions", "garlic",
  "ginger", "carrot", "carrots", "spinach", "broccoli", "mushroom", "mushrooms",
  "pepper", "peppers", "chilli", "chili", "cucumber", "zucchini", "avocado", "avocados",
  "corn", "peas", "bean", "beans", "lentil", "lentils", "tofu", "paneer",
  "taco", "tacos", "burrito", "burritos", "quesadilla", "quesadillas", "fajita", "fajitas",
  "enchilada", "enchiladas", "biryani", "korma", "tikka", "masala", "naan", "roti", "jowar", "bajra",
  "sushi", "sashimi", "ramen", "udon", "tempura", "dumpling", "dumplings", "shawarma",
  "kebab", "kebabs", "falafel", "hummus", "tzatziki", "risotto", "gnocchi", "carbonara",
  "bolognese", "pesto", "paella", "steak", "steaks", "roast", "meatball", "meatballs",
  "ribs", "wings", "bacon", "sausage", "sausages", "hotdog", "cheeseburger", "hamburger",
  "croissant", "bagel", "toast", "quiche", "frittata", "crepe", "crepes", "pudding", "tart",
  "shrimp", "shrimps", "prawn", "prawns", "lobster", "crab", "squid", "calamari",
  "clam", "clams", "mussel", "mussels", "oyster", "oysters", "cod", "halibut",
  "trout", "haddock", "anchovy", "duck", "turkey", "lamb", "mutton",
  "apple", "apples", "banana", "bananas", "orange", "oranges", "lemon", "lemons",
  "lime", "limes", "strawberry", "strawberries", "blueberry", "blueberries",
  "raspberry", "raspberries", "mango", "mangoes", "pineapple", "peach", "peaches",
  "pear", "pears", "plum", "plums", "cherry", "cherries", "grape", "grapes",
  "watermelon", "melon", "coconut", "almond", "almonds", "walnut", "walnuts",
  "peanut", "peanuts", "cashew", "cashews",
  "flour", "sugar", "butter", "oil", "cream", "milk", "yogurt", "honey", "mustard",
  "mayo", "mayonnaise", "ketchup", "vinegar", "salt", "cinnamon", "vanilla",
  "basil", "oregano", "thyme", "rosemary", "parsley", "cilantro", "coriander",
  "american", "british", "canadian", "chinese", "croatian", "dutch", "egyptian",
  "filipino", "french", "greek", "indian", "irish", "italian", "jamaican",
  "japanese", "kenyan", "malaysian", "mexican", "moroccan", "polish", "portuguese",
  "russian", "spanish", "thai", "tunisian", "turkish", "vietnamese"
];

const dynamicDictionary = new Set(BASE_FOOD_TERMS.map((t) => t.toLowerCase()));

/**
 * Dynamically ingests terms into the dictionary.
 */
export function addTermsToDictionary(terms) {
  if (!Array.isArray(terms)) return;
  terms.forEach((t) => {
    if (typeof t === "string") {
      const clean = t.trim().toLowerCase();
      if (clean.length > 1) {
        dynamicDictionary.add(clean);
        const parts = clean.split(/\s+/);
        if (parts.length > 1) {
          parts.forEach((p) => {
            if (p.length > 2) dynamicDictionary.add(p);
          });
        }
      }
    }
  });
}

/**
 * Pre-populates the dictionary with real categories, areas, and ingredients from TheMealDB.
 */
export async function initializeDictionary(mealDbClient) {
  try {
    const [ingRes, catRes, areaRes] = await Promise.all([
      mealDbClient.get("/list.php?i=list").catch(() => ({ data: { meals: [] } })),
      mealDbClient.get("/list.php?c=list").catch(() => ({ data: { meals: [] } })),
      mealDbClient.get("/list.php?a=list").catch(() => ({ data: { meals: [] } })),
    ]);

    const terms = [];
    (ingRes.data?.meals || []).forEach((m) => m.strIngredient && terms.push(m.strIngredient));
    (catRes.data?.meals || []).forEach((m) => m.strCategory && terms.push(m.strCategory));
    (areaRes.data?.meals || []).forEach((m) => m.strArea && terms.push(m.strArea));

    addTermsToDictionary(terms);
    console.log(`📚 Vocabulary dictionary populated with ${terms.length} dynamic terms.`);
  } catch (err) {
    console.warn("⚠️ Failed to preload dynamic dictionary:", err.message);
  }
}

/**
 * 5. Consonant Root Skeleton
 * Extracts phonetic skeletal consonants (vowel-invariant representation).
 */
export function consonantSkeleton(s) {
  if (!s) return "";
  const clean = s.toLowerCase().replace(/[^a-z]/g, "");
  if (clean.length < 2) return clean;
  return clean[0] + clean.slice(1).replace(/[aeiouy]/g, "");
}

/**
 * Hybrid algorithmic evaluation of a single word candidate.
 * Combines Damerau-Levenshtein, Jaro-Winkler, Soundex, Bigram Dice, and Consonant Skeleton.
 */
function findClosestWord(word, candidates) {
  if (candidates.has(word)) return word;
  if (word.length < 3) return word;

  const wordSoundex = soundex(word);
  const wordSkeleton = consonantSkeleton(word);
  let bestCandidate = null;
  let highestScore = -Infinity;

  for (const candidate of candidates) {
    const lenDiff = Math.abs(candidate.length - word.length);
    if (lenDiff > (word.length <= 4 ? 2 : 4)) continue;

    const dDist = damerauLevenshteinDistance(word, candidate);
    
    // Fast path: perfect 1-edit distance with similar length
    if (dDist === 1 && lenDiff <= 1) {
      return candidate;
    }

    const jwScore = jaroWinkler(word, candidate);
    const bgScore = bigramSimilarity(word, candidate);
    const candSoundex = soundex(candidate);
    const candSkeleton = consonantSkeleton(candidate);

    const soundexBonus = wordSoundex && candSoundex && wordSoundex === candSoundex ? 0.20 : 0.0;
    const skeletonBonus = wordSkeleton && candSkeleton && wordSkeleton === candSkeleton ? 0.25 : 0.0;

    // Composite multi-algorithmic score
    const compositeScore = 
      (0.40 * jwScore) + 
      (0.25 * bgScore) + 
      soundexBonus + 
      skeletonBonus - 
      (0.15 * (dDist / Math.max(word.length, candidate.length)));

    if (compositeScore > highestScore) {
      highestScore = compositeScore;
      bestCandidate = candidate;
    }
  }

  // Threshold: only return correction if algorithmic confidence is high
  if (highestScore >= 0.62 && bestCandidate) {
    return bestCandidate;
  }

  return null;
}

/**
 * Main Typo Suggestion Function
 * Accepts any arbitrary query (single word or multi-word).
 */
export function getTypoSuggestion(query) {
  if (!query || typeof query !== "string") return null;
  const clean = query.trim().toLowerCase();
  if (clean.length < 3) return null;

  // If already exact match in dictionary, no typo
  if (dynamicDictionary.has(clean)) return null;

  const words = clean.split(/\s+/);
  const stopWords = new Set(["and", "with", "in", "of", "the", "a", "an", "on", "for"]);

  let anyWordChanged = false;
  const correctedWords = words.map((w) => {
    if (stopWords.has(w) || dynamicDictionary.has(w)) {
      return w;
    }
    const match = findClosestWord(w, dynamicDictionary);
    if (match && match !== w) {
      anyWordChanged = true;
      return match;
    }
    return w;
  });

  if (anyWordChanged) {
    return correctedWords.join(" ");
  }

  // Fallback whole phrase check (e.g. for "garlicbread", "chickencurry")
  const wholeMatch = findClosestWord(clean, dynamicDictionary);
  if (wholeMatch && wholeMatch !== clean) {
    return wholeMatch;
  }

  return null;
}
