import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Frown, Sparkles, HelpCircle, Search } from 'lucide-react';
import axios from 'axios';
import api from '../api/client';
import MealCard from '../components/MealCard';

const DIET_FILTERS = ['All', 'Vegetarian', 'Vegan', 'Gluten-Free', 'High-Protein', 'Dairy-Free', 'Low-Carb'];

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get('type') || 'name';
  const query = searchParams.get('q') || '';
  const exact = searchParams.get('exact') === 'true';

  const [meals, setMeals] = useState([]);
  const [savedMealIds, setSavedMealIds] = useState([]);
  const [wishlistMealIds, setWishlistMealIds] = useState([]);
  const [didYouMean, setDidYouMean] = useState(null);
  const [isAutoCorrected, setIsAutoCorrected] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // In-page search bar state
  const [searchInput, setSearchInput] = useState(query);
  const [searchType, setSearchType] = useState(type);

  // Keep search input synced when query in URL changes
  useEffect(() => {
    setSearchInput(query);
    setSearchType(type);
  }, [query, type]);

  useEffect(() => {
    if (!query.trim()) {
      setMeals([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDidYouMean(null);
    setIsAutoCorrected(false);

    const exactParam = exact ? '&exact=true' : '';
    const endpoint = type === 'cuisine' 
      ? `/search/cuisine?q=${encodeURIComponent(query)}${exactParam}`
      : type === 'ingredient'
      ? `/search/ingredient?q=${encodeURIComponent(query)}${exactParam}`
      : `/search/name?q=${encodeURIComponent(query)}${exactParam}`;

    api.get(endpoint, { signal: controller.signal })
      .then((res) => {
        setMeals(res.data.meals || []);
        setSavedMealIds(res.data.savedMealIds || []);
        setWishlistMealIds(res.data.wishlistMealIds || []);
        setDidYouMean(res.data.didYouMean || null);
        setIsAutoCorrected(Boolean(res.data.isAutoCorrected));
      })
      .catch((err) => {
        if (axios.isCancel(err) || err.name === 'CanceledError') {
          return;
        }
        console.error('Search API error:', err);
        setError('Unable to fetch recipes. Please check your connection and try again.');
        setMeals([]);
      })
      .finally(() => setLoading(false));

    return () => {
      controller.abort();
    };
  }, [type, query, exact]);

  const handleInPageSearch = (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    navigate(`/search?type=${searchType}&q=${encodeURIComponent(searchInput.trim())}`);
  };

  const filteredMeals = meals.filter((meal) => {
    if (selectedDiet === 'All') return true;
    const badges = meal.dietaryBadges || [];
    return badges.includes(selectedDiet);
  });

  return (
    <div className="container animate-fade-in" style={{ padding: '2.5rem 1.5rem 5rem' }}>
      {/* Top Search & Navigation Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--secondary-light)',
            color: 'var(--secondary)',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.88rem',
            fontWeight: 600,
            border: '1px solid var(--border)',
            cursor: 'pointer'
          }}
        >
          <ArrowLeft size={16} /> Home
        </button>

        {/* In-page Re-search Console */}
        <form onSubmit={handleInPageSearch} style={{ display: 'flex', gap: '8px', flex: '1 1 360px', maxWidth: '640px' }}>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="form-select"
            style={{ width: '130px', padding: '8px 12px', fontSize: '0.88rem', borderRadius: '10px' }}
          >
            <option value="name">By Name</option>
            <option value="ingredient">Ingredient</option>
            <option value="cuisine">Cuisine</option>
          </select>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search recipes, ingredients..."
            className="form-input"
            style={{ flex: 1, padding: '8px 14px', fontSize: '0.9rem', borderRadius: '10px' }}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '8px 18px', borderRadius: '10px' }}>
            <Search size={16} />
          </button>
        </form>
      </div>

      {/* Header with Google-style results / Did You Mean indicators */}
      <div style={{
        marginBottom: '1.5rem',
        borderBottom: '2px solid var(--border)',
        paddingBottom: '1.2rem'
      }}>
        {/* Case 1: Auto-corrected search */}
        {isAutoCorrected && didYouMean ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="badge" style={{ background: 'var(--primary)', color: 'white', fontSize: '0.78rem' }}>
                Auto-Corrected
              </span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--secondary)', margin: '0 0 6px 0' }}>
              Showing results for{' '}
              <span style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                "{didYouMean}"
              </span>
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', margin: 0 }}>
              Search instead for{' '}
              <Link
                to={`/search?type=${type}&q=${encodeURIComponent(query)}&exact=true`}
                style={{ color: 'var(--secondary)', fontWeight: 700, textDecoration: 'underline' }}
              >
                "{query}"
              </Link>
              {' '}• {!loading && `${filteredMeals.length} ${filteredMeals.length === 1 ? 'recipe' : 'recipes'} found`}
            </p>
          </div>
        ) : (
          /* Case 2: Standard search */
          <div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--secondary)', margin: '0 0 4px 0' }}>
              {type === 'cuisine' && `🌍 ${query} Cuisine`}
              {type === 'ingredient' && `🌽 Ingredient: ${query}`}
              {type === 'name' && `🔍 Results for "${query}"`}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
              {!loading && `${filteredMeals.length} delicious ${filteredMeals.length === 1 ? 'recipe' : 'recipes'} found`}
            </p>
          </div>
        )}
      </div>

      {/* Did You Mean Suggestion Banner (when not auto-corrected, e.g. exact match forced or alternative term) */}
      {!isAutoCorrected && didYouMean && (
        <div style={{
          background: '#fffbeb',
          border: '1.5px solid #fde68a',
          borderRadius: '12px',
          padding: '14px 18px',
          marginBottom: '1.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HelpCircle size={22} color="#d97706" />
            <span style={{ fontSize: '0.98rem', color: '#92400e' }}>
              Did you mean{' '}
              <Link
                to={`/search?type=${type}&q=${encodeURIComponent(didYouMean)}`}
                style={{ fontWeight: 800, color: 'var(--primary)', textDecoration: 'underline' }}
              >
                "{didYouMean}"
              </Link>
              ?
            </span>
          </div>
          <Link
            to={`/search?type=${type}&q=${encodeURIComponent(didYouMean)}`}
            className="btn btn-primary"
            style={{ padding: '6px 16px', fontSize: '0.85rem' }}
          >
            Search "{didYouMean}"
          </Link>
        </div>
      )}

      {/* Dietary Filter Chips */}
      {meals.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '2rem' }}>
          {DIET_FILTERS.map((diet) => (
            <button
              key={diet}
              onClick={() => setSelectedDiet(diet)}
              className="badge"
              style={{
                cursor: 'pointer',
                padding: '6px 14px',
                fontSize: '0.82rem',
                fontWeight: 600,
                border: selectedDiet === diet ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: selectedDiet === diet ? 'var(--primary-light)' : '#ffffff',
                color: selectedDiet === diet ? 'var(--primary)' : 'var(--text-muted)',
                borderRadius: '20px'
              }}
            >
              {diet}
            </button>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '5rem 0' }}>
          <Loader2 size={40} color="#ff6b35" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Finding delicious recipes...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#fecaca', background: '#fef2f2' }}>
          <p style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMeals.length === 0 && (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <Frown size={48} color="#a0aec0" style={{ margin: '0 auto 1.2rem' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--secondary)', marginBottom: '0.6rem' }}>
            {selectedDiet !== 'All' ? `No ${selectedDiet} recipes found` : 'No Recipes Found'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem' }}>
            {selectedDiet !== 'All' 
              ? `None of the results for "${query}" match the ${selectedDiet} filter. Try clearing the filter.`
              : didYouMean 
                ? `No direct recipes for "${query}". Try searching for "${didYouMean}".`
                : `We couldn't find any recipes matching "${query}". Try checking your spelling or searching for another term.`}
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {selectedDiet !== 'All' ? (
              <button onClick={() => setSelectedDiet('All')} className="btn btn-secondary">
                Clear Diet Filter
              </button>
            ) : didYouMean ? (
              <Link
                to={`/search?type=${type}&q=${encodeURIComponent(didYouMean)}`}
                className="btn btn-primary"
              >
                Search for "{didYouMean}"
              </Link>
            ) : null}
            <button onClick={() => navigate('/')} className="btn btn-secondary">
              Back to Home
            </button>
          </div>
        </div>
      )}

      {/* Recipe Grid */}
      {!loading && filteredMeals.length > 0 && (
        <div className="recipe-grid">
          {filteredMeals.map((meal) => (
            <MealCard
              key={meal.idMeal}
              meal={meal}
              initialWishlist={wishlistMealIds.includes(meal.idMeal)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
