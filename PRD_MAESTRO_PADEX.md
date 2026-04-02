# PRD Maestro — PADEX

## 1. Resumen ejecutivo

PADEX es una plataforma integral para el ecosistema del pádel que conecta dos mundos que normalmente operan separados: **jugadores** que buscan partidos compatibles y **sedes/partners** que necesitan administrar su disponibilidad, maximizar ocupación y digitalizar su operación.

El producto se compone hoy de tres superficies principales:

- **App mobile para jugadores**: descubrimiento de partidos, creación de partidos, uniones, perfil deportivo, social, chat y ranking.
- **Backend central**: orquesta autenticación, disponibilidad, reservas, partidos, rating, leaderboard, social y tiempo real.
- **Partners Web**: onboarding de sedes, gestión de canchas, agenda, bloqueos, excepciones, cierres y ocupación operativa.

La tesis del producto es simple y poderosa: **si una sede publica oferta real y los jugadores pueden coordinarse con fricción mínima, PADEX transforma tiempo ocioso en partidos jugados, relaciones sociales y progresión competitiva**.

---

## 2. Visión del producto

Convertir a PADEX en el sistema operativo del pádel amateur y competitivo de LATAM, resolviendo en una misma plataforma:

1. **Con quién jugar**
2. **Dónde jugar**
3. **Cuándo jugar**
4. **Cómo progresar**
5. **Cómo operan las sedes**

---

## 3. Problema que resuelve

### 3.1 Problemas del jugador

- No siempre tiene grupo cerrado para jugar.
- Le cuesta encontrar partidos compatibles con su nivel.
- No sabe qué sedes tienen disponibilidad real.
- Coordinar por WhatsApp fragmenta la experiencia.
- No tiene una identidad deportiva estructurada ni progreso claro.

### 3.2 Problemas de la sede/partner

- La agenda suele estar distribuida entre planillas, WhatsApp y memoria operativa.
- Hay baja visibilidad de turnos ociosos.
- La reserva externa y la digital no siempre conviven bien.
- Es costoso comunicar disponibilidad real en tiempo y forma.
- Falta una relación directa con la comunidad de jugadores.

### 3.3 Problema sistémico

El mercado tiene herramientas aisladas: agenda por un lado, chat por otro, comunidad por otro, ranking por otro. PADEX unifica todo en una única capa transaccional y social.

---

## 4. Oportunidad

PADEX no es solo una app de “armar partidos”. Es una plataforma de doble cara:

- **Demanda**: jugadores que quieren jugar más y mejor.
- **Oferta**: sedes que quieren vender mejor su inventario horario.

Ese acople genera un flywheel fuerte:

1. Más sedes → más disponibilidad real.
2. Más disponibilidad → más partidos creados.
3. Más partidos → más jugadores activos.
4. Más actividad → mejor ranking, más social, más retención.
5. Más retención → más valor para sedes y partners.

---

## 5. Objetivos del producto

### 5.1 Objetivos de negocio

- Incrementar la ocupación de turnos de sedes adheridas.
- Convertir a PADEX en el canal principal de adquisición y retención de jugadores.
- Crear una red defensible basada en identidad deportiva, contactos y reputación.
- Habilitar monetización futura por comisión, suscripción partner, features premium o sponsorships.

### 5.2 Objetivos de usuario

- Encontrar partido compatible en menos de 2 minutos.
- Crear un partido en menos de 90 segundos.
- Poder reservar sobre disponibilidad confiable.
- Construir reputación y progreso competitivo visibles.
- Coordinar sin salir del ecosistema PADEX.

### 5.3 Objetivos operativos para partners

- Gestionar disponibilidad sin dependencia técnica.
- Bloquear/agregar agenda con granularidad real.
- Reflejar reservas externas sin romper consistencia.
- Tener lectura diaria de ocupación y próximos libres.

---

## 6. Alcance del producto

## 6.1 Dominios funcionales principales

1. **Autenticación y onboarding**
2. **Perfil deportivo y social**
3. **Exploración y creación de partidos**
4. **Disponibilidad de sedes, canchas y turnos**
5. **Reserva operativa y conciliación con agenda partner**
6. **Mensajería y conexiones**
7. **Ratings, estrellas, categorías y leaderboard**
8. **Administración partner y operación de sede**
9. **Administración interna / backoffice básico**

## 6.2 Superficies del sistema

### A. App Mobile (jugadores)

- Registro/login
- Home de partidos abiertos
- Crear partido
- Unirse / salir / ver detalle
- Social: búsqueda y conexiones
- Chat en tiempo real
- Perfil propio y perfiles de terceros
- Leaderboard / progreso competitivo

### B. Partners Web

- Login partner/admin
- Onboarding de sede
- Dashboard operativo
- Gestión de canchas
- Reglas de disponibilidad
- Excepciones y cierres
- Ocupación manual de slots
- Edición de datos de sede

### C. Backend Platform

- API REST
- Autenticación JWT
- Realtime con Socket.IO
- Modelado operacional de slots
- Lógica de partidos
- Lógica de ranking/estrellas
- Integraciones de disponibilidad externas (base ya iniciada)

---

## 7. Usuarios y personas

### 7.1 Jugador social

Quiere jugar con frecuencia, no siempre tiene grupo armado y prioriza rapidez para sumarse a partidos disponibles.

**Necesidades**:
- descubrir partidos abiertos
- saber si el nivel es compatible
- tener confianza en sede/horario

### 7.2 Jugador competitivo

Quiere progresar de categoría, cuidar reputación y jugar con pares de nivel similar.

**Necesidades**:
- ranking confiable
- historial
- rating post-partido
- filtros por nivel

### 7.3 Organizador natural

Es el jugador que suele mover grupos y crear partidos.

**Necesidades**:
- flujo de creación ultra simple
- confirmación rápida de disponibilidad
- visibilidad del estado del partido

### 7.4 Manager/Partner de sede

Administra una o varias canchas, necesita precisión operativa y control de agenda.

**Necesidades**:
- cargar disponibilidad
- bloquear canchas
- reflejar reservas externas
- entender ocupación diaria

### 7.5 Administrador PADEX

Da de alta partners, supervisa adopción y mantiene orden operativo.

---

## 8. Propuesta de valor

### Para jugadores

“Encontrá partido, sede y gente para jugar sin depender de grupos cerrados.”

### Para sedes

“Transformá disponibilidad operativa en demanda real, sin perder control de tu agenda.”

### Para el ecosistema

“Una capa única de coordinación, reserva, identidad deportiva y progresión competitiva.”

---

## 9. Estado actual observado en el producto

### 9.1 Capacidades ya implementadas con buen nivel

- App mobile con navegación por dominios clave.
- Creación de partido basada en sede + fecha + turno + reglas deportivas.
- Publicación de partidos abiertos en home.
- Unión y salida de partidos.
- Sistema social de búsqueda, solicitudes y contactos.
- Chat en tiempo real entre conexiones aceptadas.
- Perfil editable con avatar, bio y datos deportivos.
- Leaderboard por categoría tier.
- Partners Web con agenda, reglas, excepciones, cierres y ocupación manual.
- Backend centralizado que conecta demanda y oferta.

### 9.2 Capacidades parciales o conceptualmente incompletas

- Narrativa de ligas/temporadas presente, pero sin dominio formal persistido.
- Modelo de notificaciones persistentes existente, pero no expuesto como producto completo.
- Integraciones externas de agenda previstas, pero no totalmente cerradas.
- Administración interna existente, aunque todavía básica.

### 9.3 Inconsistencias detectadas a resolver

- Desalineaciones entre onboarding de categoría y modelo real de tiers.
- Validaciones de categoría en partidos dependientes de datos no presentes en JWT.
- Flujo de finalización de partido desalineado entre frontend y backend.
- Campos inconsistentes entre algunas respuestas de backend y pantallas mobile.
- Documentación técnica histórica desactualizada respecto al stack actual.

Esto es CLAVE: el producto tiene una base muy buena, pero necesita consolidación semántica. Y esto, hermano, es FUNDAMENTAL. Si el lenguaje de negocio no está alineado entre app, backend y operación, el producto crece torcido.

---

## 10. Principios de producto

1. **Disponibilidad confiable por encima de la promesa de disponibilidad**.
2. **Compatibilidad deportiva antes que volumen bruto**.
3. **Operación simple para partners, no ERP complejo disfrazado**.
4. **La experiencia social debe reducir dependencia de canales externos**.
5. **El progreso competitivo debe ser entendible, visible y justo**.
6. **Toda reserva debe tener una única fuente de verdad operacional**.

---

## 11. Experiencia core end-to-end

## 11.1 Flujo A — Crear partido

### Objetivo
Permitir que un jugador publique un partido compatible sobre oferta horaria real.

### Pasos
1. El jugador entra a “Crear”.
2. Explora sedes disponibles con filtros.
3. Elige una sede.
4. Selecciona fecha y turno libre.
5. Define detalles: descripción, cantidad de jugadores, restricciones de nivel.
6. Publica el partido.
7. El partido aparece en Home para otros jugadores.

### Resultado esperado
- Partido visible.
- Slot asociado.
- Consistencia entre disponibilidad y publicación.

## 11.2 Flujo B — Unirse a partido

### Objetivo
Permitir que otro jugador descubra el partido y se sume con fricción mínima.

### Pasos
1. Explora partidos abiertos.
2. Revisa sede, hora, nivel, organizador y cupos.
3. Se une.
4. Si el partido alcanza el umbral requerido, el slot se consolida operativamente.

### Resultado esperado
- Cupo actualizado.
- Estado del partido actualizado.
- Agenda partner consistente.

## 11.3 Flujo C — Operación partner

### Objetivo
Permitir que la sede administre oferta real y excepciones del día a día.

### Pasos
1. Partner inicia sesión.
2. Configura sede y canchas.
3. Define reglas semanales de disponibilidad.
4. Aplica excepciones o cierres cuando corresponde.
5. Marca ocupaciones manuales externas.
6. Visualiza resumen operativo.

### Resultado esperado
- Slots materializados correctamente.
- Oferta visible para jugadores.
- Menor riesgo de doble reserva.

## 11.4 Flujo D — Social y retención

### Objetivo
Convertir un partido jugado en relación persistente y actividad recurrente.

### Pasos
1. Jugadores se conocen en partido o se buscan en la red.
2. Envían/aceptan conexión.
3. Chatean por PADEX.
4. Se califican tras el partido.
5. Evolucionan en stars/categoría.
6. Vuelven a usar la plataforma.

---

## 12. Requerimientos funcionales maestros

## 12.1 Autenticación y acceso

- Registro de jugador con datos deportivos iniciales.
- Login de jugador, partner y admin.
- Persistencia de sesión.
- Recuperación/actualización de identidad básica.

## 12.2 Perfil deportivo

- Avatar y bio.
- Posición, marca de paleta, compañero preferido.
- Historial y métricas deportivas.
- Visualización de nivel/categoría actual.

## 12.3 Descubrimiento de partidos

- Feed de partidos abiertos.
- Filtros por categoría, sede, horario u otros criterios relevantes.
- Acceso a detalle del partido.

## 12.4 Creación y gestión de partido

- Selección de sede.
- Selección de fecha/turno.
- Restricciones de nivel.
- Min/max jugadores.
- Visibilidad inmediata en el ecosistema.
- Salir del partido.
- Finalizar partido con resultados.

## 12.5 Sedes, canchas y disponibilidad

- Gestión de sede y assets.
- Gestión de canchas.
- Reglas semanales.
- Excepciones por fecha.
- Cierres por cancha.
- Materialización de slots.
- Ocupación manual por reservas externas.

## 12.6 Social

- Búsqueda de jugadores.
- Solicitudes de conexión.
- Aceptación/rechazo.
- Lista de contactos.

## 12.7 Mensajería

- Conversaciones por conexión.
- Mensajes persistidos.
- Tiempo real.
- Indicador de typing.
- Lectura/no leídos.

## 12.8 Sistema competitivo

- Estrellas/score de progreso.
- Categorías/tier.
- Rating post-partido.
- Leaderboard por nivel.
- Reglas transparentes de progresión.

## 12.9 Administración partner/admin

- Alta de partner.
- Gestión de credenciales y rol.
- Vista operativa de sedes.
- Administración básica centralizada.

---

## 13. Requerimientos no funcionales

### 13.1 Consistencia operacional

- Un slot no puede presentarse como disponible si está reservado o bloqueado.
- Cambios partner deben reflejarse rápido en experiencia jugador.

### 13.2 Performance

- Home de partidos y exploración de sedes deben responder con latencia baja.
- Carga de agenda debe priorizar ventanas de uso reales (próximos días/semanas).

### 13.3 Escalabilidad

- Modelo debe soportar múltiples sedes y múltiples canchas por sede.
- Debe poder crecer a más ciudades/zonas sin rediseño conceptual.

### 13.4 Confiabilidad

- Realtime no puede ser requisito exclusivo para consistencia; debe complementar al modelo persistente.
- Deben existir reglas de fallback ante desconexiones o slots stale.

### 13.5 Seguridad

- JWT y roles bien definidos.
- Protección de uploads.
- Sanitización de respuestas sensibles.
- Control estricto de permisos partner/admin.

### 13.6 Observabilidad

- Logs claros en reserva, join, occupy, cierre y rating.
- Trazabilidad de conflictos de agenda.

---

## 14. Modelo de negocio potencial

### Opción A — Suscripción partner

Las sedes pagan por usar el panel operativo y acceder a demanda.

**Ventajas**: ingresos predecibles.  
**Tradeoff**: fricción inicial de adopción.

### Opción B — Comisión por reserva/turno concretado

PADEX cobra cuando el slot se ocupa a través del ecosistema.

**Ventajas**: alineado al valor real.  
**Tradeoff**: requiere trazabilidad impecable.

### Opción C — Freemium híbrido

- base free para sedes
- premium para analytics, CRM, campañas, integraciones y automatizaciones

**Ventajas**: baja barrera de entrada.  
**Tradeoff**: mayor complejidad comercial.

---

## 15. KPIs principales

## 15.1 Jugadores

- MAU / WAU
- partidos creados por semana
- ratio join por partido publicado
- tiempo medio hasta encontrar partido
- conexiones creadas por usuario
- mensajes por conversación
- retención D7 / D30

## 15.2 Competencia / progreso

- ratings emitidos por partido completado
- porcentaje de usuarios con progresión de tier
- consultas a leaderboard

## 15.3 Partners

- sedes activas por semana
- canchas configuradas por sede
- slots publicados
- ocupación total / libre / bloqueada
- porcentaje de ocupación originada en PADEX
- reservas externas conciliadas manualmente

## 15.4 Marketplace

- ratio oferta vs demanda por zona/horario
- fill rate de partidos
- fill rate de slots
- cancelaciones / conflictos de agenda

---

## 16. Roadmap recomendado

## Fase 1 — Consolidación del core actual

Objetivo: estabilizar la plataforma existente.

### Prioridades
- unificar lenguaje de categorías/tier en todo el sistema
- cerrar inconsistencias app ↔ backend
- robustecer finalización de partido y rating post-match
- endurecer permisos y sanitización de respuestas
- actualizar documentación viva del sistema

## Fase 2 — Producto competitivo sólido

Objetivo: transformar ranking en motor de hábito.

### Prioridades
- historial completo de performance
- progresión más explicable
- badge/reputación/logros
- seasonal leaderboard real
- calibración de nivel guiada

## Fase 3 — Operación partner avanzada

Objetivo: que Partners Web sea una herramienta operativa diaria indispensable.

### Prioridades
- CRM de clientes real
- analytics por franja/cancha
- automatización de ocupación y cancelación
- integraciones externas completas
- multi-sede / multi-manager

## Fase 4 — Escala y monetización

Objetivo: capturar valor de red.

### Prioridades
- pricing plan partner
- campañas/promos
- referidos
- features premium jugador
- expansión geográfica

---

## 17. Riesgos y mitigaciones

### Riesgo 1 — Inconsistencia entre agenda y reserva

Si la fuente de verdad no está clarísima, se destruye la confianza del usuario.

**Mitigación**: contrato único de slot + auditoría de cambios + reconciliación operativa.

### Riesgo 2 — Ranking percibido como injusto

Si el sistema competitivo no se entiende, no retiene: irrita.

**Mitigación**: reglas explícitas, feedback claro y mecánicas transparentes.

### Riesgo 3 — Partner no adopta el panel

Si el panel agrega trabajo en vez de sacarlo, fracasa.

**Mitigación**: enfoque operativo minimalista, automatizaciones y valor visible diario.

### Riesgo 4 — Social sin masa crítica

Sin liquidez de usuarios, la capa social se enfría.

**Mitigación**: foco en loops post-partido, invitaciones, conexiones y chat contextual.

### Riesgo 5 — Prometer demasiadas features antes de consolidar el core

Acá te hablo como arquitecto: si el core no está firme, agregar capas “lindas” arriba es una locura cósmica.

**Mitigación**: primero consistencia de dominio, luego expansión funcional.

---

## 18. Decisiones estratégicas recomendadas

### 18.1 Formalizar el lenguaje de dominio

Definir de forma unívoca:

- qué es una categoría
- qué es un tier
- qué es una liga
- qué es una temporada
- qué es un partido abierto vs reservado vs completado

Sin eso, el producto dice una cosa en UX y otra en backend.

### 18.2 Elegir una fuente de verdad operativa

El slot debe ser la unidad operativa central para disponibilidad y reserva.

### 18.3 Diferenciar claramente “producto actual” de “visión objetivo”

Hay features presentes en narrativa pero no cerradas como dominio real. Eso no está mal, pero hay que documentarlo con honestidad profesional.

### 18.4 Priorizar confiabilidad antes que amplitud

Un marketplace deportivo vive o muere por confianza. Si la gente no confía en el horario, el nivel o la reserva, no vuelve.

---

## 19. Backlog estratégico priorizado

### P0 — Crítico

- Alinear categorías/tier entre onboarding, backend y UI.
- Corregir validaciones de nivel en partidos.
- Cerrar flujo de completar partido + resultados + ratings.
- Revisar exposición de datos sensibles en endpoints admin/partner.
- Actualizar documentación funcional/técnica oficial.

### P1 — Alto impacto

- Centro de notificaciones real.
- Historial competitivo más rico.
- Seasonal ladders/líderes por temporada.
- CRM partner persistido.
- métricas operativas más profundas.

### P2 — Expansión

- Integraciones API/iCal completas.
- multi-sede
- campañas y promos
- referidos
- monetización premium

---

## 20. Definición de éxito

PADEX será exitoso cuando logre simultáneamente:

1. Que un jugador pueda pasar de “quiero jugar” a “ya tengo partido” en minutos.
2. Que una sede vea su agenda reflejada y ocupada sin perder control.
3. Que el progreso competitivo genere hábito y pertenencia.
4. Que la relación entre jugadores continúe después del partido.
5. Que el sistema sea confiable al punto de reemplazar coordinación manual fragmentada.

---

## 21. Anexo — Mapa maestro del producto

### Núcleo Jugador
- identidad
- perfil deportivo
- descubrimiento
- creación de partido
- unión a partido
- chat
- conexiones
- progreso competitivo

### Núcleo Partner
- onboarding de sede
- agenda
- canchas
- cierres
- excepciones
- ocupación manual
- lectura operativa

### Núcleo Plataforma
- auth
- roles
- slots
- partidos
- ratings
- leaderboard
- realtime
- integraciones

---

## 22. Cierre

PADEX tiene algo que MUCHOS productos no logran: una tesis de plataforma real, no una suma de pantallas sueltas.

La oportunidad está clarísima. Ahora bien: el próximo salto de calidad no depende de sumar features por ansiedad. Depende de consolidar semántica, confiabilidad operativa y claridad competitiva.

En otras palabras: los cimientos ya están. Ahora hay que hacer arquitectura de verdad arriba de eso. Y es ahí donde un producto pasa de “prometedor” a “serio”.
