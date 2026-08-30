import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Heart, Bookmark, Check, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { useToast } from '../components/Toast';

const CustomRecipeDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'wishlist';
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedIngredients, setCheckedIngredients] = useState({});

  useEffect(() => {
    setLoading(true);
    api.get(`/recipe/custom/${id}?source=${source}`)
      .then((res) => {
        setRecipe(res.data.recipe);
      })
      .catch((err) => {
        console.error('Fetch custom recipe error:', err);
        showToast('Could not load custom recipe', 'error');
      })
      .finally(() => setLoading(false));
  }, [id, source]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Loader2 size={40} color="#f97316" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
        <h2>Loading AI Crafted Recipe...</h2>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <div className="glass-card" style={{ maxWidth: '500px', margin: '0 auto', padding: '2rem' }}>
          <h2>Recipe Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '1rem 0' }}>This custom recipe is no longer available.</p>
          <button onClick={() => navigate(-1)} className="btn btn-primary">Go Back</button>
        </div>
      </div>
    );
  }

  const details = recipe.recipe_details || {};
  const ingredients = details.ingredients || [];
  const instructions = details.instructions || '';

  const toggleIngredient = (idx) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="container animate-fade-in" style={{ padding: '2.5rem 1.5rem 5rem' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          color: 'var(--text-secondary)',
          fontSize: '0.9rem',
          marginBottom: '1.5rem'
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Header Banner */}
      <div className="glass-card" style={{
        padding: '2.5rem',
        marginBottom: '2.5rem',
        border: '1px solid rgba(139, 92, 246, 0.4)',
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(17, 24, 39, 0.9))'
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
          <span className="badge badge-purple">
            <Sparkles size={12} /> AI Chef Creation
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, marginBottom: '0.8rem' }}>
          {recipe.meal_name}
        </h1>

        {details.description && (
          <p style={{ fontSize: '1.1rem', color: '#cbd5e1', maxWidth: '700px', lineHeight: 1.6 }}>
            {details.description}
          </p>
        )}
      </div>

      {/* Ingredients and Instructions Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2.5rem',
        alignItems: 'start'
      }}>
        {/* Ingredients */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>Ingredients</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ingredients.map((ing, idx) => {
              const isChecked = !!checkedIngredients[idx];
              return (
                <li
                  key={idx}
                  onClick={() => toggleIngredient(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${isChecked ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    textDecoration: isChecked ? 'line-through' : 'none',
                    opacity: isChecked ? 0.65 : 1
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${isChecked ? '#10b981' : 'var(--border-subtle)'}`,
                    background: isChecked ? '#10b981' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}>
                    {isChecked && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>{ing}</span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Instructions */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '1.25rem' }}>Step-by-Step Instructions</h2>
          <div style={{
            color: '#cbd5e1',
            fontSize: '0.98rem',
            lineHeight: 1.8,
            whiteSpace: 'pre-line'
          }}>
            {instructions}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomRecipeDetail;
