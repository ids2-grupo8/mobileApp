# Deploy — Bazaar Mobile App

## Estrategia

La app es mobile-first. La versión web de Expo no es viable para producción.

| Canal | Plataforma | Cómo |
|---|---|---|
| **APK directo** | Android | Descarga e instala el `.apk` |
| **Appetize.io (Android)** | Cualquier browser | Emulador Android con el `.apk` |
| **Appetize.io (iOS)** | Cualquier browser | Simulador iOS con el `.tar.gz` |
| **Expo Go** | iOS físico en dev | Escanea QR con `npx expo start` |

---

## Requisitos previos

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Login con cuenta Expo (crear una en expo.dev si no tenés)
eas login
```

---

## eas.json

El proyecto ya tiene configurados los perfiles en `eas.json`:

```json
{
  "cli": {
    "version": ">= 18.6.0",
    "appVersionSource": "remote"
  },
  "build": {
    "preview-android": {
      "android": {
        "buildType": "apk"
      }
    },
    "preview-ios": {
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

---

## Build Android (APK)

```bash
eas build -p android --profile preview-android
```

- Corre en la nube, no necesitás nada local (~5-10 min)
- Al terminar EAS imprime un link para descargar el `.apk`
- Descargarlo y guardarlo (ej: `Downloads/bazaar.apk`)

### Instalar en un Android físico

1. Pasar el `.apk` al dispositivo (cable, Drive, etc.)
2. En el Android: **Ajustes → Seguridad → Instalar apps de fuentes desconocidas** → activar
3. Abrir el `.apk` desde el explorador de archivos → instalar

---

## Build iOS (simulador para Appetize.io)

No necesitás Mac ni cuenta de Apple Developer paga.
EAS buildea en la nube en una Mac propia.

```bash
eas build -p ios --profile preview-ios
```

- Tarda ~10-15 min
- Al terminar EAS imprime un link para descargar un archivo `.tar.gz`
- Descargarlo y guardarlo (ej: `Downloads/bazaar-ios.tar.gz`)

---

## Subir a Appetize.io

Appetize.io acepta `.apk` (Android) y `.tar.gz` / `.app` (iOS simulador).
Tiene una API para subir desde terminal.

### Obtener API key

1. Crear cuenta en [appetize.io](https://appetize.io)
2. **Account → API key** → copiar la key

### Subir el build Android

```bash
curl --location 'https://api.appetize.io/v1/apps' \
  --header 'Authorization: Bearer <API_KEY>' \
  --form 'file=@"/ruta/al/bazaar.apk"' \
  --form 'platform="android"'
```

### Subir el build iOS

```bash
curl --location 'https://api.appetize.io/v1/apps' \
  --header 'Authorization: Bearer <API_KEY>' \
  --form 'file=@"/ruta/al/bazaar-ios.tar.gz"' \
  --form 'platform="ios"'
```

### Respuesta

Appetize devuelve un JSON con el link público:

```json
{
  "publicKey": "abc123xyz",
  "appURL": "https://appetize.io/app/abc123xyz"
}
```

Compartís ese link — cualquiera puede usar la app en el browser sin instalar nada.

**Plan gratuito:** 100 minutos/mes — suficiente para demos y correcciones del TP.

---

## Actualizar un build existente

Si ya subiste una versión y querés actualizarla (misma URL pública):

```bash
# Reemplaza el build existente usando el publicKey anterior
curl --location 'https://api.appetize.io/v1/apps/<PUBLIC_KEY>' \
  --header 'Authorization: Bearer <API_KEY>' \
  --form 'file=@"/ruta/al/nuevo.apk"' \
  --form 'platform="android"'
```

---

## iOS físico — Expo Go (desarrollo)

Sin Mac y sin Apple Developer pago, para correr en iPhone real:

```bash
npx expo start
```

1. Instalar **Expo Go** desde la App Store
2. Escanear el QR que aparece en la terminal
3. La app corre en el iPhone mientras el servidor esté activo

---

## Flujo completo para una entrega

```
# Android
eas build -p android --profile preview-android
  → descargás el .apk
  → curl upload a Appetize.io (platform: android)  →  link público Android
  → instalás el .apk en dispositivos Android

# iOS
eas build -p ios --profile preview-ios
  → descargás el .tar.gz
  → curl upload a Appetize.io (platform: ios)       →  link público iOS

# iOS físico (dev)
npx expo start  →  Expo Go escanea QR
```

---

## Resumen de comandos

```bash
# Login (una sola vez)
eas login

# Build Android
eas build -p android --profile preview-android

# Build iOS simulador
eas build -p ios --profile preview-ios

# Subir Android a Appetize.io
curl --location 'https://api.appetize.io/v1/apps' \
  --header 'Authorization: Bearer <API_KEY>' \
  --form 'file=@"<RUTA>.apk"' \
  --form 'platform="android"'

# Subir iOS a Appetize.io
curl --location 'https://api.appetize.io/v1/apps' \
  --header 'Authorization: Bearer <API_KEY>' \
  --form 'file=@"<RUTA>.tar.gz"' \
  --form 'platform="ios"'

# Dev con Expo Go
npx expo start
```
