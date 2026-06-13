import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './features/onboarding/Onboarding';
import Landing from './features/auth/Landing';
import HomeLanding from './features/home/HomeLanding';
import PrivacyPolicyPage from './features/legal/PrivacyPolicyPage';
import AccountDeletionPage from './features/legal/AccountDeletionPage';
import AdminDashboard from './features/admin/AdminDashboard';
import HoyPage from './features/operations/routes/HoyPage';
import AgendaPage from './features/operations/routes/AgendaPage';
import ExcepcionesPage from './features/operations/routes/ExcepcionesPage';
import CanchasPage from './features/operations/routes/CanchasPage';
import SedePage from './features/operations/routes/SedePage';
import {
  api,
  clearStoredSession,
  isJwtExpired,
  persistSession,
  readStoredSession,
  ROUTER_MODE,
  setAuthToken,
  setUnauthorizedHandler,
} from './lib/runtime';
import { useOperationsVenue } from './features/operations/hooks/useOperationsVenue';
import './index.css';

const RouterComponent = ROUTER_MODE === 'browser' ? BrowserRouter : HashRouter;

function AuthBootScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#09090b',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 999,
          border: '2px solid rgba(255,255,255,0.12)',
          borderTopColor: '#C0FF00',
          animation: 'partner-auth-spin 0.8s linear infinite',
        }}
      />
      <style>{`
        @keyframes partner-auth-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const {
    venue,
    venueError,
    isLoadingVenue: loadingVenue,
    refreshVenue,
  } = useOperationsVenue({ user });

  const handleLogout = useCallback(() => {
    setUser(null);
    clearStoredSession();
    setAuthToken(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleLogout);
    return () => setUnauthorizedHandler(null);
  }, [handleLogout]);

  useEffect(() => {
    setAuthToken(user?.token);
  }, [user]);

  useEffect(() => {
    let ignore = false;

    const bootstrapSession = async () => {
      const savedSession = readStoredSession();
      if (!savedSession?.token) {
        if (!ignore) {
          handleLogout();
          setIsRestoringSession(false);
        }
        return;
      }

      if (isJwtExpired(savedSession.token)) {
        if (!ignore) {
          handleLogout();
          setIsRestoringSession(false);
        }
        return;
      }

      setAuthToken(savedSession.token);

      try {
        const response = await api.get('/auth/me');
        if (ignore) return;

        const sessionData = { ...savedSession, ...response.data.user, token: savedSession.token };
        setUser(sessionData);
        persistSession(sessionData);
      } catch (error) {
        if (ignore) return;

        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) {
          handleLogout();
        } else {
          setUser(savedSession);
        }
      } finally {
        if (!ignore) {
          setIsRestoringSession(false);
        }
      }
    };

    bootstrapSession();

    return () => {
      ignore = true;
    };
  }, [handleLogout]);

  const handleLogin = (authData) => {
    const { user: userData, token } = authData;
    const sessionData = { ...userData, token };
    setAuthToken(token);
    setUser(sessionData);
    persistSession(sessionData);
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
      if (loadingVenue) return null;
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

  if (isRestoringSession) {
    return (
      <RouterComponent>
        <AuthBootScreen />
      </RouterComponent>
    );
  }

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
          element={
            user?.role !== 'partner'
              ? <Navigate to="/socios" replace />
              : loadingVenue
              ? <AuthBootScreen />
              : !venue
              ? <Onboarding onComplete={handleOnboardingComplete} />
              : <Navigate to="/operations/hoy" replace />
          } 
        />

        <Route path="/politicas-de-privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/eliminar-cuenta" element={<AccountDeletionPage />} />
        
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
