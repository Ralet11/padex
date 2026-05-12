# Competitive Season Scripts

Esta guia resume como inicializar y operar temporadas competitivas desde `backend`.

## Scripts disponibles

Los comandos estan definidos en `backend/package.json`.

Comandos:

```bash
npm run backfill:competitive-foundation
npm run season:create -- [opciones]
npm run season:finalize -- [opciones]
npm run season:rollover -- [opciones]
```

Archivos principales:

- `src/scripts/backfillCompetitiveFoundation.js`
- `src/scripts/createCompetitiveSeason.js`
- `src/scripts/finalizeCompetitiveSeason.js`
- `src/scripts/rolloverCompetitiveSeason.js`
- `src/services/competitive/seasonLifecycle.js`

## Cuándo usar cada uno

`backfill:competitive-foundation`

- Usalo una sola vez cuando el entorno todavia no tiene liga, season ni standings competitivos.
- Crea la fundacion competitiva minima y rellena snapshots legacy.

`season:create`

- Crea una nueva season.
- Puede arrancar en `pending` o `active`.
- Puede sembrar standings desde los players actuales.

`season:finalize`

- Cierra una season existente.
- Tambien puede cerrar la season activa de una liga si usas `--use-active`.

`season:rollover`

- Cierra la season actual y crea la siguiente en un solo paso.
- Es el comando recomendado para el cambio normal entre temporadas.

## Flujo inicial en producción

Si en producción hoy no existe ninguna season:

1. Deployar el backend con estos cambios.
2. Verificar que el `.env` del server apunte a la base correcta.
3. Ejecutar:

```bash
npm run backfill:competitive-foundation
```

Eso deja:

- una liga competitiva base
- una season activa
- `competitive_standings` poblada
- `league_id` y `season_id` asignados en users
- snapshot competitivo alineado con los datos legacy

Despues de ese bootstrap inicial ya podes operar con `season:create`, `season:finalize` y `season:rollover`.

## Recomendación operativa

Antes de tocar producción:

1. Ejecutar siempre con `--dry-run`.
2. Revisar el JSON de salida.
3. Repetir sin `--dry-run` cuando el resultado sea el esperado.

## Crear una season

Ejemplo:

```bash
npm run season:create -- \
  --league-key padex-default-league \
  --key apertura-2027 \
  --name "Apertura 2027" \
  --status active \
  --seed-players true \
  --seed-mode carry-over \
  --dry-run
```

Flags mas usados:

- `--league-id <id>`
- `--league-key <key>`
- `--key <season-key>`
- `--name <season-name>`
- `--status <pending|active>`
- `--starts-at <iso-date>`
- `--ends-at <iso-date>`
- `--seed-players <true|false>`
- `--seed-mode <carry-over|reset>`
- `--finalize-current-active`
- `--finalize-ends-at <iso-date>`
- `--dry-run`

Notas:

- `--seed-players true` crea standings para los players de esa liga.
- `--seed-mode carry-over` arrastra snapshot competitivo actual.
- `--seed-mode reset` reinicia puntos, rating, wins y losses para la nueva season.
- Si vas a abrir una season `active` nueva mientras ya hay otra activa, conviene usar `--finalize-current-active`.

## Finalizar una season

Cerrar una season concreta:

```bash
npm run season:finalize -- \
  --season-key apertura-2027 \
  --dry-run
```

Cerrar la season activa de una liga:

```bash
npm run season:finalize -- \
  --league-key padex-default-league \
  --use-active \
  --dry-run
```

Flags mas usados:

- `--season-id <id>`
- `--season-key <key>`
- `--league-id <id>`
- `--league-key <key>`
- `--use-active`
- `--ends-at <iso-date>`
- `--final-status <completed|archived>`
- `--dry-run`

## Rollover de temporada

Es el flujo normal para pasar de una season a la siguiente.

Ejemplo:

```bash
npm run season:rollover -- \
  --league-key padex-default-league \
  --next-key clausura-2027 \
  --next-name "Clausura 2027" \
  --seed-mode carry-over \
  --dry-run
```

Flags mas usados:

- `--league-id <id>`
- `--league-key <key>`
- `--current-season-id <id>`
- `--current-season-key <key>`
- `--next-key <season-key>`
- `--next-name <season-name>`
- `--next-status <pending|active>`
- `--starts-at <iso-date>`
- `--ends-at <iso-date>`
- `--finalize-ends-at <iso-date>`
- `--seed-mode <carry-over|reset>`
- `--dry-run`

Qué hace:

1. Cierra la season actual.
2. Crea la nueva season.
3. Siembra standings para los players.
4. Recalcula ranking dentro de cada tier.
5. Sincroniza el snapshot competitivo actual del user cuando corresponde.

## Seed mode

`carry-over`

- Arrastra a la nueva season el snapshot actual del player.
- Conserva puntos, tier, rating, wins y losses.
- Es la opción mas segura si todavia no definieron reglas de reset fuertes.

`reset`

- Deja la nueva season en cero para los players.
- Conserva tier/categoria base como referencia.
- Reinicia puntos, rating, wins, losses y matches jugados del snapshot competitivo actual.

## Salidas esperadas

Los scripts imprimen JSON.

Campos comunes:

- `league`
- `season`
- `previous_season`
- `next_season`
- `seed_summary`
- `ranking_summary`
- `dry_run`

## Buenas prácticas para prod

- Ejecutar desde el directorio `backend/`.
- Confirmar el `.env` antes de correr cualquier script.
- Hacer `--dry-run` primero.
- Guardar el JSON de salida del comando real en el ticket o changelog operativo.
- Evitar abrir dos seasons `active` a la vez en la misma liga.
- Si no estas seguro de la liga objetivo, usar `--league-key` explicitamente.

## Ejemplos recomendados

Bootstrap inicial:

```bash
npm run backfill:competitive-foundation
```

Crear la proxima season pero dejarla pendiente:

```bash
npm run season:create -- \
  --league-key padex-default-league \
  --key apertura-2028 \
  --name "Apertura 2028" \
  --status pending \
  --seed-players false \
  --dry-run
```

Cerrar la actual y abrir la siguiente con arrastre:

```bash
npm run season:rollover -- \
  --league-key padex-default-league \
  --next-key clausura-2028 \
  --next-name "Clausura 2028" \
  --seed-mode carry-over \
  --dry-run
```

Cerrar la actual y abrir la siguiente con reset:

```bash
npm run season:rollover -- \
  --league-key padex-default-league \
  --next-key clausura-2028 \
  --next-name "Clausura 2028" \
  --seed-mode reset \
  --dry-run
```
