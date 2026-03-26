import React, { useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Mail, Lock, ChevronRight, Trophy, Smartphone, ShieldCheck } from 'lucide-react';

const Landing = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      onLogin(response.data); // Pass user and token
    } catch (err) {
      alert('Error en el login: ' + (err.response?.data?.error || 'Credenciales inválidas'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="landing-layout">
      {/* Left Side: Content */}
      <section className="landing-content">
        <div className="branding">
          <div className="logo-icon neon-glow"></div>
          <span>PADEX <strong>PARTNERS</strong></span>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hero-text"
        >
          <h1>Lleva tu club al <span>siguiente nivel</span>.</h1>
          <p>La plataforma definitiva para managers de pádel. Gestión inteligente, automatización y una experiencia premium para tus jugadores.</p>
        </motion.div>

        <div className="features-grid">
          <div className="feature-item">
            <ShieldCheck className="icon" size={24} />
            <div>
              <h3>Control Total</h3>
              <p>Gestiona turnos, canchas y socios en un solo lugar.</p>
            </div>
          </div>
          <div className="feature-item">
            <Smartphone className="icon" size={24} />
            <div>
              <h3>App Integrada</h3>
              <p>Tus turnos aparecen automáticamente en la app de Padex.</p>
            </div>
          </div>
          <div className="feature-item">
            <Trophy className="icon" size={24} />
            <div>
              <h3>Ranking Oficial</h3>
              <p>Tus partidos suman para el ranking global de socios.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Right Side: Login */}
      <section className="landing-auth glass">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="auth-card"
        >
          <h2>Acceso Partner</h2>
          <p className="subtitle">Ingresa tus credenciales para administrar tu sede.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-field">
              <label>Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="icon" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="manager@tuclub.com"
                  required 
                />
              </div>
            </div>

            <div className="input-field">
              <label>Contraseña</label>
              <div className="input-wrapper">
                <Lock size={18} className="icon" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={isLoading}>
              {isLoading ? "Iniciando sesión..." : "Entrar al Panel"}
              {!isLoading && <ChevronRight size={18} />}
            </button>
          </form>

          <div className="auth-footer">
            <p>¿No tienes una cuenta? Contacta con soporte@padex.com</p>
          </div>
        </motion.div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .landing-layout { 
          display: grid; 
          grid-template-columns: 1fr 480px; 
          min-height: 100vh;
          background: #09090b;
        }

        .landing-content {
          padding: 64px 80px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
          background: radial-gradient(circle at 0% 0%, #1a1a1c, #09090b);
        }

        .branding { display: flex; align-items: center; gap: 12px; margin-bottom: 80px; position: absolute; top: 64px; }
        .logo-icon { width: 14px; height: 14px; border-radius: 50%; background: var(--primary); }
        
        .hero-text h1 { font-size: 3.5rem; font-weight: 800; letter-spacing: -0.04em; line-height: 1.1; margin-bottom: 24px; }
        .hero-text h1 span { color: var(--primary); }
        .hero-text p { font-size: 1.25rem; color: var(--muted-foreground); max-width: 540px; line-height: 1.6; margin-bottom: 64px; }

        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 32px; }
        .feature-item { display: flex; gap: 16px; }
        .feature-item .icon { color: var(--primary); margin-top: 4px; }
        .feature-item h3 { font-size: 1rem; font-weight: 600; margin-bottom: 4px; }
        .feature-item p { font-size: 0.85rem; color: var(--muted-foreground); line-height: 1.4; }

        .landing-auth {
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(18, 18, 20, 0.5);
          border-left: 1px solid var(--border);
        }

        .auth-card { width: 100%; max-width: 360px; }
        h2 { font-size: 1.5rem; font-weight: 700; margin-bottom: 8px; }
        .subtitle { color: var(--muted-foreground); font-size: 0.9rem; margin-bottom: 32px; }

        .input-field { margin-bottom: 24px; }
        .input-field label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--muted-foreground); margin-bottom: 8px; }
        .input-wrapper { position: relative; display: flex; align-items: center; }
        .input-wrapper .icon { position: absolute; left: 16px; color: var(--muted-foreground); }
        input {
          width: 100%;
          background: var(--secondary);
          border: 1px solid var(--border);
          padding: 14px 16px 14px 48px;
          border-radius: 12px;
          color: white;
          font-size: 1rem;
        }
        input:focus { outline: none; border-color: var(--primary); }

        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

        .auth-footer { margin-top: 32px; text-align: center; }
        .auth-footer p { font-size: 0.8rem; color: var(--muted-foreground); }

        @media (max-width: 1024px) {
          .landing-layout { grid-template-columns: 1fr; }
          .landing-content { padding: 80px 40px; }
          .landing-auth { padding: 80px 40px; border-left: none; border-top: 1px solid var(--border); }
          .branding { top: 40px; }
        }
      `}}></style>
    </div>
  );
};

export default Landing;
