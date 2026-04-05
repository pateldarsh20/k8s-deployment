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

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function Header() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  if (pathname === '/login' || pathname === '/signup') return null;

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  const navLinks = [
    { to: '/dashboard',     label: 'Dashboard' },
    { to: '/habits',        label: 'Habits' },
    { to: '/analytics',     label: 'Analytics' },
    { to: '/notifications', label: 'Alerts' },
  ];

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-logo">
          <div className="logo-icon">🎯</div>
          <h1>HabitFlow</h1>
        </div>

        <nav>
          {navLinks.map(({ to, label }) => (
            <Link key={to} to={to} className={pathname === to ? 'active' : ''}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-right">
          <div className="user-badge">
            <div className="user-avatar">{initials}</div>
            <span className="user-name">{user?.name?.split(' ')[0]}</span>
          </div>
          <button className="btn-logout" onClick={logout}>Sign out</button>
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  return (
    <>
      <Header />
      <div className="container">
        <Routes>
          <Route path="/login"  element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard"     element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/habits"        element={<ProtectedRoute><Habits /></ProtectedRoute>} />
          <Route path="/analytics"     element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/"  element={<Navigate to="/dashboard" />} />
          <Route path="*"  element={<Navigate to="/dashboard" />} />
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
