# WhatsApp Cloud API Blast System

Sistem broadcast WhatsApp menggunakan Meta Cloud API yang terintegrasi dengan Google Sheets dan Firebase Dashboard.

## 📖 Gambaran Project

### Apa itu project ini?

Sistem ini adalah **backend blast WhatsApp** yang berjalan di Google Apps Script. Sistem ini:

1. **Membaca data kontak** dari Google Sheets
2. **Mengirim pesan WhatsApp** via Meta Cloud API (template message)
3. **Menyimpan riwayat pesan** ke Firebase Realtime Database
4. **Terintegrasi dengan Dashboard** untuk monitoring dan manajemen

### Arsitektur Sistem

```
┌─────────────────┐
│   Dashboard     │ ← User login, monitoring, manajemen
│   (Frontend)    │
└────────┬────────┘
         │ API Call (Web App)
         ↓
┌─────────────────┐
│ Google Sheets   │ ← Data kontak, konfigurasi blast
│ + Apps Script   │
└────────┬────────┘
         │ Send Message
         ↓
┌─────────────────┐
│ WhatsApp Cloud  │ ← Meta API untuk kirim pesan
│      API        │
└────────┬────────┘
         │ Save History
         ↓
┌─────────────────┐
│    Firebase     │ ← Database untuk riwayat & monitoring
│ Realtime DB     │
└─────────────────┘
```

---

## 🎯 Untuk Developer Dashboard

### Yang Perlu Anda Ketahui

Anda sedang membuat **Dashboard** yang akan:

1. **Menampilkan riwayat pesan** yang dikirim dari Google Sheets
2. **Manajemen user/workspace** - setiap user punya spreadsheet sendiri
3. **Monitoring status pengiriman** - berapa pesan terkirim, gagal, dll
4. **Konfigurasi WhatsApp Business** - token, phone ID, template

### Data Flow

```
User Login Dashboard
    ↓
Dashboard ambil User ID (Firebase Auth)
    ↓
Dashboard panggil API Spreadsheet untuk set User ID
    ↓
User input data kontak di Google Sheets
    ↓
User klik "Kirim" di Google Sheets
    ↓
Apps Script kirim pesan via WhatsApp API
    ↓
Apps Script simpan riwayat ke Firebase: /conversations/{userId}/
    ↓
Dashboard baca data dari Firebase dan tampilkan
```

---

## 🔧 Komponen yang Perlu Dibuat di Dashboard

### 1. Authentication & User Management

**Yang perlu ada:**

- Login/Register dengan Firebase Auth
- Setiap user punya User ID unik (dari Firebase Auth UID)
- User bisa punya multiple workspace/cabang

**Data Structure (Firebase):**

```javascript
// Collection: users
{
  "userId": "854v5EJsIDS1H55nxDh3EfcIUZ53",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "admin",
  "createdAt": "2026-03-20T10:00:00Z"
}
```

---

### 2. Workspace Management

**Yang perlu ada:**

- CRUD workspace (create, read, update, delete)
- Setiap workspace punya 1 Google Sheets
- Simpan Web App URL dari spreadsheet
- Simpan konfigurasi WhatsApp Business

**Data Structure (Firebase):**

```javascript
// Collection: workspaces
{
  "workspaceId": "ws_001",
  "userId": "854v5EJsIDS1H55nxDh3EfcIUZ53",
  "name": "Cabang Jakarta",
  
  // Google Sheets Config
  "spreadsheet": {
    "id": "1ABC123...",
    "name": "WA Blast - Jakarta",
    "webAppUrl": "https://script.google.com/macros/s/.../exec",
    "lastSync": "2026-03-20T10:00:00Z",
    "status": "connected" // connected | disconnected | error
  },
  
  // WhatsApp Business Config
  "whatsapp": {
    "phoneId": "1234567890",
    "wabaId": "9876543210",
    "displayPhone": "+62 812-3456-7890",
    "verifiedName": "Toko ABC",
    "token": "EAAB..." // Encrypted
  },
  
  // Firebase Config (untuk save riwayat)
  "firebase": {
    "url": "https://kirim-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
    "hasSecret": true
  },
  
  "status": "active",
  "createdAt": "2026-03-01T00:00:00Z",
  "updatedAt": "2026-03-20T10:00:00Z"
}
```

**UI yang perlu dibuat:**

- List workspace (card/table)
- Form tambah workspace baru
- Form edit workspace
- Button connect/disconnect spreadsheet
- Status indicator (connected, error, dll)

---

### 3. Spreadsheet Integration

**Yang perlu ada:**

Saat user create/edit workspace, dashboard harus:

1. **Test connection** ke spreadsheet
2. **Set User ID** ke spreadsheet via API
3. **Verify** setup berhasil

**API Endpoints yang tersedia:**

| Action | URL | Response |
|--------|-----|----------|
| Test Connection | `{webAppUrl}?action=test` | `{success, spreadsheetName, spreadsheetId}` |
| Set User ID | `{webAppUrl}?action=setUserId&userId={uid}` | `{success, userId}` |
| Get Config | `{webAppUrl}?action=getConfig` | `{success, userId, firebaseUrl, ...}` |

**Contoh Flow di Dashboard:**

```javascript
// 1. User input Web App URL
const webAppUrl = "https://script.google.com/macros/s/.../exec";

// 2. Test connection
const testRes = await fetch(`${webAppUrl}?action=test`);
const testData = await testRes.json();

if (testData.success) {
  // 3. Set User ID
  const userId = currentUser.uid;
  const setupRes = await fetch(
    `${webAppUrl}?action=setUserId&userId=${userId}`
  );
  const setupData = await setupRes.json();
  
  if (setupData.success) {
    // 4. Save ke Firebase
    await db.collection('workspaces').doc(workspaceId).update({
      'spreadsheet.webAppUrl': webAppUrl,
      'spreadsheet.status': 'connected',
      'spreadsheet.lastSync': new Date()
    });
    
    alert('✓ Spreadsheet berhasil terhubung!');
  }
}
```

**UI yang perlu dibuat:**

- Input field untuk Web App URL
- Button "Test Connection"
- Button "Connect Spreadsheet"
- Status indicator (loading, success, error)
- Instruksi cara deploy Web App (modal/tooltip)

---

### 4. Message History / Conversations

**Yang perlu ada:**

Dashboard menampilkan riwayat pesan yang dikirim dari spreadsheet.

**Data Structure (Firebase):**

```javascript
// Path: /conversations/{userId}/{phoneKey}/
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
      "parameters": ["Budi", "Sales A"],
      "from": "bot",
      "status": "sent"
    },
    "1710921700000": {
      "text": "Terima kasih",
      "timestamp": 1710921700000,
      "type": "text",
      "from": "customer",
      "status": "received"
    }
  }
}
```

**Query Firebase:**

```javascript
// Get all conversations untuk user tertentu
const conversationsRef = firebase.database()
  .ref(`conversations/${userId}`);

conversationsRef.on('value', (snapshot) => {
  const conversations = [];
  snapshot.forEach((child) => {
    const phoneKey = child.key; // wa_6282313228875
    const data = child.val();
    conversations.push({
      phoneKey,
      ...data
    });
  });
  
  // Sort by lastMessageTime
  conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
  
  // Render di UI
  renderConversations(conversations);
});

// Get messages untuk 1 kontak
const messagesRef = firebase.database()
  .ref(`conversations/${userId}/${phoneKey}/messages`);

messagesRef.on('value', (snapshot) => {
  const messages = [];
  snapshot.forEach((child) => {
    messages.push({
      id: child.key,
      ...child.val()
    });
  });
  
  // Sort by timestamp
  messages.sort((a, b) => a.timestamp - b.timestamp);
  
  // Render chat
  renderMessages(messages);
});
```

**UI yang perlu dibuat:**

- **List Conversations** (sidebar)
  - Avatar/initial nama
  - Nama kontak
  - Last message preview
  - Timestamp
  - Unread indicator (optional)

- **Chat View** (main area)
  - Header: nama, nomor HP
  - Message bubbles (bot vs customer)
  - Timestamp
  - Status (sent, delivered, read)
  - Template info (nama template, parameters)

- **Filter & Search**
  - Search by nama/nomor
  - Filter by date range
  - Filter by status

---

### 5. Dashboard Analytics

**Yang perlu ada:**

Statistik pengiriman pesan untuk monitoring.

**Metrics yang perlu ditampilkan:**

```javascript
// Hitung dari Firebase
const stats = {
  // Total conversations
  totalConversations: 150,
  
  // Total messages hari ini
  messagesToday: 45,
  
  // Total messages bulan ini
  messagesThisMonth: 890,
  
  // Success rate
  successRate: 98.5, // %
  
  // Breakdown by status
  byStatus: {
    sent: 880,
    failed: 10
  },
  
  // Breakdown by template
  byTemplate: {
    "promo_h1_maret": 450,
    "hello_world": 200,
    "reminder": 240
  },
  
  // Timeline (untuk chart)
  timeline: [
    { date: "2026-03-01", count: 30 },
    { date: "2026-03-02", count: 45 },
    // ...
  ]
};
```

**Query untuk Analytics:**

```javascript
// Get all messages untuk user
const messagesRef = firebase.database()
  .ref(`conversations/${userId}`);

messagesRef.once('value', (snapshot) => {
  let totalMessages = 0;
  let messagesToday = 0;
  const today = new Date().setHours(0, 0, 0, 0);
  
  snapshot.forEach((phoneSnapshot) => {
    const messages = phoneSnapshot.child('messages').val() || {};
    
    Object.values(messages).forEach((msg) => {
      totalMessages++;
      
      const msgDate = new Date(msg.timestamp).setHours(0, 0, 0, 0);
      if (msgDate === today) {
        messagesToday++;
      }
    });
  });
  
  console.log('Total:', totalMessages);
  console.log('Today:', messagesToday);
});
```

**UI yang perlu dibuat:**

- **Cards/Stats**
  - Total pesan hari ini
  - Total pesan bulan ini
  - Success rate
  - Total kontak

- **Charts**
  - Line chart: pesan per hari (7 hari terakhir)
  - Pie chart: breakdown by template
  - Bar chart: pesan per jam

- **Recent Activity**
  - List 10 pesan terakhir
  - Timestamp
  - Status

---

### 6. WhatsApp Business Configuration

**Yang perlu ada:**

Form untuk konfigurasi WhatsApp Business API.

**Fields yang perlu ada:**

```javascript
{
  // Meta API Credentials
  "accessToken": "EAAB...",        // WhatsApp Access Token
  "phoneNumberId": "1234567890",   // Phone Number ID
  "wabaId": "9876543210",          // WhatsApp Business Account ID
  "verifyToken": "my_token_123",   // Webhook verify token
  
  // Display Info (auto-fetch dari Meta API)
  "displayPhone": "+62 812-3456-7890",
  "verifiedName": "Toko ABC",
  "status": "verified"
}
```

**API Meta untuk validasi:**

```javascript
// Validate token & get phone info
async function validateWhatsAppConfig(phoneId, token) {
  const url = `https://graph.facebook.com/v18.0/${phoneId}?fields=display_phone_number,verified_name`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return {
      valid: true,
      displayPhone: data.display_phone_number,
      verifiedName: data.verified_name
    };
  }
  
  return { valid: false };
}
```

**UI yang perlu dibuat:**

- Form input credentials
- Button "Validate" untuk test token
- Display info (nama bisnis, nomor)
- Status indicator
- Link ke Meta Business Manager

---

### 7. Template Management

**Yang perlu ada:**

List template WhatsApp yang tersedia di akun Meta.

**API Meta untuk get templates:**

```javascript
async function getTemplates(wabaId, token) {
  const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates?fields=name,language,components,status&limit=100`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  
  return data.data.filter(t => t.status === 'APPROVED');
}
```

**Data Structure:**

```javascript
{
  "name": "promo_h1_maret",
  "language": "id",
  "status": "APPROVED",
  "components": [
    {
      "type": "HEADER",
      "format": "IMAGE"
    },
    {
      "type": "BODY",
      "text": "Halo {{1}}, promo spesial untuk Anda!"
    },
    {
      "type": "FOOTER",
      "text": "Hubungi kami untuk info lebih lanjut"
    }
  ]
}
```

**UI yang perlu dibuat:**

- List templates (card/table)
- Preview template
- Status badge (APPROVED, PENDING, REJECTED)
- Button "Refresh" untuk sync dari Meta
- Link ke Meta Business Manager untuk create template

---

## 📁 Struktur Firebase yang Direkomendasikan

```
firebase-project/
│
├── users/
│   └── {userId}/
│       ├── email
│       ├── name
│       ├── role
│       └── createdAt
│
├── workspaces/
│   └── {workspaceId}/
│       ├── userId
│       ├── name
│       ├── spreadsheet/
│       ├── whatsapp/
│       ├── firebase/
│       └── status
│
├── conversations/
│   └── {userId}/
│       └── {phoneKey}/
│           ├── lastMessage
│           ├── lastMessageTime
│           ├── name
│           ├── phoneNumber
│           └── messages/
│               └── {timestamp}/
│
├── broadcast_history/
│   └── {userId}/
│       └── {broadcastId}/
│           ├── date
│           ├── totalSent
│           ├── totalFailed
│           └── templateName
│
└── waba_configs/
    └── {userId}/
        ├── accessToken (encrypted)
        ├── phoneNumberId
        ├── wabaId
        └── templates/
```

---

## 🚀 Quick Start untuk Developer Dashboard

### 1. Setup Firebase

```bash
npm install firebase
```

```javascript
// firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  databaseURL: "https://kirim-chat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
```

### 2. Buat Service untuk Spreadsheet API

```javascript
// services/spreadsheet.js
export class SpreadsheetService {
  async testConnection(webAppUrl) {
    const response = await fetch(`${webAppUrl}?action=test`);
    return response.json();
  }
  
  async setupSpreadsheet(webAppUrl, userId, firebaseUrl, firebaseSecret) {
    const params = new URLSearchParams({
      action: 'setUserId',
      userId,
      firebaseUrl,
      firebaseSecret
    });
    
    const response = await fetch(`${webAppUrl}?${params}`);
    return response.json();
  }
  
  async getConfig(webAppUrl) {
    const response = await fetch(`${webAppUrl}?action=getConfig`);
    return response.json();
  }
}
```

### 3. Buat Service untuk Conversations

```javascript
// services/conversations.js
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { db } from '../firebase';

export class ConversationService {
  listenToConversations(userId, callback) {
    const conversationsRef = ref(db, `conversations/${userId}`);
    
    return onValue(conversationsRef, (snapshot) => {
      const conversations = [];
      
      snapshot.forEach((child) => {
        conversations.push({
          phoneKey: child.key,
          ...child.val()
        });
      });
      
      // Sort by lastMessageTime
      conversations.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
      
      callback(conversations);
    });
  }
  
  listenToMessages(userId, phoneKey, callback) {
    const messagesRef = ref(db, `conversations/${userId}/${phoneKey}/messages`);
    
    return onValue(messagesRef, (snapshot) => {
      const messages = [];
      
      snapshot.forEach((child) => {
        messages.push({
          id: child.key,
          ...child.val()
        });
      });
      
      // Sort by timestamp
      messages.sort((a, b) => a.timestamp - b.timestamp);
      
      callback(messages);
    });
  }
}
```

### 4. Contoh Component (React)

```jsx
// components/ConversationList.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ConversationService } from '../services/conversations';

export function ConversationList() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const conversationService = new ConversationService();
  
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = conversationService.listenToConversations(
      user.uid,
      setConversations
    );
    
    return () => unsubscribe();
  }, [user]);
  
  return (
    <div className="conversation-list">
      {conversations.map((conv) => (
        <div key={conv.phoneKey} className="conversation-item">
          <div className="avatar">{conv.name?.[0] || '?'}</div>
          <div className="info">
            <h4>{conv.name || conv.phoneNumber}</h4>
            <p>{conv.lastMessage}</p>
          </div>
          <div className="time">
            {new Date(conv.lastMessageTime).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 📚 Dokumentasi Lengkap

- **[DASHBOARD_INTEGRATION.md](./DASHBOARD_INTEGRATION.md)** - API endpoints detail dan contoh kode
- **[LIBRARY_SETUP.md](./LIBRARY_SETUP.md)** - Setup Google Sheets library system

---

## 🔐 Security Checklist

- [ ] Encrypt WhatsApp Access Token di Firebase
- [ ] Gunakan Firebase Rules untuk restrict access per user
- [ ] Validasi User ID di setiap API call
- [ ] Jangan expose Firebase Secret di frontend
- [ ] Gunakan HTTPS untuk semua API calls
- [ ] Implement rate limiting untuk API calls

**Contoh Firebase Rules:**

```json
{
  "rules": {
    "conversations": {
      "$userId": {
        ".read": "auth != null && auth.uid == $userId",
        ".write": "auth != null && auth.uid == $userId"
      }
    },
    "workspaces": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## 📞 Support

Jika ada pertanyaan tentang integrasi:

1. Baca [DASHBOARD_INTEGRATION.md](./DASHBOARD_INTEGRATION.md) untuk detail API
2. Cek Firebase Console untuk struktur data
3. Test API dengan Postman/curl
4. Gunakan menu debug di Google Sheets: "🔍 Debug Firebase Config"

---

## 📝 Changelog

### Version 2.0.0 (2026-03-20)
- ✨ Multi-user support dengan User ID
- ✨ Web App API untuk dashboard integration
- ✨ Firebase integration untuk riwayat pesan
- ✨ Template management
- ✨ Sampling test per sheet
- 🐛 Fix Firebase 404 error
- 🐛 Fix URL format untuk Firebase baru (.firebasedatabase.app)

### Version 1.0.0 (2026-03-15)
- 🎉 Initial release
- ✨ WhatsApp Cloud API integration
- ✨ Google Sheets data source
- ✨ Per-sheet configuration

---

**Dibuat dengan ❤️ untuk sistem blast WhatsApp yang scalable dan maintainable**
