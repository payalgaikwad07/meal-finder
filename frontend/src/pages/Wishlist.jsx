import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, ShoppingBag, LogIn, Loader2 } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import MealCard from '../components/MealCard';

const Wishlist = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

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
        .catch((err) => {
          console.error('Fetch wishlist error:', err);
        })
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated, authLoading]);

  const handleRemoveWishlist = (removedId) => {
    setWishlist((prev) => prev.filter((m) => (m.meal_id || m.id) !== removedId && m.id !== removedId));
  };

  if (authLoading || loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Loader2 size={40} color="#10b981" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
        <h2 style={{ color: 'var(--secondary)' }}>Loading your wishlist...</h2>
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
            background: 'var(--success-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--success)',
            margin: '0 auto 1.5rem'
          }}>
            <Bookmark size={28} />
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--secondary)', marginBottom: '0.8rem' }}>Your Cooking Wishlist</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Bookmark recipes you plan to make soon, and turn them into an instant, consolidated grocery shopping list.
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

  return (
    <div className="container animate-fade-in" style={{ padding: '3rem 1.5rem 5rem' }}>
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--secondary)' }}>Recipe Wishlist</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            {wishlist.length} {wishlist.length === 1 ? 'recipe' : 'recipes'} queued to cook
          </p>
        </div>

        {wishlist.length > 0 && (
          <Link
            to="/shopping-list?source=wishlist"
            className="btn btn-success"
          >
            <ShoppingBag size={18} />
            <span>Generate Shopping List</span>
          </Link>
        )}
      </div>

      {/* Empty State */}
      {wishlist.length === 0 ? (
        <div className="card" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <Bookmark size={50} color="#a0aec0" style={{ margin: '0 auto 1.5rem' }} />
          <h2 style={{ fontSize: '1.4rem', color: 'var(--secondary)', marginBottom: '0.6rem' }}>Your Wishlist is Empty</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Save recipes you'd like to cook later. Once added, you can generate a consolidated grocery shopping list with one click!
          </p>
          <Link to="/" className="btn btn-primary">
            Explore Recipes
          </Link>
        </div>
      ) : (
        <div className="recipe-grid">
          {wishlist.map((meal) => (
            <MealCard
              key={meal.id || meal.meal_id}
              meal={meal}
              initialWishlist={true}
              isCustom={meal.is_ai_generated}
              onRemoveWishlist={handleRemoveWishlist}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
