import React from 'react';
import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import ballMark from '../../assets/ball-mark.png';

const policySections = [
  {
    title: '1. Informacion que recopilamos',
    body:
      'Podemos recopilar datos de identificacion y contacto del partner, informacion operativa de la sede, configuraciones del panel, actividad dentro de la plataforma y datos tecnicos basicos necesarios para brindar el servicio de forma segura.',
  },
  {
    title: '2. Para que usamos la informacion',
    body:
      'Usamos la informacion para habilitar el acceso al panel, administrar sedes, canchas, reservas, agenda y soporte operativo. Tambien la utilizamos para mejorar la experiencia, prevenir abusos y mantener la seguridad del servicio.',
  },
  {
    title: '3. Comparticion y resguardo',
    body:
      'No compartimos informacion del partner fuera de los casos necesarios para operar la plataforma, cumplir obligaciones legales o trabajar con proveedores que procesan datos por nuestra cuenta bajo medidas de confidencialidad y seguridad razonables.',
  },
  {
    title: '4. Conservacion de datos',
    body:
      'Conservamos la informacion durante el tiempo necesario para prestar el servicio, sostener la operacion del panel, resolver disputas, cumplir exigencias regulatorias y mantener registros operativos o de seguridad cuando corresponda.',
  },
  {
    title: '5. Derechos y contacto',
    body:
      'Si necesitas actualizar informacion, solicitar una revision o hacer una consulta sobre privacidad y tratamiento de datos, puedes comunicarte con el equipo de soporte de Padex por los canales oficiales de la compania.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="privacyPolicyPage">
      <div className="privacyPolicyGlow privacyPolicyGlowLeft" aria-hidden="true" />
      <div className="privacyPolicyGlow privacyPolicyGlowRight" aria-hidden="true" />

      <div className="privacyPolicyShell">
        <header className="privacyPolicyHeader">
          <Link to="/socios" className="privacyPolicyBackLink">
            <ArrowLeft size={16} />
            Volver a Partners
          </Link>

          <div className="privacyPolicyBrand" aria-label="Padex Partners">
            <span className="privacyPolicyBrandBadge">
              <img src={ballMark} alt="Padex" className="privacyPolicyBrandBall" />
            </span>
            <span>PADEX PARTNERS</span>
          </div>
        </header>

        <main className="privacyPolicyCard glass">
          <div className="privacyPolicyHero">
            <div className="privacyPolicyHeroBadge">
              <ShieldCheck size={16} />
              <span>Privacidad y uso responsable</span>
            </div>

            <h1>Politicas de privacidad</h1>
            <p>
              Esta pantalla resume como Padex Partners gestiona la informacion
              necesaria para operar la sede, habilitar el panel y sostener una
              experiencia segura para el equipo del club.
            </p>
          </div>

          <section className="privacyPolicySummary">
            <div className="privacyPolicySummaryIcon">
              <FileText size={20} />
            </div>
            <div>
              <strong>Version vigente</strong>
              <p>
                Este contenido puede actualizarse para reflejar mejoras del
                producto, cambios operativos o nuevas obligaciones legales.
              </p>
            </div>
          </section>

          <div className="privacyPolicySections">
            {policySections.map((section) => (
              <article key={section.title} className="privacyPolicySection">
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            ))}
          </div>

          <footer className="privacyPolicyFooter">
            <span>PADEX PARTNERS</span>
            <div className="privacyPolicyFooterLinks">
              <Link to="/socios">Acceso partners</Link>
              <Link to="/politicas-de-privacidad">Politica de privacidad</Link>
              <Link to="/eliminar-cuenta">Eliminar cuenta</Link>
            </div>
          </footer>
        </main>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .privacyPolicyPage {
              min-height: 100vh;
              position: relative;
              overflow: hidden;
              background:
                radial-gradient(circle at top left, rgba(192, 255, 0, 0.08), transparent 28%),
                radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 20%),
                linear-gradient(180deg, #0a0a0c 0%, #111216 100%);
            }
            .privacyPolicyGlow {
              position: absolute;
              width: 340px;
              height: 340px;
              border-radius: 999px;
              filter: blur(90px);
              opacity: 0.28;
              pointer-events: none;
            }
            .privacyPolicyGlowLeft {
              top: -120px;
              left: -100px;
              background: rgba(192, 255, 0, 0.18);
            }
            .privacyPolicyGlowRight {
              right: -120px;
              bottom: -120px;
              background: rgba(71, 117, 255, 0.18);
            }
            .privacyPolicyShell {
              position: relative;
              z-index: 1;
              max-width: 1080px;
              margin: 0 auto;
              padding: 40px 24px 64px;
            }
            .privacyPolicyHeader {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 18px;
              margin-bottom: 24px;
            }
            .privacyPolicyBackLink,
            .privacyPolicyBrand {
              display: inline-flex;
              align-items: center;
              gap: 10px;
            }
            .privacyPolicyBackLink {
              color: rgba(255, 255, 255, 0.78);
              text-decoration: none;
              font-size: 0.92rem;
              font-weight: 600;
            }
            .privacyPolicyBackLink:hover {
              color: white;
            }
            .privacyPolicyBrand {
              color: white;
              font-size: 0.9rem;
              font-weight: 700;
              letter-spacing: 0.08em;
            }
            .privacyPolicyBrandBadge {
              width: 36px;
              height: 36px;
              border-radius: 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .privacyPolicyBrandBall {
              width: 24px;
              height: 24px;
              object-fit: contain;
            }
            .privacyPolicyCard {
              padding: 36px;
              border-radius: 28px;
              background: rgba(18, 18, 20, 0.78);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .privacyPolicyHero {
              max-width: 760px;
              margin-bottom: 30px;
            }
            .privacyPolicyHeroBadge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 16px;
              padding: 7px 12px;
              border-radius: 999px;
              color: var(--primary);
              background: rgba(192, 255, 0, 0.1);
              font-size: 0.82rem;
              font-weight: 700;
            }
            .privacyPolicyHero h1 {
              margin: 0 0 12px;
              font-size: clamp(2.3rem, 4vw, 3.7rem);
              line-height: 1.02;
              letter-spacing: -0.04em;
            }
            .privacyPolicyHero p {
              margin: 0;
              max-width: 680px;
              color: var(--muted-foreground);
              font-size: 1rem;
              line-height: 1.7;
            }
            .privacyPolicySummary {
              display: flex;
              gap: 14px;
              align-items: flex-start;
              margin-bottom: 28px;
              padding: 18px 20px;
              border-radius: 20px;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .privacyPolicySummaryIcon {
              width: 40px;
              height: 40px;
              border-radius: 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              color: var(--primary);
              background: rgba(192, 255, 0, 0.08);
            }
            .privacyPolicySummary strong {
              display: block;
              margin-bottom: 4px;
            }
            .privacyPolicySummary p {
              margin: 0;
              color: var(--muted-foreground);
              line-height: 1.6;
            }
            .privacyPolicySections {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px;
            }
            .privacyPolicySection {
              min-height: 180px;
              padding: 22px;
              border-radius: 22px;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .privacyPolicySection h2 {
              margin: 0 0 10px;
              font-size: 1.02rem;
              font-weight: 700;
            }
            .privacyPolicySection p {
              margin: 0;
              color: var(--muted-foreground);
              line-height: 1.65;
              font-size: 0.95rem;
            }
            .privacyPolicyFooter {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 16px;
              margin-top: 26px;
              padding-top: 18px;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              color: var(--muted-foreground);
              font-size: 0.9rem;
            }
            .privacyPolicyFooterLinks {
              display: flex;
              align-items: center;
              gap: 18px;
              flex-wrap: wrap;
            }
            .privacyPolicyFooter a {
              color: white;
              text-decoration: none;
            }
            .privacyPolicyFooter a:hover {
              color: var(--primary);
            }
            @media (max-width: 800px) {
              .privacyPolicyHeader {
                flex-direction: column;
                align-items: flex-start;
              }
              .privacyPolicyCard {
                padding: 24px;
              }
              .privacyPolicySections {
                grid-template-columns: 1fr;
              }
              .privacyPolicyFooter {
                flex-direction: column;
                align-items: flex-start;
              }
            }
          `,
        }}
      />
    </div>
  );
}
