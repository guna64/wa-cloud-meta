# WA Cloud Meta - Library System

## Cara Setup di Spreadsheet Cabang (Hanya Sekali)

### Step 1: Buka Apps Script
1. Buka spreadsheet cabang
2. Klik **Extensions** → **Apps Script**

### Step 2: Tambah Library
1. Di editor Apps Script, klik **gear icon (⚙️)** di sebelah kiri
2. Klik **Libraries**
3. Klik tombol **+ Add a library**
4. Masukkan **Script ID**:
   ```
   1ZhSYOjLaNR_zX_0VtX0_5vy95RQhzVvXe5d4sBtCWbSZkPYAutKUG-Sa
   ```
5. Klik **Lookup**
6. Pilih **Version**: "HEAD" (selalu update terbaru) atau pilih versi spesifik
7. **Identifier**: ketik `WACLOUD`
8. Klik **Add**

### Step 3: Buat File Wrapper
Buat file baru (File → New → Script file) dengan nama `Code.gs`, isi dengan:

```javascript
// Wrapper untuk Library WA Cloud Meta
// Update otomatis saat library di-update

function onOpen() {
  WACLOUD.onOpen();
}

function sendSemuaSheet() {
  WACLOUD.sendSemuaSheet();
}

function testKirim() {
  WACLOUD.testKirim();
}

function openFormGlobal() {
  WACLOUD.openFormGlobal();
}

function openFormPerSheet() {
  WACLOUD.openFormPerSheet();
}

function generateLaporanHarian() {
  WACLOUD.generateLaporanHarian();
}

function cekStatusCabang() {
  WACLOUD.cekStatusCabang();
}

function debugDataSampling() {
  WACLOUD.debugDataSampling();
}
```

### Step 4: Simpan
Klik **Save** 💾

### Step 5: Refresh Spreadsheet
Tutup dan buka kembali spreadsheet. Menu "WA Cloud Meta" akan muncul.

---

## Keuntungan Sistem Library

✅ **Update Otomatis**: Saat kode di-update di library, semua cabang otomatis mendapat versi terbaru (jika pakai versi "HEAD")

✅ **Mudah Maintenance**: Tidak perlu update satu per satu ke semua spreadsheet

✅ **Konsisten**: Semua cabang pakai kode yang sama

✅ **Aman**: Cabang tidak bisa edit kode, hanya bisa pakai

---

## Troubleshooting

### Menu tidak muncul?
- Refresh browser (F5)
- Pastikan identifier library adalah `WACLOUD`
- Cek apakah library sudah benar ditambah

### Ingin update manual?
Jika tidak pakai "HEAD", cabang bisa pilih versi baru di menu Libraries.

### Error "Library not found"?
Pastikan Script ID benar dan library sudah di-deploy sebagai library.

---

## Versi Library

| Versi | Tanggal | Keterangan |
|-------|---------|------------|
| 2.0.0 | 2025-03-18 | Library system, sampling fix, Telegram topic |
| 1.0.0 | 2025-03-15 | Initial release |
