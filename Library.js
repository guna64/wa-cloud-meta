// ============================================================
//  WA CLOUD META - LIBRARY SYSTEM
//  Versi: 2.0.0 | Updated: 18 Maret 2025
//  Repo: https://github.com/guna64/wa-cloud-meta
// ============================================================

/**
 * Library ID untuk import di spreadsheet cabang:
 * 1ZhSYOjLaNR_zX_0VtX0_5vy95RQhzVvXe5d4sBtCWbSZkPYAutKUG-Sa
 * 
 * Cara pakai di spreadsheet cabang:
 * 1. Extensions → Apps Script
 * 2. Klik gear (⚙️) → Libraries
 * 3. Tambah Library ID di atas
 * 4. Pilih versi "HEAD" atau versi terbaru
 * 5. Identifier: WACLOUD
 */

// Export semua fungsi ke global scope untuk library
function onOpen() {
  return WACLOUD.onOpen();
}

function sendSemuaSheet() {
  return WACLOUD.sendSemuaSheet();
}

function testKirim() {
  return WACLOUD.testKirim();
}

function openFormGlobal() {
  return WACLOUD.openFormGlobal();
}

function openFormPerSheet() {
  return WACLOUD.openFormPerSheet();
}

function generateLaporanHarian() {
  return WACLOUD.generateLaporanHarian();
}

function cekStatusCabang() {
  return WACLOUD.cekStatusCabang();
}

function debugDataSampling() {
  return WACLOUD.debugDataSampling();
}

// Wrapper namespace
const WACLOUD = {
  // Re-export semua fungsi dari Kode.js
  onOpen: onOpen_lib,
  sendSemuaSheet: sendSemuaSheet_lib,
  testKirim: testKirim_lib,
  openFormGlobal: openFormGlobal_lib,
  openFormPerSheet: openFormPerSheet_lib,
  generateLaporanHarian: generateLaporanHarian_lib,
  cekStatusCabang: cekStatusCabang_lib,
  debugDataSampling: debugDataSampling_lib,
  
  // Info versi
  VERSION: "2.0.0",
  LAST_UPDATED: "2025-03-18"
};
