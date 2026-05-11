import React, { useState, useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './features/onboarding/Onboarding';
import Landing from './features/auth/Landing';
import HomeLanding from './features/home/HomeLanding';
import AdminDashboard from './features/admin/AdminDashboard';
import HoyPage from './features/operations/routes/HoyPage';
import AgendaPage from './features/operations/routes/AgendaPage';
import ExcepcionesPage from './features/operations/routes/ExcepcionesPage';
import CanchasPage from './features/operations/routes/CanchasPage';
import SedePage from './features/operations/routes/SedePage';
import { ROUTER_MODE, setAuthToken } from './lib/runtime';
import { useOperationsVenue } from './features/operations/hooks/useOperationsVenue';
import './index.css';

const RouterComponent = ROUTER_MODE === 'browser' ? BrowserRouter : HashRouter;

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('padex_user');
    return saved ? JSON.parse(saved) : null;
  });
  const {
    venue,
    venueError,
    isLoadingVenue: loadingVenue,
    refreshVenue,
  } = useOperationsVenue({ user });

  useEffect(() => {
    setAuthToken(user?.token);
  }, [user]);

  const handleLogin = (authData) => {
    const { user: userData, token } = authData;
    const sessionData = { ...userData, token };
    setUser(sessionData);
    localStorage.setItem('padex_user', JSON.stringify(sessionData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('padex_user');
    setAuthToken(null);
  };

  const handleOnboardingComplete = (venueData) => {
    void venueData;
    refreshVenue();
  };

  // Helper to determine where to redirect a logged-in user
  const getRedirectPath = (currentPath) => {
    if (!user) return '/socios';
    
    let target = '/socios';
    if (user.role === 'admin') target = '/admin';
    else if (user.role === 'partner') {
      target = venue ? '/operations/hoy' : '/onboarding';
    }

    if (target === currentPath) return null;
    return target;
  };

  const renderPartnerOperationsRoute = (Page) => {
    if (user?.role !== 'partner') return <Navigate to="/socios" replace />;
    if (loadingVenue) return <div>Cargando...</div>;
    if (!venue) return <Navigate to="/onboarding" replace />;

    return React.createElement(Page, {
      venue,
      onLogout: handleLogout,
      onRefresh: () => refreshVenue({ silent: true }),
      error: venueError,
    });
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
        
        <Route path="/operations" element={user?.role === 'partner' ? <Navigate to="/operations/hoy" replace /> : <Navigate to="/socios" replace />} />
        <Route path="/operations/hoy" element={renderPartnerOperationsRoute(HoyPage)} />
        <Route path="/operations/agenda" element={renderPartnerOperationsRoute(AgendaPage)} />
        <Route path="/operations/excepciones" element={renderPartnerOperationsRoute(ExcepcionesPage)} />
        <Route path="/operations/canchas" element={renderPartnerOperationsRoute(CanchasPage)} />
        <Route path="/operations/sede" element={renderPartnerOperationsRoute(SedePage)} />

        <Route
          path="/dashboard"
          element={
            loadingVenue && user?.role === 'partner'
              ? <div>Cargando...</div>
              : user?.role === 'partner'
              ? <Navigate to={venue ? '/operations/hoy' : '/onboarding'} replace />
              : <Navigate to="/socios" replace />
          }
        />

        <Route path="/" element={<HomeLanding />} />
      </Routes>
    </RouterComponent>
  );
}

export default App;
