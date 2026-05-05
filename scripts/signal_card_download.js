/* ============================================================
   STREET SIGNALS — Signal Card Image Download
   --------------------------------------------------------------
   Drop this script into the Street Signals page. It:
     1. Injects a "Download Image" button into every .signal-card
        footer (and .priority-signal-card-footer if you want).
     2. On click, generates a 1080×1080 LinkedIn-ready PNG that
        mirrors the card's data, with the news/ticker treatment.
     3. Triggers a browser download of the PNG.

   Dependencies:
     - html2canvas (loaded from CDN at runtime, cached after first use)
     - Inter font (already loaded by the site as Satoshi fallback)

   Usage:
     <script src="signal_card_download.js" defer></script>

   No build step. No backend. Works on the live static site.
   ============================================================ */

(function () {
  "use strict";

  // ---------- Config ----------
  const HTML2CANVAS_CDN =
    "/assets/vendor/html2canvas.min.js";
  const LOGO_URL = window.SS_LOGO_URL || "/assets/nextfi_logo_navy.png";
  // ^^ point this to wherever you serve the logo from on the live site,
  //    or set window.SS_LOGO_URL to a base64 data URL for inline embedding
  const SITE_URL = "streetsignals.nextfiadvisors.com";
  const BUTTON_LABEL = "Download";
  const CARD_SELECTORS = [
    ".signal-card",            // catalogue cards
    ".priority-signal-card",   // priority cards (optional - delete if not wanted)
  ];

  // ---------- Style for the injected button ----------
  const buttonStyle = `
    .ss-download-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: #1e3263;
      color: #fff;
      border: none;
      border-radius: 6px;
      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.15s, transform 0.15s;
      white-space: nowrap;
    }
    .ss-download-btn:hover { background: #2a4180; transform: translateY(-1px); }
    .ss-download-btn:active { transform: translateY(0); }
    .ss-download-btn[disabled] { opacity: 0.6; cursor: wait; }
    .ss-download-btn svg { width: 13px; height: 13px; flex-shrink: 0; }

    /* Off-screen render container — never visible to the user */
    .ss-render-stage {
      position: absolute;
      top: 0;
      left: -99999px;
      width: 1080px;
      height: 1080px;
      pointer-events: none;
      overflow: hidden;
    }
  `;

  // ---------- Inject button stylesheet once ----------
  function injectStyle() {
    if (document.getElementById("ss-download-style")) return;
    const s = document.createElement("style");
    s.id = "ss-download-style";
    s.textContent = buttonStyle;
    document.head.appendChild(s);
  }

  // ---------- Lazy-load html2canvas ----------
  let html2canvasReady = null;
  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (html2canvasReady) return html2canvasReady;
    html2canvasReady = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = HTML2CANVAS_CDN;
      s.onload = () => resolve(window.html2canvas);
      s.onerror = () => reject(new Error("Failed to load html2canvas"));
      document.head.appendChild(s);
    });
    return html2canvasReady;
  }

  // ---------- Read field from a card with safe fallback ----------
  function readField(card, selector) {
    const el = card.querySelector(selector);
    return el ? el.innerText.trim() : "";
  }

  function extractTopInitiativeClassifications(card) {
    const rows = card.querySelectorAll(".signal-details-grid > div");
    for (const row of rows) {
      const label = row.querySelector(".signal-details-label")?.innerText?.trim() || "";
      if (/^top initiative relevance$/i.test(label)) {
        return row.querySelector(".signal-details-values")?.innerText?.trim() || "";
      }
    }
    return "";
  }

  function extractInstitutionCategory(card) {
    const segmentChip = Array.from(card.querySelectorAll(".signal-chip-rank"))
      .map((el) => el.innerText.trim())
      .find((text) => /^segment\s+/i.test(text));
    if (segmentChip) return segmentChip.replace(/^segment\s+/i, "").trim();

    const signalTag = readField(card, ".signal-tag");
    if (signalTag) return signalTag;

    const tier = readField(card, ".priority-signal-badge") || readField(card, ".signal-importance-badge");
    return tier || "Institutional";
  }

  // ---------- Extract all relevant fields from a catalogue card ----------
  function extractSignalData(card) {
    return {
      institution:    readField(card, ".signal-institution") ||
                      readField(card, ".priority-signal-card-institution-name"),
      date:           readField(card, ".signal-date") ||
                      readField(card, ".priority-signal-card-date"),
      headline:       readField(card, ".signal-initiative") ||
                      readField(card, ".priority-signal-card-headline"),
      initiative:     readField(card, ".priority-signal-card-initiative") ||
                      extractTopInitiativeClassifications(card),
      momentum:       readField(card, ".signal-momentum-label"),
      momentumScore:  readField(card, ".signal-momentum-score"),
      importance:     readField(card, ".signal-importance-badge") ||
                      readField(card, ".priority-signal-badge"),
      importanceScore:readField(card, ".signal-importance-score"),
      marketLabel:    readField(card, ".signal-market-context-label") || "Market Context",
      marketChip:     readField(card, ".signal-market-context-chip") ||
                      readField(card, ".priority-signal-market-chip"),
      marketConf:     readField(card, ".signal-market-context-confidence") ||
                      readField(card, ".priority-signal-market-confidence"),
      marketSummary:  readField(card, ".signal-market-context-summary"),
      aiInsight:      readField(card, ".signal-ai-insight") ||
                      readField(card, ".priority-signal-card-insight"),
      description:    readField(card, ".signal-description"),
      source:         readField(card, ".signal-source") ||
                      readField(card, ".priority-signal-card-source"),
      institutionCategory: extractInstitutionCategory(card),
      tags:           Array.from(card.querySelectorAll(".signal-tag"))
                          .map(t => t.innerText.trim()).slice(0, 3),
    };
  }

  // ---------- Build the 1080×1080 stage HTML ----------
  function buildStageHTML(data) {
    // Strip "AI WHY THIS MATTERS\n\n" prefix if present
    let insight = data.aiInsight || data.description || "";
    insight = insight.replace(/^AI WHY THIS MATTERS\s*\n+/i, "").trim();
    // Keep full insight; CSS/layout handles containment.
    const description = (data.description || "").trim();
    const initiative = (data.initiative || "").trim();

    const tierBadge = (data.importance || "Signal").toUpperCase();
    const tierClass = tierBadge.toLowerCase().includes("system")
      ? "system" : tierBadge.toLowerCase().includes("direct")
      ? "directional" : tierBadge.toLowerCase().includes("strateg")
      ? "strategic" : tierBadge.toLowerCase().includes("tactic")
      ? "tactical" : "monitoring";

    const showMarket = (data.marketChip && data.marketChip.length > 0) || (data.marketSummary && data.marketSummary.length > 0);

    return `
      <div class="ss-stage-card">
        <!-- Ticker strip -->
        <div class="ss-ticker">
          <div class="ss-live-dot"></div>
          <span class="ss-live-label">Signal · Live</span>
          <div class="ss-ticker-divider"></div>
          <span class="ss-ticker-meta">${escapeHTML(data.date || "")}</span>
          <div class="ss-ticker-divider"></div>
          <span class="ss-ticker-meta">From the Catalogue</span>
          <div class="ss-ticker-spacer"></div>
          <span class="ss-signal-id">${SITE_URL}</span>
        </div>

        <!-- Brand bar -->
        <div class="ss-brand">
          <div class="ss-brand-left">
            <img class="ss-logo" src="${LOGO_URL}" alt="NextFi Advisors" crossorigin="anonymous" />
            <div class="ss-brand-divider"></div>
            <span class="ss-brand-property">Street Signals
              <em>· DLT &amp; Digital Asset Intelligence</em>
            </span>
          </div>
        </div>

        <!-- Inner signal card -->
        <div class="ss-inner">
          <div class="ss-tier-row">
            <span class="ss-tier-badge" data-tier="${tierClass}">${escapeHTML(tierBadge)}</span>
            ${data.momentum ? `
              <span class="ss-momentum">
                <span class="ss-momentum-dot"></span>
                ${escapeHTML(data.momentum)}
              </span>` : ""}
          </div>

          <div class="ss-header">
            <div class="ss-institution">${escapeHTML(data.institution || "")}</div>
            <div class="ss-date">${escapeHTML(data.date || "")}</div>
          </div>

          <h1 class="ss-headline">${escapeHTML(data.headline || "")}</h1>

          ${initiative ? `
            <div class="ss-initiative-row">
              <span class="ss-initiative-label">Initiative Classification</span>
              <span class="ss-initiative-value">${escapeHTML(initiative)}</span>
            </div>
          ` : ""}

          ${showMarket ? `
            <div class="ss-market-context">
              <span class="ss-market-label">${escapeHTML(data.marketLabel || "Market Context")}</span>
              ${data.marketChip ? `<span class="ss-market-chip">${escapeHTML(data.marketChip)}</span>` : ""}
              ${data.marketConf ? `<span class="ss-market-conf">Confidence: ${escapeHTML(data.marketConf)}</span>` : ""}
              ${!data.marketChip && data.marketSummary ? `<span class="ss-market-conf">${escapeHTML(data.marketSummary)}</span>` : ""}
            </div>
          ` : ""}

          <div class="ss-insight">${escapeHTML(insight)}</div>
          ${description ? `<div class="ss-description">${escapeHTML(description)}</div>` : ""}

          <div class="ss-footer">
            <div class="ss-source">
              <span class="ss-source-label">Source</span>
              <span class="ss-source-value">${escapeHTML(data.source || "")}</span>
            </div>
            <div class="ss-catalogue-copy">Signals from the Street | ${escapeHTML(data.institutionCategory || "Institutional")} Catalogue</div>
          </div>
        </div>

        <!-- Outer footer -->
        <div class="ss-outer-footer">
          <span class="ss-outer-tag">Market Intelligence by <strong>NextFi Advisors</strong></span>
          <span class="ss-outer-tag">${SITE_URL}</span>
        </div>
      </div>
    `;
  }

  // ---------- Stage CSS (inlined into the off-screen DOM) ----------
  // Keep this in sync with the HTML template package — they share visual identity.
  const stageStyle = `
    .ss-stage-card {
      width: 1080px; height: 1080px;
      background: #f5f6fa;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1a1c24;
      display: flex; flex-direction: column;
      position: relative; overflow: hidden;
      box-sizing: border-box;
    }
    .ss-stage-card *, .ss-stage-card *::before, .ss-stage-card *::after {
      box-sizing: border-box;
    }

    /* Ticker */
    .ss-ticker {
      background: #1e3263; color: #fff;
      padding: 16px 56px;
      display: flex; align-items: center; gap: 18px;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 12.5px; font-weight: 500; letter-spacing: 0.10em;
    }
    .ss-live-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #cc3366;
    }
    .ss-live-label {
      font-weight: 700; letter-spacing: 0.20em; text-transform: uppercase;
      color: #fff;
    }
    .ss-ticker-divider {
      width: 1px; height: 14px; background: rgba(255,255,255,0.30);
    }
    .ss-ticker-meta {
      color: rgba(255,255,255,0.78);
      text-transform: uppercase; letter-spacing: 0.16em; font-size: 11.5px;
    }
    .ss-ticker-spacer { flex: 1; }
    .ss-signal-id {
      color: rgba(255,255,255,0.55); font-size: 11px; letter-spacing: 0.10em;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
    }

    /* Brand bar */
    .ss-brand {
      padding: 22px 56px;
      background: #fff;
      border-bottom: 1px solid #e7e9ef;
      display: flex; align-items: center;
    }
    .ss-brand-left {
      display: flex; align-items: center; gap: 16px;
    }
    .ss-logo {
      height: 30px; width: auto; display: block;
    }
    .ss-brand-divider {
      width: 1px; height: 22px; background: #e7e9ef;
    }
    .ss-brand-property {
      font-size: 12.5px; font-weight: 700;
      letter-spacing: 0.22em; text-transform: uppercase;
      color: #1e3263;
    }
    .ss-brand-property em {
      font-style: normal; color: #9498a8; font-weight: 500;
    }

    /* Inner card */
    .ss-inner {
      flex: 1;
      margin: 36px 56px 0;
      padding: 34px 40px 28px;
      background: #fff;
      border-radius: 14px;
      border: 1px solid #e7e9ef;
      box-shadow: 0 1px 2px rgba(20,30,60,0.04), 0 8px 24px rgba(20,30,60,0.06);
      display: flex; flex-direction: column;
    }
    .ss-tier-row {
      display: flex; align-items: center; gap: 14px;
      margin-bottom: 22px;
    }
    .ss-tier-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 26px;
      padding: 6px 14px; border-radius: 999px;
      font-size: 11.5px; font-weight: 700;
      letter-spacing: 0.22em; text-transform: uppercase;
      line-height: 1.1;
    }
    .ss-tier-badge[data-tier="system"]      { color: #cc3366; background: rgba(255,92,138,0.14); }
    .ss-tier-badge[data-tier="directional"] { color: #cc9900; background: rgba(255,194,51,0.16); }
    .ss-tier-badge[data-tier="strategic"]   { color: #b07a00; background: rgba(212,160,23,0.14); }
    .ss-tier-badge[data-tier="tactical"]    { color: #2563b3; background: rgba(80,140,220,0.14); }
    .ss-tier-badge[data-tier="monitoring"]  { color: #5d6573; background: rgba(93,101,115,0.10); }

    .ss-momentum {
      display: inline-flex; align-items: center; gap: 7px;
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.18em; text-transform: uppercase;
      color: #ff8c42;
    }
    .ss-momentum-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #ff8c42;
    }

    .ss-header {
      display: flex; align-items: baseline;
      justify-content: space-between; gap: 24px;
      margin-bottom: 18px;
      padding-bottom: 18px;
      border-bottom: 1px solid #e7e9ef;
    }
    .ss-institution {
      font-size: 22px; font-weight: 700;
      color: #1a1c24; line-height: 1.2;
    }
    .ss-date {
      font-size: 14px; font-weight: 500;
      color: #9498a8; white-space: nowrap; flex-shrink: 0;
    }

    .ss-headline {
      font-size: 36px; font-weight: 700;
      line-height: 1.18; letter-spacing: -0.018em;
      color: #1a1c24;
      margin: 0 0 22px 0;
    }

    .ss-initiative-row {
      display: flex; align-items: center; gap: 10px;
      margin: -6px 0 16px;
      padding: 9px 12px;
      border-radius: 8px;
      background: #f7f9fc;
      border: 1px solid #e7e9ef;
    }
    .ss-initiative-label {
      display: inline-flex;
      align-items: center;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase;
      color: #73798a;
      white-space: nowrap;
      line-height: 1.1;
    }
    .ss-initiative-value {
      display: inline-flex;
      align-items: center;
      font-size: 13px; font-weight: 650;
      color: #2a2e3a;
      line-height: 1.25;
    }

    .ss-market-context {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px;
      background: #f7f9fc;
      border: 1px solid #e7e9ef;
      border-radius: 8px;
      margin-bottom: 22px;
      font-size: 13px;
    }
    .ss-market-label {
      display: inline-flex;
      align-items: center;
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 10px; font-weight: 700;
      letter-spacing: 0.14em; text-transform: uppercase;
      color: #73798a;
      white-space: nowrap;
      line-height: 1.1;
    }
    .ss-market-chip {
      display: inline-flex;
      align-items: center;
      font-weight: 700; color: #1a1c24;
      line-height: 1.25;
    }
    .ss-market-conf {
      color: #9498a8; font-size: 12px;
      display: inline-flex; align-items: center;
      line-height: 1.25;
    }

    .ss-insight {
      font-size: 16.5px; line-height: 1.5;
      color: #383b48;
    }

    .ss-description {
      margin-top: 14px;
      font-size: 14px; line-height: 1.45;
      color: #4a4f5f;
      max-height: 145px;
      overflow: hidden;
    }

    .ss-footer {
      margin-top: auto;
      padding-top: 18px;
      border-top: 1px solid #e7e9ef;
      display: flex; align-items: center;
      justify-content: space-between; gap: 16px;
    }
    .ss-source { display: flex; align-items: center; gap: 10px; font-size: 12.5px; }
    .ss-source-label {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      font-size: 10px; font-weight: 600;
      letter-spacing: 0.22em; text-transform: uppercase;
      color: #9498a8;
    }
    .ss-source-value { font-weight: 600; color: #383b48; }
    .ss-catalogue-copy {
      font-size: 10.5px; font-weight: 700;
      letter-spacing: 0.10em; text-transform: uppercase;
      color: #1e3263;
      text-align: right;
      white-space: nowrap;
      line-height: 1.15;
    }

    /* Outer footer */
    .ss-outer-footer {
      padding: 26px 56px 28px;
      display: flex; align-items: center; justify-content: space-between;
      font-size: 12px; color: #9498a8;
    }
    .ss-outer-tag {
      font-family: 'JetBrains Mono', ui-monospace, monospace;
      letter-spacing: 0.16em; text-transform: uppercase;
    }
    .ss-outer-tag strong { color: #1e3263; font-weight: 700; }
  `;

  // ---------- Helpers ----------
  function escapeHTML(s) {
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function slugify(s) {
    return String(s || "signal")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "signal";
  }

  // ---------- Generate and download ----------
  async function generateImage(card, button) {
    const originalLabel = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2 v6 m0 0 -3 -3 m3 3 3 -3" /></svg>Generating…`;

    try {
      console.log("[StreetSignals] Loading html2canvas…");
      const html2canvas = await loadHtml2Canvas();
      console.log("[StreetSignals] html2canvas loaded.");

      const data = extractSignalData(card);

      // Build the off-screen stage
      const stage = document.createElement("div");
      stage.className = "ss-render-stage";
      // Inline style ensures correct positioning even if stylesheet loads late
      stage.style.cssText = "position:absolute;top:0;left:-99999px;width:1080px;height:1080px;pointer-events:none;overflow:hidden;";
      stage.innerHTML = `<style>${stageStyle}</style>${buildStageHTML(data)}`;
      document.body.appendChild(stage);

      // Wait one tick for layout + image load
      await new Promise(r => setTimeout(r, 150));
      // Wait for logo image to load (so it's not blank)
      const logoImg = stage.querySelector("img.ss-logo");
      if (logoImg && !logoImg.complete) {
        await new Promise(r => {
          logoImg.onload = r;
          logoImg.onerror = () => { console.warn("[StreetSignals] Logo failed to load:", LOGO_URL); r(); };
        });
      }
      // Wait for fonts
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      console.log("[StreetSignals] Rendering canvas…");
      const stageCard = stage.querySelector(".ss-stage-card");
      if (!stageCard) throw new Error("Stage card element not found in DOM");

      const canvas = await html2canvas(stageCard, {
        scale: 2,                  // retina output (2160 × 2160)
        backgroundColor: "#f5f6fa",
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: 1080,
        height: 1080,
        scrollX: 0,
        scrollY: 0,
      });
      console.log("[StreetSignals] Canvas rendered:", canvas.width, "×", canvas.height);

      // Trigger download
      const filename = `signal-${slugify(data.institution)}-${slugify(data.date)}.png`;
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");

      // Cleanup
      document.body.removeChild(stage);
    } catch (err) {
      console.error("[StreetSignals] Image generation failed:", err);
      alert("Image generation failed:\n\n" + (err && err.message ? err.message : String(err)));
    } finally {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }
  }

  // ---------- Inject button into a card ----------
  function injectButtonIntoCard(card) {
    if (card.querySelector(".ss-download-btn")) return;  // already injected

    // Find the footer (where to attach the button)
    const footer = card.querySelector(".signal-footer") ||
                   card.querySelector(".priority-signal-card-footer");
    if (!footer) return;

    const btn = document.createElement("button");
    btn.className = "ss-download-btn";
    btn.type = "button";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      ${BUTTON_LABEL}
    `;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      generateImage(card, btn);
    });

    footer.appendChild(btn);
  }

  // ---------- Process all cards on the page ----------
  function processAllCards() {
    CARD_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(injectButtonIntoCard);
    });
  }

  // ---------- Watch for dynamically added cards ----------
  function observeNewCards() {
    const obs = new MutationObserver(() => {
      // Debounce slightly
      clearTimeout(obs._t);
      obs._t = setTimeout(processAllCards, 150);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ---------- Boot ----------
  function init() {
    injectStyle();
    processAllCards();
    observeNewCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
