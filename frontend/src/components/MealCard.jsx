import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Eye, Sparkles, ChefHat } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const MealCard = ({ 
  meal, 
  initialWishlist = false,
  onRemoveWishlist,
  isCustom = false
}) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  
  const mealId = meal.idMeal || meal.meal_id || meal.id;
  const mealName = meal.strMeal || meal.meal_name || 'Delicious Recipe';
  const mealThumb = meal.strMealThumb || meal.meal_thumb || '';
  const mealCategory = meal.strCategory || (isCustom ? 'AI Chef' : null);
  const matchesCount = meal.matchesCount;

  const [isWishlist, setIsWishlist] = useState(initialWishlist);
  const [wishLoading, setWishLoading] = useState(false);

  const toggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      showToast('Please log in to save recipes to your wishlist', 'info');
      return;
    }

    setWishLoading(true);
    try {
      if (isWishlist) {
        await api.delete(`/wishlist/${mealId || meal.id}`);
        setIsWishlist(false);
        showToast(`Removed "${mealName}" from Wishlist`, 'info');
        if (onRemoveWishlist) onRemoveWishlist(mealId || meal.id);
      } else {
        await api.post('/wishlist', {
          meal_id: isCustom ? null : mealId,
          meal_name: mealName,
          meal_thumb: mealThumb,
          is_ai_generated: isCustom,
          recipe_details: meal.recipe_details || null
        });
        setIsWishlist(true);
        confetti({ particleCount: 30, spread: 50, origin: { y: 0.85 } });
        showToast(`Added "${mealName}" to Wishlist! 🔖`);
      }
    } catch {
      showToast('Action failed. Please try again.', 'error');
    } finally {
      setWishLoading(false);
    }
  };

  const detailUrl = isCustom 
    ? `/recipe/custom/${meal.id || mealId}?source=${meal.source || 'wishlist'}`
    : `/meal/${mealId}`;

  return (
    <div 
      className="card animate-fade-in"
      style={{
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        height: '100%',
        borderRadius: '16px',
        border: '1.5px solid var(--border)',
        boxShadow: 'var(--shadow)',
        background: '#ffffff'
      }}
    >
      {/* Card Image Box */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '65%', overflow: 'hidden', background: '#f5ece3' }}>
        {mealThumb ? (
          <img 
            src={mealThumb} 
            alt={mealName}
            loading="lazy"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          />
        ) : (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--primary-light)',
            color: 'var(--primary)'
          }}>
            <ChefHat size={44} />
          </div>
        )}
      </div>

      {/* Card Content */}
      <div style={{
        padding: '1.2rem',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'space-between'
      }}>
        <div>
          <h3 style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--secondary)',
            marginBottom: '0.5rem',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {mealName}
          </h3>

          {/* Badges / Matches count */}
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {matchesCount !== undefined ? (
              <span className="badge badge-green" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                Matches {matchesCount} ingredients
              </span>
            ) : isCustom ? (
              <span className="badge badge-purple" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                <Sparkles size={11} /> AI Recipe
              </span>
            ) : mealCategory ? (
              <span className="badge badge-primary" style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                {mealCategory}
              </span>
            ) : null}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto' }}>
          <Link
            to={detailUrl}
            className="btn btn-primary btn-sm"
            style={{ width: '100%', fontWeight: 700 }}
            aria-label={`View recipe for ${mealName}`}
          >
            <Eye size={15} />
            <span>View Recipe</span>
          </Link>

          <button
            onClick={toggleWishlist}
            disabled={wishLoading}
            className="btn btn-secondary btn-sm"
            aria-label={isWishlist ? `Remove ${mealName} from Wishlist` : `Add ${mealName} to Wishlist`}
            style={{
              width: '100%',
              fontSize: '0.85rem',
              fontWeight: 600,
              background: isWishlist ? 'var(--success-light)' : 'var(--secondary-light)',
              color: isWishlist ? 'var(--success)' : 'var(--secondary)',
              borderColor: isWishlist ? '#a7f3d0' : 'var(--border)'
            }}
          >
            <Bookmark size={14} fill={isWishlist ? 'currentColor' : 'none'} />
            <span>{isWishlist ? 'In Wishlist' : '+ Add to Wishlist'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MealCard;
