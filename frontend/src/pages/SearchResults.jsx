import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Frown } from 'lucide-react';
import api from '../api/client';
import MealCard from '../components/MealCard';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const type = searchParams.get('type') || 'name';
  const query = searchParams.get('q') || '';

  const [meals, setMeals] = useState([]);
  const [savedMealIds, setSavedMealIds] = useState([]);
  const [wishlistMealIds, setWishlistMealIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!query.trim()) {
      setMeals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const endpoint = type === 'cuisine' 
      ? `/search/cuisine?q=${encodeURIComponent(query)}`
      : type === 'ingredient'
      ? `/search/ingredient?q=${encodeURIComponent(query)}`
      : `/search/name?q=${encodeURIComponent(query)}`;

    api.get(endpoint)
      .then((res) => {
        setMeals(res.data.meals || []);
        setSavedMealIds(res.data.savedMealIds || []);
        setWishlistMealIds(res.data.wishlistMealIds || []);
      })
      .catch((err) => {
        console.error('Search API error:', err);
        setError('Unable to fetch recipes. Please check your connection and try again.');
        setMeals([]);
      })
      .finally(() => setLoading(false));
  }, [type, query]);

  return (
    <div className="container animate-fade-in" style={{ padding: '2.5rem 1.5rem 5rem' }}>
      {/* Back Navigation Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--secondary-light)',
            color: 'var(--secondary)',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.88rem',
            fontWeight: 600,
            border: '1px solid var(--border)'
          }}
        >
          <ArrowLeft size={16} /> Back to Search
        </button>
      </div>

      {/* Results Header Title */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem',
        borderBottom: '2px solid var(--border)',
        paddingBottom: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)' }}>
            {type === 'cuisine' && `🌍 ${query} Cuisine`}
            {type === 'ingredient' && `🌽 Ingredient: ${query}`}
            {type === 'name' && `🔍 Results for "${query}"`}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '4px' }}>
            {!loading && `${meals.length} delicious ${meals.length === 1 ? 'recipe' : 'recipes'} found`}
          </p>
        </div>
      </div>

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

      {/* Empty State (Clean, no pushed hardcoded chicken suggestions) */}
      {!loading && !error && meals.length === 0 && (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <Frown size={48} color="#a0aec0" style={{ margin: '0 auto 1.2rem' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--secondary)', marginBottom: '0.6rem' }}>No Recipes Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem' }}>
            We couldn't find any recipes matching "{query}". Try checking your spelling or searching for another term.
          </p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Back to Search
          </button>
        </div>
      )}

      {/* Clean Recipe Grid */}
      {!loading && meals.length > 0 && (
        <div className="recipe-grid">
          {meals.map((meal) => (
            <MealCard
              key={meal.idMeal}
              meal={meal}
              initialFavorite={savedMealIds.includes(meal.idMeal)}
              initialWishlist={wishlistMealIds.includes(meal.idMeal)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
