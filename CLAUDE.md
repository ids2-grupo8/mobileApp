# Bazaar — Mobile App

Marketplace donde cualquier usuario puede comprar y vender. La misma cuenta permite ambos roles sin fricción.

## Stack

- **Framework**: React Native con Expo (managed workflow)
- **Lenguaje**: TypeScript
- **Navegación**: React Navigation (bottom tabs + stack)
- **Estado global**: Zustand (sesión, carrito, preferencias)
- **Estado servidor**: TanStack Query (productos, órdenes — manejo de caché, reintentos, loading/error states)
- **Pagos**: Stripe SDK (sandbox) o MercadoPago — se debe usar gateway real en modo test, no mock interno

## Arquitectura general

La app mobile es uno de los componentes del sistema. Se comunica **exclusivamente** a través del API Gateway (punto único de entrada). No llama directamente a servicios backend.

```
Mobile App → API Gateway → Servicios backend (users, catalog, orders, payments, etc.)
```

## Funcionalidades (épicas)

### Obligatorias
- **Usuarios**: registro, login email/password, recupero de contraseña
- **Perfil**: edición y visualización del perfil propio
- **Catálogo**: home con productos recientes, listado/búsqueda, detalle de producto
- **Carrito**: agregar productos, gestión (modificar cantidades, eliminar)
- **Checkout y Órdenes**: flujo de pago, seguimiento de estado, historial de compras
- **Vendedor**: publicar producto, gestión de stock/publicaciones, historial de ventas
- **Administración**: NO va en mobile — es exclusiva del backoffice web

### Optativas (a definir con el corrector)
- Login con proveedor federado (Google)
- Registro con PIN (ligado al dispositivo)
- Perfil público de otros usuarios
- Compartir link de producto (deep link)
- Productos populares en home
- Filtros avanzados y ordenamiento en catálogo
- Wishlist
- Reviews (calificar producto y vendedor)
- Cupones de descuento en checkout
- Cancelar orden y reembolso simulado
- Notificaciones push (FCM) — cambio de estado de orden, stock bajo
- Recomendaciones basadas en historial

## Estados de una orden

```
pendiente de pago → confirmada → en preparación → enviada → entregada
```
Excepciones: `pago rechazado`, `cancelada`, `reembolso en proceso`, `reembolso procesado`

Las transiciones son unidireccionales. El modelo de datos debe contemplar todos los estados aunque no se implementen todas las transiciones en la UI.

## Reglas de negocio críticas

- **Concurrencia en checkout**: si dos usuarios compran el último item simultáneamente, solo uno completa la compra. El otro recibe error sin cobro.
- **Idempotencia de pago**: un reintento no debe generar dos cobros. Usar idempotency key.
- **Stock**: nunca puede quedar negativo. Al llegar a 0, el producto desaparece del catálogo automáticamente.
- **Carrito persiste** entre sesiones.
- **Sesión expirada**: redirigir al login conservando la acción pendiente cuando sea posible.
- **Usuario bloqueado**: mostrar mensaje claro de cuenta suspendida, no error genérico.
- **Productos sin stock o deshabilitados**: no aparecen en catálogo ni búsqueda.

## Autenticación

- JWT con tiempo de expiración configurable. Incluye user ID y rol.
- Soporte de refresh token sin re-autenticación.
- Contraseña: mínimo 8 caracteres, al menos una mayúscula, minúscula y número.
- PIN (si se implementa): mínimo 6 dígitos, ligado al dispositivo, bloqueo tras intentos fallidos.
- Nunca exponer en logs ni respuestas de error: passwords, tokens internos, datos privados de otros usuarios.

## Sistema de diseño

La app mobile debe mantener la misma estética que el backoffice (`../backoffice`). Todas las decisiones visuales se derivan de esa referencia.

### Paleta de colores

| Token            | Valor                        | Uso |
|------------------|------------------------------|-----|
| `base`           | `#0B0B0F`                    | Fondo principal |
| `elevated`       | `#141418`                    | Fondo de surfaces elevadas |
| `card`           | `rgba(255,255,255,0.04)`     | Fondo de cards |
| `accent`         | `#C5F135`                    | Verde lima — CTAs, activo, highlight |
| `accent-dim`     | `#9FBF28`                    | Acento presionado / hover |
| `border`         | `rgba(255,255,255,0.07)`     | Bordes sutiles |
| `text-primary`   | `#FFFFFF`                    | Texto principal |
| `text-secondary` | `#8B8FA8`                    | Texto secundario / labels |
| `text-muted`     | `#555870`                    | Texto deshabilitado / placeholder |
| `badge-red`      | bg `rgba(239,68,68,0.14)` / text `#F87171` | Estados de error |

### Tipografía

- **Sans**: Fira Sans (weights: 300, 400, 500, 600, 700) — texto general
- **Mono**: Fira Code (weights: 400, 500, 600, 700) — códigos, IDs, datos técnicos

### Estilo de cards ("liquid glass")

Las cards usan un efecto glass con capas:
1. Fondo semitransparente oscuro
2. Borde con opacidad baja
3. `blur` + `saturate` via `backdrop-filter` (en RN: usar `@react-native-community/blur` o equivalente)
4. Sombra superior interna (rim de refracción) + sombra exterior de elevación
5. Textura de ruido sutil (grain overlay)

Border radius de cards: `16px`.

### Badges / estados

- **Accent** (positivo/activo): fondo `rgba(197,241,53,0.12)`, texto `#C5F135`
- **Red** (error/bloqueado): fondo `rgba(239,68,68,0.12)`, texto `#F87171`
- **Muted** (neutral/inactivo): fondo `rgba(255,255,255,0.06)`, texto `#555870`

### Nav / tabs activo

Item activo: fondo `rgba(197,241,53,0.1)`, texto e ícono en `#C5F135`.

### UX general

- Accesibilidad básica: contraste de color legible, tamaños de texto adecuados para mobile.
- Wireframes/mockups requeridos antes de codificar los flujos principales (Figma o equivalente).
- La app debe manejar explícitamente:
  - Estados de carga (loading indicators)
  - Errores de red con mensajes accionables
  - Comportamiento coherente ante timeouts del backend (no dejar UI en estado inconsistente)

## Media

- Imágenes de perfil: JPEG, PNG, WebP — hasta 5 MB
- Imágenes de producto: JPEG, PNG, WebP — hasta 10 MB por archivo
- Los archivos se almacenan en servicio externo (S3, GCS, Cloudinary o equivalente). Solo se persiste la URL.
- Rechazar otros formatos con error descriptivo.

## Notificaciones push

- Usar Firebase Cloud Messaging (FCM).
- El backend emite el mensaje a FCM; FCM lo entrega al dispositivo.
- La notificación debe abrir directamente el detalle de la orden correspondiente (deep link).

## Checkpoints

| Checkpoint | Fecha      | Foco en mobile |
|------------|------------|----------------|
| CP0        | 27/03/2026 | Setup, estructura del repo |
| CP1        | 17/04/2026 | CI/CD, al menos un CRUD funcional, wireframes/mockups presentados |
| CP2        | 12/05/2026 | Todos los CRUDs básicos al 100%, 70% historias requeridas |
| CP3        | 05/06/2026 | 100% historias requeridas, 80% historias optativas |
| Entrega    | 26/06/2026 | Demo funcional completa |

## Convenciones de desarrollo

- Cada PR debe referenciar la historia de usuario que implementa.
- No mezclar features no relacionadas en un mismo PR.
- Commits descriptivos (no "fix", "changes", "wip").
- Secretos y credenciales nunca en el código fuente ni en el historial de Git — usar variables de entorno.
