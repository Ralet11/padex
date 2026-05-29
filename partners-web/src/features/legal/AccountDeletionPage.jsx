import React from 'react';
import { ArrowLeft, CircleAlert, Mail, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import ballMark from '../../assets/ball-mark.png';

const deletionSections = [
  {
    title: 'Como solicitar la eliminacion',
    body:
      'Puedes eliminar tu cuenta desde la app, entrando a tu perfil y eligiendo la opcion de eliminar cuenta. Si no puedes acceder a la app, tambien puedes escribir a soporte@padex.com desde el email asociado a tu cuenta para pedir ayuda manual.',
  },
  {
    title: 'Que datos se eliminan',
    body:
      'Al procesar la solicitud eliminaremos el acceso a la cuenta y los datos principales del perfil asociados al usuario, incluyendo informacion de identificacion, preferencias y otros datos necesarios para operar la cuenta dentro de la app.',
  },
  {
    title: 'Que datos podrian conservarse',
    body:
      'Podemos conservar durante un periodo limitado ciertos registros tecnicos, operativos o legales cuando sea necesario para prevenir fraude, resolver disputas, cumplir obligaciones regulatorias o resguardar la seguridad de la plataforma.',
  },
  {
    title: 'Plazos de retencion',
    body:
      'Las solicitudes se revisan manualmente. Los datos estrictamente necesarios para soporte, seguridad o cumplimiento pueden conservarse por hasta 90 dias, o por el plazo mayor que exija una obligacion legal aplicable.',
  },
];

export default function AccountDeletionPage() {
  return (
    <div className="accountDeletionPage">
      <div className="accountDeletionGlow accountDeletionGlowLeft" aria-hidden="true" />
      <div className="accountDeletionGlow accountDeletionGlowRight" aria-hidden="true" />

      <div className="accountDeletionShell">
        <header className="accountDeletionHeader">
          <Link to="/socios" className="accountDeletionBackLink">
            <ArrowLeft size={16} />
            Volver a Partners
          </Link>

          <div className="accountDeletionBrand" aria-label="Padex Partners">
            <span className="accountDeletionBrandBadge">
              <img src={ballMark} alt="Padex" className="accountDeletionBrandBall" />
            </span>
            <span>PADEX PARTNERS</span>
          </div>
        </header>

        <main className="accountDeletionCard glass">
          <div className="accountDeletionHero">
            <div className="accountDeletionHeroBadge">
              <Trash2 size={16} />
              <span>Eliminacion de cuenta</span>
            </div>

            <h1>Solicitar eliminacion de cuenta</h1>
            <p>
              Esta pagina explica como solicitar la eliminacion de tu cuenta de
              Padex y que tratamiento se da a los datos asociados una vez
              recibida la solicitud.
            </p>
          </div>

          <section className="accountDeletionActionBox">
            <div className="accountDeletionActionIcon">
              <Mail size={20} />
            </div>
            <div>
              <strong>Canal de solicitud</strong>
              <p>
                Desde la app: Perfil {'->'} sesion {'->'} <strong>Eliminar cuenta</strong>.
                Como alternativa, escribe a <a href="mailto:soporte@padex.com">soporte@padex.com</a> desde el
                email vinculado a tu cuenta.
              </p>
            </div>
          </section>

          <section className="accountDeletionNotice">
            <CircleAlert size={18} />
            <p>
              Si la solicitud llega desde un email distinto, podemos pedir
              informacion adicional para validar la identidad antes de eliminar
              la cuenta.
            </p>
          </section>

          <div className="accountDeletionSections">
            {deletionSections.map((section) => (
              <article key={section.title} className="accountDeletionSection">
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </article>
            ))}
          </div>

          <footer className="accountDeletionFooter">
            <span>PADEX PARTNERS</span>
            <div className="accountDeletionFooterLinks">
              <Link to="/politicas-de-privacidad">Politica de privacidad</Link>
              <Link to="/eliminar-cuenta">Eliminar cuenta</Link>
            </div>
          </footer>
        </main>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .accountDeletionPage {
              min-height: 100vh;
              position: relative;
              overflow: hidden;
              background:
                radial-gradient(circle at top left, rgba(255, 138, 80, 0.12), transparent 24%),
                radial-gradient(circle at top right, rgba(192, 255, 0, 0.08), transparent 22%),
                linear-gradient(180deg, #0a0a0c 0%, #111216 100%);
            }
            .accountDeletionGlow {
              position: absolute;
              width: 340px;
              height: 340px;
              border-radius: 999px;
              filter: blur(90px);
              opacity: 0.28;
              pointer-events: none;
            }
            .accountDeletionGlowLeft {
              top: -120px;
              left: -100px;
              background: rgba(255, 138, 80, 0.18);
            }
            .accountDeletionGlowRight {
              right: -120px;
              bottom: -120px;
              background: rgba(192, 255, 0, 0.12);
            }
            .accountDeletionShell {
              position: relative;
              z-index: 1;
              max-width: 1080px;
              margin: 0 auto;
              padding: 40px 24px 64px;
            }
            .accountDeletionHeader {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 18px;
              margin-bottom: 24px;
            }
            .accountDeletionBackLink,
            .accountDeletionBrand {
              display: inline-flex;
              align-items: center;
              gap: 10px;
            }
            .accountDeletionBackLink {
              color: rgba(255, 255, 255, 0.78);
              text-decoration: none;
              font-size: 0.92rem;
              font-weight: 600;
            }
            .accountDeletionBackLink:hover {
              color: white;
            }
            .accountDeletionBrand {
              color: white;
              font-size: 0.9rem;
              font-weight: 700;
              letter-spacing: 0.08em;
            }
            .accountDeletionBrandBadge {
              width: 36px;
              height: 36px;
              border-radius: 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .accountDeletionBrandBall {
              width: 24px;
              height: 24px;
              object-fit: contain;
            }
            .accountDeletionCard {
              padding: 36px;
              border-radius: 28px;
              background: rgba(18, 18, 20, 0.78);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .accountDeletionHero {
              max-width: 760px;
              margin-bottom: 26px;
            }
            .accountDeletionHeroBadge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 16px;
              padding: 7px 12px;
              border-radius: 999px;
              color: #ffb48a;
              background: rgba(255, 138, 80, 0.12);
              font-size: 0.82rem;
              font-weight: 700;
            }
            .accountDeletionHero h1 {
              margin: 0 0 12px;
              font-size: clamp(2.3rem, 4vw, 3.7rem);
              line-height: 1.02;
              letter-spacing: -0.04em;
            }
            .accountDeletionHero p {
              margin: 0;
              max-width: 680px;
              color: var(--muted-foreground);
              font-size: 1rem;
              line-height: 1.7;
            }
            .accountDeletionActionBox,
            .accountDeletionNotice {
              display: flex;
              gap: 14px;
              align-items: flex-start;
              margin-bottom: 18px;
              padding: 18px 20px;
              border-radius: 20px;
            }
            .accountDeletionActionBox {
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .accountDeletionActionIcon {
              width: 40px;
              height: 40px;
              border-radius: 14px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              color: #ffb48a;
              background: rgba(255, 138, 80, 0.08);
            }
            .accountDeletionActionBox strong {
              display: block;
              margin-bottom: 4px;
            }
            .accountDeletionActionBox p,
            .accountDeletionNotice p {
              margin: 0;
              color: var(--muted-foreground);
              line-height: 1.6;
            }
            .accountDeletionActionBox a {
              color: white;
            }
            .accountDeletionNotice {
              background: rgba(255, 180, 138, 0.08);
              border: 1px solid rgba(255, 180, 138, 0.18);
              color: #ffb48a;
            }
            .accountDeletionSections {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px;
            }
            .accountDeletionSection {
              min-height: 180px;
              padding: 22px;
              border-radius: 22px;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.02));
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .accountDeletionSection h2 {
              margin: 0 0 10px;
              font-size: 1.02rem;
              font-weight: 700;
            }
            .accountDeletionSection p {
              margin: 0;
              color: var(--muted-foreground);
              line-height: 1.65;
              font-size: 0.95rem;
            }
            .accountDeletionFooter {
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
            .accountDeletionFooterLinks {
              display: flex;
              align-items: center;
              gap: 18px;
              flex-wrap: wrap;
            }
            .accountDeletionFooter a {
              color: white;
              text-decoration: none;
            }
            .accountDeletionFooter a:hover {
              color: var(--primary);
            }
            @media (max-width: 800px) {
              .accountDeletionHeader {
                flex-direction: column;
                align-items: flex-start;
              }
              .accountDeletionCard {
                padding: 24px;
              }
              .accountDeletionSections {
                grid-template-columns: 1fr;
              }
              .accountDeletionFooter {
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
