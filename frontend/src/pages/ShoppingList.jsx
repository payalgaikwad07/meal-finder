import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Check, Copy, Printer, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';
import api from '../api/client';
import { useToast } from '../components/Toast';

const ShoppingList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const source = searchParams.get('source') || 'wishlist';
  const week = searchParams.get('week') || '';

  const [ingredients, setIngredients] = useState([]);
  const [totalMeals, setTotalMeals] = useState(0);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    setLoading(true);
    const endpoint = source === 'planner'
      ? `/planner/shopping-list?week=${week}`
      : '/wishlist/shopping-list';

    api.get(endpoint)
      .then((res) => {
        setIngredients(res.data.ingredients || []);
        setTotalMeals(res.data.totalMeals || 0);
      })
      .catch((err) => {
        console.error('Shopping list error:', err);
        showToast('Failed to load shopping list', 'error');
      })
      .finally(() => setLoading(false));
  }, [source, week]);

  const toggleItem = (name) => {
    setCheckedItems((prev) => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const handleCopyList = async () => {
    if (ingredients.length === 0) return;
    const textList = ingredients
      .map((item) => `• ${item.name} (${item.lines.join(', ')})`)
      .join('\n');

    try {
      await navigator.clipboard.writeText(`🛒 YumPlan Grocery List:\n\n${textList}`);
      showToast('Grocery list copied to clipboard! 📋');
    } catch (err) {
      console.error('Clipboard write error:', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleResetChecked = () => {
    setCheckedItems({});
    showToast('Checked items reset', 'info');
  };

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Loader2 size={40} color="#10b981" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
        <h2 style={{ color: 'var(--secondary)' }}>Consolidating ingredients and measurements...</h2>
      </div>
    );
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '2.5rem 1.5rem 5rem', maxWidth: '820px' }}>
      <button
        onClick={() => navigate(-1)}
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
          border: '1px solid var(--border)',
          marginBottom: '1.5rem'
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      {/* Shopping List Card matching original design */}
      <div className="card" style={{
        padding: '2.5rem',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        background: '#ffffff'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.3rem' }}>
              Saved Recipes Grocery List
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.98rem' }}>
              Consolidated ingredients from {totalMeals} {totalMeals === 1 ? 'recipe' : 'recipes'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCopyList} className="btn btn-secondary btn-sm" title="Copy to clipboard">
              <Copy size={16} />
              <span>Copy List</span>
            </button>
            <button onClick={handlePrint} className="btn btn-secondary btn-sm" title="Print checklist">
              <Printer size={16} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {ingredients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <ShoppingBag size={48} color="#a0aec0" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: 'var(--secondary)' }}>No Ingredients in List</h3>
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 1.5rem' }}>
              Add recipes to your wishlist to generate your consolidated grocery list.
            </p>
            <Link to="/" className="btn btn-primary">Explore Recipes</Link>
          </div>
        ) : (
          <div>
            <ul style={{ listStyle: 'none', borderTop: '1px solid var(--border)', marginBottom: '1.5rem' }}>
              {ingredients.map((item) => {
                const isChecked = !!checkedItems[item.name];
                return (
                  <li
                    key={item.name}
                    onClick={() => toggleItem(item.name)}
                    style={{
                      padding: '14px 0',
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                      />
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: isChecked ? 'var(--text-muted)' : 'var(--secondary)',
                        textDecoration: isChecked ? 'line-through' : 'none'
                      }}>
                        {item.name}
                      </span>
                    </div>

                    <span className="badge" style={{
                      background: isChecked ? '#f1f3f5' : 'var(--secondary-light)',
                      color: isChecked ? '#a0aec0' : 'var(--secondary)',
                      textDecoration: isChecked ? 'line-through' : 'none'
                    }}>
                      {item.lines.join(', ')}
                    </span>
                  </li>
                );
              })}
            </ul>

            {Object.values(checkedItems).some(Boolean) && (
              <button onClick={handleResetChecked} className="btn btn-secondary btn-sm">
                <RefreshCw size={14} />
                <span>Reset Checklist</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingList;
