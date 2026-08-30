import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookHeart, Search, Sparkles, UtensilsCrossed, LogIn, Loader2, Frown } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MealCard from '../components/MealCard';

const Cookbook = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLoading(false);
      return;
    }

    if (isAuthenticated) {
      setLoading(true);
      api.get('/favorites')
        .then((res) => {
          setMeals(res.data.meals || []);
        })
        .catch((err) => {
          console.error('Fetch favorites error:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, authLoading]);

  const handleRemoveFavorite = (removedId) => {
    setMeals((prev) => prev.filter((m) => (m.meal_id || m.id) !== removedId && m.id !== removedId));
  };

  if (authLoading || loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Loader2 size={40} color="#ff6b35" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
        <h2 style={{ color: 'var(--secondary)' }}>Opening your personal cookbook...</h2>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container animate-fade-in" style={{ padding: '6rem 1.5rem', textAlign: 'center' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '3rem 2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)',
            margin: '0 auto 1.5rem'
          }}>
            <BookHeart size={28} />
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--secondary)', marginBottom: '0.8rem' }}>Your Recipe Cookbook</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Sign in to save and organize your favorite recipes, create custom culinary collections, and access them anytime.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link to="/login" className="btn btn-primary btn-lg">
              <LogIn size={18} />
              <span>Log In</span>
            </Link>
            <Link to="/signup" className="btn btn-secondary btn-lg">
              <span>Sign Up Free</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredMeals = meals.filter((meal) => {
    const matchesSearch = (meal.meal_name || '').toLowerCase().includes(filterQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterType === 'standard') return !meal.is_ai_generated;
    if (filterType === 'ai') return meal.is_ai_generated;
    return true;
  });

  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 1.5rem 5rem' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--secondary)' }}>My Saved Cookbook</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            {meals.length} {meals.length === 1 ? 'recipe' : 'recipes'} collected in your personal vault
          </p>
        </div>

        <Link to="/" className="btn btn-secondary btn-sm">
          <UtensilsCrossed size={16} />
          <span>Discover More Recipes</span>
        </Link>
      </div>

      {/* Filter & Search Controls */}
      {meals.length > 0 && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={17} color="#718096" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter saved recipes..."
              className="form-input"
              style={{ paddingLeft: '40px', height: '40px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setFilterType('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: filterType === 'all' ? 'var(--primary)' : 'var(--secondary-light)',
                color: filterType === 'all' ? 'white' : 'var(--secondary)'
              }}
            >
              All ({meals.length})
            </button>
            <button
              onClick={() => setFilterType('standard')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: filterType === 'standard' ? 'var(--primary)' : 'var(--secondary-light)',
                color: filterType === 'standard' ? 'white' : 'var(--secondary)'
              }}
            >
              Standard ({meals.filter(m => !m.is_ai_generated).length})
            </button>
            <button
              onClick={() => setFilterType('ai')}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: filterType === 'ai' ? 'var(--primary)' : 'var(--secondary-light)',
                color: filterType === 'ai' ? 'white' : 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={13} /> AI Recipes ({meals.filter(m => m.is_ai_generated).length})
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {meals.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <BookHeart size={50} color="#a0aec0" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--secondary)', marginBottom: '0.6rem' }}>Your Cookbook is Empty</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            You haven't saved any recipes yet! Explore dishes or create ideas with AI and click the heart icon to save them here.
          </p>
          <Link to="/" className="btn btn-primary">
            Explore Recipes
          </Link>
        </div>
      ) : filteredMeals.length === 0 ? (
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <Frown size={36} color="#a0aec0" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--secondary)' }}>No saved recipes match "{filterQuery}"</h3>
        </div>
      ) : (
        <div className="recipe-grid">
          {filteredMeals.map((meal) => (
            <MealCard
              key={meal.id || meal.meal_id}
              meal={meal}
              initialFavorite={true}
              isCustom={meal.is_ai_generated}
              onRemoveFavorite={handleRemoveFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Cookbook;
