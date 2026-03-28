import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronRight,
  MapPinned,
  ShieldCheck,
  Smartphone,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import ballMark from '../../assets/ball-mark.png';
import './HomeLanding.css';

const heroSignals = [
  { icon: Users, label: 'Partidos abiertos cerca tuyo' },
  { icon: Trophy, label: 'Ranking y ligas en vivo' },
  { icon: Zap, label: 'Entr\u00e1s, jug\u00e1s y escal\u00e1s' },
];

const featureCards = [
  {
    icon: MapPinned,
    eyebrow: 'Matchmaking real',
    title: 'Encontr\u00e1 el partido justo, sin perseguir chats.',
    copy:
      'Eleg\u00ed nivel, zona y horario para sumarte a partidos abiertos con una experiencia mucho m\u00e1s clara y competitiva.',
    tags: ['Zona correcta', 'Nivel compatible', 'Coordinaci\u00f3n simple'],
    className: 'homeFeatureCard homeFeatureCardWide',
  },
  {
    icon: Trophy,
    eyebrow: 'Progreso visible',
    title: 'Cheque\u00e1 tu ranking y entend\u00e9 cu\u00e1ndo subir.',
    copy:
      'Segu\u00eds tu posici\u00f3n, tu racha y tu objetivo de liga para saber si ya est\u00e1s listo para competir un escal\u00f3n m\u00e1s arriba.',
    tags: ['Ranking vivo', 'Racha semanal'],
    className: 'homeFeatureCard',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Ecosistema ordenado',
    title: 'Jugadores, clubes y socios dentro de la misma experiencia.',
    copy:
      'Padex conecta comunidad, organizaci\u00f3n y competencia en una interfaz m\u00e1s prolija para el jugador y para el club.',
    tags: ['Comunidad activa', 'Panel socios'],
    className: 'homeFeatureCard',
  },
];

const platformNotes = [
  'Ranking competitivo real en una sola app.',
  'Descubrimiento de partidos con menos fricci\u00f3n.',
  'Misma experiencia para jugador y panel de socios.',
];

export default function HomeLanding() {
  const scrollToDownload = () => {
    document.getElementById('descarga')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="homeLanding">
      <div className="homeAmbient homeAmbientLeft" aria-hidden="true" />
      <div className="homeAmbient homeAmbientRight" aria-hidden="true" />

      <div className="homeShell">
        <header className="homeHeader">
          <Link to="/" className="homeBrand" aria-label="Padex">
            <span className="homeBrandBadge">
              <img src={ballMark} alt="Padex" className="homeBrandBall" />
            </span>
            <span className="homeBrandWord">PADEX</span>
          </Link>

          <div className="homeHeaderActions">
            <button
              type="button"
              className="homeButton homeButtonGhost"
              onClick={scrollToDownload}
            >
              Descargar app
            </button>
            <Link to="/socios" className="homeButton homeButtonOutline">
              Socios
            </Link>
          </div>
        </header>

        <main className="homeMain">
          <section className="homeHero">
            <div className="homeHeroCopy homeRevealUp">
              <div className="homeHeroBadge">
                <span className="homeEyebrow">{'La app para el nuevo p\u00e1del'}</span>
                <span className="homeHeroBadgeDivider" aria-hidden="true" />
                <span className="homeHeroBadgeText">Ranking, ligas y partidos en una sola experiencia</span>
              </div>

              <h1>{'Encontr\u00e1 partidos, segu\u00ed tu ranking y sub\u00ed de liga'}</h1>

              <p className="homeLead">
                Padex conecta a jugadores del mismo nivel, ordena la experiencia
                social y te muestra progreso real con una interfaz pensada para
                competir mejor semana tras semana.
              </p>

              <div className="homeActionRow">
                <button
                  type="button"
                  className="homeButton homeButtonPrimary"
                  onClick={scrollToDownload}
                >
                  Descargar la app
                  <ChevronRight size={18} />
                </button>
                <Link to="/socios" className="homeButton homeButtonOutline">
                  Acceso Socios
                </Link>
              </div>

              <div className="homeProofRow">
                {heroSignals.map(({ icon: Icon, label }) => (
                  <div key={label} className="homeProofItem">
                    {React.createElement(Icon, { size: 18 })}
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="homeHeroVisual homeRevealScale">
              <div className="homeStageGlow" aria-hidden="true" />

              <div className="homeOrbitCard homeOrbitCardTop homeFloatUp">
                <div className="homeOrbitBallWrap">
                  <img src={ballMark} alt="" aria-hidden="true" />
                </div>
                <div>
                  <span>Padex match</span>
                  <strong>{'Jug\u00e1 con gente de tu nivel'}</strong>
                </div>
              </div>

              <div className="homePhoneShell">
                <div className="homePhoneTop">
                  <span className="homePhoneTitle">PADEX APP</span>
                  <span className="homePhoneDot" />
                </div>

                <div className="homePhoneScreen">
                  <div className="homePhoneCard homePhoneHeroCard">
                    <div className="homePhoneHeader">
                      <span>Tu ranking hoy</span>
                      <small>Subiendo</small>
                    </div>
                    <strong>#18 en CABA</strong>
                    <p>{'+3 posiciones esta semana por tus \u00faltimos 2 partidos.'}</p>
                  </div>

                  <div className="homePhoneTicker">
                    <span className="homeTickerDot" />
                    <span>3 partidos abiertos cerca tuyo en este momento</span>
                  </div>

                  <div className="homePhoneCard homePhoneMatchCard">
                    <div className="homePhoneHeader">
                      <span>Partido sugerido</span>
                      <small>Hoy</small>
                    </div>
                    <strong>21:00 - Club Belgrano</strong>
                    <p>Nivel 4ta/5ta, falta 1 jugador y el ranking es compatible.</p>
                    <div className="homeTagRow">
                      <span>Ranking compatible</span>
                      <span>Liga nocturna</span>
                    </div>
                  </div>

                  <div className="homePhoneCard homePhoneLeagueCard">
                    <div className="homePhoneHeader">
                      <span>Subida de liga</span>
                      <small>Objetivo</small>
                    </div>
                    <strong>{'4ta categor\u00eda'}</strong>
                    <div className="homeLeagueBar" aria-hidden="true">
                      <div className="homeLeagueProgress" />
                    </div>
                    <p>{'Te faltan 2 victorias para meterte en la siguiente categor\u00eda.'}</p>
                  </div>
                </div>
              </div>

              <div className="homeOrbitCard homeOrbitCardBottom homeFloatDown">
                <span>Comunidad activa</span>
                <strong>{'Ranking, ligas y matches con una interfaz m\u00e1s clara.'}</strong>
              </div>
            </div>
          </section>

          <section className="homeFeatureSection">
            <div className="homeSectionIntro">
              <span className="homeEyebrow">Todo en una sola experiencia</span>
              <h2>{'Dise\u00f1ada para que jugar mejor te lleve menos fricci\u00f3n.'}</h2>
              <p>
                {
                  'La landing ahora muestra una direcci\u00f3n visual m\u00e1s limpia: mejor ritmo, mejores bloques y una composici\u00f3n m\u00e1s premium alrededor del producto.'
                }
              </p>
            </div>

            <div className="homeFeatureGrid">
              {featureCards.map((card, index) => {
                return (
                  <article
                    key={card.title}
                    className={`${card.className} homeFeatureCardReveal`}
                    style={{ animationDelay: `${0.14 + index * 0.08}s` }}
                  >
                    <div className="homeFeatureIcon">
                      {React.createElement(card.icon, { size: 20 })}
                    </div>
                    <span className="homeFeatureEyebrow">{card.eyebrow}</span>
                    <h3>{card.title}</h3>
                    <p>{card.copy}</p>

                    <div className="homeTagRow homeTagRowMuted">
                      {card.tags.map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="descarga" className="homeDownloadSection">
            <div className="homeDownloadCopy">
              <span className="homeEyebrow">Descarga</span>
              <h2>{'Llev\u00e1 tu p\u00e1del al siguiente nivel con Padex.'}</h2>
              <p>
                {
                  'Android y iPhone, con ranking, descubrimiento de partidos y progreso competitivo dentro de una experiencia m\u00e1s prolija.'
                }
              </p>
            </div>

            <div className="homeDownloadPanel">
              <div className="homeStoreRow">
                <span className="homeStoreBadge">Android</span>
                <span className="homeStoreBadge">iPhone</span>
              </div>

              <div className="homeDownloadNotes">
                {platformNotes.map((note) => (
                  <div key={note} className="homeDownloadNote">
                    <Smartphone size={16} />
                    <span>{note}</span>
                  </div>
                ))}
              </div>

              <div className="homeDownloadActions">
                <button
                  type="button"
                  className="homeButton homeButtonPrimary"
                  onClick={scrollToDownload}
                >
                  Descargar app
                </button>
                <Link to="/socios" className="homeButton homeButtonOutline">
                  Panel Socios
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
