import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { User, MapPin, Building2, Phone, Mail, ChevronRight, Check, Lock, Shield } from 'lucide-react';
import { api } from '../../lib/runtime';

const Input = ({ label, icon: Icon, value, onChange, placeholder, type = "text" }) => (
  <div className="input-group">
    <label>{label}</label>
    <div className="input-wrapper">
      {Icon && <Icon size={18} className="input-icon" />}
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        placeholder={placeholder}
      />
    </div>
    <style dangerouslySetInnerHTML={{ __html: `
      .input-group { margin-bottom: 24px; }
      label { display: block; font-size: 0.85rem; color: var(--muted-foreground); margin-bottom: 8px; font-weight: 500; }
      .input-wrapper { position: relative; display: flex; align-items: center; }
      .input-icon { position: absolute; left: 16px; color: var(--muted-foreground); }
      input {
        width: 100%;
        background: var(--secondary);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        padding: 14px 16px 14px 48px;
        color: white;
        font-size: 1rem;
        transition: all 0.2s ease;
      }
      input:focus { outline: none; border-color: var(--primary); background: #1a1a1c; }
    ` }} />
  </div>
);

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    venue_name: '',
    venue_address: '',
    venue_phone: '',
    court_count: '1',
    newPassword: '',
    confirmPassword: ''
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const response = await api.post('/partners/onboarding', {
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        venue_phone: formData.venue_phone,
        court_count: formData.court_count,
        newPassword: formData.newPassword
      });

      onComplete({
        name: response.data.venue.name,
        address: response.data.venue.address,
        court_count: response.data.court_count
      });
    } catch (err) {
      console.error(err);
      alert('Error al procesar el registro: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card glass">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <Motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="step-content"
            >
              <h2>Configura tu Sede</h2>
              <p className="subtitle">Danos los detalles básicos de tu club para empezar.</p>
              
              <Input 
                label="Nombre del Complejo" 
                icon={Building2} 
                value={formData.venue_name} 
                onChange={v => updateField('venue_name', v)} 
                placeholder="Padel Master Club"
              />
              <Input 
                label="Dirección" 
                icon={MapPin} 
                value={formData.venue_address} 
                onChange={v => updateField('venue_address', v)} 
                placeholder="Av. Santa Fe 1234, CABA"
              />
              <div className="grid">
                <Input 
                  label="Teléfono Sede" 
                  icon={Phone} 
                  value={formData.venue_phone} 
                  onChange={v => updateField('venue_phone', v)} 
                  placeholder="+54 9 11 ..."
                />
                <Input 
                  label="Canchas" 
                  icon={Check} 
                  value={formData.court_count} 
                  onChange={v => updateField('court_count', v)} 
                  placeholder="4"
                  type="number"
                />
              </div>
              
              <button className="btn-primary" onClick={nextStep}>
                Continuar a Seguridad <ChevronRight size={18} />
              </button>
            </Motion.div>
          )}

          {step === 2 && (
            <Motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="step-content"
            >
              <h2>Seguridad</h2>
              <p className="subtitle">Como es tu primer ingreso, debes cambiar tu contraseña temporal.</p>
              
              <Input 
                label="Nueva Contraseña" 
                icon={Lock} 
                value={formData.newPassword} 
                onChange={v => updateField('newPassword', v)} 
                placeholder="••••••••"
                type="password"
              />
              <Input 
                label="Confirmar Contraseña" 
                icon={Shield} 
                value={formData.confirmPassword} 
                onChange={v => updateField('confirmPassword', v)} 
                placeholder="••••••••"
                type="password"
              />
              
              <div className="btn-group">
                <button className="btn-secondary" onClick={prevStep}>Atrás</button>
                <button className="btn-primary" onClick={nextStep}>Revisar Datos</button>
              </div>
            </Motion.div>
          )}

          {step === 3 && (
            <Motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="step-content confirmation"
            >
              <div className="success-icon neon-glow">
                <Check size={48} color="black" />
              </div>
              <h2>¡Casi listo!</h2>
              <p className="subtitle">Confirma que la información de tu sede es correcta para empezar a gestionar tus turnos.</p>
              
              <div className="resume">
                <div className="resume-item">
                  <span>Sede</span>
                  <strong>{formData.venue_name}</strong>
                </div>
                <div className="resume-item">
                  <span>Canchas</span>
                  <strong>{formData.court_count}</strong>
                </div>
              </div>

              <button className="btn-primary" onClick={handleSubmit}>Ir al Dashboard</button>
            </Motion.div>
          )}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .onboarding-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: radial-gradient(circle at top right, #1a1a1c, #09090b);
        }
        .onboarding-card {
          width: 100%;
          max-width: 480px;
          background: rgba(18, 18, 20, 0.8);
          border-radius: 24px;
          padding: 40px;
          position: relative;
          overflow: hidden;
        }
        .progress-bar {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.05);
        }
        .progress-fill {
          height: 100%;
          background: var(--primary);
          transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 0 10px var(--primary);
        }
        h2 { font-size: 1.75rem; margin-bottom: 8px; font-weight: 700; letter-spacing: -0.025em; }
        .subtitle { color: var(--muted-foreground); margin-bottom: 32px; font-size: 0.95rem; line-height: 1.5; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .btn-group { display: grid; grid-template-columns: auto 1fr; gap: 16px; margin-top: 12px; }
        .btn-group { display: grid; grid-template-columns: auto 1fr; gap: 16px; margin-top: 12px; }
        .confirmation { text-align: center; }
        .success-icon {
          width: 80px;
          height: 80px;
          background: rgba(192, 255, 0, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }
        .resume {
          background: rgba(255,255,255,0.03);
          border-radius: var(--radius);
          padding: 20px;
          margin-bottom: 32px;
          text-align: left;
        }
        .resume-item { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 0.9rem; }
        .resume-item:last-child { margin-bottom: 0; }
        .resume-item span { color: var(--muted-foreground); }
      ` }} />
    </div>
  );
};

export default Onboarding;
