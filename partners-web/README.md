# Padex · Panel de clubes

Panel de operaciones construido con React y Vite. Forma parte de [Padex](../README.md), junto con la API Express/PostgreSQL y la aplicación Expo.

```sh
npm ci
cp .env.example .env
npm run dev
```

Configurar `VITE_API_URL` con el origen de la API (sin `/api`). Revisar la [guía principal](../README.md) antes de iniciar el backend: usar exclusivamente una base local descartable.

## Comprobaciones

- `npm test`: Vitest.
- `npm run build`: build de producción del frontend, sin publicar.
- `npm run lint`: ESLint.

Una compilación exitosa no valida reservas, pagos o integraciones en vivo.
