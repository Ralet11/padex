# Dev Match Scripts

Estos scripts sirven para limpiar partidos de desarrollo y recrear una tanda nueva de partidos demo sin tocar historial competitivo completado.

## Scripts disponibles

- `npm run dev:matches:clear -- --dry-run`
  Simula que partidos borraria.
- `npm run dev:matches:clear -- --yes`
  Borra partidos no completados.
- `npm run dev:matches:clear -- --scope demo --yes`
  Borra solo partidos demo cuyo titulo empieza con `Demo Match`.
- `npm run dev:matches:create`
  Asegura venues demo, players demo y completa partidos demo abiertos hasta el target por default.
- `npm run dev:matches:create -- --count 12`
  Ajusta el total objetivo de partidos demo abiertos.
- `npm run dev:matches:create -- --count 12 --payment-required true`
  Genera partidos demo aptos para probar `join-payment-intent`.
- `npm run dev:matches:reset -- --dry-run`
  Simula limpieza y recreacion en un solo paso.
- `npm run dev:matches:reset -- --yes`
  Limpia partidos no completados y recrea la tanda demo.
- `npm run dev:matches:reset -- --scope demo --count 12 --payment-required true --yes`
  Limpia demo matches y recrea una tanda nueva con pagos habilitados.

## Alcances de borrado

- `--scope non-completed`
  Default. Borra partidos `draft`, `open`, `reserved`, `in_progress` y `cancelled`.
- `--scope demo`
  Borra partidos demo no completados cuyo titulo arranca con `Demo Match`. Se puede cambiar el prefijo con `--title-prefix`.

## Que limpia exactamente

Cuando un partido entra en el borrado, el script elimina tambien:

- `match_payments`
- `calibration_votes`
- `reputation_ratings`
- `ratings`
- `competitive_results`
- `match_players`

Despues intenta liberar el `slot` asociado si quedo retenido por la app.

## Notas

- `clear` y `reset` exigen `--yes` para correr de verdad. Sin eso, usa `--dry-run`.
- Los scripts se frenan si `NODE_ENV=production`.
- No borran partidos completados a proposito, para no desalinear standings, reputacion e historial competitivo.
- `--payment-required true` sirve para probar el pago al unirse a un partido. No reemplaza el flujo real de pago del creador al crear el partido desde la app.
