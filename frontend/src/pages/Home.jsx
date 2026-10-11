import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  Dice5, 
  Globe2, 
  Utensils, 
  Flame, 
  History
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const popularCuisines = [
  { label: 'Indian', value: 'Indian' },
  { label: 'Italian', value: 'Italian' },
  { label: 'Japanese', value: 'Japanese' },
  { label: 'Mexican', value: 'Mexican' },
  { label: 'British', value: 'British' },
  { label: 'Chinese', value: 'Chinese' },
  { label: 'Thai', value: 'Thai' },
  { label: 'Greek', value: 'Greek' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'Canadian', value: 'Canadian' },
  { label: 'Filipino', value: 'Filipino' },
  { label: 'Vietnamese', value: 'Vietnamese' },
  { label: 'Turkish', value: 'Turkish' },
];

const Home = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [searchTab, setSearchTab] = useState('name');
  const [nameInput, setNameInput] = useState('');
  const [cuisineInput, setCuisineInput] = useState('Indian');
  const [ingredientInput, setIngredientInput] = useState('');
  const [nameSuggestion, setNameSuggestion] = useState(null);
  const [ingredientSuggestion, setIngredientSuggestion] = useState(null);
  const [history, setHistory] = useState([]);
  const [randomLoading, setRandomLoading] = useState(false);

  useEffect(() => {
    if (!nameInput.trim() || nameInput.trim().length < 3) {
      setNameSuggestion(null);
      return;
    }
    const timer = setTimeout(() => {
      api.get(`/search/suggest?q=${encodeURIComponent(nameInput.trim())}`)
        .then((res) => {
          if (res.data?.suggestion) {
            setNameSuggestion(res.data.suggestion);
          } else {
            setNameSuggestion(null);
          }
        })
        .catch(() => setNameSuggestion(null));
    }, 200);
    return () => clearTimeout(timer);
  }, [nameInput]);

  useEffect(() => {
    if (!ingredientInput.trim() || ingredientInput.trim().length < 3) {
      setIngredientSuggestion(null);
      return;
    }
    const timer = setTimeout(() => {
      api.get(`/search/suggest?q=${encodeURIComponent(ingredientInput.trim())}`)
        .then((res) => {
          if (res.data?.suggestion) {
            setIngredientSuggestion(res.data.suggestion);
          } else {
            setIngredientSuggestion(null);
          }
        })
        .catch(() => setIngredientSuggestion(null));
    }, 200);
    return () => clearTimeout(timer);
  }, [ingredientInput]);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/search/history')
        .then((res) => {
          const raw = res.data.history || [];
          const unique = [];
          const seen = new Set();
          for (const item of raw) {
            const key = item.query_text.trim().toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              unique.push(item);
            }
          }
          setHistory(unique);
        })
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleNameSearch = (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    navigate(`/search?type=name&q=${encodeURIComponent(nameInput.trim())}`);
  };

  const handleCuisineSearch = (e) => {
    e.preventDefault();
    if (!cuisineInput.trim()) return;
    navigate(`/search?type=cuisine&q=${encodeURIComponent(cuisineInput.trim())}`);
  };

  const handleIngredientSearch = (e) => {
    e.preventDefault();
    if (!ingredientInput.trim()) return;
    navigate(`/search?type=ingredient&q=${encodeURIComponent(ingredientInput.trim())}`);
  };

  const handleRandomSearch = async () => {
    setRandomLoading(true);
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    try {
      const res = await api.get('/search/random');
      if (res.data && res.data.meals && res.data.meals[0]) {
        navigate(`/meal/${res.data.meals[0].idMeal}`);
      } else {
        showToast('Could not load random recipe', 'error');
      }
    } catch {
      showToast('Service unavailable', 'error');
    } finally {
      setRandomLoading(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* 1. Hero Landing Block */}
      <header className="hero-header">
        <div className="container">
          <h1>Your Ultimate Kitchen Companion</h1>
          <p>
            Say goodbye to food waste. Discover recipes, save your favorite meals to your wishlist, generate grocery lists, and find ideas using whatever is in your fridge.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <a href="#search-section" className="btn btn-primary">
              <Search size={16} />
              <span>Explore Recipes</span>
            </a>
            <Link
              to={isAuthenticated ? "/leftovers" : "/login"}
              className="btn btn-secondary"
              style={{ background: 'rgba(255,255,255,0.18)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)' }}
            >
              <Sparkles size={16} />
              <span>{isAuthenticated ? 'What Can I Cook?' : 'What Can I Cook? (Login to try)'}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container">
        {/* 2. AI Promo Card */}
        <section className="ai-promo-card">
          <div style={{ flex: '1 1 280px' }}>
            <span className="badge" style={{ background: 'var(--primary)', color: 'white', marginBottom: '0.8rem', padding: '4px 12px', fontSize: '0.8rem' }}>
              NEW FEATURE
            </span>
            <h2 style={{ color: 'var(--secondary)', marginBottom: '0.6rem', fontSize: '1.5rem' }}>
              Leftovers in the Fridge?
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Enter the ingredients you have on hand and let our AI Leftover Suggester generate custom recipe ideas tailored to what you have, mixed with real matches from our database!
            </p>
          </div>

          <Link
            to={isAuthenticated ? "/leftovers" : "/login"}
            className="btn btn-primary"
            style={{ alignSelf: 'center' }}
          >
            {isAuthenticated ? 'Try AI Leftovers Suggester' : 'Login to Try AI Suggester'}
          </Link>
        </section>

        {/* 3. Interactive Search Discovery Console */}
        <section id="search-section" style={{
          paddingTop: '2rem',
          borderTop: '2px solid var(--border)',
          marginBottom: '4rem'
        }}>
          <h2 style={{ textAlign: 'center', color: 'var(--secondary)', marginBottom: '0.4rem', fontWeight: 800, fontSize: '1.85rem' }}>
            Recipe Discovery Console
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>
            Select your search strategy below to find your next favorite meal
          </p>

          <div className="card" style={{ padding: '2rem', maxWidth: '820px', margin: '0 auto', boxShadow: 'var(--shadow)' }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              <button
                type="button"
                onClick={() => setSearchTab('name')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: searchTab === 'name' ? 'var(--primary)' : 'var(--secondary-light)',
                  color: searchTab === 'name' ? '#ffffff' : 'var(--secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                🔍 By Name
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('cuisine')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: searchTab === 'cuisine' ? 'var(--primary)' : 'var(--secondary-light)',
                  color: searchTab === 'cuisine' ? '#ffffff' : 'var(--secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                🌍 By Cuisine
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('ingredient')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: searchTab === 'ingredient' ? 'var(--primary)' : 'var(--secondary-light)',
                  color: searchTab === 'ingredient' ? '#ffffff' : 'var(--secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                🌽 By Ingredient
              </button>

              <button
                type="button"
                onClick={() => setSearchTab('random')}
                style={{
                  padding: '8px 18px',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  background: searchTab === 'random' ? 'var(--primary)' : 'var(--secondary-light)',
                  color: searchTab === 'random' ? '#ffffff' : 'var(--secondary)',
                  transition: 'all 0.2s ease'
                }}
              >
                🎲 Random
              </button>
            </div>

            {/* TAB 1: Search by Name */}
            {searchTab === 'name' && (
              <div>
                <form onSubmit={handleNameSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="e.g. pasta, sushi, burger, chicken..."
                    className="form-input"
                    style={{ flex: '1 1 260px' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                    Search Recipes
                  </button>
                </form>
                {nameSuggestion && (
                  <div style={{ marginTop: '10px', fontSize: '0.88rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💡 Did you mean:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(nameSuggestion);
                        setNameSuggestion(null);
                      }}
                      style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {nameSuggestion}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Search by Cuisine */}
            {searchTab === 'cuisine' && (
              <form onSubmit={handleCuisineSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <select
                  value={cuisineInput}
                  onChange={(e) => setCuisineInput(e.target.value)}
                  className="form-select"
                  style={{ flex: '1 1 260px' }}
                >
                  {popularCuisines.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                  Explore Cuisine
                </button>
              </form>
            )}

            {/* TAB 3: Search by Ingredient */}
            {searchTab === 'ingredient' && (
              <div>
                <form onSubmit={handleIngredientSearch} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    placeholder="e.g. chicken_breast, garlic, tomato..."
                    className="form-input"
                    style={{ flex: '1 1 260px' }}
                    required
                  />
                  <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>
                    Find by Ingredient
                  </button>
                </form>
                {ingredientSuggestion && (
                  <div style={{ marginTop: '10px', fontSize: '0.88rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>💡 Did you mean:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIngredientInput(ingredientSuggestion);
                        setIngredientSuggestion(null);
                      }}
                      style={{
                        background: '#fef3c7',
                        border: '1px solid #fde68a',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontWeight: 700,
                        color: 'var(--primary)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      {ingredientSuggestion}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Random Meal */}
            {searchTab === 'random' && (
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleRandomSearch}
                  disabled={randomLoading}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                >
                  {randomLoading ? '🎲 Rolling for a recipe...' : '🎲 Surprise Me with a Random Recipe!'}
                </button>
              </div>
            )}

            {/* Deduplicated Recent Searches */}
            {isAuthenticated && history.length > 0 && (
              <div style={{
                marginTop: '1.5rem',
                paddingTop: '1.2rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  🕒 Recent:
                </span>
                {history.map((h, i) => (
                  <button
                    key={i}
                    onClick={() => navigate(`/search?type=${h.search_type}&q=${encodeURIComponent(h.query_text)}`)}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--secondary-light)',
                      color: 'var(--secondary)',
                      borderRadius: '20px',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      border: '1px solid var(--border)'
                    }}
                  >
                    {h.query_text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
