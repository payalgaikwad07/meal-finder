import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bookmark, 
  Youtube, 
  ExternalLink, 
  Loader2 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const RecipeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [meal, setMeal] = useState(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    api.get(`/meals/${id}`)
      .then((res) => {
        setMeal(res.data.meal);
        setIsWishlisted(res.data.isWishlisted || false);
      })
      .catch((err) => {
        console.error('Fetch meal detail error:', err);
        setError('Unable to load recipe details.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Loader2 size={44} color="#ff6b35" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
        <h2 style={{ color: 'var(--secondary)' }}>Loading recipe...</h2>
      </div>
    );
  }

  if (error || !meal) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Recipe Not Found</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{error || "We couldn't retrieve this recipe."}</p>
          <button onClick={() => navigate('/')} className="btn btn-primary">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  // Extract ingredients and measurements
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push({
        id: i,
        name: ing.trim(),
        measure: (measure || '').trim()
      });
    }
  }

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      showToast('Please log in to save to your Wishlist', 'info');
      return;
    }

    try {
      if (isWishlisted) {
        await api.delete(`/wishlist/${meal.idMeal}`);
        setIsWishlisted(false);
        showToast('Removed from Wishlist', 'info');
      } else {
        await api.post('/wishlist', {
          meal_id: meal.idMeal,
          meal_name: meal.strMeal,
          meal_thumb: meal.strMealThumb,
          is_ai_generated: false
        });
        setIsWishlisted(true);
        showToast('Added to your Wishlist! 🔖');
      }
    } catch {
      showToast('Action failed', 'error');
    }
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '2.5rem 1.5rem 5rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '2px solid var(--border)',
        paddingBottom: '1.2rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--secondary)' }}>{meal.strMeal}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '4px' }}>
            {meal.strArea} Cuisine &bull; {meal.strCategory}
          </p>
        </div>

        <button
          onClick={() => navigate(-1)}
          className="btn btn-secondary btn-sm"
        >
          <ArrowLeft size={16} />
          <span>Back to Search</span>
        </button>
      </div>

      {/* Main Content Layout: Left (Image & Buttons) + Right (Ingredients) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        {/* Left Side: Photo & Actions */}
        <div>
          <div style={{
            position: 'relative',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow)',
            border: '1px solid var(--border)'
          }}>
            <img
              src={meal.strMealThumb}
              alt={meal.strMeal}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            {meal.strCategory && (
              <span className="badge badge-primary" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {meal.strCategory}
              </span>
            )}
            {meal.strArea && (
              <span className="badge badge-green" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                {meal.strArea}
              </span>
            )}
            {meal.dietaryBadges && meal.dietaryBadges.map((badge) => (
              <span 
                key={badge} 
                className="badge" 
                style={{ 
                  fontSize: '0.85rem', 
                  padding: '6px 14px',
                  background: badge === 'Vegetarian' || badge === 'Vegan' ? 'var(--success-light)' : '#e0f2fe',
                  color: badge === 'Vegetarian' || badge === 'Vegan' ? 'var(--success)' : '#0284c7'
                }}
              >
                {badge}
              </span>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1.5rem' }}>
            <button
              onClick={handleWishlistToggle}
              className={`btn ${isWishlisted ? 'btn-success' : 'btn-secondary'}`}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <Bookmark size={18} fill={isWishlisted ? 'white' : 'none'} />
              <span>{isWishlisted ? 'In Wishlist' : '+ Add to Wishlist'}</span>
            </button>

            {meal.strYoutube && (
              <a
                href={meal.strYoutube}
                target="_blank"
                rel="noreferrer"
                className="btn btn-danger"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Youtube size={18} />
                <span>Watch Cooking Video</span>
              </a>
            )}
          </div>
        </div>

        {/* Right Side: Clean Ingredients List */}
        <div className="card" style={{ padding: '2rem', background: '#ffffff' }}>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--secondary)', marginBottom: '1.25rem' }}>
            Ingredients
          </h2>

          <ul style={{ listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {ingredients.map((ing) => (
              <li
                key={ing.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)'
                }}
              >
                <img
                  src={`https://www.themealdb.com/images/ingredients/${encodeURIComponent(ing.name)}-Small.png`}
                  alt={ing.name}
                  style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <span style={{ fontSize: '0.92rem', color: 'var(--secondary)' }}>
                  <strong>{ing.measure}</strong> {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Full Width Instructions Section */}
      <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '2px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.6rem', color: 'var(--secondary)', marginBottom: '1rem' }}>
          Cooking Instructions
        </h2>
        <div className="card" style={{ padding: '2rem', background: '#ffffff', color: 'var(--text)', lineHeight: 1.8, fontSize: '1rem', whiteSpace: 'pre-line' }}>
          {meal.strInstructions}
        </div>
      </div>
    </div>
  );
};

export default RecipeDetail;
