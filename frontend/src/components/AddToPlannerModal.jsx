import React, { useState } from 'react';
import { CalendarDays, X, Check } from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealTypes = [
  { key: 'breakfast', label: '🍳 Breakfast' },
  { key: 'lunch', label: '🥗 Lunch' },
  { key: 'dinner', label: '🍲 Dinner' }
];

function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const AddToPlannerModal = ({ isOpen, onClose, mealId, mealName }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();

  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedType, setSelectedType] = useState('dinner');
  const [weekDate, setWeekDate] = useState(() => formatDate(getMonday(new Date())));
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      showToast('Please log in to add meals to your weekly planner', 'info');
      return;
    }

    if (!mealName) {
      showToast('Recipe information missing', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post('/planner', {
        meal_id: String(mealId || 'custom'),
        meal_name: mealName,
        day_of_week: selectedDay,
        meal_type: selectedType,
        week_start_date: weekDate,
      });

      showToast(`Added "${mealName}" to ${selectedDay} ${selectedType}! 📅`);
      onClose();
    } catch (err) {
      console.error('Add to planner error:', err);
      showToast(err.response?.data?.error || 'Failed to add to meal plan', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(61, 44, 30, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="card animate-fade-in" style={{
        maxWidth: '460px',
        width: '100%',
        padding: '2rem',
        background: '#ffffff',
        border: '1.5px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        position: 'relative',
        borderRadius: '16px'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            color: 'var(--text-muted)',
            padding: '4px',
            fontSize: '1.2rem',
            lineHeight: 1
          }}
        >
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'var(--primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--primary)'
          }}>
            <CalendarDays size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.3rem', color: 'var(--secondary)', fontWeight: 800 }}>Add to Meal Planner</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Choose a day and time slot</p>
          </div>
        </div>

        <div style={{
          padding: '0.85rem 1rem',
          background: 'var(--bg)',
          borderRadius: '10px',
          marginBottom: '1.4rem',
          border: '1px solid var(--border)'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
            Recipe
          </span>
          <div style={{ fontWeight: 700, color: 'var(--secondary)', marginTop: '2px', fontSize: '1rem' }}>
            {mealName}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.4rem' }}>
              Select Day of the Week
            </label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="form-select"
              style={{ background: '#ffffff', border: '1.5px solid var(--border)' }}
            >
              {daysOfWeek.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', marginBottom: '0.4rem' }}>
              Meal Time Slot
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {mealTypes.map((type) => (
                <button
                  type="button"
                  key={type.key}
                  onClick={() => setSelectedType(type.key)}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: `1.5px solid ${selectedType === type.key ? 'var(--primary)' : 'var(--border)'}`,
                    background: selectedType === type.key ? 'var(--primary-light)' : 'var(--bg)',
                    color: selectedType === type.key ? 'var(--primary)' : 'var(--secondary)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ flex: 1 }}
            >
              {loading ? 'Adding...' : 'Confirm Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddToPlannerModal;
