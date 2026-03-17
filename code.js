// ============================================================
//  WA CLOUD META SENDER - LIBRARY VERSION
//  Adaptasi fitur per-sheet untuk WhatsApp Cloud API (Meta)
// ============================================================

const DEFAULTS = {
    WA_TOKEN: "",
    WA_PHONE_ID: "",
    WA_VERIFY_TOKEN: "",
    WA_WABA_ID: "",
    NO_HP_NOTIF: "",
    JAM_TRIGGER: "8",
    DELAY_MIN: "2",
    DELAY_MAX: "5",
    TEMPLATE_NAME: "hello_world",
    TEMPLATE_LANG: "en_US",
    TEMPLATE_PARAMS: "[NAMA]\n[NAMA_SALES]",
    MAX_MESSAGES: 1000
};

const SHEET_EXCLUDE = ["FLP", "SETTING", "LOG"];

const DATA_SAMPLING_ENC = [
    { nama: "RWNvIEFkaWd1bmE=", hp: "MDgyMzEzMjI4ODc1" },
    { nama: "c2lzaWxpYQ==", hp: "MDgyMTk3NTQyOTMy" },
    { nama: "U2lnaXQgcHJpeW9ubw==", hp: "MDgxMjc4ODcyNTY2" },
    { nama: "QXJiZXJ0", hp: "MDg5NTEyODEyNDM1" },
    { nama: "RmVyZHk=", hp: "MDg3ODg4OTc1MTg0" }
];

const DATA_SAMPLING = DATA_SAMPLING_ENC.map(item => ({
    nama: Utilities.newBlob(Utilities.base64Decode(item.nama)).getDataAsString(),
    hp: formatPhoneNumber(Utilities.newBlob(Utilities.base64Decode(item.hp)).getDataAsString())
}));

// ===== 1. MENU =====
function onOpen() {
    SpreadsheetApp.getUi()
        .createMenu("WA Cloud Meta")
        .addItem("Pengaturan Global", "openFormGlobal")
        .addItem("Pengaturan Per Sheet", "openFormPerSheet")
        .addItem("Test Kirim Template (Sheet Aktif)", "testKirim")
        .addToUi();
}

// ------------------------------
function getDataSheets() {
    return SpreadsheetApp.getActiveSpreadsheet()
        .getSheets()
        .filter(s => !SHEET_EXCLUDE.includes(s.getName()))
        .map(s => s.getName());
}

// ------------------------------
function openFormGlobal() {
    const props = PropertiesService.getDocumentProperties();
    const token = props.getProperty("WA_TOKEN") || DEFAULTS.WA_TOKEN;
    const phoneId = props.getProperty("WA_PHONE_ID") || DEFAULTS.WA_PHONE_ID;
    const verifyToken = props.getProperty("WA_VERIFY_TOKEN") || DEFAULTS.WA_VERIFY_TOKEN;
    const wabaId = props.getProperty("WA_WABA_ID") || DEFAULTS.WA_WABA_ID;
    const noNotif = props.getProperty("NO_HP_NOTIF") || DEFAULTS.NO_HP_NOTIF;
    const extraSamplesRaw = props.getProperty("EXTRA_SAMPLES") || "[]";

    let extraSamples = [];
    try { extraSamples = JSON.parse(extraSamplesRaw); } catch (e) { }

    let displayName = "Belum terhubung";
    let displayPhone = "-";
    if (token && phoneId && wabaId) {
        try {
            const phoneUrl = "https://graph.facebook.com/v18.0/" + phoneId + "?fields=display_phone_number,verified_name";
            const phoneRes = UrlFetchApp.fetch(phoneUrl, { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
            if (phoneRes.getResponseCode() === 200) {
                const phoneData = JSON.parse(phoneRes.getContentText());
                displayName = phoneData.verified_name || displayName;
                displayPhone = phoneData.display_phone_number || displayPhone;
            }
        } catch (e) { }
    }

    const sampleRows = extraSamples.map((s, i) =>
        `<div style="display:flex;gap:8px;margin-bottom:6px;">
          <input type="text" id="sampleName_${i}" value="${s.nama || ''}" placeholder="Nama" style="flex:1;">
          <input type="text" id="sampleHp_${i}" value="${s.hp || ''}" placeholder="08xxx" style="flex:1;">
          <button type="button" onclick="removeSample(${i})" style="padding:8px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;width:auto;">Hapus</button>
        </div>`
    ).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <style>
    body { font-family: sans-serif; padding: 16px; color: #333; }
    label { font-weight: bold; font-size: 13px; display: block; margin-top: 12px; margin-bottom: 4px; }
    input { width: 100%; padding: 8px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
    button { background: #008CBA; color: white; padding: 11px; border: none; cursor: pointer; border-radius: 4px; margin-top: 12px; font-weight: bold; width: 100%; font-size: 14px; }
    button.secondary { background: #6b7280; }
    button.add { background: #10b981; width: auto; padding: 8px 16px; margin-top: 8px; }
    #status { text-align: center; margin-top: 10px; font-weight: bold; color: green; }
    .info-box { background: #e8f4f8; padding: 12px; border-radius: 4px; margin-bottom: 12px; border: 1px solid #bce8f1; }
    .sample-section { background: #f9fafb; padding: 12px; border-radius: 4px; border: 1px solid #e5e7eb; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="info-box">
    <div><b>Akun Meta:</b> ${displayName}</div>
    <div style="font-size:12px;color:#555;"><b>Nomor:</b> ${displayPhone}</div>
  </div>

  <button class="secondary" onclick="toggleEdit()" id="btnToggle">Edit Konfigurasi</button>

  <div id="editForm" style="display:none; margin-top:10px;">
    <label>WhatsApp Access Token:</label>
    <input type="text" id="token" value="${token}" placeholder="EAAB...">

    <label>Phone Number ID:</label>
    <input type="text" id="phoneId" value="${phoneId}" placeholder="1234567890">

    <label>WhatsApp Business Account ID (WABA ID):</label>
    <input type="text" id="wabaId" value="${wabaId}" placeholder="Untuk API Load Template">

    <label>Verify Token (Untuk Webhook):</label>
    <input type="text" id="verifyToken" value="${verifyToken}" placeholder="my_secure_token">

    <label>Nomor HP Admin (Notifikasi):</label>
    <input type="text" id="noNotif" value="${noNotif}" placeholder="Contoh: 6282313228875">

    <div class="sample-section">
      <label>Nomor Sample Tambahan (untuk Test Kirim):</label>
      <div id="sampleContainer">${sampleRows}</div>
      <button type="button" class="add" onclick="addSample()">+ Tambah Sample</button>
    </div>

    <button id="btn" onclick="simpan()">Simpan Pengaturan Global</button>
  </div>

  <div id="status"></div>

  <script>
    var sampleCount = ${extraSamples.length};
    function toggleEdit() {
      var form = document.getElementById('editForm');
      var btn = document.getElementById('btnToggle');
      var shown = form.style.display !== 'none';
      form.style.display = shown ? 'none' : 'block';
      btn.innerText = shown ? 'Edit Konfigurasi' : 'Tutup Edit';
    }
    function addSample() {
      var container = document.getElementById('sampleContainer');
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;';
      div.innerHTML = '<input type="text" id="sampleName_' + sampleCount + '" placeholder="Nama" style="flex:1;">' +
                      '<input type="text" id="sampleHp_' + sampleCount + '" placeholder="08xxx" style="flex:1;">' +
                      '<button type="button" onclick="removeSample(' + sampleCount + ')" style="padding:8px;background:#dc2626;color:white;border:none;border-radius:4px;cursor:pointer;width:auto;">Hapus</button>';
      container.appendChild(div);
      sampleCount++;
    }
    function removeSample(idx) {
      var el = document.getElementById('sampleName_' + idx);
      if (el && el.parentElement) el.parentElement.remove();
    }
    function simpan() {
      var btn = document.getElementById('btn');
      btn.disabled = true;
      btn.innerText = 'Menyimpan...';
      var samples = [];
      for (var i = 0; i < sampleCount; i++) {
        var nameEl = document.getElementById('sampleName_' + i);
        var hpEl = document.getElementById('sampleHp_' + i);
        if (nameEl && hpEl && nameEl.value.trim() && hpEl.value.trim()) {
          samples.push({ nama: nameEl.value.trim(), hp: hpEl.value.trim() });
        }
      }
      google.script.run
        .withSuccessHandler(function(msg) {
          document.getElementById('status').innerText = msg;
          btn.innerText = 'Berhasil!';
          setTimeout(function() { google.script.host.close(); }, 1200);
        })
        .withFailureHandler(function(e) {
          alert('Error: ' + e);
          btn.disabled = false;
          btn.innerText = 'Simpan Pengaturan Global';
        })
        .simpanPengaturanGlobal({
          token : document.getElementById('token').value.trim(),
          phoneId : document.getElementById('phoneId').value.trim(),
          verifyToken : document.getElementById('verifyToken').value.trim(),
          wabaId : document.getElementById('wabaId').value.trim(),
          noNotif: document.getElementById('noNotif').value.trim(),
          extraSamples: JSON.stringify(samples)
        });
    }
  </script>
</body>
</html>`;

    SpreadsheetApp.getUi().showModalDialog(
        HtmlService.createHtmlOutput(html).setWidth(560).setHeight(640),
        "Pengaturan Global Meta API"
    );
}

function simpanPengaturanGlobal(data) {
    const props = PropertiesService.getDocumentProperties();
    props.setProperty("WA_TOKEN", data.token);
    props.setProperty("WA_PHONE_ID", data.phoneId);
    props.setProperty("WA_VERIFY_TOKEN", data.verifyToken);
    props.setProperty("WA_WABA_ID", data.wabaId);
    props.setProperty("NO_HP_NOTIF", data.noNotif);
    
    // Simpan sample tambahan (JSON array)
    if (data.extraSamples) {
        props.setProperty("EXTRA_SAMPLES", data.extraSamples);
    }
    
    return "Pengaturan global berhasil disimpan!";
}

// ------------------------------
function openFormPerSheet() {
    const html = '<!DOCTYPE html>' +
    '<html><head><base target="_top"><style>' +
    '* { box-sizing: border-box; }' +
    'body { font-family: sans-serif; padding: 12px; color: #333; font-size: 13px; margin: 0; }' +
    '.tab-bar { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #008CBA; }' +
    '.tab-btn { padding: 6px 14px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; color: #555; }' +
    '.tab-btn.active { background: #008CBA; color: white; border-color: #008CBA; }' +
    '.tab-panel { display: none; }' +
    '.tab-panel.active { display: block; }' +
    'label { font-weight: bold; display: block; margin-top: 10px; margin-bottom: 3px; color: #444; }' +
    'input[type="text"], select, textarea { width: 100%; padding: 7px; border: 1px solid #ccc; border-radius: 4px; font-family: sans-serif; font-size: 13px; }' +
    'input[type="number"] { padding: 7px; border: 1px solid #ccc; border-radius: 4px; font-family: sans-serif; font-size: 13px; }' +
    'textarea { height: 75px; resize: none; }' +
    '.toggle-wrap { display: flex; align-items: center; gap: 8px; margin-top: 10px; padding: 8px; background: #f0f8ff; border-radius: 4px; border: 1px solid #c8e6fa; }' +
    '.toggle-wrap input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; }' +
    '.toggle-wrap span { font-weight: bold; color: #006494; }' +
    '.delay-wrap { display: flex; align-items: center; gap: 8px; margin-top: 4px; }' +
    '.delay-wrap input[type="number"] { width: 72px; }' +
    '.delay-wrap span { color: #555; }' +
    '.info { font-size: 11px; color: #555; background: #f9f9f9; padding: 6px 8px; border-left: 3px solid #008CBA; margin-bottom: 4px; line-height: 1.5; }' +
    'code { background: #e0e0e0; padding: 1px 4px; border-radius: 3px; color: #c62828; font-weight: bold; }' +
    '.btn-simpan { background: #008CBA; color: white; padding: 11px; border: none; cursor: pointer; border-radius: 4px; margin-top: 14px; font-weight: bold; width: 100%; font-size: 14px; }' +
    '.btn-simpan:hover { background: #007B9E; }' +
    '.btn-simpan:disabled { background: #ccc; cursor: not-allowed; }' +
    '#status { text-align: center; margin-top: 8px; font-weight: bold; color: green; }' +
    '.flex-row { display: flex; gap: 8px; }' +
    '.flex-col { flex: 1; }' +
    '#loading { text-align: center; padding: 40px; font-size: 14px; color: #555; }' +
    '</style></head><body>' +
    '<div id="loading">Memuat data konfigurasi...</div>' +
    '<div id="app" style="display:none">' +
    '  <div class="tab-bar" id="tabBar"></div>' +
    '  <div id="tabContent"></div>' +
    '  <button class="btn-simpan" id="btnSimpan" onclick="simpanSemua()">Simpan Semua Konfigurasi</button>' +
    '  <div id="status"></div>' +
    '</div>' +
    '<script>' +
    'var G = {};' +
    'window.addEventListener("load", function() {' +
    '  google.script.run' +
    '    .withSuccessHandler(function(data) {' +
    '      G.daftarSheet   = data.daftarSheet;' +
    '      G.allConfig     = data.allConfig;' +
    '      G.defaultParams = data.defaultParams;' +
    '      G.defaultDelMin = data.defaultDelMin;' +
    '      G.defaultDelMax = data.defaultDelMax;' +
    '      G.tList         = data.templateList;' +
    '      G.templateError = data.templateError || "";' +
    '      buildUI();' +
    '      document.getElementById("loading").style.display = "none";' +
    '      document.getElementById("app").style.display = "block";' +
    '    })' +
    '    .withFailureHandler(function(e) {' +
    '      document.getElementById("loading").innerHTML = "<b style=\\"color:red\\">Error: " + e + "</b>";' +
    '    })' +
    '    .getSheetFormData();' +
    '});' +
    'function buildUI() {' +
    '  var tabBar     = document.getElementById("tabBar");' +
    '  var tabContent = document.getElementById("tabContent");' +
    '  var tmplOpts = "";' +
    '  for (var t = 0; t < G.tList.length; t++) {' +
    '    var tt = G.tList[t];' +
    '    var valStr = tt.name + "|" + tt.lang + "|" + tt.vars + "|" + (tt.img ? "1" : "0");' +
    '    tmplOpts += "<option value=\\"" + valStr + "\\">" + tt.name + " (" + tt.lang + ")</option>";' +
    '  }' +
    '  for (var idx = 0; idx < G.daftarSheet.length; idx++) {' +
    '    (function(idx) {' +
    '      var name    = G.daftarSheet[idx];' +
    '      var cfg     = G.allConfig[name] || {};' +
    '      var cfgDelMin = (cfg.delayMin !== undefined && cfg.delayMin !== "") ? parseInt(cfg.delayMin) : G.defaultDelMin;' +
    '      var cfgDelMax = (cfg.delayMax !== undefined && cfg.delayMax !== "") ? parseInt(cfg.delayMax) : G.defaultDelMax;' +
    '      var cfgJam    = parseInt(cfg.jam !== undefined ? cfg.jam : 8);' +
    '      var btn = document.createElement("button");' +
    '      btn.className = "tab-btn" + (idx === 0 ? " active" : "");' +
    '      btn.innerText = name;' +
    '      btn.onclick   = function() { switchTab(idx); };' +
    '      tabBar.appendChild(btn);' +
    '      var jamOptions = "";' +
    '      for (var j = 0; j < 24; j++) {' +
    '        jamOptions += "<option value=\\"" + j + "\\"" + (j === cfgJam ? " selected" : "") + ">" + (j < 10 ? "0" + j : j) + ":00</option>";' +
    '      }' +
    '      var panel = document.createElement("div");' +
    '      panel.className = "tab-panel" + (idx === 0 ? " active" : "");' +
    '      panel.id = "panel_" + idx;' +
    '      panel.innerHTML =' +
    '        "<div class=\\"toggle-wrap\\">" +' +
    '          "<input type=\\"checkbox\\" id=\\"aktif_" + idx + "\\"" + (cfg.aktif !== false ? " checked" : "") + ">" +' +
    '          "<span>Aktifkan pengiriman untuk sheet ini</span>" +' +
    '        "</div>" +' +
    '        "<label>Jam Kirim Otomatis:</label>" +' +
    '        "<select id=\\"jam_" + idx + "\\">" + jamOptions + "</select>" +' +
    '        "<label>Delay Antar Pesan (detik):</label>" +' +
    '        "<div class=\\"delay-wrap\\">" +' +
    '          "<input type=\\"number\\" id=\\"delayMin_" + idx + "\\" value=\\"" + cfgDelMin + "\\" min=\\"1\\" max=\\"300\\"> " +' +
    '          "<span>s/d</span> " +' +
    '          "<input type=\\"number\\" id=\\"delayMax_" + idx + "\\" value=\\"" + cfgDelMax + "\\" min=\\"1\\" max=\\"300\\"> " +' +
    '          "<span>detik</span>" +' +
    '        "</div>" +' +
    '        "<div style=\\"margin-top:10px;background:#e8f4f8;padding:8px;border:1px solid #bce8f1;border-radius:4px;\\">" +' +
    '            "<label style=\\"margin-top:0;\\">Pilih Template Meta:</label>" +' +
    '            "<select id=\\"tmplSelect_" + idx + "\\" onchange=\\"pilihTmpl(" + idx + ", this.value)\\">" +' +
    '              "<option value=\\"\\">-- Pilih Template Meta --</option>" + tmplOpts + "</select>" +' +
    '            (tmplOpts ? "" : "<div style=\\"margin-top:6px;color:#b00020;font-size:12px;\\">" + (G.templateError || "Template Meta belum tersedia") + "</div>") +' +
    '          "</div>" +' +
    '        "<div class=\\"flex-row\\" style=\\"margin-top:10px;\\">" +' +
    '          "<div class=\\"flex-col\\">" +' +
    '            "<label>Nama Template Meta:</label>" +' +
    '            "<input type=\\"text\\" id=\\"tplName_" + idx + "\\" placeholder=\\"promo_merdeka\\" readonly style=\\"background:#f3f4f6;\\">" +' +
    '          "</div>" +' +
    '          "<div class=\\"flex-col\\">" +' +
    '            "<label>Kode Bahasa:</label>" +' +
    '            "<input type=\\"text\\" id=\\"tplLang_" + idx + "\\" placeholder=\\"id / en_US\\" readonly style=\\"background:#f3f4f6;\\">" +' +
    '          "</div>" +' +
    '        "</div>" +' +
    '        "<label>Parameter Template (1 variabel per baris):</label>" +' +
    '        "<div class=\\"info\\">Urutan variabel {{1}}, {{2}} di Meta.<br/>Variabel: <code>[NAMA]</code>, <code>[NAMA_SALES]</code>, <code>[HP_SALES]</code></div>" +' +
    '        "<textarea id=\\"params_" + idx + "\\" rows=\\"3\\"></textarea>" +' +
    '        "<label>Header Image URL (Opsional):</label>" +' +
    '        "<div class=\\"info\\">Isi jika template memiliki Header Image</div>" +' +
    '        "<input type=\\"text\\" id=\\"img_" + idx + "\\" placeholder=\\"https://...gambar.jpg\\">";' +
    '      panel.querySelector("#tplName_" + idx).value = cfg.templateName || "hello_world";' +
    '      panel.querySelector("#tplLang_" + idx).value = cfg.templateLang || "id";' +
    '      panel.querySelector("#params_" + idx).value  = cfg.params !== undefined ? cfg.params : G.defaultParams;' +
    '      panel.querySelector("#img_" + idx).value     = cfg.imageUrl || "";' +
    '      var selInit = panel.querySelector("#tmplSelect_" + idx);' +
    '      if (selInit && cfg.templateName && cfg.templateLang) {' +
    '        for (var oi = 0; oi < selInit.options.length; oi++) {' +
    '          var ov = selInit.options[oi].value || "";' +
    '          if (ov.indexOf(cfg.templateName + "|" + cfg.templateLang + "|") === 0) {' +
    '            selInit.selectedIndex = oi; break;' +
    '          }' +
    '        }' +
    '      }' +
    '      tabContent.appendChild(panel);' +
    '    })(idx);' +
    '  }' +
    '}' +
    'function switchTab(idx) {' +
    '  var btns   = document.querySelectorAll(".tab-btn");' +
    '  var panels = document.querySelectorAll(".tab-panel");' +
    '  for (var i = 0; i < btns.length; i++) { btns[i].classList.toggle("active", i === idx); }' +
    '  for (var i = 0; i < panels.length; i++) { panels[i].classList.toggle("active", i === idx); }' +
    '}' +
    'function pilihTmpl(idx, val) {' +
    '  if (!val) return;' +
    '  var parts = val.split("|");' +
    '  var tName = parts[0], tLang = parts[1], varsCount = parseInt(parts[2] || 0), hasImg = parts[3] === "1";' +
    '  document.getElementById("tplName_" + idx).value = tName;' +
    '  document.getElementById("tplLang_" + idx).value = tLang;' +
    '  var paramArea = document.getElementById("params_" + idx);' +
    '  var currentLines = paramArea.value.split("\\n").filter(function(l) { return l.trim() !== ""; });' +
    '  var defaultVars = ["[NAMA]", "[NAMA_SALES]", "[HP_SALES]"];' +
    '  var newParams = [];' +
    '  for (var i = 0; i < varsCount; i++) {' +
    '    newParams.push((i < currentLines.length && currentLines[i]) ? currentLines[i] : (defaultVars[i] || "[CUSTOM_VAR]"));' +
    '  }' +
    '  paramArea.value = newParams.join("\\n");' +
    '  var imgInput = document.getElementById("img_" + idx);' +
    '  if (hasImg && imgInput.value.trim() === "") {' +
    '    imgInput.value = "https://...taruh-link-gambar.jpg";' +
    '    imgInput.style.border = "2px solid red";' +
    '  } else if (!hasImg) {' +
    '    imgInput.value = "";' +
    '    imgInput.style.border = "1px solid #ccc";' +
    '  }' +
    '}' +
    'function simpanSemua() {' +
    '  var btn = document.getElementById("btnSimpan");' +
    '  btn.disabled = true;' +
    '  btn.innerText = "Menyimpan...";' +
    '  var valid = true;' +
    '  for (var idx = 0; idx < G.daftarSheet.length; idx++) {' +
    '    var mn = parseInt(document.getElementById("delayMin_" + idx).value);' +
    '    var mx = parseInt(document.getElementById("delayMax_" + idx).value);' +
    '    if (isNaN(mn) || isNaN(mx) || mn < 1 || mx < 1 || mn > mx) {' +
    '      alert("Sheet \\"" + G.daftarSheet[idx] + "\\": Delay min harus >= 1 dan min <= max!");' +
    '      valid = false; break;' +
    '    }' +
    '  }' +
    '  if (!valid) { btn.disabled = false; btn.innerText = "Simpan Semua Konfigurasi"; return; }' +
    '  var result = {};' +
    '  for (var idx = 0; idx < G.daftarSheet.length; idx++) {' +
    '    var name = G.daftarSheet[idx];' +
    '    var sel2 = document.getElementById("tmplSelect_" + idx);' +
    '    var parts2 = (sel2 && sel2.value) ? sel2.value.split("|") : [];' +
    '    var tName = parts2[0] || document.getElementById("tplName_" + idx).value.trim();' +
    '    var tLang = parts2[1] || document.getElementById("tplLang_" + idx).value.trim();' +
    '    result[name] = {' +
    '      aktif       : document.getElementById("aktif_"    + idx).checked,' +
    '      jam         : document.getElementById("jam_"      + idx).value,' +
    '      delayMin    : parseInt(document.getElementById("delayMin_" + idx).value),' +
    '      delayMax    : parseInt(document.getElementById("delayMax_" + idx).value),' +
    '      templateName: tName,' +
    '      templateLang: tLang,' +
    '      params      : document.getElementById("params_"   + idx).value,' +
    '      imageUrl    : document.getElementById("img_"      + idx).value.trim()' +
    '    };' +
    '  }' +
    '  google.script.run' +
    '    .withSuccessHandler(function(msg) {' +
    '      document.getElementById("status").innerText = msg;' +
    '      btn.innerText = "Berhasil!";' +
    '      setTimeout(function() { google.script.host.close(); }, 1500);' +
    '    })' +
    '    .withFailureHandler(function(e) {' +
    '      alert("Error: " + e);' +
    '      btn.disabled = false;' +
    '      btn.innerText = "Simpan Semua Konfigurasi";' +
    '    })' +
    '    .simpanKonfigurasiSheet(JSON.stringify(result));' +
    '}' +
    '<\/script></body></html>';

    SpreadsheetApp.getUi().showModalDialog(
        HtmlService.createHtmlOutput(html).setWidth(520).setHeight(700),
        "Pengaturan Per Sheet (Meta API)"
    );
}

function getSheetFormData() {
    const props = PropertiesService.getDocumentProperties();
    const token = props.getProperty("WA_TOKEN");
    const wabaId = props.getProperty("WA_WABA_ID");

    let templateList = [];
    let templateError = "";

    if (!token || !wabaId) {
        templateError = "WA_TOKEN / WA_WABA_ID belum diisi di Pengaturan Global.";
    } else {
        try {
            const url = "https://graph.facebook.com/v18.0/" + wabaId + "/message_templates?fields=name,language,components,status&limit=100";
            const res = UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
            const status = res.getResponseCode();

            if (status === 200) {
                const json = JSON.parse(res.getContentText());
                if (json.data) {
                    templateList = json.data
                        .filter(t => (t.status || "APPROVED") === "APPROVED")
                        .map(t => {
                            let bodyVarsCount = 0;
                            let hasImage = false;
                            if (t.components) {
                                for (let c of t.components) {
                                    if (c.type === "BODY" && c.text) {
                                        const match = c.text.match(/\{\{\d+\}\}/g);
                                        if (match) bodyVarsCount = match.length;
                                    }
                                    if (c.type === "HEADER" && c.format === "IMAGE") hasImage = true;
                                }
                            }
                            return { name: t.name, lang: t.language, vars: bodyVarsCount, img: hasImage };
                        });
                }
                if (templateList.length === 0) {
                    templateError = "Template APPROVED tidak ditemukan di WABA ini.";
                }
            } else {
                templateError = "Gagal load template Meta (HTTP " + status + "). Cek token / WABA ID.";
            }
        } catch (e) {
            templateError = "Error load template Meta: " + e.toString();
        }
    }

    return {
        daftarSheet  : getDataSheets(),
        allConfig    : getAllSheetConfig(),
        defaultParams: DEFAULTS.TEMPLATE_PARAMS,
        defaultDelMin: parseInt(DEFAULTS.DELAY_MIN),
        defaultDelMax: parseInt(DEFAULTS.DELAY_MAX),
        templateList : templateList,
        templateError: templateError
    };
}

function getAllSheetConfig() {
    const props = PropertiesService.getDocumentProperties();
    const sheets = getDataSheets();
    const result = {};
    sheets.forEach(name => {
        const raw = props.getProperty("SHEET_CFG_" + name);
        result[name] = raw ? JSON.parse(raw) : {
            aktif: true,
            templateName: DEFAULTS.TEMPLATE_NAME,
            templateLang: DEFAULTS.TEMPLATE_LANG,
            params: DEFAULTS.TEMPLATE_PARAMS,
            imageUrl: "",
            jam: DEFAULTS.JAM_TRIGGER,
            delayMin: parseInt(DEFAULTS.DELAY_MIN),
            delayMax: parseInt(DEFAULTS.DELAY_MAX),
        };
    });
    return result;
}

function simpanKonfigurasiSheet(dataJson) {
    const props = PropertiesService.getDocumentProperties();
    const config = JSON.parse(dataJson);
    Object.keys(config).forEach(sheetName => {
        props.setProperty("SHEET_CFG_" + sheetName, JSON.stringify(config[sheetName]));
    });
    setupTriggerHarian();
    return "Konfigurasi per sheet berhasil disimpan!";
}

// ------------------------------
function sendSemuaSheet() {
    const startTime = new Date().getTime();
    const props = PropertiesService.getDocumentProperties();
    
    const token = props.getProperty("WA_TOKEN");
    const phoneId = props.getProperty("WA_PHONE_ID");
    if (!token || !phoneId) {
        Logger.log("Token & Phone ID belum diatur!");
        return;
    }

    const noHpNotif = props.getProperty("NO_HP_NOTIF") || "";
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetFLP = ss.getSheetByName("FLP");
    const mapSales = sheetFLP ? _buildSalesMap(sheetFLP) : {};
    const timezone = Session.getScriptTimeZone();
    const todayStr = Utilities.formatDate(new Date(), timezone, "dd/MM/yyyy");
    const jamSekarang = new Date().getHours();
    const isManual = _isManualRun();

    // Jika dijalankan manual (via menu), paksa reset state resume agar proses tidak nyangkut 
    // di sisa antrean/timeout sheet waktu eksekusi sebelumnya.
    if (isManual) {
        props.deleteProperty("RESUME_STATE");
        props.deleteProperty("RESUME_COUNTER");
    }

    const lastSamplingDate = props.getProperty("LAST_SAMPLING_DATE");
    let samplingSudahDikirim = (lastSamplingDate === todayStr);

    const dataSheets = getDataSheets();
    const allConfig = getAllSheetConfig();

    // ======================================
    //     LOGIC LIMIT BULANAN (1000)
    // ======================================
    const monthYearStr = Utilities.formatDate(new Date(), timezone, "MM/yyyy");
    const lastMonthStr = props.getProperty("WA_MONTHLY_LIMIT_PERIOD");
    
    // Jika ganti bulan, reset counter bulanan menjadi 0
    if (lastMonthStr !== monthYearStr) {
        props.setProperty("WA_MONTHLY_LIMIT_PERIOD", monthYearStr);
        props.setProperty("WA_MONTHLY_LIMIT_COUNT", "0");
    }

    // Ambil berpaa banyak yang sudah terkirim bulan ini
    let monthlyCount = parseInt(props.getProperty("WA_MONTHLY_LIMIT_COUNT") || "0", 10);
    // ======================================

    const savedCounterRaw = props.getProperty("RESUME_COUNTER");
    let totalCounter = savedCounterRaw
        ? JSON.parse(savedCounterRaw)
        : { success: 0, failed: 0 };

    const resumeRaw = props.getProperty("RESUME_STATE");
    let resumeState = resumeRaw ? JSON.parse(resumeRaw) : null;

    let skipUntilResume = !!resumeState;
    let adaYangDiproses = false;

    for (const sheetName of dataSheets) {
        const cfg = allConfig[sheetName] || {};
        if (!cfg.aktif) continue;

        const jamSheet = parseInt(cfg.jam || DEFAULTS.JAM_TRIGGER, 10);
        if (!isManual && jamSheet !== jamSekarang) continue;

        if (skipUntilResume && resumeState.sheetName !== sheetName) continue;

        const sheet = ss.getSheetByName(sheetName);
        if (!sheet) continue;

        adaYangDiproses = true;
        const rows = _getSheetData(sheet);

        const delayMin = (parseInt(cfg.delayMin) || parseInt(DEFAULTS.DELAY_MIN)) * 1000;
        const delayMax = (parseInt(cfg.delayMax) || parseInt(DEFAULTS.DELAY_MAX)) * 1000;

        const startRow = (skipUntilResume && resumeState.sheetName === sheetName)
            ? resumeState.rowIndex
            : 0;
        skipUntilResume = false;

        for (let i = startRow; i < rows.length; i++) {
            // Cek apakah sudah limit max BULANAN
            if (monthlyCount >= DEFAULTS.MAX_MESSAGES) {
                Logger.log("Batas maksimal bulanan " + DEFAULTS.MAX_MESSAGES + " pesan tercapai!");
                
                // Simpan state saat ini, tapi JANGAN buat resumption trigger
                // Supaya terhenti (biar lanjut bulan depan, atau manual)
                props.setProperty("RESUME_STATE", JSON.stringify({ sheetName, rowIndex: i }));
                props.setProperty("RESUME_COUNTER", JSON.stringify(totalCounter));
                
                _sendNotifikasi(noHpNotif, totalCounter, token, phoneId, true); // Tambah info limit bulanan
                return;
            }

            if (new Date().getTime() - startTime > 270000) {
                props.setProperty("RESUME_STATE", JSON.stringify({ sheetName, rowIndex: i }));
                props.setProperty("RESUME_COUNTER", JSON.stringify(totalCounter));
                _createResumptionTrigger();
                return;
            }

            const row = rows[i];
            const tanggalStr = _formatTanggal(row[0], timezone);
            const namaKonsumen = row[1] ? row[1].toString().trim() : "";
            const noHP = row[2] ? row[2].toString().trim() : "";
            const namaSales = row[3] ? row[3].toString().trim() : "";
            const statusKirim = row[4] ? row[4].toString().trim() : "";

            if (tanggalStr !== todayStr || !noHP || statusKirim === "TERKIRIM") continue;

            const phone = formatPhoneNumber(noHP);
            const hpSales = mapSales[namaSales] || "-";

            const ok = _sendMetaTemplate(phone, cfg, namaKonsumen, namaSales, hpSales, token, phoneId);

            if (ok) {
                totalCounter.success++;
                monthlyCount++; // tambah 1 ke hitungan bulanan
                props.setProperty("WA_MONTHLY_LIMIT_COUNT", monthlyCount.toString());
                
                sheet.getRange(2 + i, 5).setValue("TERKIRIM");
                SpreadsheetApp.flush();

                if (!samplingSudahDikirim) {
                    DATA_SAMPLING.forEach(sample => {
                        let sampleOk = _sendMetaTemplate(sample.hp, cfg, sample.nama, namaSales, hpSales, token, phoneId);
                        if (sampleOk) {
                            monthlyCount++;
                            props.setProperty("WA_MONTHLY_LIMIT_COUNT", monthlyCount.toString());
                        }
                    });
                    props.setProperty("LAST_SAMPLING_DATE", todayStr);
                    samplingSudahDikirim = true;
                }

                const delayMs = Math.floor(Math.random() * (delayMax - delayMin + 1)) + delayMin;
                Utilities.sleep(delayMs);

            } else {
                totalCounter.failed++;
                monthlyCount++; // Gagal pun tetap dihitung load dari Meta
                props.setProperty("WA_MONTHLY_LIMIT_COUNT", monthlyCount.toString());
            }
        }
    }

    props.deleteProperty("RESUME_STATE");
    props.deleteProperty("RESUME_COUNTER");
    _deleteAllTriggers();
    setupTriggerHarian();
    _sendNotifikasi(noHpNotif, totalCounter, token, phoneId);

    const ui = _getUi();
    if (adaYangDiproses) {
        _showResult(ui, totalCounter);
    } else if (ui) {
        ui.alert("Tidak ada sheet yang dijadwalkan pada jam " + jamSekarang + ":00, atau tidak ada data hari ini.");
    }
}

function _isManualRun() {
    try { SpreadsheetApp.getUi(); return true; } catch (e) { return false; }
}

function testKirim() {
    const ui = _getUi();
    if (!ui) return;
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const sheetName = sheet.getName();
    
    if (SHEET_EXCLUDE.includes(sheetName)) {
        ui.alert("Ini adalah sheet " + sheetName + ". Silakan buka sheet data (selain FLP/SETTING/LOG) untuk melakukan test!");
        return;
    }

    const allConfig = getAllSheetConfig();
    const cfg = allConfig[sheetName] || {};
    
    if (!cfg.templateName || !cfg.templateLang) {
        ui.alert("Template untuk sheet " + sheetName + " belum diatur!");
        return;
    }
    
    const props = PropertiesService.getDocumentProperties();
    const token = props.getProperty("WA_TOKEN");
    const phoneId = props.getProperty("WA_PHONE_ID");
    
    if (!token || !phoneId) {
        ui.alert("Token & Phone ID belum disetting di Pengaturan Global!");
        return;
    }

    let extraSamples = [];
    try {
        extraSamples = JSON.parse(props.getProperty("EXTRA_SAMPLES") || "[]");
    } catch (e) { }

    const mergedSamples = [...DATA_SAMPLING, ...extraSamples.map(s => ({
        nama: s.nama || "Sample",
        hp: formatPhoneNumber(s.hp || "")
    }))].filter(s => s.hp);
    
    let successCount = 0;
    ui.alert("Proses mengirim pesan test ke nomor sampling...");
    
    mergedSamples.forEach(sample => {
        let ok = _sendMetaTemplate(sample.hp, cfg, sample.nama, "NamaSalesTest", "08123456789", token, phoneId);
        if (ok) successCount++;
    });
    
    ui.alert("Test Kirim Selesai!\\nBerhasil mengirim ke " + successCount + " dari " + mergedSamples.length + " nomor sample.");
}

function testKirimDebugRamadan() {
    const ui = _getUi();
    if (!ui) return;
    
    const props = PropertiesService.getDocumentProperties();
    const token = props.getProperty("WA_TOKEN");
    const phoneId = props.getProperty("WA_PHONE_ID");
    
    if (!token || !phoneId) {
        ui.alert("Token & Phone ID belum disetting di Pengaturan Global!");
        return;
    }
    
    const sample = DATA_SAMPLING[0];
    const url = "https://graph.facebook.com/v18.0/" + phoneId + "/messages";
    
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: sample.hp,
        type: "template",
        template: {
            name: "promoh2_ramadan",
            language: { code: "id" },
            components: [
                {
                    type: "header",
                    parameters: [
                        {
                            type: "image",
                            image: { link: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800&q=80" } // Link JPG asli
                        }
                    ]
                },
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: sample.nama }
                    ]
                }
            ]
        }
    };
    
    const options = {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + token },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };
    
    try {
        ui.alert("Memproses request debug...");
        const response = UrlFetchApp.fetch(url, options);
        const code = response.getResponseCode();
        const text = response.getContentText();
        
        const html = '<textarea style="width:100%;height:350px;font-family:monospace;">' + 
                     'HTTP STATUS: ' + code + '\\n\\n' +
                     '--RESPONSE META--\\n' + text + '\\n\\n' +
                     '--PAYLOAD SENT--\\n' + JSON.stringify(payload, null, 2) + 
                     '</textarea>';
                     
        ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(600).setHeight(400), "Debug promoh2_ramadan");
    } catch (e) {
        ui.alert("ERROR KONEKSI: " + e.toString());
    }
}

function checkTemplateStatus() {
    const ui = SpreadsheetApp.getUi();
    const props = PropertiesService.getDocumentProperties();
    const token = props.getProperty("WA_TOKEN");
    const wabaId = props.getProperty("WA_WABA_ID");
    
    if (!token || !wabaId) {
        ui.alert("Token atau WABA ID belum diatur!");
        return;
    }
    
    const url = "https://graph.facebook.com/v18.0/" + wabaId + "/message_templates?name=promo_h1_maret";
    
    try {
        const res = UrlFetchApp.fetch(url, { headers: { Authorization: "Bearer " + token }, muteHttpExceptions: true });
        const json = JSON.parse(res.getContentText());
        
        if (json.data && json.data.length > 0) {
            const t = json.data[0];
            const fullJson = JSON.stringify(t, null, 2);
            let info = "NAMA: " + t.name + "\\nSTATUS: " + t.status + "\\nBAHASA: " + t.language;
            
            if (t.status !== "APPROVED") {
                info += "\\n\\nâš ï¸ PERHATIAN: Template belum di-APPROVED.";
            } else {
                info += "\\n\\nâœ… Template sudah Approved.";
            }
            
            const html = '<div style="font-family:sans-serif;">' +
                         '<h3>' + info.replace(/\\n/g, '<br>') + '</h3>' +
                         '<p>Salin JSON lengkap di bawah ini untuk saya analisa:</p>' +
                         '<textarea style="width:100%;height:300px;font-family:monospace;">' + fullJson + '</textarea>' +
                         '</div>';
            
            ui.showModalDialog(HtmlService.createHtmlOutput(html).setWidth(600).setHeight(500), "Struktur Lengkap Template");
        } else {
            ui.alert("Template 'promoh2_ramadan' tidak ditemukan di akun WABA Anda!");
        }
    } catch (e) {
        ui.alert("Gagal mengecek status: " + e.toString());
    }
}

// ------------------------------
function setupTriggerHarian() {
    _deleteAllTriggers();
    const allConfig = getAllSheetConfig();
    const jamSudahDibuat = new Set();

    Object.keys(allConfig).forEach(sheetName => {
        const cfg = allConfig[sheetName];
        if (!cfg.aktif) return;
        const jam = parseInt(cfg.jam || DEFAULTS.JAM_TRIGGER, 10);
        if (jamSudahDibuat.has(jam)) return;
        ScriptApp.newTrigger("sendSemuaSheet").timeBased().atHour(jam).everyDays(1).create();
        jamSudahDibuat.add(jam);
    });
}

function _createResumptionTrigger() {
    ScriptApp.getProjectTriggers().forEach(t => {
        if (t.getHandlerFunction() === "sendSemuaSheet" && t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) {
            const evType = t.getEventType();
            if (evType === ScriptApp.EventType.CLOCK) {
                try { ScriptApp.deleteTrigger(t); } catch (e) { }
            }
        }
    });
    ScriptApp.newTrigger("sendSemuaSheet").timeBased().after(60000).create();
}

function _deleteAllTriggers() {
    ScriptApp.getProjectTriggers().forEach(t => {
        if (t.getHandlerFunction() === "sendSemuaSheet") ScriptApp.deleteTrigger(t);
    });
}

// ------------------------------
function _getUi() { try { return SpreadsheetApp.getUi(); } catch (e) { return null; } }

function _buildSalesMap(sheet) {
    const map = {};
    sheet.getRange("A:B").getValues().forEach(([n, p]) => {
        if (n) map[n.toString().trim()] = p.toString().trim();
    });
    return map;
}

function _getSheetData(sheet) {
    const last = sheet.getLastRow();
    return last < 2 ? [] : sheet.getRange(2, 1, last - 1, 5).getValues();
}

function _formatTanggal(raw, tz) {
    if (raw instanceof Date) {
        return Utilities.formatDate(raw, tz, "dd/MM/yyyy");
    }
    if (raw) {
        return raw.toString().trim().replace(/-/g, '/');
    }
    return "";
}

function _sendMetaTemplate(phone, cfg, namaKonsumen, namaSales, hpSales, token, phoneId) {
    const url = "https://graph.facebook.com/v18.0/" + phoneId + "/messages";
    
    // Parse parameters
    const rawParams = cfg.params || "";
    const paramLines = rawParams.split(/\r?\n|\\n/);
    const bodyParams = [];
    
    for (const line of paramLines) {
        if (!line.trim()) continue;
        let val = line.trim()
            .replace(/\[NAMA\]/g, namaKonsumen)
            .replace(/\[NAMA_SALES\]/g, namaSales)
            .replace(/\[HP_SALES\]/g, hpSales);
        
        bodyParams.push({
            type: "text",
            text: val
        });
    }
    
    const components = [];
    
    // 1. Header (Opsional Image)
    if (cfg.imageUrl && cfg.imageUrl.trim() !== "") {
        components.push({
            type: "header",
            parameters: [
                {
                    type: "image",
                    image: { link: cfg.imageUrl.trim() }
                }
            ]
        });
    }
    
    // 2. Body parameters
    if (bodyParams.length > 0) {
        components.push({
            type: "body",
            parameters: bodyParams
        });
    }
    
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "template",
        template: {
            name: cfg.templateName,
            language: { code: cfg.templateLang },
            components: components
        }
    };
    
    const options = {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + token },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };
    
    try {
        const response = UrlFetchApp.fetch(url, options);
        Logger.log(response.getContentText());
        return response.getResponseCode() === 200 || response.getResponseCode() === 201;
    } catch (e) {
        Logger.log("Error API: " + e.toString());
        return false;
    }
}

function _sendWhatsAppMessage(phone, messageText, token, phoneId) {
    const url = "https://graph.facebook.com/v18.0/" + phoneId + "/messages";
    const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: phone,
        type: "text",
        text: { preview_url: false, body: messageText }
    };
    const options = {
        method: "post",
        contentType: "application/json",
        headers: { Authorization: "Bearer " + token },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
    };
    try {
        const response = UrlFetchApp.fetch(url, options);
        return response.getResponseCode() === 200 || response.getResponseCode() === 201;
    } catch (e) { return false; }
}

function _sendNotifikasi(no, counter, token, phoneId, hitLimit = false) {
    if (!no) return;
    let msg = "*[LAPORAN HARIAN META API]*\\nâœ… Berhasil: " + counter.success + "\\nâŒ Gagal: " + counter.failed;
    
    // Ambil sisa kuota bulanan untuk diinformasikan
    const props = PropertiesService.getDocumentProperties();
    let monthlyCount = parseInt(props.getProperty("WA_MONTHLY_LIMIT_COUNT") || "0", 10);
    let sisaKuota = DEFAULTS.MAX_MESSAGES - monthlyCount;
    if (sisaKuota < 0) sisaKuota = 0;
    
    msg += "\\nðŸ“Š *Sisa Kuota Bulanan*: " + sisaKuota + " / " + DEFAULTS.MAX_MESSAGES + " pesan";

    if (hitLimit) {
        msg += "\\n\\nâš ï¸ *PERHATIAN*: Batas maksimal " + DEFAULTS.MAX_MESSAGES + " pesan BULANAN telah tercapai. Sistem akan berhenti mengirim pesan hingga tanggal 1 bulan depan.";
    }
    _sendWhatsAppMessage(formatPhoneNumber(no), msg, token, phoneId);
}

function _showResult(ui, counter) {
    if (ui) ui.alert("Proses Selesai!\\nBerhasil: " + counter.success + "\\nGagal: " + counter.failed);
}

function formatPhoneNumber(phone) {
    if (!phone) return null;
    let d = phone.toString().replace(/\D/g, "");
    if (d.startsWith("62")) return d;
    if (d.startsWith("0")) return "62" + d.slice(1);
    return "62" + d;
}

// ------------------------------
function doGet(e) {
    const props = PropertiesService.getDocumentProperties();
    const verifyToken = props.getProperty("WA_VERIFY_TOKEN") || DEFAULTS.WA_VERIFY_TOKEN;
    if (e.parameter['hub.mode'] === 'subscribe' && e.parameter['hub.verify_token'] === verifyToken) {
        return ContentService.createTextOutput(e.parameter['hub.challenge']);
    }
    return ContentService.createTextOutput("Invalid verify token").setStatusCode(403);
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        if (data.object === 'whatsapp_business_account') {
            for (const entry of data.entry) {
                for (const change of entry.changes) {
                    if (change.value && change.value.messages) {
                        const messages = change.value.messages;
                        for (const msg of messages) {
                            const from = msg.from;
                            const text = msg.text ? msg.text.body : "";
                            Logger.log("Received message from " + from + ": " + text);
                            
                            // Auto reply jika dibutuhkan:
                            // const props = PropertiesService.getDocumentProperties();
                            // const token = props.getProperty("WA_TOKEN");
                            // const phoneId = props.getProperty("WA_PHONE_ID");
                            // if (token && phoneId) {
                            //    _sendWhatsAppMessage(from, "Pesan Anda diterima.", token, phoneId);
                            // }
                        }
                    }
                }
            }
        }
        return ContentService.createTextOutput("EVENT_RECEIVED").setStatusCode(200);
    } catch (error) {
        Logger.log("Error in doPost: " + error.toString());
        return ContentService.createTextOutput("error").setStatusCode(500);
    }
}

