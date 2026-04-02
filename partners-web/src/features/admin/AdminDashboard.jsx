import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Trash2, 
  Plus,
  Mail, 
  Phone, 
  Building2, 
  ShieldCheck,
  ExternalLink,
  Loader2,
  LogOut
} from 'lucide-react';
import { motion as Motion } from 'framer-motion';
import { api } from '../../lib/runtime';

const AdminDashboard = ({ onLogout }) => {
  const [partners, setPartners] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddPartnerModal, setShowAddPartnerModal] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: '',
    email: '',
    venueName: '',
    address: ''
  });

  // Fetch partners from API
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        const response = await api.get('/partners/all');
        setPartners(response.data.partners);
      } catch (err) {
        console.error('Error fetching partners:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPartners();
  }, []);

  const filteredPartners = partners.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.ManagedVenues && p.ManagedVenues[0]?.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const [tempPassword, setTempPassword] = useState(null);

  const handleCreatePartner = async () => {
    try {
      const response = await api.post('/partners/create', {
        name: newPartner.name,
        email: newPartner.email
      });
      
      const createdPartner = {
        ...response.data.partner,
        ManagedVenues: [] // New partners have no venue yet
      };
      
      setPartners([createdPartner, ...partners]);
      setTempPassword(response.data.temporaryPassword);
      setNewPartner({ name: '', email: '', venueName: '', address: '' });
    } catch (err) {
      alert('Error al crear el partner: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="admin-layout">
      {/* Top Header */}
      <header className="admin-header glass">
        <div className="branding">
          <div className="logo-icon neon-glow"></div>
          <span>PADEX <strong>SUPER ADMIN</strong></span>
        </div>
        <div className="admin-info">
          <span>Super Administrador</span>
          <div className="avatar">A</div>
          <button className="icon-btn" title="Cerrar Sesión" onClick={onLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="admin-content">
        <div className="content-intro">
          <div>
            <h1>Gestión de Partners</h1>
            <p>Supervisa, contacta y administra las sedes asociadas a Padex.</p>
          </div>
          <div className="stats-mini">
            <div className="stat">
              <strong>{partners.length}</strong>
              <span>Socios Activos</span>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="admin-toolbar">
          <div className="search-wrapper">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar por manager o sede..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="toolbar-actions">
            <button className="btn-premium-neon" onClick={() => setShowAddPartnerModal(true)}>
              <Plus size={18} /> Nuevo Partner
            </button>
            <button className="btn-secondary"><ShieldCheck size={18} /> Logs</button>
          </div>
        </div>

        {/* Partners Table */}
        <div className="partners-grid">
          {isLoading ? (
            <div className="loading-state">
              <Loader2 className="animate-spin" />
              <span>Cargando partners...</span>
            </div>
          ) : (
            filteredPartners.map(partner => (
              <Motion.div 
                key={partner.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="partner-card glass"
              >
                <div className="card-header">
                  <div className="venue-info">
                    <Building2 size={24} className="icon" />
                    <div>
                      <h3>{partner.ManagedVenues?.[0]?.name || 'Sede no configurada'}</h3>
                      <p>{partner.ManagedVenues?.[0]?.address || 'Pendiente de onboarding'}</p>
                    </div>
                  </div>
                  <div className="actions">
                    <button className="icon-btn danger"><Trash2 size={18} /></button>
                  </div>
                </div>

                <div className="card-body">
                  <div className="manager-info">
                    <div className="info-group">
                      <label>Manager</label>
                      <div className="value"><Users size={14} /> {partner.name}</div>
                    </div>
                    <div className="info-group">
                      <label>Contacto</label>
                      <div className="value"><Mail size={14} /> {partner.email}</div>
                      <div className="value"><Phone size={14} /> {partner.venue?.phone || '-'}</div>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <button className="btn-contact">Contactar <ExternalLink size={14} /></button>
                </div>
              </Motion.div>
            ))
          )}
        </div>

        {/* Add Partner Modal */}
        {showAddPartnerModal && (
          <div className="modal-overlay">
            <Motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="modal glass"
            >
              <h3>Nuevo Partner</h3>
              <p className="subtitle">Crea una cuenta de acceso para un nuevo manager.</p>
              
              {!tempPassword ? (
                <>
                  <div className="form-grid" style={{ marginBottom: 0 }}>
                    <div className="input-field">
                      <label>Nombre Manager</label>
                      <input type="text" placeholder="Ej: Roberto Gomez" 
                        value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} />
                    </div>
                    <div className="input-field">
                      <label>Email Access</label>
                      <input type="email" placeholder="manager@sede.com" 
                        value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="btn-group">
                    <button className="btn-outline" onClick={() => setShowAddPartnerModal(false)}>Cancelar</button>
                    <button className="btn-primary-sm" onClick={handleCreatePartner}>Crear Acceso</button>
                  </div>
                </>
              ) : (
                <div className="password-reveal">
                  <div className="success-banner">Cuenta creada con éxito</div>
                  <label>Contraseña Temporal</label>
                  <div className="pass-box">{tempPassword}</div>
                  <p className="hint">Copia esta contraseña y dásela al manager para su primer ingreso.</p>
                  <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => {
                    setShowAddPartnerModal(false);
                    setTempPassword(null);
                  }}>Entendido</button>
                </div>
              )}
            </Motion.div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-layout { background: #09090b; min-height: 100vh; color: white; }
        
        /* Modal */
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 100;
        }
        .modal { width: 480px; padding: 32px; border-radius: 20px; }
        .modal h3 { font-size: 1.5rem; margin-bottom: 8px; }
        .modal .subtitle { color: var(--muted-foreground); margin-bottom: 24px; font-size: 0.9rem; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        
        .input-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .input-field label { font-size: 0.8rem; font-weight: 600; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em; }
        .input-field input {
          background: var(--secondary);
          border: 1px solid var(--border);
          padding: 12px 16px;
          border-radius: 12px;
          color: white;
          font-size: 0.95rem;
          transition: all 0.2s;
        }
        .input-field input:focus { outline: none; border-color: var(--primary); background: rgba(192, 255, 0, 0.02); }
        
        .btn-group { display: flex; gap: 12px; margin-top: 32px; }
        .btn-group button { flex: 1; }
        
        .toolbar-actions { display: flex; gap: 12px; }
        .password-reveal { text-align: center; padding: 10px 0; }
        .success-banner { background: rgba(192, 255, 0, 0.1); color: var(--primary); padding: 8px; border-radius: 8px; font-size: 0.85rem; font-weight: 700; margin-bottom: 24px; }
        .pass-box { background: var(--secondary); border: 2px dashed var(--primary); color: white; padding: 16px; border-radius: 12px; font-size: 1.5rem; font-family: monospace; letter-spacing: 0.1em; margin: 12px 0; }
        .hint { font-size: 0.75rem; color: var(--muted-foreground); margin-top: 8px; }

        .btn-premium-neon {
          background: linear-gradient(135deg, var(--primary) 0%, #a2ff00 100%);
          color: black;
          padding: 10px 24px;
          border-radius: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.9rem;
          border: none;
          box-shadow: 0 4px 15px rgba(192, 255, 0, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-premium-neon:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(192, 255, 0, 0.5);
          filter: brightness(1.1);
        }

        /* Header */
        .admin-header { 
          height: 80px; display: flex; align-items: center; justify-content: space-between; 
          padding: 0 48px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 50;
        }
        .branding { display: flex; align-items: center; gap: 12px; font-size: 0.9rem; letter-spacing: 0.1em; }
        .logo-icon { width: 12px; height: 12px; border-radius: 50%; background: var(--primary); }
        .admin-info { display: flex; align-items: center; gap: 16px; font-size: 0.85rem; color: var(--muted-foreground); }
        .avatar { width: 36px; height: 36px; background: var(--primary); color: black; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; }

        .admin-content { padding: 48px 80px; max-width: 1400px; margin: 0 auto; }
        
        .content-intro { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
        h1 { font-size: 2.5rem; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 8px; }
        .content-intro p { color: var(--muted-foreground); font-size: 1.1rem; }
        
        .stats-mini .stat { text-align: right; }
        .stat strong { display: block; font-size: 2rem; color: var(--primary); line-height: 1; }
        .stat span { font-size: 0.8rem; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em; }

        /* Toolbar */
        .admin-toolbar { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 32px; }
        .search-wrapper { 
          flex: 1; position: relative; display: flex; align-items: center; 
          background: var(--secondary); border-radius: 12px; border: 1px solid var(--border);
        }
        .search-wrapper svg { position: absolute; left: 16px; color: var(--muted-foreground); }
        .search-wrapper input { 
          width: 100%; background: transparent; border: none; padding: 14px 16px 14px 48px; 
          color: white; font-size: 0.95rem; 
        }
        .search-wrapper input:focus { outline: none; }
        
        .search-wrapper input:focus { outline: none; }

        /* Grid */
        .partners-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 24px; }
        .partner-card { border-radius: 20px; padding: 24px; display: flex; flex-direction: column; gap: 24px; }
        
        .card-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .venue-info { display: flex; gap: 16px; align-items: center; }
        .venue-info .icon { color: var(--primary); }
        .venue-info h3 { font-size: 1.25rem; font-weight: 700; margin-bottom: 2px; }
        .venue-info p { font-size: 0.85rem; color: var(--muted-foreground); }
        
        .card-body { border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 20px 0; }
        .info-group { margin-bottom: 16px; }
        .info-group:last-child { margin-bottom: 0; }
        .info-group label { display: block; font-size: 0.7rem; color: var(--muted-foreground); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .info-group .value { display: flex; align-items: center; gap: 10px; font-size: 0.95rem; margin-bottom: 6px; }
        .info-group .value svg { color: var(--muted-foreground); }

        .btn-contact { 
          width: 100%; padding: 12px; background: rgba(192, 255, 0, 0.05); color: var(--primary); 
          border: 1px solid rgba(192, 255, 0, 0.2); border-radius: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 0.9rem;
          transition: all 0.2s;
        }
        .btn-contact:hover { background: var(--primary); color: black; }

        .icon-btn.danger { color: #f87171; background: rgba(248, 113, 113, 0.1); width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .icon-btn.danger:hover { background: #f87171; color: white; }

        .loading-state { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; padding: 100px 0; color: var(--muted-foreground); }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      ` }} />
    </div>
  );
};

export default AdminDashboard;
