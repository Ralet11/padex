# 🎾 PadelApp — Instrucciones de uso

## Estructura del proyecto

```
padel-app/
├── backend/      → Servidor Node.js (Express + SQLite)
├── mobile/       → App React Native (Expo)
└── database.sqlite → Base de datos SQLite (se crea automáticamente)
```

---

## 1. Levantar el backend

```bash
cd padel-app/backend
npm run dev
```

El servidor arranca en **http://localhost:3000**

La base de datos SQLite se crea automáticamente con:
- 3 canchas de ejemplo (Buenos Aires)
- Turnos pre-cargados para los próximos 14 días

---

## 2. Levantar el frontend (Expo)

```bash
cd padel-app/mobile
npm start
```

Luego escaneás el QR con la app **Expo Go** en tu celular,
o presionás `a` para Android emulator / `i` para iOS.

---

## ⚙️ Configurar la IP del servidor

Si usás dispositivo físico (no emulador), editá:

```
mobile/src/services/api.js → línea 8
```

Cambiá `localhost` por la IP de tu computadora en la red local.
Ej: `http://192.168.1.100:3000`

---

## Funcionalidades

### 🔐 Autenticación
- Registro con nombre, email, contraseña
- Selección de categoría inicial (Principiante / Intermedio / Avanzado / Profesional)
- Selección de posición (Drive / Revés)
- El ELO inicial se asigna según la categoría elegida

### 🎾 Partidos
- Buscador de partidos abiertos con filtros
- Crear partido: seleccionar cancha → turno disponible → detalles
- Unirse a un partido existente
- Cuando se alcanza el mínimo de jugadores → **notificación automática a la cancha por WhatsApp**

### 👥 Social
- Buscar jugadores por nombre/categoría/posición
- Enviar solicitud de conexión
- Aceptar/rechazar solicitudes
- Si ambos se aceptan → pueden chatear

### 💬 Chat
- Mensajería en tiempo real (Socket.io) entre compañeros
- Indicador de "está escribiendo..."
- Mensajes no leídos

### 👤 Perfil
- Ver/editar: posición, paleta, compañero preferido, bio
- Subir foto de perfil
- Ver historial de partidos
- Ver/calificar jugadores tras un partido (1-5 estrellas)

### ⭐ Sistema ELO
- ELO inicial según categoría auto-asignada
- Se ajusta con calificaciones recibidas (±8 puntos por estrella)
- Categoría se actualiza automáticamente:
  - < 900: Principiante
  - 900-1100: Intermedio
  - 1100-1300: Avanzado
  - 1300+: Profesional

---

## 📱 WhatsApp (notificaciones a canchas)

El mensaje se imprime en la consola del backend.
Para enviarlo vía WhatsApp real, completar en `backend/.env`:

```
TWILIO_ACCOUNT_SID=tu_sid
TWILIO_AUTH_TOKEN=tu_token
ADMIN_WHATSAPP=+549XXXXXXXXXX
```

---

## API Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/auth/register | Registrarse |
| POST | /api/auth/login | Login |
| GET | /api/matches | Listar partidos |
| POST | /api/matches | Crear partido |
| POST | /api/matches/:id/join | Unirse |
| GET | /api/courts | Listar canchas |
| GET | /api/courts/:id/slots | Turnos disponibles |
| GET | /api/social/players | Buscar jugadores |
| POST | /api/social/connect | Enviar solicitud |
| GET | /api/social/connections | Mis compañeros |
| GET | /api/messages/:connId | Ver mensajes |
| POST | /api/ratings | Calificar jugador |

### Contratos canónicos a considerar

- `match.state` pasa a ser la fuente principal del ciclo de vida (`open`, `reserved`, `completed`, etc.) y `status` queda solo por compatibilidad.
- `slot.state` representa el estado operativo del turno (`available`, `reserved`, `blocked`, `completed`, etc.) y convive con `is_available` mientras se alinean las superficies.
- Los perfiles de jugador exponen reputación canónica en `reputation_avg_score` y `reputation_ratings_count`, manteniendo `avg_rating`/`total_ratings` como fallback histórico.
- Los cierres competitivos pueden devolver `canonical_completion` y deltas competitivos por jugador para reflejar progreso y resultado en mobile.
