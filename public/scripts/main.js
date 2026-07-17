/**
 * Switch tabs on the homepage search panel.
 */
function switchTab(name, el) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

  document.getElementById('panel-' + name).classList.add('active');
  el.classList.add('active');
}

/**
 * Toggles a meal in the user's favorites (AJAX call).
 */
async function toggleFavorite(btnEl, mealId, mealName, mealThumb) {
  // Show loading indicator
  const originalText = btnEl.innerHTML;
  btnEl.disabled = true;
  btnEl.classList.add('loading');

  const isFavorited = btnEl.classList.contains('favorited');
  
  try {
    if (isFavorited) {
      // Remove from favorites
      const response = await fetch(`/favorites/${mealId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        btnEl.classList.remove('favorited');
        btnEl.innerHTML = '♡ Save';
      } else {
        alert(data.error || 'Failed to remove from favorites.');
        btnEl.innerHTML = originalText;
      }
    } else {
      // Save to favorites
      const response = await fetch('/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meal_id: mealId, meal_name: mealName, meal_thumb: mealThumb }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        btnEl.classList.add('favorited');
        btnEl.innerHTML = '♥ Saved';
      } else {
        // If not logged in, redirect to login page
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        alert(data.error || 'Failed to save to favorites.');
        btnEl.innerHTML = originalText;
      }
    }
  } catch (error) {
    console.error('Error toggling favorite:', error);
    alert('A connection error occurred. Please try again.');
    btnEl.innerHTML = originalText;
  } finally {
    btnEl.disabled = false;
    btnEl.classList.remove('loading');
  }
}

/**
 * Removes a meal from favorites from the Cookbook page (AJAX call).
 */
/**
 * Removes a meal from favorites from the Cookbook page (AJAX call).
 * Supports standard MealDB recipes and custom AI recipes (prefixed with 'custom-').
 */
async function removeFavorite(identifier) {
  const card = document.getElementById(`fav-card-${identifier}`);
  if (!card) return;

  const btn = card.querySelector('.fav-remove-btn');
  btn.disabled = true;
  btn.innerText = 'Removing...';

  try {
    let url = `/favorites/${identifier}`;
    if (identifier.toString().startsWith('custom-')) {
      const customId = identifier.replace('custom-', '');
      url = `/favorites/custom/${customId}`;
    }

    const response = await fetch(url, {
      method: 'DELETE',
    });
    const data = await response.json();

    if (response.ok && data.success) {
      // Smooth fade-out animation
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9)';
      
      setTimeout(() => {
        card.remove();
        
        // If no cards left, refresh list container to show empty state
        const remainingCards = document.querySelectorAll('.card');
        if (remainingCards.length === 0) {
          const grid = document.getElementById('cookbook-grid');
          if (grid) {
            grid.innerHTML = `
              <div class="empty-state">
                <div class="empty-icon">🍳</div>
                <h3>Your cookbook is empty</h3>
                <p>Browse or search for meals and click the heart icon to save them here.</p>
                <a href="/" class="btn btn-secondary">Search Recipes</a>
              </div>
            `;
          }
        }
      }, 300);
    } else {
      alert(data.error || 'Failed to remove from cookbook.');
      btn.disabled = false;
      btn.innerText = '🗑️ Remove';
    }
  } catch (error) {
    console.error('Error removing favorite:', error);
    alert('A connection error occurred. Please try again.');
    btn.disabled = false;
    btn.innerText = '🗑️ Remove';
  }
}

/**
 * Toggles a standard MealDB recipe in the user's wishlist (AJAX call).
 */
async function toggleWishlist(btnEl, mealId, mealName, mealThumb) {
  const originalText = btnEl.innerHTML;
  btnEl.disabled = true;

  const isInWishlist = btnEl.classList.contains('in-wishlist');

  try {
    if (isInWishlist) {
      // Remove from wishlist
      const response = await fetch(`/wishlist/${mealId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        btnEl.classList.remove('in-wishlist');
        btnEl.innerHTML = '➕ Add to Wishlist';
      } else {
        alert(data.error || 'Failed to remove from wishlist.');
        btnEl.innerHTML = originalText;
      }
    } else {
      // Add to wishlist
      const response = await fetch('/wishlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meal_id: mealId,
          meal_name: mealName,
          meal_thumb: mealThumb,
          is_ai_generated: false,
          recipe_details: null
        }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        btnEl.classList.add('in-wishlist');
        btnEl.innerHTML = '📋 In Wishlist';
      } else {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        alert(data.error || 'Failed to add to wishlist.');
        btnEl.innerHTML = originalText;
      }
    }
  } catch (error) {
    console.error('Error toggling wishlist:', error);
    alert('A connection error occurred. Please try again.');
    btnEl.innerHTML = originalText;
  } finally {
    btnEl.disabled = false;
  }
}

/**
 * Adds an AI suggested recipe from Leftovers to the wishlist (AJAX call).
 */
async function addAICustomWishlist(btnEl, idx) {
  const recipe = window.aiSuggestions && window.aiSuggestions[idx];
  if (!recipe) return;

  const originalText = btnEl.innerHTML;
  btnEl.disabled = true;
  btnEl.innerText = 'Adding...';

  try {
    const response = await fetch('/wishlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meal_id: null,
        meal_name: recipe.name,
        meal_thumb: null,
        is_ai_generated: true,
        recipe_details: recipe
      }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      btnEl.innerText = '📋 Added to Wishlist';
      btnEl.disabled = true;
    } else {
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      alert(data.error || 'Failed to add to wishlist.');
      btnEl.disabled = false;
      btnEl.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Error adding AI recipe to wishlist:', error);
    alert('A connection error occurred. Please try again.');
    btnEl.disabled = false;
    btnEl.innerHTML = originalText;
  }
}

/**
 * Saves an AI suggested recipe from Leftovers to Cookbook (favorites) (AJAX call).
 */
async function saveAICustomFavorite(btnEl, idx) {
  const recipe = window.aiSuggestions && window.aiSuggestions[idx];
  if (!recipe) return;

  const originalText = btnEl.innerHTML;
  btnEl.disabled = true;
  btnEl.innerText = 'Saving...';

  try {
    const response = await fetch('/favorites/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meal_name: recipe.name,
        recipe_details: recipe
      }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      btnEl.innerText = '💾 Saved to Cookbook';
      btnEl.disabled = true;
    } else {
      if (response.status === 401) {
        window.location.href = '/login';
        return;
      }
      alert(data.error || 'Failed to save to cookbook.');
      btnEl.disabled = false;
      btnEl.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Error saving AI recipe to cookbook:', error);
    alert('A connection error occurred. Please try again.');
    btnEl.disabled = false;
    btnEl.innerHTML = originalText;
  }
}