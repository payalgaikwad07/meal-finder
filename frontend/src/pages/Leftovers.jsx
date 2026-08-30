import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  X, 
  ChefHat, 
  Utensils, 
  Bookmark, 
  Heart, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import MealCard from '../components/MealCard';

const quickPantrySuggestions = [
  'Tomato', 'Garlic', 'Egg', 'Chicken', 'Cheese', 'Onion', 'Rice', 'Pasta', 'Potato', 'Spinach', 'Mushroom', 'Bell Pepper'
];

const Leftovers = () => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [inputVal, setInputVal] = useState('');
  const [ingredients, setIngredients] = useState(['Peas', 'Rice']);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const addIngredient = (ing) => {
    const trimmed = ing.trim();
    if (!trimmed) return;
    if (ingredients.map(i => i.toLowerCase()).includes(trimmed.toLowerCase())) {
      showToast(`"${trimmed}" is already in your list`, 'info');
      return;
    }
    if (ingredients.length >= 6) {
      showToast('Maximum 6 ingredients at a time', 'info');
      return;
    }
    setIngredients((prev) => [...prev, trimmed]);
    setInputVal('');
  };

  const removeIngredient = (idx) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIngredient(inputVal);
    }
  };

  const handleSuggest = async (e) => {
    e.preventDefault();
    if (ingredients.length < 2) {
      setError('Please add at least 2 leftover ingredients.');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await api.post('/leftovers/suggest', {
        ingredients
      });

      setResults(res.data);
      confetti({ particleCount: 45, spread: 70, origin: { y: 0.7 } });
    } catch (err) {
      console.error('Leftovers suggester error:', err);
      setError(err.response?.data?.error || 'Unable to generate suggestions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAiToWishlist = async (aiRecipe) => {
    if (!isAuthenticated) {
      showToast('Please log in to save recipes to your wishlist', 'info');
      return;
    }

    try {
      await api.post('/wishlist', {
        meal_name: aiRecipe.name,
        is_ai_generated: true,
        recipe_details: aiRecipe
      });
      showToast(`Saved "${aiRecipe.name}" to Wishlist! 🔖`);
    } catch {
      showToast('Failed to save recipe', 'error');
    }
  };

  const handleSaveAiToCookbook = async (aiRecipe) => {
    if (!isAuthenticated) {
      showToast('Please log in to save recipes to your cookbook', 'info');
      return;
    }

    try {
      await api.post('/favorites/ai', {
        meal_name: aiRecipe.name,
        recipe_details: aiRecipe
      });
      showToast(`Saved "${aiRecipe.name}" to Cookbook! ❤️`);
      confetti({ particleCount: 30, spread: 50 });
    } catch {
      showToast('Failed to save recipe', 'error');
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 1.5rem 6rem' }}>
      {/* Header Banner */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.4rem' }}>
          Leftovers Recipe Finder
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
          {results ? `Suggestions based on: ${results.ingredients?.join(', ')}` : 'Enter ingredients you have on hand to find matches and AI ideas'}
        </p>
      </div>

      {/* Ingredient Tag Input Card */}
      <div className="card" style={{
        maxWidth: '820px',
        padding: '2rem',
        border: '1.5px solid var(--border)',
        boxShadow: 'var(--shadow)',
        marginBottom: '3rem',
        background: '#ffffff'
      }}>
        <form onSubmit={(e) => { e.preventDefault(); addIngredient(inputVal); }}>
          <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.6rem' }}>
            Enter 2 to 6 Leftover Ingredients:
          </label>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '1.25rem' }}>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type an ingredient (e.g. peas, rice, chicken) and press Enter..."
              className="form-input"
              style={{ fontSize: '0.95rem' }}
            />
            <button
              type="submit"
              className="btn btn-secondary"
              style={{ flexShrink: 0 }}
            >
              <Plus size={18} />
              <span>Add</span>
            </button>
          </div>
        </form>

        {/* Current Active Tags */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          minHeight: '44px',
          padding: '10px',
          background: 'var(--bg)',
          borderRadius: '10px',
          marginBottom: '1.5rem',
          border: '1px dashed var(--border)'
        }}>
          {ingredients.length === 0 ? (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
              No ingredients added yet.
            </span>
          ) : (
            ingredients.map((ing, idx) => (
              <span
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  background: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '20px',
                  color: 'var(--secondary)',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                }}
              >
                <span>{ing}</span>
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  style={{ background: 'transparent', color: '#ff6b35', display: 'flex', alignItems: 'center' }}
                >
                  <X size={14} />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Quick Suggestions */}
        <div style={{ marginBottom: '1.8rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
            QUICK PANTRY ADDITIONS:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {quickPantrySuggestions.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => addIngredient(item)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '14px',
                  background: 'var(--secondary-light)',
                  border: '1px solid var(--border)',
                  color: 'var(--secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  transition: 'all 0.2s ease'
                }}
              >
                + {item}
              </button>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSuggest}
          disabled={loading || ingredients.length < 2}
          className="btn btn-primary btn-lg"
          style={{ width: '100%', gap: '8px' }}
        >
          {loading ? (
            <>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Chef AI is Searching & Crafting Recipes...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Find Leftover Recipes ({ingredients.length} ingredients)</span>
            </>
          )}
        </button>

        {error && (
          <div style={{
            marginTop: '1.2rem',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#ef4444',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Results Display */}
      {results && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
          {/* Section 1: Real Recipe Database Matches */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.8rem' }}>
              <span style={{ fontSize: '1.4rem' }}>🍳</span>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)' }}>
                Real Recipe Database Matches
              </h2>
            </div>

            {results.realMatches && results.realMatches.length > 0 ? (
              <div className="recipe-grid">
                {results.realMatches.map((meal) => (
                  <MealCard
                    key={meal.idMeal}
                    meal={meal}
                    initialFavorite={results.savedMealIds?.includes(meal.idMeal)}
                    initialWishlist={results.wishlistMealIds?.includes(meal.idMeal)}
                  />
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>
                  No exact database recipe matched all selected ingredients. Check the AI creations below!
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Gemini AI Custom Creations */}
          {results.aiSuggestions && results.aiSuggestions.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.8rem' }}>
                <span style={{ fontSize: '1.4rem' }}>✨</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--secondary)' }}>
                  Custom AI Chef Suggestions
                </h2>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.5rem'
              }}>
                {results.aiSuggestions.map((aiRecipe, idx) => (
                  <div
                    key={idx}
                    className="card"
                    style={{
                      padding: '1.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1.5px solid #e9d5ff',
                      background: '#ffffff'
                    }}
                  >
                    <div>
                      <span className="badge badge-purple" style={{ marginBottom: '0.8rem' }}>
                        <Sparkles size={11} /> AI Recipe #{idx + 1}
                      </span>

                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.6rem' }}>
                        {aiRecipe.name}
                      </h3>

                      <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: '1.2rem', lineHeight: 1.6 }}>
                        {aiRecipe.description}
                      </p>

                      <div style={{ marginBottom: '1.2rem' }}>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Ingredients
                        </h4>
                        <ul style={{ listStyle: 'disc', paddingLeft: '1.2rem', fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>
                          {(aiRecipe.ingredients || []).map((ing, iIdx) => (
                            <li key={iIdx}>{ing}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Instructions
                        </h4>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                          {aiRecipe.instructions}
                        </p>
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      marginTop: '1.5rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--border)'
                    }}>
                      <button
                        onClick={() => handleSaveAiToCookbook(aiRecipe)}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                      >
                        <Heart size={15} color="#ef4444" />
                        <span>Cookbook</span>
                      </button>

                      <button
                        onClick={() => handleSaveAiToWishlist(aiRecipe)}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1 }}
                      >
                        <Bookmark size={15} />
                        <span>Wishlist</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leftovers;
