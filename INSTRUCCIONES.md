# Ejecutar Padex en desarrollo

La guía actual está en el [README principal](README.md#inicio-local).

El backend usa **PostgreSQL**, no SQLite. Los archivos SQLite históricos fueron retirados del tracking de esta rama y no deben emplearse como base de la demo. No se crean ni se cargan automáticamente. Sus copias locales se conservan; siguen en el historial y en main hasta fusionar el PR.

- API: `backend/`, configurar `.env` a partir de `.env.example`, `npm ci` y `npm run dev`.
- Panel de clubes: `partners-web/`, `npm ci`, `.env.example` → `.env`, `npm run dev`.
- Aplicación: `mobile/`, `npm ci`, `.env.example` → `.env`, `npm start`.
- La URL de un teléfono debe apuntar a la IP LAN de la computadora, mediante `EXPO_PUBLIC_API_URL`.
- Demo de canchas/administrador: requiere `SEED_DEMO=true`, email y contraseña local única; nunca se activa en producción.
- Usar exclusivamente PostgreSQL descartable: el arranque sincroniza esquemas y ejecuta un backfill. Mantener los workers desactivados en la demo.

La presencia de lógica de pagos, mapas o notificaciones no prueba que un proveedor esté conectado. No ejecutar scripts destructivos, de pago, despliegue ni publicación como parte del inicio local.
