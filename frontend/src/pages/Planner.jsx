import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  ShoppingBag, 
  Plus, 
  X, 
  LogIn, 
  Loader2 
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealTypes = [
  { key: 'breakfast', label: 'Breakfast', color: '#f59e0b' },
  { key: 'lunch', label: 'Lunch', color: '#3b82f6' },
  { key: 'dinner', label: 'Dinner', color: '#10b981' }
];

function formatDateFriendly(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const Planner = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentWeekQuery = searchParams.get('week') || '';

  const [plannerData, setPlannerData] = useState({
    weekStartDate: '',
    prevWeekDate: '',
    nextWeekDate: '',
    plans: [],
    savedMeals: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedMealBySlot, setSelectedMealBySlot] = useState({});

  const fetchPlanner = (week) => {
    setLoading(true);
    const url = week ? `/planner?week=${week}` : '/planner';
    api.get(url)
      .then((res) => {
        setPlannerData(res.data);
      })
      .catch((err) => {
        console.error('Planner load error:', err);
        showToast('Could not load meal planner', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLoading(false);
      return;
    }

    if (isAuthenticated) {
      fetchPlanner(currentWeekQuery);
    }
  }, [isAuthenticated, authLoading, currentWeekQuery]);

  const handleWeekChange = (weekDate) => {
    setSearchParams({ week: weekDate });
  };

  const handleAddSlot = async (day, type) => {
    const slotKey = `${day}-${type}`;
    const mealId = selectedMealBySlot[slotKey];
    if (!mealId) {
      showToast('Please choose a recipe', 'info');
      return;
    }

    const selectedMeal = plannerData.savedMeals.find((m) => String(m.meal_id) === String(mealId) || String(m.id) === String(mealId));
    if (!selectedMeal) return;

    try {
      const res = await api.post('/planner', {
        meal_id: String(selectedMeal.meal_id || selectedMeal.id),
        meal_name: selectedMeal.meal_name,
        day_of_week: day,
        meal_type: type,
        week_start_date: plannerData.weekStartDate
      });

      setPlannerData((prev) => {
        const filtered = prev.plans.filter(
          (p) => !(p.day_of_week === day && p.meal_type === type)
        );
        return {
          ...prev,
          plans: [...filtered, res.data.slot]
        };
      });

      showToast(`Added "${selectedMeal.meal_name}" to ${day} ${type}! 📅`);
      setSelectedMealBySlot((prev) => ({ ...prev, [slotKey]: '' }));
    } catch (err) {
      showToast('Failed to add recipe to plan', 'error');
    }
  };

  const handleDeleteSlot = async (day, type) => {
    try {
      await api.delete('/planner', {
        data: {
          day_of_week: day,
          meal_type: type,
          week_start_date: plannerData.weekStartDate
        }
      });

      setPlannerData((prev) => ({
        ...prev,
        plans: prev.plans.filter(
          (p) => !(p.day_of_week === day && p.meal_type === type)
        )
      }));

      showToast(`Removed meal from ${day} ${type}`, 'info');
    } catch {
      showToast('Failed to remove meal from plan', 'error');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '6rem 0' }}>
        <Loader2 size={40} color="#ff6b35" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1.5rem' }} />
        <h2 style={{ color: 'var(--secondary)' }}>Loading your weekly planner...</h2>
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
            <CalendarDays size={28} />
          </div>
          <h1 style={{ fontSize: '1.8rem', color: 'var(--secondary)', marginBottom: '0.8rem' }}>Weekly Meal Planner</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6 }}>
            Sign in to schedule your weekly breakfast, lunch, and dinner, balance your diet, and build seamless shopping lists.
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
    <div className="container animate-fade-in" style={{ padding: '2.5rem 1.5rem 5rem' }}>
      {/* Header Bar */}
      <div className="planner-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--secondary)' }}>Weekly Meal Planner</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
            Plan your breakfast, lunch, and dinner for the week
          </p>
        </div>

        <Link
          to={`/shopping-list?source=planner&week=${plannerData.weekStartDate}`}
          className="btn btn-success"
        >
          <ShoppingBag size={18} />
          <span>Generate Shopping List</span>
        </Link>
      </div>

      {/* Week Navigator */}
      <div className="week-navigation" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        padding: '1rem 1.5rem',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        marginBottom: '2rem'
      }}>
        <button
          onClick={() => handleWeekChange(plannerData.prevWeekDate)}
          className="btn btn-secondary btn-sm"
        >
          <ChevronLeft size={16} />
          <span>Previous Week</span>
        </button>

        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--secondary)' }}>
          Week of <strong>{formatDateFriendly(plannerData.weekStartDate)}</strong>
        </div>

        <button
          onClick={() => handleWeekChange(plannerData.nextWeekDate)}
          className="btn btn-secondary btn-sm"
        >
          <span>Next Week</span>
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekly Planner Grid */}
      <div className="planner-grid" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {days.map((day) => (
          <div
            key={day}
            className="planner-day-row"
            style={{
              display: 'grid',
              gridTemplateColumns: '160px 1fr',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow)'
            }}
          >
            {/* Day Header */}
            <div className="planner-day-header" style={{
              background: 'var(--secondary-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: '1px solid var(--border)',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--secondary)' }}>{day}</h3>
            </div>

            {/* Meal Slots (Breakfast, Lunch, Dinner) */}
            <div className="planner-slots" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              padding: '12px'
            }}>
              {mealTypes.map((type) => {
                const slotKey = `${day}-${type.key}`;
                const planned = plannerData.plans.find(
                  (p) => p.day_of_week === day && p.meal_type === type.key
                );

                return (
                  <div
                    key={type.key}
                    style={{
                      background: 'var(--bg)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      borderLeft: `4px solid ${type.color}`,
                      minHeight: '100px',
                      justifyContent: 'space-between'
                    }}
                  >
                    <span style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: 700,
                      color: 'var(--text-muted)',
                      marginBottom: '6px'
                    }}>
                      {type.label}
                    </span>

                    {planned ? (
                      <div style={{
                        background: '#ffffff',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Link
                          to={`/meal/${planned.meal_id}`}
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            color: 'var(--secondary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            flex: 1
                          }}
                        >
                          {planned.meal_name}
                        </Link>

                        <button
                          onClick={() => handleDeleteSlot(day, type.key)}
                          style={{
                            background: 'transparent',
                            color: 'var(--danger)',
                            fontSize: '1.2rem',
                            padding: '0 4px',
                            fontWeight: 'bold'
                          }}
                          title="Remove meal"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div>
                        {plannerData.savedMeals && plannerData.savedMeals.length > 0 ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <select
                              value={selectedMealBySlot[slotKey] || ''}
                              onChange={(e) =>
                                setSelectedMealBySlot((prev) => ({
                                ...prev,
                                [slotKey]: e.target.value
                              }))
                            }
                            className="form-select"
                            style={{
                              padding: '4px 8px',
                              fontSize: '0.8rem',
                              height: '32px',
                              background: '#ffffff'
                            }}
                          >
                            <option value="">-- Choose Meal --</option>
                            {plannerData.savedMeals.map((fav) => (
                              <option key={fav.meal_id || fav.id} value={fav.meal_id || fav.id}>
                                {fav.meal_name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleAddSlot(day, type.key)}
                            className="btn btn-primary"
                            style={{ padding: '0 10px', height: '32px', borderRadius: '6px' }}
                            title="Add to slot"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          No saved meals. <Link to="/" style={{ color: 'var(--primary)' }}>Search</Link>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  </div>
);
};

export default Planner;
