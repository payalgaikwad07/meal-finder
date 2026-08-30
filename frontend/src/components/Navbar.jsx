import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { 
  UtensilsCrossed, 
  Bookmark, 
  BookHeart, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Menu, 
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    showToast('Logged out successfully', 'info');
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container">
        <div className="navbar-inner">
          {/* Logo */}
          <Link to="/" className="nav-brand" onClick={() => setMobileMenuOpen(false)}>
            <div className="nav-brand-logo">
              <UtensilsCrossed size={20} />
            </div>
            <span>Yum<span className="brand-highlight">Plan</span></span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="nav-links-desktop">
            <ul className="nav-links">
              <li>
                <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span>Search</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/leftovers" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span>What Can I Cook?</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/cookbook" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span>My Cookbook</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/wishlist" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <span>Wishlist & Groceries</span>
                </NavLink>
              </li>
            </ul>
          </nav>

          {/* User Auth Controls */}
          <div className="nav-user-actions">
            {isAuthenticated ? (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    background: 'var(--secondary-light)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    color: 'var(--secondary)',
                    fontSize: '0.88rem',
                    fontWeight: 600
                  }}
                >
                  <span style={{ color: 'var(--text-muted)' }}>Hi,</span>
                  <span style={{ color: 'var(--secondary)', fontWeight: 700 }}>{user?.name?.split(' ')[0] || 'User'}!</span>
                </button>

                {userDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 'calc(100% + 8px)',
                      width: '200px',
                      background: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      boxShadow: 'var(--shadow-md)',
                      padding: '8px',
                      zIndex: 1000
                    }}
                  >
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--secondary)' }}>{user?.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.email}
                      </div>
                    </div>
                    <Link
                      to="/cookbook"
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        color: 'var(--secondary)',
                        fontSize: '0.88rem',
                        borderRadius: '6px'
                      }}
                    >
                      <BookHeart size={16} /> My Cookbook
                    </Link>
                    <Link
                      to="/wishlist"
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        color: 'var(--secondary)',
                        fontSize: '0.88rem',
                        borderRadius: '6px'
                      }}
                    >
                      <Bookmark size={16} /> My Wishlist
                    </Link>
                    <button
                      onClick={handleLogout}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        color: '#ef4444',
                        background: 'transparent',
                        fontSize: '0.88rem',
                        borderRadius: '6px',
                        textAlign: 'left'
                      }}
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link to="/login" className="btn btn-secondary btn-sm">
                  <span>Login</span>
                </Link>
                <Link to="/signup" className="btn btn-primary btn-sm">
                  <span>Sign Up</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="btn btn-secondary btn-icon"
              style={{ display: 'none' }}
              aria-label="Toggle menu"
              id="mobile-nav-toggle"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          #mobile-nav-toggle {
            display: inline-flex !important;
          }
        }
      `}</style>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            width: '100%',
            background: '#ffffff',
            borderBottom: '1px solid var(--border)',
            padding: '1.5rem',
            zIndex: 99,
            boxShadow: 'var(--shadow)'
          }}
        >
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <NavLink
                to="/"
                end
                onClick={() => setMobileMenuOpen(false)}
                className="nav-link"
                style={{ padding: '8px 12px' }}
              >
                Search Recipes
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/leftovers"
                onClick={() => setMobileMenuOpen(false)}
                className="nav-link"
                style={{ padding: '8px 12px' }}
              >
                What Can I Cook?
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/cookbook"
                onClick={() => setMobileMenuOpen(false)}
                className="nav-link"
                style={{ padding: '8px 12px' }}
              >
                My Cookbook
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                className="nav-link"
                style={{ padding: '8px 12px' }}
              >
                Wishlist & Groceries
              </NavLink>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
};

export default Navbar;
