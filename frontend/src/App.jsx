import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import SearchResults from './pages/SearchResults';
import RecipeDetail from './pages/RecipeDetail';
import CustomRecipeDetail from './pages/CustomRecipeDetail';
import Cookbook from './pages/Cookbook';
import ShoppingList from './pages/ShoppingList';
import Leftovers from './pages/Leftovers';
import Login from './pages/Login';
import Signup from './pages/Signup';

function App() {
  return (
    <div className="app-wrapper">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/meal/:id" element={<RecipeDetail />} />
          <Route path="/recipe/custom/:id" element={<CustomRecipeDetail />} />
          <Route path="/wishlist" element={<Cookbook />} />
          <Route path="/cookbook" element={<Navigate to="/wishlist" replace />} />
          <Route path="/saved" element={<Navigate to="/wishlist" replace />} />
          <Route path="/planner" element={<Navigate to="/wishlist" replace />} />
          <Route path="/shopping-list" element={<ShoppingList />} />
          <Route path="/leftovers" element={<Leftovers />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
