# Dashboard Integration Guide

Panduan integrasi antara Google Sheets WA Blast dengan Dashboard Firebase.

## 📋 Daftar Isi

- [Overview](#overview)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Setup Awal](#setup-awal)
- [API Endpoints](#api-endpoints)
- [Contoh Implementasi](#contoh-implementasi)
- [Struktur Data Firebase](#struktur-data-firebase)
- [Troubleshooting](#troubleshooting)

---

## Overview

Sistem ini menghubungkan Google Sheets (untuk blast WhatsApp) dengan Dashboard Firebase (untuk monitoring dan manajemen). Setiap user/cabang memiliki:

- **User ID unik** - Identitas akun di Firebase
- **Spreadsheet sendiri** - File Google Sheets untuk data blast
- **Web App URL** - Endpoint API untuk komunikasi dengan spreadsheet

### Alur Kerja

```
Dashboard → Web App API → Google Sheets → WhatsApp Cloud API → Firebase
     ↑                                                              ↓
     └──────────────────── Read Messages ─────────────────────────┘
```

---

## Arsitektur Sistem

### Struktur Firebase

```
firebase-project/
├── conversations/
│   ├── {userId}/                    ← User ID dari dashboard
│   │   ├── wa_{phoneNumber}/        ← Nomor WA kontak
│   │   │   ├── lastMessage
│   │   │   ├── lastMessageTime
│   │   │   ├── name
│   │   │   ├── phoneNumber
│   │   │   ├── platform: "whatsapp"
│   │   │   └── messages/
│   │   │       └── {timestamp}/
│   │   │           ├── text
│   │   │           ├── timestamp
│   │   │           ├── type: "template"
│   │   │           ├── templateName
│   │   │           ├── templateLang
│   │   │           ├── parameters: []
│   │   │           ├── from: "bot"
│   │   │           └── status: "sent"
│   │   └── wa_{phoneNumber2}/
│   └── ...
├── users/
├── workspaces/
├── waba_configs/
└── ...
```

### Komponen Sistem

1. **Dashboard** - Frontend untuk user login dan monitoring
2. **Firebase Realtime Database** - Penyimpanan data
3. **Google Sheets** - Input data blast dan konfigurasi
4. **Apps Script Web App** - API bridge antara dashboard dan sheets
5. **WhatsApp Cloud API** - Pengiriman pesan

---

## Setup Awal

### 1. Deploy Web App di Google Sheets

Setiap spreadsheet perlu di-deploy sebagai Web App:

1. Buka spreadsheet → **Extensions** → **Apps Script**
2. Klik **Deploy** → **New deployment**
3. Pilih type: **Web app**
4. Konfigurasi:
   - **Description**: "Dashboard Integration API"
   - **Execute as**: Me (your-email@gmail.com)
   - **Who has access**: Anyone
5. Klik **Deploy**
6. **Copy Web App URL** (format: `https://script.google.com/macros/s/AKfycby.../exec`)
7. Simpan URL ini di dashboard

### 2. Simpan Web App URL di Dashboard

Di Firebase, simpan Web App URL untuk setiap workspace/user:

```javascript
// Collection: workspaces atau waba_configs
{
  userId: "854v5EJsIDS1H55nxDh3EfcIUZ53",
  spreadsheetId: "1ABC123...",
  spreadsheetName: "WA Blast - Cabang Jakarta",
  webAppUrl: "https://script.google.com/macros/s/AKfycby.../exec",
  firebaseUrl: "https://kirim-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  firebaseSecret: "4XK00Y1qf2qYaQGaMR53zbKA4C9QW1b1k",
  createdAt: "2026-03-20T10:00:00Z",
  status: "active"
}
```

---

## API Endpoints

Base URL: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec`

### 1. Test Connection

**Endpoint**: `?action=test` atau `?action=ping`

**Method**: GET

**Deskripsi**: Mengecek apakah Web App dapat diakses

**Request**:
```
GET https://script.google.com/.../exec?action=test
```

**Response**:
```json
{
  "success": true,
  "message": "Connection OK",
  "timestamp": 1710921600000,
  "spreadsheetId": "1ABC123...",
  "spreadsheetName": "WA Blast - Cabang Jakarta"
}
```

---

### 2. Set User ID & Firebase Config

**Endpoint**: `?action=setUserId`

**Method**: GET

**Deskripsi**: Menyimpan User ID dan Firebase config ke spreadsheet

**Parameters**:
- `userId` (required) - User ID dari Firebase Auth
- `firebaseUrl` (optional) - Firebase Realtime Database URL
- `firebaseSecret` (optional) - Firebase Database Secret

**Request**:
```
GET https://script.google.com/.../exec?action=setUserId&userId=854v5EJsIDS1H55nxDh3EfcIUZ53&firebaseUrl=https://kirim-chat-default-rtdb.asia-southeast1.firebasedatabase.app&firebaseSecret=4XK00Y1qf2qYaQGaMR53zbKA4C9QW1b1k
```

**Response**:
```json
{
  "success": true,
  "message": "User ID berhasil disimpan",
  "userId": "854v5EJsIDS1H55nxDh3EfcIUZ53",
  "firebaseUrl": "https://kirim-chat-default-rtdb.asia-southeast1.firebasedatabase.app"
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

### 3. Get Current Config

**Endpoint**: `?action=getConfig` atau `?action=getUserId`

**Method**: GET

**Deskripsi**: Mengambil konfigurasi yang tersimpan di spreadsheet

**Request**:
```
GET https://script.google.com/.../exec?action=getConfig
```

**Response**:
```json
{
  "success": true,
  "userId": "854v5EJsIDS1H55nxDh3EfcIUZ53",
  "firebaseUrl": "https://kirim-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  "hasFirebaseSecret": true,
  "spreadsheetId": "1ABC123...",
  "spreadsheetName": "WA Blast - Cabang Jakarta"
}
```

---

## Contoh Implementasi

### JavaScript/TypeScript (Dashboard)

```javascript
class SpreadsheetAPI {
  constructor(webAppUrl) {
    this.webAppUrl = webAppUrl;
  }

  /**
   * Test connection ke spreadsheet
   */
  async testConnection() {
    try {
      const response = await fetch(`${this.webAppUrl}?action=test`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✓ Connected to:', data.spreadsheetName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('✗ Connection failed:', error);
      return false;
    }
  }

  /**
   * Setup spreadsheet dengan User ID dan Firebase config
   */
  async setupSpreadsheet(userId, firebaseUrl, firebaseSecret) {
    try {
      const params = new URLSearchParams({
        action: 'setUserId',
        userId: userId,
        firebaseUrl: firebaseUrl,
        firebaseSecret: firebaseSecret
      });

      const response = await fetch(`${this.webAppUrl}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('✓ Setup complete for user:', data.userId);
        return data;
      } else {
        console.error('✗ Setup failed:', data.error);
        return null;
      }
    } catch (error) {
      console.error('✗ Setup error:', error);
      return null;
    }
  }

  /**
   * Get current config dari spreadsheet
   */
  async getConfig() {
    try {
      const response = await fetch(`${this.webAppUrl}?action=getConfig`);
      const data = await response.json();
      
      if (data.success) {
        return data;
      }
      return null;
    } catch (error) {
      console.error('✗ Get config error:', error);
      return null;
    }
  }

  /**
   * Verify apakah spreadsheet sudah ter-setup dengan benar
   */
  async verifySetup(expectedUserId) {
    const config = await this.getConfig();
    
    if (!config) {
      return { valid: false, message: 'Cannot get config' };
    }

    if (config.userId !== expectedUserId) {
      return { 
        valid: false, 
        message: `User ID mismatch. Expected: ${expectedUserId}, Got: ${config.userId}` 
      };
    }

    if (!config.firebaseUrl) {
      return { valid: false, message: 'Firebase URL not configured' };
    }

    return { valid: true, message: 'Setup valid', config };
  }
}

// ===== CONTOH PENGGUNAAN =====

// 1. Inisialisasi API
const spreadsheetAPI = new SpreadsheetAPI(
  "https://script.google.com/macros/s/AKfycby.../exec"
);

// 2. Test connection saat user buka halaman
async function initSpreadsheet() {
  const isConnected = await spreadsheetAPI.testConnection();
  
  if (!isConnected) {
    alert('Tidak dapat terhubung ke spreadsheet!');
    return;
  }

  // 3. Setup dengan User ID dari Firebase Auth
  const currentUser = firebase.auth().currentUser;
  const userId = currentUser.uid;
  
  const result = await spreadsheetAPI.setupSpreadsheet(
    userId,
    "https://kirim-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
    "4XK00Y1qf2qYaQGaMR53zbKA4C9QW1b1k"
  );

  if (result) {
    console.log('✓ Spreadsheet ready!');
    
    // 4. Verify setup
    const verification = await spreadsheetAPI.verifySetup(userId);
    
    if (verification.valid) {
      console.log('✓ Setup verified:', verification.config);
    } else {
      console.error('✗ Setup invalid:', verification.message);
    }
  }
}

// Jalankan saat halaman load
initSpreadsheet();
```

### React/Next.js Hook

```typescript
import { useState, useEffect } from 'react';

interface SpreadsheetConfig {
  userId: string;
  firebaseUrl: string;
  hasFirebaseSecret: boolean;
  spreadsheetId: string;
  spreadsheetName: string;
}

export function useSpreadsheet(webAppUrl: string, userId: string) {
  const [config, setConfig] = useState<SpreadsheetConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setupSpreadsheet() {
      try {
        setLoading(true);
        
        // Test connection
        const testRes = await fetch(`${webAppUrl}?action=test`);
        const testData = await testRes.json();
        
        if (!testData.success) {
          throw new Error('Cannot connect to spreadsheet');
        }

        // Setup User ID
        const setupRes = await fetch(
          `${webAppUrl}?action=setUserId&userId=${userId}&firebaseUrl=${encodeURIComponent(process.env.NEXT_PUBLIC_FIREBASE_URL!)}&firebaseSecret=${encodeURIComponent(process.env.FIREBASE_SECRET!)}`
        );
        const setupData = await setupRes.json();
        
        if (!setupData.success) {
          throw new Error(setupData.error || 'Setup failed');
        }

        // Get config
        const configRes = await fetch(`${webAppUrl}?action=getConfig`);
        const configData = await configRes.json();
        
        if (configData.success) {
          setConfig(configData);
        }
        
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    if (webAppUrl && userId) {
      setupSpreadsheet();
    }
  }, [webAppUrl, userId]);

  return { config, loading, error };
}

// Penggunaan di component
function SpreadsheetManager() {
  const { user } = useAuth(); // Firebase Auth
  const { config, loading, error } = useSpreadsheet(
    user?.webAppUrl || '',
    user?.uid || ''
  );

  if (loading) return <div>Loading spreadsheet...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h2>Spreadsheet: {config?.spreadsheetName}</h2>
      <p>User ID: {config?.userId}</p>
      <p>Status: ✓ Connected</p>
    </div>
  );
}
```

---

## Struktur Data Firebase

### Collection: `conversations`

Path: `/conversations/{userId}/{phoneKey}/`

```json
{
  "lastMessage": "📢 Halo Budi, promo spesial...",
  "lastMessageTime": 1710921600000,
  "name": "Budi Santoso",
  "phoneNumber": "6282313228875",
  "platform": "whatsapp",
  "messages": {
    "1710921600000": {
      "text": "Halo Budi, promo spesial hari ini!",
      "timestamp": 1710921600000,
      "type": "template",
      "templateName": "promo_h1_maret",
      "templateLang": "id",
      "parameters": ["Budi", "Sales A", "08123456789"],
      "from": "bot",
      "status": "sent"
    }
  }
}
```

### Collection: `workspaces` (Recommended)

Simpan konfigurasi spreadsheet per workspace:

```json
{
  "workspaceId": "workspace_001",
  "userId": "854v5EJsIDS1H55nxDh3EfcIUZ53",
  "name": "Cabang Jakarta",
  "spreadsheet": {
    "id": "1ABC123...",
    "name": "WA Blast - Cabang Jakarta",
    "webAppUrl": "https://script.google.com/macros/s/AKfycby.../exec",
    "lastSync": "2026-03-20T10:00:00Z"
  },
  "firebase": {
    "url": "https://kirim-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
    "hasSecret": true
  },
  "whatsapp": {
    "phoneId": "1234567890",
    "wabaId": "9876543210",
    "displayPhone": "+62 812-3456-7890",
    "verifiedName": "Toko ABC"
  },
  "status": "active",
  "createdAt": "2026-03-01T00:00:00Z",
  "updatedAt": "2026-03-20T10:00:00Z"
}
```

---

## Troubleshooting

### 1. Error: "Cannot connect to spreadsheet"

**Penyebab**:
- Web App URL salah
- Spreadsheet belum di-deploy
- Network issue

**Solusi**:
```javascript
// Test dengan curl atau browser
fetch('https://script.google.com/.../exec?action=test')
  .then(r => r.json())
  .then(console.log);
```

### 2. Error: "User ID mismatch"

**Penyebab**:
- User ID di spreadsheet berbeda dengan yang di-expect
- Setup belum dijalankan

**Solusi**:
```javascript
// Re-setup User ID
await spreadsheetAPI.setupSpreadsheet(correctUserId, firebaseUrl, firebaseSecret);
```

### 3. Pesan tidak muncul di dashboard

**Penyebab**:
- User ID salah
- Firebase URL/Secret salah
- Path Firebase tidak sesuai

**Solusi**:
1. Cek config di spreadsheet:
```javascript
const config = await spreadsheetAPI.getConfig();
console.log('Current config:', config);
```

2. Cek di Firebase Console apakah data masuk di path: `/conversations/{userId}/`

3. Jalankan debug di spreadsheet: Menu **"🔍 Debug Firebase Config"**

### 4. Error 403: Permission Denied

**Penyebab**:
- Web App deployment setting salah
- "Who has access" bukan "Anyone"

**Solusi**:
1. Buka Apps Script → Deploy → Manage deployments
2. Edit deployment
3. Ubah "Who has access" menjadi **"Anyone"**
4. Deploy ulang

### 5. CORS Error

**Penyebab**:
- Browser blocking request ke Apps Script

**Solusi**:
Apps Script Web App sudah support CORS by default. Jika masih error, pastikan:
- Menggunakan HTTPS
- URL Web App benar (harus ada `/exec` di akhir)

---

## Best Practices

### 1. Keamanan

- **Jangan hardcode Firebase Secret** di frontend
- Simpan secret di environment variables
- Gunakan Firebase Rules untuk restrict access:

```json
{
  "rules": {
    "conversations": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId"
      }
    }
  }
}
```

### 2. Error Handling

Selalu handle error dengan graceful fallback:

```javascript
try {
  const result = await spreadsheetAPI.setupSpreadsheet(...);
  if (!result) {
    // Fallback: tampilkan form manual input
    showManualSetupForm();
  }
} catch (error) {
  // Log error untuk debugging
  console.error('Setup error:', error);
  // Tampilkan pesan user-friendly
  showErrorMessage('Gagal setup spreadsheet. Silakan coba lagi.');
}
```

### 3. Caching

Cache Web App URL dan config untuk mengurangi API calls:

```javascript
// LocalStorage
localStorage.setItem('webAppUrl', webAppUrl);
localStorage.setItem('spreadsheetConfig', JSON.stringify(config));

// Atau gunakan state management (Redux, Zustand, etc)
```

### 4. Monitoring

Log setiap API call untuk debugging:

```javascript
async function apiCall(url) {
  console.log('[API] Request:', url);
  const start = Date.now();
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('[API] Response:', data, `(${Date.now() - start}ms)`);
    return data;
  } catch (error) {
    console.error('[API] Error:', error, `(${Date.now() - start}ms)`);
    throw error;
  }
}
```

---

## Support

Jika ada pertanyaan atau issue:

1. Cek log di Apps Script: Extensions → Apps Script → Executions
2. Cek Firebase Console untuk data yang masuk
3. Gunakan menu debug di spreadsheet: **"🔍 Debug Firebase Config"**
4. Review dokumentasi API di atas

---

**Last Updated**: 20 Maret 2026  
**Version**: 2.0.0
