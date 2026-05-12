import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Gauge,
  LogOut,
  RefreshCw,
  Settings,
  ShieldAlert,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/operations/hoy', label: 'Hoy', icon: Gauge },
  { to: '/operations/agenda', label: 'Agenda', icon: Calendar },
  { to: '/operations/excepciones', label: 'Excepciones', icon: ShieldAlert },
  { to: '/operations/canchas', label: 'Canchas', icon: Building2 },
  { to: '/operations/sede', label: 'Sede', icon: Settings },
];

function getVenueMonogram(name) {
  const parts = String(name || 'Tu sede')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  return (parts.map((part) => part.charAt(0)).join('') || 'P').toUpperCase();
}

export default function PartnerOperationsLayout({
  venue,
  title,
  description,
  sectionLabel,
  children,
  onLogout,
  onRefresh,
  isRefreshing = false,
  isLoading = false,
  error = null,
  actions = null,
  compactHeader = false,
}) {
  const [isRailCollapsed, setIsRailCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;

    const stored = window.localStorage.getItem('padex-partners-rail-collapsed');
    if (stored !== null) return stored === '1';

    return window.innerWidth <= 1520;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('padex-partners-rail-collapsed', isRailCollapsed ? '1' : '0');
  }, [isRailCollapsed]);
  const venueName = venue?.name || 'Tu sede';
  const venueMonogram = getVenueMonogram(venueName);

  return (
    <div className={`operationsShell${isRailCollapsed ? ' railCollapsed' : ''}`}>
      <a href="#operations-main" className="skip-link">
        Ir al contenido principal
      </a>

      <aside
        className={`operationsRail glass${isRailCollapsed ? ' collapsed' : ''}`}
        aria-label="Barra lateral de navegacion"
        aria-expanded={!isRailCollapsed}
      >
        <div className="operationsRailTop">
          <div className="operationsBrand">
            <span className="operationsBrandMark">
              <span className="dot"></span>
            </span>
            <span className="operationsBrandText">PADEX <strong>PARTNER</strong></span>
          </div>

          <button
            type="button"
            className="icon-btn operationsRailToggle"
            onClick={() => setIsRailCollapsed((prev) => !prev)}
            aria-label={isRailCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
            aria-expanded={!isRailCollapsed}
            title={isRailCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          >
            {isRailCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className={`operationsVenue${isRailCollapsed ? ' compact' : ''}`}>
          <strong className="operationsVenueMonogram">{venueMonogram}</strong>
          <div className="operationsVenueCopy">
            <strong>{venueName}</strong>
            <span>{venue?.address || 'Sin direccion cargada'}</span>
          </div>
        </div>

        <nav className="operationsNav" aria-label="Navegacion operativa">
          {NAV_ITEMS.map((item) => {
            const NavItemIcon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `operationsNavLink${isActive ? ' active' : ''}`}
                aria-label={item.label}
                title={item.label}
              >
                <span className="operationsNavIcon">
                  <NavItemIcon size={18} strokeWidth={2.15} />
                </span>
                <span className="operationsNavText">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="operationsRailFooter">
          <button
            type="button"
            className="btn-outline operationsRailButton"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label={isRefreshing ? 'Actualizando agenda' : 'Actualizar'}
            title={isRefreshing ? 'Actualizando agenda' : 'Actualizar'}
          >
            <span className="operationsNavIcon">
              <RefreshCw size={16} strokeWidth={2.15} className={isRefreshing ? 'spin' : ''} />
            </span>
            <span className="operationsNavText">{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
          <button
            type="button"
            className="btn-outline operationsRailButton"
            onClick={onLogout}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
          >
            <span className="operationsNavIcon">
              <LogOut size={16} strokeWidth={2.15} />
            </span>
            <span className="operationsNavText">Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <main className="operationsMain" id="operations-main">
        <header className={`operationsHeader glass${compactHeader ? ' compact' : ''}`}>
          <div>
            <p className="eyebrow">{sectionLabel}</p>
            <h1>{title}</h1>
            {description ? <p className="subtle operationsHeaderCopy">{description}</p> : null}
          </div>
          {actions ? <div className="operationsHeaderActions">{actions}</div> : null}
        </header>

        {isLoading ? (
          <section className="operationsState glass" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div>
              <strong>Cargando estacion operativa</strong>
              <p className="subtle">Estamos trayendo la sede y el estado compartido antes de mostrar la nueva navegacion.</p>
            </div>
          </section>
        ) : error ? (
          <section className="operationsState glass" aria-live="polite">
            <AlertTriangle size={22} className="operationsStateIcon" />
            <div>
              <strong>No pudimos sincronizar la sede</strong>
              <p className="subtle">{error?.response?.data?.error || error?.message || 'Reintenta la carga para volver a traer la verdad del backend.'}</p>
            </div>
            <button type="button" className="btn-primary-sm" onClick={onRefresh}>
              Reintentar
            </button>
          </section>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
