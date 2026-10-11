import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Bookmark, 
  ShoppingBag, 
  Search, 
  LogIn, 
  Loader2, 
  Frown 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MealCard from '../components/MealCard';

const DIET_FILTERS = ['All', 'Vegetarian', 'Vegan', 'Gluten-Free', 'High-Protein'];

const Cookbook = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedDiet, setSelectedDiet] = useState('All');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLoading(false);
      return;
    }

    if (isAuthenticated) {
      setLoading(true);
      api.get('/wishlist')
        .then((res) => {
          setWishlist(res.data.wishlist || []);
        })
        .catch(() => setWishlist([]))
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, authLoading]);

  const handleRemoveWishlist = (removedId) => {
    setWishlist((prev) => prev.filter((m) => (m.meal_id || m.id) !== removedId && m.id !== removedId));
  };

  if (authLoading || loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Loader2 size={40} color="#ff6b35" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
        <h2 style={{ color: 'var(--secondary)' }}>Loading your saved recipes...</h2>
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
            <Bookmark size={28} />
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--secondary)', marginBottom: '0.8rem' }}>Your Saved Recipes</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Sign in to access your saved recipes, manage your cooking wishlist, and instantly generate combined grocery lists.
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

  const filteredMeals = wishlist.filter((meal) => {
    const name = (meal.meal_name || meal.strMeal || '').toLowerCase();
    const matchesSearch = name.includes(filterQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedDiet === 'All') return true;
    const badges = meal.dietaryBadges || [];
    return badges.includes(selectedDiet);
  });

  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 1.5rem 5rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--secondary)' }}>
            Saved Recipes & Wishlist
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>
            {wishlist.length} {wishlist.length === 1 ? 'recipe' : 'recipes'} saved to your cooking wishlist
          </p>
        </div>

        {wishlist.length > 0 && (
          <Link to="/shopping-list?source=wishlist" className="btn btn-success">
            <ShoppingBag size={18} />
            <span>Generate Grocery List</span>
          </Link>
        )}
      </div>

      {/* Search & Dietary Filters Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 280px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Filter saved recipes by name..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="form-input"
            style={{ paddingLeft: '40px', borderRadius: '25px', background: '#ffffff' }}
          />
        </div>

        {/* Dietary Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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
      </div>

      {/* Grid of Meals */}
      {filteredMeals.length > 0 ? (
        <div className="recipe-grid">
          {filteredMeals.map((meal) => (
            <MealCard
              key={meal.id || meal.meal_id}
              meal={meal}
              initialWishlist={true}
              onRemoveWishlist={handleRemoveWishlist}
              isCustom={Boolean(meal.is_ai_generated)}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '2rem auto' }}>
          <Frown size={48} color="#a0aec0" style={{ margin: '0 auto 1.2rem' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--secondary)', marginBottom: '0.6rem' }}>
            {filterQuery || selectedDiet !== 'All' ? 'No Matching Recipes' : 'Your Wishlist is Empty'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.8rem' }}>
            {filterQuery || selectedDiet !== 'All'
              ? 'Try clearing your search query or dietary filter.'
              : 'You have not added any recipes to your wishlist yet. Discover recipes or use AI Leftovers to get started!'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {filterQuery || selectedDiet !== 'All' ? (
              <button 
                onClick={() => { setFilterQuery(''); setSelectedDiet('All'); }} 
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            ) : (
              <Link to="/" className="btn btn-primary">
                Explore Recipes
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cookbook;
