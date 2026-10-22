# Padex

Plataforma de pádel con una aplicación para jugadores, un panel de operaciones para clubes y una API compartida. El repositorio reúne reservas y disponibilidad, organización de partidos, conexiones entre jugadores, chat en tiempo real y lógica competitiva.

**Estado:** proyecto en desarrollo. El código y las pruebas disponibles no equivalen a una publicación en tiendas, un despliegue validado ni aceptación de usuarios. No se incluye una demo pública verificada.

## Qué explorar

- **Jugadores:** aplicación Expo / React Native con búsqueda de partidos, perfil y experiencia social.
- **Clubes:** panel React / Vite para administrar disponibilidad y operaciones.
- **Backend:** Express, Sequelize y PostgreSQL; Socket.IO para chat y actualizaciones de disponibilidad.
- **Dominio:** servicios de reservas, pagos y clasificación competitiva. Las integraciones externas requieren configuración y validación independientes.

## Arquitectura

```text
mobile/        Expo SDK 54, React Native 0.81
partners-web/  React 19, Vite 8, Vitest
backend/       Node.js, Express, Sequelize, PostgreSQL, Socket.IO
```

Los clientes consumen la API en `/api`; Socket.IO comparte el servidor HTTP. La autenticación del socket usa JWT y las suscripciones al chat requieren una conexión aceptada entre los participantes. Los modelos y servicios están en `backend/src/models` y `backend/src/services`.

## Inicio local

Requisitos: Node.js 22.12 o superior (Node 24 recomendado), npm y PostgreSQL local. Usá **una base de datos descartable**, nunca una base real: el arranque actual sincroniza modelos con `alter: true` y ejecuta un backfill competitivo. No es un sistema de migraciones listo para producción.

1. Creá una base PostgreSQL y un usuario exclusivos para desarrollo.
2. Instalá las dependencias y copiá los ejemplos de entorno:

```sh
cd backend
npm ci
cp .env.example .env
```

Editá `DATABASE_URL` y `JWT_SECRET` con valores locales. Para cargar canchas y un administrador de demostración, configurá `SEED_DEMO=true`, `DEMO_ADMIN_EMAIL` y una contraseña local única de al menos 16 caracteres en `DEMO_ADMIN_PASSWORD`. No hay credenciales demo universales. El seed se rechaza en producción. Conservá `DISABLE_BACKGROUND_WORKERS=true` para evitar sincronizaciones externas y mantenimiento de pagos en la demo.

```sh
npm run dev
# API: http://localhost:3000/api/health
```

En otras terminales:

```sh
cd partners-web
npm ci
cp .env.example .env
npm run dev
```

```sh
cd mobile
npm ci
cp .env.example .env
npm start
```

En un teléfono, `localhost` es el teléfono: configurá `EXPO_PUBLIC_API_URL` con la IP LAN de la computadora. En el emulador Android suele ser `http://10.0.2.2:3000`. Las credenciales e integraciones de terceros son opcionales para revisar el código y no se proporcionan aquí. Las funciones nativas requieren su entorno y configuración correspondientes; no se garantiza que todas funcionen en Expo Go.

## Verificación

```sh
cd backend
npm test                    # pruebas unitarias aisladas de autorización de chat
cd ../partners-web
npm test                    # pruebas del panel
npm run build               # compilación del panel
npm run lint                # revisión estática
```

La CI propuesta ejecuta pruebas y build, sin despliegues ni secretos. Los scripts históricos de integración en `backend/test_*.js` no forman parte de `npm test`: necesitan evaluación y un entorno descartable antes de ejecutarlos. No ejecutar `fix_admin.js`, resets, backfills ni comandos EAS contra recursos reales como parte de una revisión de portfolio.

## Recorrido sugerido para una demo

1. Explicar los tres clientes/componentes y el modelo de disponibilidad.
2. Mostrar operaciones del club y luego la experiencia de partidos del jugador.
3. Con dos cuentas de prueba, aceptar una conexión y mostrar el chat.
4. Explicar las pruebas, límites actuales y decisiones técnicas sin presentar integraciones no validadas como operativas.

Antes de grabar, verificá ese recorrido en tu entorno local. No hay capturas generadas ni resultados de ejecución simulados en este README.

## Límites antes de producción

- Revisar el ciclo de migraciones/backfills y la configuración de CORS, autenticación e integraciones.
- La cobertura unitaria no reemplaza pruebas end-to-end, de dispositivos ni de pagos.
- Los tres archivos SQLite históricos fueron retirados del tracking en esta rama; el backend usa PostgreSQL y no los necesita. Sus copias locales se conservaron. No se inspeccionó su contenido ni se confirmó información sensible. Siguen accesibles en el historial y en main hasta fusionar el PR; este cambio no purga el historial.
- Los cambios de presentación o código no eliminan información ya existente en el historial de Git.

Consultá [INSTRUCCIONES.md](INSTRUCCIONES.md) para la guía de entrada y [docs/PORTFOLIO_REVIEW.md](docs/PORTFOLIO_REVIEW.md) para el alcance de la revisión.
