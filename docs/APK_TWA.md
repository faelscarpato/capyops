# APK Android (PWA via TWA)

Este projeto usa Bubblewrap para empacotar a PWA como APK Android (Trusted Web Activity).

## Pre-requisitos

- PWA publicada em HTTPS (exemplo: `https://capyops.pages.dev`)
- Java 17 (recomendado pelo Bubblewrap)
- Android Command-line Tools (SDK)

Se o Bubblewrap falhar no download automatico do JDK, configure manualmente:

```bash
bubblewrap updateConfig --jdkPath="C:/caminho/jdk-17" --androidSdkPath="C:/caminho/android-sdk"
```

## Comandos

1. Inicializar projeto Android TWA:

```bash
npm run apk:init
```

2. Atualizar projeto apos mudar `twa-manifest.json`:

```bash
npm run apk:update
```

3. Gerar APK assinado:

```bash
npm run apk:build
```

4. Gerar APK sem assinatura (teste local):

```bash
npm run apk:build:unsigned
```

## Saida esperada

O Bubblewrap gera os artefatos no diretório `android-twa` (incluindo APK/AAB).

## Publicacao no app web

Depois de publicar o APK em uma URL publica, configure:

```env
VITE_ANDROID_APK_URL=https://seu-dominio.com/downloads/CapyOps.apk
```
