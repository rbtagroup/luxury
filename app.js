
document.addEventListener("DOMContentLoaded", () => {
  // === CONFIG ===
  const APP_VERSION = "v25_20260417_luxury_themefix";
  const COMMISSION_RATE = 0.30;        // 30 % z netto tržby
  const BASE_FULL_SHIFT = 1000;        // fix pro plnou směnu
  const BASE_HALF_SHIFT = 500;         // fix pro 1/2 směnu
  const THRESHOLD_FULL = 3330;         // hranice, od které se jede % (plná)
  const THRESHOLD_HALF = THRESHOLD_FULL / 2; // hranice pro 1/2 směnu
  const MIN_TRZBA_PER_KM = 15;         // minimum Kč/km

  // === ELEMENTS ===
  const form = document.getElementById("calcForm");
  const output = document.getElementById("output");
  const actions = document.getElementById("actions");
  const resetBtn = document.getElementById("resetBtn");
  const pdfBtn = document.getElementById("pdfExport");
  const shareBtn = document.getElementById("shareBtn");
  const newShiftBtn = document.getElementById("newShiftBtn");
  const themeToggle = document.getElementById("themeToggle");
  const versionEl = document.getElementById("appVersion");
  if (versionEl) versionEl.textContent = `RB TAXI Mobile ${APP_VERSION}`;

  
  // === AUTO KM CALC ===
  const kmStartEl = document.getElementById("kmStart");
  const kmEndEl = document.getElementById("kmEnd");
  const kmRealEl = document.getElementById("kmReal");
  const kmEl = document.getElementById("km");
  const rzEl = document.getElementById("rz");

  function syncKm() {
    const s = parseFloat((kmStartEl?.value || "0").replace(",", ".")) || 0;
    const e = parseFloat((kmEndEl?.value || "0").replace(",", ".")) || 0;
    const real = Math.max(0, e - s);
    if (kmEndEl && e >= s) kmEndEl.setCustomValidity("");
    if (kmRealEl) kmRealEl.value = real;
    if (kmEl) kmEl.value = real;
  }
  kmStartEl && kmStartEl.addEventListener("input", syncKm);
  kmEndEl && kmEndEl.addEventListener("input", syncKm);
// === HELPERS ===
  function getValue(id) {
    const el = document.getElementById(id);
    return el ? (el.value || "").trim() : "";
  }
  function getNumber(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const raw = (el.value || "").trim().replace(/\s/g, "").replace(",", ".");
    const n = parseFloat(raw);
    return isNaN(n) ? 0 : n;
  }
  function canvasToBlob(canvas) {
    return new Promise((resolve, reject) => {
      if (canvas.toBlob) {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Nepodařilo se vytvořit obrázek.")), "image/png");
        return;
      }
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const parts = dataUrl.split(",");
        const binary = atob(parts[1]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        resolve(new Blob([bytes], { type: "image/png" }));
      } catch (err) {
        reject(err);
      }
    });
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  // === THEME (persist + system default) ===
  (function initTheme(){
    const key = "rbThemeLuxuryV25";
    let saved = localStorage.getItem(key) || "dark";
    if (saved === "light") document.body.classList.add("light-mode");
    else document.body.classList.remove("light-mode");
    updateThemeLabel();
    if (themeToggle) {
      const _toggleTheme = () => {
        document.body.classList.toggle("light-mode");
        localStorage.setItem(key, document.body.classList.contains("light-mode") ? "light" : "dark");
        updateThemeLabel();
      };
      themeToggle.addEventListener('click', _toggleTheme, {passive:true});
    }
  })();

  function updateThemeLabel(){
  const isLight = document.body.classList.contains('light-mode');
  const label = isLight ? 'Režim: světlý' : 'Režim: tmavý';
  const emo = isLight ? '🌙' : '🌞';
  const el = document.getElementById('themeToggle');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute("content", isLight ? "#f7f7f3" : "#121212");
  if (el) {
    const icon = document.createElement("span");
    icon.className = "ico";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = emo;
    el.replaceChildren(icon, document.createTextNode(" " + label));
    el.setAttribute("aria-label", `Přepnout na ${isLight ? "tmavý" : "světlý"} režim`);
  }
}

// === SUBMIT ===
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const driver = getValue("driverName");
      const shift = getValue("shiftType");
      const shiftLabelMap = { den: "Denní", noc: "Noční", odpo: "Odpolední", pul: "1/2 směna" };
      const shiftLabel = shiftLabelMap[shift] || shift;
      const kmStart = getNumber("kmStart");
      const kmEnd = getNumber("kmEnd");
      if (kmEndEl) kmEndEl.setCustomValidity("");
      if (kmStartEl) kmStartEl.setCustomValidity("");
      if (kmEnd < kmStart) {
        if (kmEndEl) {
          kmEndEl.setCustomValidity("Konečné km nesmí být nižší než počáteční km.");
          kmEndEl.reportValidity();
          kmEndEl.focus();
        } else {
          alert("Konečné km nesmí být nižší než počáteční km.");
        }
        return;
      }
      const kmReal = Math.max(0, kmEnd - kmStart);
      const km = kmReal;
      const rz = getValue("rz");
      const trzba = getNumber("trzba");
      const pristavne = getNumber("pristavne");
      const palivo = getNumber("palivo");
      const myti = getNumber("myti");
      const kartou = getNumber("kartou");
      const fakturou = getNumber("fakturou");
      const jine = getNumber("jine");

      const netto = trzba - pristavne;
      const minTrzba = km * MIN_TRZBA_PER_KM;
      const nedoplatek = trzba < minTrzba;
      const doplatek = nedoplatek ? (minTrzba - trzba) : 0;

      const isHalf = (shift === "pul");
      const threshold = isHalf ? THRESHOLD_HALF : THRESHOLD_FULL;
      let vyplata = (netto > threshold) ? (netto * COMMISSION_RATE) : (isHalf ? BASE_HALF_SHIFT : BASE_FULL_SHIFT);
      vyplata = Math.round(vyplata * 100) / 100;

      const kOdevzdani = (trzba - palivo - myti - kartou - fakturou - jine - vyplata);
// kOdevzdani set after vyplata
      const datum = new Date().toLocaleString("cs-CZ");
      
      const safeDatum = escapeHtml(datum);
      const safeDriver = escapeHtml(driver);
      const safeShiftLabel = escapeHtml(shiftLabel);
      const safeRz = escapeHtml(rz || "-");
      
      const html = `
        <div class="title"><svg class="icon"><use href="#icon-doc"/></svg> Výčetka řidiče</div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-clock"/></svg></span> Datum:</div><div class="val">${safeDatum}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-user"/></svg></span> Řidič:</div><div class="val">${safeDriver}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Směna:</div><div class="val">${safeShiftLabel}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-car"/></svg></span> RZ:</div><div class="val">${safeRz}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Km začátek:</div><div class="val">${kmStart}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Km konec:</div><div class="val">${kmEnd}</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-road"/></svg></span> Najeté km:</div><div class="val">${km}</div></div>
        <div class="hr"></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-cash"/></svg></span> Tržba:</div><div class="val">${trzba} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-fuel"/></svg></span> Palivo:</div><div class="val">${palivo} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-wash"/></svg></span> Mytí:</div><div class="val">${myti} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-card"/></svg></span> Kartou:</div><div class="val">${kartou} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-doc"/></svg></span> Faktura:</div><div class="val">${fakturou} Kč</div></div>
        <div class="row"><div class="key"><span class="ico"><svg class="icon"><use href="#icon-flag"/></svg></span> Přístavné:</div><div class="val">${pristavne} Kč</div></div>
        <div class="hr"></div>
        <div class="row"><div class="key">K odevzdání:</div><div class="val money-blue">${kOdevzdani.toFixed(2)} Kč</div></div>
        <div class="row"><div class="key">Výplata:</div><div class="val money-green">${vyplata.toFixed(2)} Kč</div></div>
        ${nedoplatek ? `<div class="row"><div class="key">Doplatek řidiče na KM</div><div class="val money-red">${doplatek.toFixed(2)} Kč</div></div>
        <div class="row"><div class="key">K odevzdání celkem (s doplatkem)</div><div class="val money-blue">${(kOdevzdani + doplatek).toFixed(2)} Kč</div></div>` : ``}
      `;

      output.innerHTML = html;
// Add accent classes to key rows based on their label text
try {
  output.querySelectorAll('.row .key').forEach(k => {
    const t = (k.textContent || '').trim();
    if (t.startsWith('K odevzdání')) k.parentElement?.classList.add('accent-odev');
    if (t.startsWith('Výplata')) k.parentElement?.classList.add('accent-pay');
    if (t.startsWith('Doplatek řidiče na KM')) k.parentElement?.classList.add('accent-doplatek');
    if (t.startsWith('K odevzdání celkem')) k.parentElement?.classList.add('accent-grand');
  });
} catch(_e) {}

      output.classList.remove("hidden");
      if (actions) actions.classList.remove("hidden");

    });
  }

  // === BUTTONS ===

// === SHARE AS IMAGE (non-blocking) ===
(function(){
  const btn = document.getElementById('shareImgBtn');
  const output = document.getElementById('output') || document.querySelector('.output') || document.body;
  if (!btn || !output) return;
  btn.addEventListener('click', async () => {
    try {
      if (!window.html2canvas) {
        alert("Export obrázku není dostupný. Zkontrolujte připojení a načtěte aplikaci znovu.");
        return;
      }
      const scale = Math.max(2, Math.floor(window.devicePixelRatio || 2));
      const canvas = await html2canvas(output, { scale, backgroundColor: null, useCORS: true });
      const blob = await canvasToBlob(canvas);

      // 1) Native share with file (https / supported UA)
      const file = window.File ? new File([blob], "vypocet-vycetky.png", { type: "image/png" }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Výčetka řidiče", text: "Výčetka řidiče (PNG)" });
        return;
      }

      // 2) Clipboard as image (some Chromium builds)
      if (navigator.clipboard && window.ClipboardItem) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          alert("Obrázek výčetky byl zkopírován do schránky.");
          return;
        } catch(_e) {}
      }

      // 3) Download fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vypocet-vycetky.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      alert("Sdílení obrázku selhalo: " + (e && e.message ? e.message : e));
    }
  });
})();

  if (resetBtn) resetBtn.addEventListener("click", () => {
    const keepName = document.getElementById("driverName")?.value || "";
    form?.reset();
    if (keepName) document.getElementById("driverName").value = keepName;
    output?.classList.add("hidden");
    actions?.classList.add("hidden");
  });

  if (newShiftBtn) newShiftBtn.addEventListener("click", () => {
    const keepName = document.getElementById("driverName")?.value || "";
    form?.reset();
    if (keepName) document.getElementById("driverName").value = keepName;
    const note = document.getElementById("note");
    if (note) note.value = "";
    output?.classList.add("hidden");
    actions?.classList.add("hidden");
  });

  if (shareBtn) shareBtn.addEventListener("click", async () => {
    try {
      const text = (output && !output.classList.contains("hidden")) ? output.innerText.trim() : "";
      if (!text) { alert("Nejprve vypočítejte výčetku."); return; }
      if (navigator.share) {
        await navigator.share({ title: "Výčetka řidiče", text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        alert("Zkopírováno do schránky.");
      } else {
        const ta = document.createElement("textarea");
        ta.value = text; document.body.appendChild(ta);
        ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
        alert("Zkopírováno do schránky.");
      }
    } catch(e) {
      alert("Sdílení selhalo: " + (e && e.message ? e.message : e));
    }
  });

  if (pdfBtn) pdfBtn.addEventListener("click", () => {
    const node = output;
    if (!node || node.classList.contains("hidden")) { alert("Nejprve vypočítejte výčetku."); return; }
    if (!window.html2canvas || !window.jspdf) { alert("Export PDF není dostupný. Zkontrolujte připojení a načtěte aplikaci znovu."); return; }
    html2canvas(node, { scale: 2, useCORS: true }).then(canvas => {
      const img = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf || {};
      if (!jsPDF) { alert("Chybí jsPDF knihovna."); return; }
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 28;
      const w = pageWidth - margin*2;
      const h = canvas.height * (w / canvas.width);
      pdf.addImage(img, "PNG", margin, margin, w, h, undefined, "FAST");
      pdf.save("RB-TAXI-vycetka.pdf");
    }).catch(e => alert("Export do PDF selhal: " + (e && e.message ? e.message : e)));
  });

  // === SERVICE WORKER (https only) ===
  if ((location.protocol.startsWith("http")) && "serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker.register(`service-worker.js?v=${APP_VERSION}`)
        .then(registration => {
          registration.update().catch(() => undefined);
          registration.addEventListener("updatefound", () => {
            const worker = registration.installing;
            if (!worker) return;
            worker.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                worker.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
          if (registration.waiting) registration.waiting.postMessage({ type: "SKIP_WAITING" });
        })
        .catch(console.warn);
    });
  }
});
