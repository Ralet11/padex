# Comandos utiles del proyecto

Esta guia junta los comandos mas usados de `padex`, separados por modulo, con foco especial en `EAS Build` para la app mobile.

## Estructura rapida

- `backend/`: API Node.js + scripts operativos
- `mobile/`: app Expo / React Native
- `partners-web/`: panel web con Vite + React

## Instalacion inicial

Cada modulo tiene su propio `package.json`, asi que la instalacion se hace por carpeta:

```bash
cd backend
npm install

cd ../mobile
npm install

cd ../partners-web
npm install
```

## Backend

Ejecutar en desarrollo:

```bash
cd backend
npm run dev
```

Ejecutar en modo normal:

```bash
cd backend
npm start
```

Seed de datos demo:

```bash
cd backend
npm run seed:demo
```

### Scripts utiles para partidos de desarrollo

Simular que se borraria:

```bash
cd backend
npm run dev:matches:clear -- --dry-run
```

Borrar partidos no completados:

```bash
cd backend
npm run dev:matches:clear -- --yes
```

Borrar solo demo matches:

```bash
cd backend
npm run dev:matches:clear -- --scope demo --yes
```

Crear demo matches:

```bash
cd backend
npm run dev:matches:create
```

Crear una cantidad concreta:

```bash
cd backend
npm run dev:matches:create -- --count 12
```

Crear demo matches con pago habilitado:

```bash
cd backend
npm run dev:matches:create -- --count 12 --payment-required true
```

Reset completo de demo matches:

```bash
cd backend
npm run dev:matches:reset -- --yes
```

Simular reset:

```bash
cd backend
npm run dev:matches:reset -- --dry-run
```

### Scripts utiles para temporadas competitivas

Bootstrap inicial de la base competitiva:

```bash
cd backend
npm run backfill:competitive-foundation
```

Crear temporada:

```bash
cd backend
npm run season:create -- --league-key padex-default-league --key apertura-2027 --name "Apertura 2027" --status active --seed-players true --seed-mode carry-over --dry-run
```

Finalizar temporada:

```bash
cd backend
npm run season:finalize -- --season-key apertura-2027 --dry-run
```

Rollover de temporada:

```bash
cd backend
npm run season:rollover -- --league-key padex-default-league --next-key clausura-2027 --next-name "Clausura 2027" --seed-mode carry-over --dry-run
```

Verificacion de base competitiva:

```bash
cd backend
npm run verify:competitive-foundation
```

Notas:

- Para cambios operativos en datos, conviene correr primero con `--dry-run`.
- Los detalles completos de estos scripts estan en `backend/docs/dev-match-scripts.md` y `backend/docs/competitive-season-scripts.md`.

## Mobile

Levantar Expo:

```bash
cd mobile
npm start
```

Abrir directo en Android:

```bash
cd mobile
npm run android
```

Abrir directo en iOS:

```bash
cd mobile
npm run ios
```

Abrir en web:

```bash
cd mobile
npm run web
```

Ver configuracion publica de Expo:

```bash
cd mobile
npm run config:public
```

Nota:

- El script `mobile/scripts/start-expo.js` intenta detectar automaticamente una IP LAN y setea `REACT_NATIVE_PACKAGER_HOSTNAME`, lo que ayuda cuando probas desde dispositivo fisico.

## EAS Build

Toda la configuracion actual vive en `mobile/eas.json`.

### Scripts EAS que ya existen en el proyecto

Hoy en `mobile/package.json` existen estos scripts npm:

```bash
npm run build:apk
npm run build:android
```

Equivalen a:

```bash
npx eas-cli build -p android --profile apk
npx eas-cli build -p android --profile production
```

Resumen rapido:

- `build:apk`: genera una build interna Android en formato APK
- `build:android`: genera una build Android de produccion en formato AAB

Importante:

- No existen hoy otros scripts npm de EAS como `submit`, `build:list` o `credentials`.
- Esos se corren directo con `npx eas-cli ...` cuando los necesites.

### Perfiles actuales

- `apk`: build interna Android en formato APK
- `production`: build Android en formato AAB

Ambos perfiles usan hoy:

```text
EXPO_PUBLIC_API_URL=https://apidev.insiderbookings.com
```

### Prerequisitos

Instalar dependencias del modulo mobile:

```bash
cd mobile
npm install
```

Loguearse en Expo / EAS:

```bash
npx eas-cli login
```

Ver proyecto configurado:

```bash
cd mobile
npx eas-cli project:info
```

El proyecto ya tiene asociado este `projectId` en `mobile/app.json`:

```text
5ec6a3d8-a9be-41ea-9dde-c02aff4e0a72
```

### Builds definidos en scripts

Generar APK interna:

```bash
cd mobile
npm run build:apk
```

Generar Android production bundle:

```bash
cd mobile
npm run build:android
```

### Builds EAS utiles por consola

Lanzar build Android con perfil `apk`:

```bash
cd mobile
npx eas-cli build -p android --profile apk
```

Lanzar build Android con perfil `production`:

```bash
cd mobile
npx eas-cli build -p android --profile production
```

Listar builds:

```bash
cd mobile
npx eas-cli build:list
```

Ver un build puntual:

```bash
cd mobile
npx eas-cli build:view
```

Descargar o seguir logs desde la web:

```bash
cd mobile
npx eas-cli build:list
```

Despues elegis el `build id` en Expo.

### Comandos EAS recomendados para chequeo

Validar configuracion:

```bash
cd mobile
npx eas-cli config
```

Ver quien esta logueado:

```bash
npx eas-cli whoami
```

Reconfigurar credenciales si hace falta:

```bash
cd mobile
npx eas-cli credentials
```

### Publicacion y submit

Si mas adelante quieren enviar el AAB a tienda, el flujo tipico es:

```bash
cd mobile
npx eas-cli submit -p android --latest
```

O indicando perfil/build puntual segun necesidad.

### Cosas a tener en cuenta

- Hoy `mobile/eas.json` solo define builds para Android.
- No hay perfil iOS configurado en `mobile/eas.json`.
- El perfil `apk` usa `distribution: internal` y `android.buildType: apk`.
- El perfil `production` usa `android.buildType: app-bundle`, que sirve para Play Store.
- Si cambia la API por entorno, hay que actualizar `EXPO_PUBLIC_API_URL` en `mobile/eas.json` o moverlo a secrets/envs de EAS.

## Partners Web

Levantar en desarrollo:

```bash
cd partners-web
npm run dev
```

Build de produccion:

```bash
cd partners-web
npm run build
```

Preview local del build:

```bash
cd partners-web
npm run preview
```

Lint:

```bash
cd partners-web
npm run lint
```

Tests:

```bash
cd partners-web
npm test
```

Tests en watch:

```bash
cd partners-web
npm run test:watch
```

Notas:

- En dev, Vite proxya `/api` y `/uploads` a `http://127.0.0.1:3000` por default.
- El panel usa `VITE_API_URL` para definir el origen del backend; si no esta seteado, cae en `https://apidev.insiderbookings.com`.

## Comandos cortos mas usados

```bash
# backend
cd backend && npm run dev

# mobile
cd mobile && npm start
cd mobile && npm run build:apk
cd mobile && npm run build:android

# partners web
cd partners-web && npm run dev
cd partners-web && npm run build
```
