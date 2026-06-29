// Intercepta TODOS los deep links nativos antes de que Expo Router los resuelva.
//
// Problema que resuelve: Supabase redirige el recupero de contraseña a
// `mobileapp://reset-password?email=...#access_token=...&refresh_token=...&type=recovery`.
// Como `reset-password` queda como *host* de la URI (y los tokens viajan en el
// fragmento `#`), el linking automático de Expo Router resuelve esa URL de forma
// inconsistente y, con la app ya abierta (warm start), termina navegando al
// índice (catálogo) en lugar de a reset-password. Manejarlo desde un listener
// dentro de _layout no alcanza: compite (y pierde) contra la navegación
// automática del router.
//
// `redirectSystemPath` corre para cold start (`initial: true`) y warm start
// (`initial: false`) por igual, y recibe la URL completa con el fragmento, así
// que es el único punto donde podemos reescribir el destino de manera
// determinística. Devolvemos una ruta interna explícita (`/reset-password`) con
// los tokens como query params, que la pantalla lee vía `useLocalSearchParams`.
//
// Nota: este archivo es solo nativo; en web `redirectSystemPath` no se ejecuta
// (el recupero en web no aplica porque el `redirect_to` usa el scheme nativo).

type NativeIntentParams = { path: string; initial: boolean };

export function redirectSystemPath({ path }: NativeIntentParams): string {
  try {
    const hashIndex = path.indexOf("#");
    if (hashIndex === -1) return path;

    const hashParams = new URLSearchParams(path.slice(hashIndex + 1));
    const type = hashParams.get("type");
    const error = hashParams.get("error"); // presente si el token expiró

    // Solo reescribimos links de recupero (válidos o expirados). El resto de los
    // deep links (producto, checkout, etc.) pasan sin tocar.
    if (type !== "recovery" && error !== "access_denied") return path;

    // El email viaja en el query string, antes del fragmento.
    const beforeHash = path.slice(0, hashIndex);
    const qIndex = beforeHash.indexOf("?");
    const email =
      qIndex !== -1
        ? (new URLSearchParams(beforeHash.slice(qIndex + 1)).get("email") ?? "")
        : "";

    const params = new URLSearchParams({
      access_token: hashParams.get("access_token") ?? "",
      refresh_token: hashParams.get("refresh_token") ?? "",
      email,
    });

    return `/reset-password?${params.toString()}`;
  } catch {
    // Ante cualquier error de parseo, dejamos que el router maneje la URL tal cual.
    return path;
  }
}
