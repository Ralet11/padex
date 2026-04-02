import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './features/onboarding/Onboarding';
import Dashboard from './features/dashboard/Dashboard';
import Landing from './features/auth/Landing';
import HomeLanding from './features/home/HomeLanding';
import AdminDashboard from './features/admin/AdminDashboard';
import { api, ROUTER_MODE, setAuthToken } from './lib/runtime';
import './index.css';

const RouterComponent = ROUTER_MODE === 'browser' ? BrowserRouter : HashRouter;

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('padex_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [venue, setVenue] = useState(null);
  const [loadingVenue, setLoadingVenue] = useState(true);

  const loadVenue = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingVenue(true);
    try {
      const response = await api.get('/partners/venue');
      setVenue(response.data.venue);
    } catch (err) {
      console.error('No venue found or error', err);
      setVenue(null);
    } finally {
      if (!silent) setLoadingVenue(false);
    }
  }, []);

  useEffect(() => {
    setAuthToken(user?.token);

    if (user && user.role === 'partner') {
      loadVenue();
    } else {
      setVenue(null);
      setLoadingVenue(false);
    }
  }, [user, loadVenue]);

  const handleLogin = (authData) => {
    const { user: userData, token } = authData;
    const sessionData = { ...userData, token };
    setUser(sessionData);
    localStorage.setItem('padex_user', JSON.stringify(sessionData));
  };

  const handleLogout = () => {
    setUser(null);
    setVenue(null);
    localStorage.removeItem('padex_user');
    setAuthToken(null);
  };

  const handleOnboardingComplete = (venueData) => {
    setVenue(venueData);
  };

  // Helper to determine where to redirect a logged-in user
  const getRedirectPath = (currentPath) => {
    if (!user) return '/socios';
    
    let target = '/socios';
    if (user.role === 'admin') target = '/admin';
    else if (user.role === 'partner') {
      target = venue ? '/dashboard' : '/onboarding';
    }

    if (target === currentPath) return null;
    return target;
  };

  return (
    <RouterComponent>
      <Routes>
        <Route 
          path="/socios" 
          element={
            user ? (
              getRedirectPath('/socios') ? (
                <Navigate to={getRedirectPath('/socios')} replace />
              ) : (
                user.role ? (
                  <div className="flex items-center justify-center min-h-screen">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="min-h-screen flex items-center justify-center bg-[#09090b] text-white p-8">
                    <div className="max-w-md w-full glass p-8 rounded-3xl text-center">
                      <h2 className="text-2xl font-bold mb-4 text-red-400">Error de Perfil</h2>
                      <p className="text-muted-foreground mb-8">No se encontró un rol asignado a tu cuenta. Contacta con soporte.</p>
                      <button onClick={handleLogout} className="btn-outline w-full">Cerrar Sesión</button>
                    </div>
                  </div>
                )
              )
            ) : (
              <Landing onLogin={handleLogin} />
            )
          } 
        />
        
        <Route 
          path="/admin" 
          element={user?.role === 'admin' ? <AdminDashboard onLogout={handleLogout} /> : <Navigate to="/socios" replace />} 
        />
        
        <Route 
          path="/onboarding" 
          element={user?.role === 'partner' && !venue ? <Onboarding onComplete={handleOnboardingComplete} /> : <Navigate to="/socios" replace />} 
        />
        
        <Route 
          path="/dashboard" 
          element={
            loadingVenue && user?.role === 'partner' ? <div>Cargando...</div> : (
              user?.role === 'partner' && venue ? <Dashboard venue={venue} onLogout={handleLogout} onVenueRefresh={() => loadVenue({ silent: true })} /> : <Navigate to="/socios" replace />
            )
          } 
        />

        <Route path="/" element={<HomeLanding />} />
      </Routes>
    </RouterComponent>
  );
}

export default App;
