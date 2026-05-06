# VIMS Mobile — Build APK Guide

## Step 1: Set your Railway backend URL

Edit `src/services/api.js` and replace:
```
export const BASE_URL = 'https://YOUR_RAILWAY_APP.railway.app/api';
```
With your actual Railway URL, e.g.:
```
export const BASE_URL = 'https://vims-backend.up.railway.app/api';
```

Also update the CORS setting on Railway:
Add `CORS_ORIGINS=*` or specifically allow your app.

---

## Step 2: Install dependencies

```bash
cd mobile
npm install
```

---

## Step 3: Install Expo and EAS CLI

```bash
npm install -g expo-cli eas-cli
```

---

## Step 4: Login to Expo

```bash
eas login
```
Create a free account at https://expo.dev if you don't have one.

---

## Step 5: Initialize EAS project

```bash
eas init
```
This will create a project on Expo and update `app.json` with your project ID.

---

## Step 6: Build the APK

```bash
npm run build:apk
```

This runs `eas build --platform android --profile preview` which builds a **direct-install APK**.

The build happens in the cloud (Expo servers). It takes ~5-10 minutes.
You'll get a download link for the `.apk` file.

---

## Step 7: Install on Android

1. Download the `.apk` from the Expo dashboard
2. Transfer to your Android phone
3. Enable "Install from unknown sources" in Settings → Security
4. Open the APK and install

---

## For production (Play Store AAB):

```bash
npm run build:aab
```

---

## Test locally with Expo Go (no build needed)

```bash
npm start
```
Scan the QR code with the **Expo Go** app on your Android phone.
⚠️ Expo Go won't work for the final APK but is great for quick testing.

---

## Credentials used for testing

| Role | Email | Password |
|------|-------|----------|
| SUPER_ADMIN | superadmin@vims.com | Admin@123 |
| ADMIN | admin@vims.com | Admin@123 |
| VENDOR | vendor@vims.com | Vendor@123 |
| FINANCE | finance1@vims.com | Finance1@123 |
| CFO | cfo@vims.com | Cfo@12345 |
