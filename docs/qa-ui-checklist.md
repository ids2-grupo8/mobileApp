# QA UI — Checklist manual

Pasos para validar visualmente las pantallas en **modo claro** y **modo oscuro**. Cambiar de modo desde *Perfil → Preferencias → Tema*.

> Antes de empezar: hacer un *Reload* en Expo Go (`R`) la primera vez después de actualizar para que se cargue la font de `MaterialCommunityIcons` (bell).

---

## 1. Login (`/(auth)/login`)

- [ ] La pantalla entra completa sin necesidad de hacer scroll, en pantallas chicas (iPhone SE, Pixel 4a).
- [ ] El teclado al focusear email/contraseña no tapa el botón "Iniciar sesión".
- [ ] Tema claro: inputs y botón Google se distinguen del fondo.
- [ ] Tema oscuro: el botón "Iniciar sesión" tiene el glow verde.

## 2. Home (`/(tabs)`)

- [ ] El pill "Buscar en Bazaar" abre la pantalla *Explorar* al tocarlo.
- [ ] Notificaciones: el icono es una **campana** (no un círculo).
- [ ] Si hay no leídas, aparece el badge numérico.
- [ ] Los filtros (categoría / precio / orden) siguen funcionando.
- [ ] Botón "Limpiar filtros": en modo claro se ve rojo lleno con ícono blanco.

## 3. Explorar (`/(tabs)/explore`)

- [ ] El input de búsqueda acepta texto.
- [ ] Al apretar "search" en el teclado renderiza los resultados **en la misma pantalla** (no redirige a Home).
- [ ] Si no hay resultados, muestra "No encontramos productos…".
- [ ] Tocar una búsqueda reciente reproduce la búsqueda inline.
- [ ] Borrar el texto vuelve a la vista curada (categorías, vendedores, "Para vos").

## 4. Carrito (`/(tabs)/cart`)

- [ ] No aparece ningún botón fantasma arriba a la izquierda en modo claro.
- [ ] El botón de "vaciar carrito" sólo se ve cuando hay items.
- [ ] Empty state: ícono + título + texto + CTA, todo centrado verticalmente.

## 5. Notificaciones (`/(tabs)/notifications`)

- [ ] Header con el mismo estilo que *Tu carrito* (título centrado, subtítulo "X sin leer").
- [ ] Empty state centrado verticalmente (no pegado arriba). El ícono es una campana grande dentro de un círculo glass.
- [ ] El botón "marcar todas leídas" usa el ícono `check-all` cuando hay no leídas.
- [ ] Cada item de la lista muestra su ícono de estado (`check-circle`, `local-shipping`, etc.) y, en estados desconocidos, fallback a campana.

## 6. Perfil (`/(tabs)/profile`)

- [ ] **No** aparece la sección "Actividad → Notificaciones".
- [ ] Avatar sin foto: círculo verde sólido con iniciales **blancas**, legible en ambos modos.
- [ ] Modo claro: ninguna card se ve "doble" (card dentro de card más transparente). Cards = blanco sólido con borde gris suave.

## 7. Detalle de producto (`/product/[id]`)

- [ ] El pill de categoría se ve **legible** (fondo verde sólido, texto blanco). No es un casi-invisible borde verde.
- [ ] Tarjeta "Descripción": tap en el header colapsa/expande con chevron animado.
- [ ] Tarjeta "Especificaciones": idem.
- [ ] Avatar del vendedor (fallback con iniciales): circulo verde con iniciales blancas.

---

## Smoke test (orden sugerido, ~3 min)

1. Abrir login → confirmar que no hay scroll.
2. Login con credenciales válidas → cae en Home.
3. Tap en el pill de búsqueda → llega a Explorar.
4. Escribir "remera" → resultados inline.
5. Tap en un producto → colapsar/expandir descripción y especificaciones.
6. Volver y abrir el tab de Notificaciones → ver layout estilo carrito y campana.
7. Abrir Perfil → confirmar avatar con iniciales blancas y sin row "Notificaciones".
8. Cambiar a *Tema → Claro* y repetir steps 1–7. Validar que ninguna card se ve "doble".
