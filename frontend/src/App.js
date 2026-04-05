import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Habits from './pages/Habits';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import './App.css';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

// Header Component
function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <header className="header">
      <div className="header-content">
        <h1>🎯 Habit Tracker</h1>
        <nav>
          <Link to="/dashboard" className={pathname === '/dashboard' ? 'active' : ''}>Dashboard</Link>
          <Link to="/habits" className={pathname === '/habits' ? 'active' : ''}>Habits</Link>
          <Link to="/analytics" className={pathname === '/analytics' ? 'active' : ''}>Analytics</Link>
          <Link to="/notifications" className={pathname === '/notifications' ? 'active' : ''}>Notifications</Link>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>Hi, {user?.name}</span>
          <button className="btn-logout" onClick={logout}>Logout</button>
        </nav>
      </div>
    </header>
  );
}

// Main App Component
function AppContent() {
  return (
    <>
      <Header />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/habits" element={
            <ProtectedRoute><Habits /></ProtectedRoute>
          } />
          <Route path="/analytics" element={
            <ProtectedRoute><Analytics /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><Notifications /></ProtectedRoute>
          } />
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
