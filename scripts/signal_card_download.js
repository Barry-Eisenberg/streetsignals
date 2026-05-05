/* ============================================================
   STREET SIGNALS — Signal Card Image Download (Canvas 2D)
   --------------------------------------------------------------
   Generates a 1080x1080 LinkedIn-ready PNG by drawing directly
   to a Canvas 2D context — no html2canvas, no off-screen DOM,
   no CSS rendering quirks. Pixel-perfect and deterministic.

   Usage:
     <script src="signal_card_download.js" defer></script>
   ============================================================ */

(function () {
  "use strict";

  // ---------- Config ----------
  const LOGO_URL   = window.SS_LOGO_URL || "/assets/nextfi_logo_navy.png";
  const SITE_URL   = "streetsignals.nextfiadvisors.com";
  const BUTTON_LABEL = "Download";
  const CARD_SELECTORS = [
    ".signal-card",
    ".priority-signal-card",
  ];

  // ---------- Layout constants (1080x1080 canvas) ----------
  const W  = 1080;
  const H  = 1080;
  const SCALE = 2;           // retina — actual canvas pixels = W*SCALE x H*SCALE
  const MX  = 56;            // outer horizontal margin

  const TICKER_H       = 54;
  const BRAND_H        = 74;
  const CARD_GAP_TOP   = 36;
  const OUTER_FOOTER_H = 70;

  const CARD_X  = MX;
  const CARD_Y  = TICKER_H + BRAND_H + CARD_GAP_TOP;  // 164
  const CARD_W  = W - MX * 2;                           // 968
  const CARD_H  = H - CARD_Y - OUTER_FOOTER_H;          // 846

  const CPX = 40;            // card inner padding X
  const CPT = 34;            // card inner padding top
  const CPB = 34;            // card inner padding bottom
  const CX  = CARD_X + CPX; // content X  = 96
  const CW  = CARD_W - CPX * 2; // content W = 888

  // Tier badge colours
  const TIER_COLORS = {
    system:      { text: "#cc3366", bg: "rgba(255,92,138,0.14)" },
    directional: { text: "#cc9900", bg: "rgba(255,194,51,0.16)" },
    strategic:   { text: "#b07a00", bg: "rgba(212,160,23,0.14)" },
    tactical:    { text: "#2563b3", bg: "rgba(80,140,220,0.14)" },
    monitoring:  { text: "#5d6573", bg: "rgba(93,101,115,0.10)" },
  };

  // ---------- Brand colours ----------
  const C = {
    navy:    "#1e3263",
    dark:    "#1a1c24",
    mid:     "#383b48",
    sub:     "#4a4f5f",
    muted:   "#9498a8",
    border:  "#e7e9ef",
    rowBg:   "#f7f9fc",
    bg:      "#f5f6fa",
    white:   "#ffffff",
    accent:  "#ff8c42",
    pink:    "#cc3366",
  };

  // ---------- Button style ----------
  const buttonStyle = `
    .ss-download-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; background: #1e3263; color: #fff;
      border: none; border-radius: 6px; font-family: inherit;
      font-size: 11px; font-weight: 600; letter-spacing: 0.05em;
      text-transform: uppercase; cursor: pointer;
      transition: background 0.15s, transform 0.15s; white-space: nowrap;
    }
    .ss-download-btn:hover  { background: #2a4180; transform: translateY(-1px); }
    .ss-download-btn:active { transform: translateY(0); }
    .ss-download-btn[disabled] { opacity: 0.6; cursor: wait; }
    .ss-download-btn svg { width: 13px; height: 13px; flex-shrink: 0; }
  `;

  function injectStyle() {
    if (document.getElementById("ss-download-style")) return;
    const s = document.createElement("style");
    s.id = "ss-download-style";
    s.textContent = buttonStyle;
    document.head.appendChild(s);
  }

  // ---------- Data extraction ----------
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
      .map(el => el.innerText.trim())
      .find(text => /^segment\s+/i.test(text));
    if (segmentChip) return segmentChip.replace(/^segment\s+/i, "").trim();

    const signalTag = readField(card, ".signal-tag");
    if (signalTag) return signalTag;

    const tier = readField(card, ".priority-signal-badge") || readField(card, ".signal-importance-badge");
    return tier || "Institutional";
  }

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
      importance:     readField(card, ".signal-importance-badge") ||
                      readField(card, ".priority-signal-badge"),
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
    };
  }

  // ---------- Canvas helpers ----------
  function loadImage(src) {
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /** Draw a rounded rect path. Call ctx.fill() / ctx.stroke() after. */
  function roundRectPath(ctx, x, y, w, h, r) {
    const R = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + R, y);
    ctx.lineTo(x + w - R, y);
    ctx.arcTo(x + w, y,     x + w, y + R,     R);
    ctx.lineTo(x + w, y + h - R);
    ctx.arcTo(x + w, y + h, x + w - R, y + h, R);
    ctx.lineTo(x + R, y + h);
    ctx.arcTo(x,     y + h, x,     y + h - R, R);
    ctx.lineTo(x,     y + R);
    ctx.arcTo(x,     y,     x + R, y,         R);
    ctx.closePath();
  }

  /**
   * Split text into lines that fit within maxWidth.
   * Respects existing newlines in the source string.
   */
  function getWrappedLines(ctx, text, maxWidth) {
    const paragraphs = String(text || "").split(/\n+/);
    const lines = [];
    for (const para of paragraphs) {
      if (!para.trim()) continue;
      const words = para.split(/\s+/);
      let line = "";
      for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  // ---------- Drawing sections ----------

  function drawTicker(ctx, data) {
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, 0, W, TICKER_H);

    const MY = TICKER_H / 2;
    ctx.textBaseline = "middle";

    let tx = MX;

    // Live dot
    ctx.fillStyle = C.pink;
    ctx.beginPath();
    ctx.arc(tx + 4, MY, 4, 0, Math.PI * 2);
    ctx.fill();
    tx += 18;

    // "SIGNAL . LIVE"
    ctx.fillStyle = C.white;
    ctx.font = "bold 12px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText("SIGNAL  .  LIVE", tx, MY);
    tx += ctx.measureText("SIGNAL  .  LIVE").width + 18;

    // divider
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.fillRect(tx, MY - 7, 1, 14);
    tx += 19;

    // Date
    const dateStr = (data.date || "").toUpperCase();
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "500 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText(dateStr, tx, MY);
    tx += ctx.measureText(dateStr).width + 18;

    // divider
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.fillRect(tx, MY - 7, 1, 14);
    tx += 19;

    // "FROM THE CATALOGUE"
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText("FROM THE CATALOGUE", tx, MY);

    // Site URL — right
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(SITE_URL, W - MX, MY);
    ctx.textAlign = "left";
  }

  function drawBrandBar(ctx, logo) {
    const BY = TICKER_H;

    ctx.fillStyle = C.white;
    ctx.fillRect(0, BY, W, BRAND_H);

    // Bottom border
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, BY + BRAND_H);
    ctx.lineTo(W, BY + BRAND_H);
    ctx.stroke();

    const MY = BY + BRAND_H / 2;
    ctx.textBaseline = "middle";
    let bx = MX;

    if (logo) {
      const LH = 30;
      const LW = Math.round((logo.width / logo.height) * LH);
      ctx.drawImage(logo, bx, MY - LH / 2, LW, LH);
      bx += LW + 16;
    }

    // Vertical divider
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bx, MY - 11);
    ctx.lineTo(bx, MY + 11);
    ctx.stroke();
    bx += 16;

    // Brand name
    ctx.fillStyle = C.navy;
    ctx.font = "bold 12px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("STREET SIGNALS", bx, MY);
    const ssW = ctx.measureText("STREET SIGNALS").width;

    ctx.fillStyle = C.muted;
    ctx.font = "500 12px 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.fillText("  .  DLT & Digital Asset Intelligence", bx + ssW, MY);
  }

  function drawCard(ctx, data) {
    // Shadow
    ctx.save();
    ctx.shadowColor = "rgba(20,30,60,0.10)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = C.white;
    roundRectPath(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 14);
    ctx.fill();
    ctx.restore();

    // Border
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    roundRectPath(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 14);
    ctx.stroke();

    // Clip to card
    ctx.save();
    roundRectPath(ctx, CARD_X, CARD_Y, CARD_W, CARD_H, 14);
    ctx.clip();

    let cy = CARD_Y + CPT;

    // ---- Tier badge ----
    const importanceText = (data.importance || "Signal").toUpperCase();
    const tierKey = importanceText.toLowerCase().includes("system")     ? "system"
                  : importanceText.toLowerCase().includes("direct")     ? "directional"
                  : importanceText.toLowerCase().includes("strateg")    ? "strategic"
                  : importanceText.toLowerCase().includes("tactic")     ? "tactical"
                  : "monitoring";
    const tier = TIER_COLORS[tierKey];

    const BADGE_H   = 26;
    const BADGE_PAD = 14;
    ctx.font = "bold 11px 'Inter', -apple-system, sans-serif";
    const badgeTextW = ctx.measureText(importanceText).width;
    const badgeW     = badgeTextW + BADGE_PAD * 2;

    ctx.fillStyle = tier.bg;
    roundRectPath(ctx, CX, cy, badgeW, BADGE_H, 999);
    ctx.fill();

    ctx.fillStyle = tier.text;
    ctx.textBaseline = "middle";
    ctx.fillText(importanceText, CX + BADGE_PAD, cy + BADGE_H / 2);

    // Momentum
    if (data.momentum) {
      const mText = data.momentum.toUpperCase();
      const DOT_X = CX + badgeW + 16 + 3;
      const DOT_Y = cy + BADGE_H / 2;
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.arc(DOT_X, DOT_Y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "bold 11px 'Inter', -apple-system, sans-serif";
      ctx.fillStyle = C.accent;
      ctx.textBaseline = "middle";
      ctx.fillText(mText, DOT_X + 10, DOT_Y);
    }

    cy += BADGE_H + 20;

    // ---- Institution + Date ----
    ctx.textBaseline = "alphabetic";
    ctx.font = "bold 21px 'Inter', -apple-system, sans-serif";
    ctx.fillStyle = C.dark;
    ctx.fillText(data.institution || "", CX, cy + 21);

    ctx.font = "500 13px 'Inter', -apple-system, sans-serif";
    ctx.fillStyle = C.muted;
    ctx.textAlign = "right";
    ctx.fillText(data.date || "", CX + CW, cy + 21);
    ctx.textAlign = "left";

    cy += 21 + 16;

    // Divider below institution
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CX, cy);
    ctx.lineTo(CX + CW, cy);
    ctx.stroke();
    cy += 18;

    // ---- Headline ----
    ctx.font = "bold 34px 'Inter', -apple-system, sans-serif";
    ctx.fillStyle = C.dark;
    ctx.textBaseline = "alphabetic";
    const LH_H = 34 * 1.18;
    const hLines = getWrappedLines(ctx, data.headline || "", CW);
    const hShown = Math.min(hLines.length, 3);
    for (let i = 0; i < hShown; i++) {
      ctx.fillText(hLines[i], CX, cy + LH_H * (i + 1) - 6);
    }
    cy += hShown * LH_H + 22;

    // ---- Initiative row ----
    if (data.initiative) {
      const ROW_H = 42;
      ctx.fillStyle = C.rowBg;
      roundRectPath(ctx, CX, cy, CW, ROW_H, 8);
      ctx.fill();
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1;
      roundRectPath(ctx, CX, cy, CW, ROW_H, 8);
      ctx.stroke();

      const rMY = cy + ROW_H / 2;
      ctx.textBaseline = "middle";
      ctx.font = "bold 10px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillStyle = "#73798a";
      ctx.fillText("INITIATIVE CLASSIFICATION", CX + 14, rMY);

      ctx.font = "700 13px 'Inter', -apple-system, sans-serif";
      ctx.fillStyle = "#2a2e3a";
      ctx.fillText(data.initiative, CX + 232, rMY);

      cy += ROW_H + 14;
    }

    // ---- Market context row ----
    const marketText = data.marketChip || data.marketSummary || "";
    if (marketText) {
      const ROW_H = 42;
      ctx.fillStyle = C.rowBg;
      roundRectPath(ctx, CX, cy, CW, ROW_H, 8);
      ctx.fill();
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1;
      roundRectPath(ctx, CX, cy, CW, ROW_H, 8);
      ctx.stroke();

      const rMY = cy + ROW_H / 2;
      ctx.textBaseline = "middle";

      ctx.font = "bold 10px 'JetBrains Mono', ui-monospace, monospace";
      ctx.fillStyle = "#73798a";
      ctx.fillText("MARKET CONTEXT", CX + 14, rMY);

      // Measure confidence text so chip doesn't overlap
      const confStr = data.marketConf ? "Confidence: " + data.marketConf : "";
      ctx.font = "12px 'Inter', -apple-system, sans-serif";
      const confW = confStr ? ctx.measureText(confStr).width + 24 : 0;

      // Chip text — truncate to fit
      const chipMaxW = CW - 186 - confW - 20;
      ctx.font = "bold 13px 'Inter', -apple-system, sans-serif";
      ctx.fillStyle = C.dark;
      let chipText = marketText;
      while (chipText.length > 4 && ctx.measureText(chipText).width > chipMaxW) {
        chipText = chipText.slice(0, -1);
      }
      if (chipText !== marketText) chipText = chipText.trimEnd() + "\u2026";
      ctx.fillText(chipText, CX + 186, rMY);

      if (confStr) {
        ctx.font = "12px 'Inter', -apple-system, sans-serif";
        ctx.fillStyle = C.muted;
        ctx.textAlign = "right";
        ctx.fillText(confStr, CX + CW - 14, rMY);
        ctx.textAlign = "left";
      }

      cy += ROW_H + 20;
    }

    // ---- Footer — pinned to card bottom ----
    const FOOTER_H = 44;
    const FOOTER_Y = CARD_Y + CARD_H - CPB - FOOTER_H;
    const BODY_MAX_Y = FOOTER_Y - 14;

    // ---- AI Insight ----
    let insight = (data.aiInsight || "").replace(/^AI WHY THIS MATTERS\s*\n+/i, "").trim();
    if (!insight) insight = (data.description || "").trim();

    if (insight && cy < BODY_MAX_Y - 30) {
      const LH = Math.round(15.5 * 1.48);
      ctx.font = "15.5px 'Inter', -apple-system, sans-serif";
      ctx.fillStyle = C.mid;
      ctx.textBaseline = "alphabetic";

      const lines    = getWrappedLines(ctx, insight, CW);
      const avail    = BODY_MAX_Y - cy;
      const maxLines = Math.min(lines.length, Math.floor(avail / LH), 5);

      for (let i = 0; i < maxLines; i++) {
        ctx.fillText(lines[i], CX, cy + LH * (i + 1) - 4);
      }
      cy += maxLines * LH + 14;
    }

    // ---- Description (fills remaining space) ----
    const desc = (data.description || "").trim();
    if (desc && desc !== insight && cy < BODY_MAX_Y - 30) {
      const LH = Math.round(14 * 1.48);
      ctx.font = "14px 'Inter', -apple-system, sans-serif";
      ctx.fillStyle = C.sub;
      ctx.textBaseline = "alphabetic";

      const lines    = getWrappedLines(ctx, desc, CW);
      const avail    = BODY_MAX_Y - cy;
      const maxLines = Math.min(lines.length, Math.floor(avail / LH));

      for (let i = 0; i < maxLines; i++) {
        ctx.fillText(lines[i], CX, cy + LH * (i + 1) - 4);
      }
    }

    // ---- Card footer ----
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CX, FOOTER_Y);
    ctx.lineTo(CX + CW, FOOTER_Y);
    ctx.stroke();

    const FMY = FOOTER_Y + FOOTER_H / 2;
    ctx.textBaseline = "middle";

    ctx.font = "bold 10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = C.muted;
    ctx.fillText("SOURCE", CX, FMY);

    ctx.font = "600 12px 'Inter', -apple-system, sans-serif";
    ctx.fillStyle = C.mid;
    ctx.fillText(data.source || "", CX + 72, FMY);

    const catCopy = "SIGNALS FROM THE STREET  |  "
      + (data.institutionCategory || "Institutional").toUpperCase()
      + " CATALOGUE";
    ctx.font = "bold 10px 'Inter', -apple-system, sans-serif";
    ctx.fillStyle = C.navy;
    ctx.textAlign = "right";
    ctx.fillText(catCopy, CX + CW, FMY);
    ctx.textAlign = "left";

    ctx.restore(); // end clip
  }

  function drawOuterFooter(ctx) {
    const FMY = H - OUTER_FOOTER_H / 2;
    ctx.textBaseline = "middle";
    ctx.font = "500 11px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = C.muted;
    ctx.fillText("MARKET INTELLIGENCE BY NEXTFI ADVISORS", MX, FMY);

    ctx.textAlign = "right";
    ctx.fillText(SITE_URL.toUpperCase(), W - MX, FMY);
    ctx.textAlign = "left";
  }

  // ---------- Helpers ----------
  function slugify(s) {
    return String(s || "signal")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "signal";
  }

  // ---------- Main render ----------
  async function generateImage(card, button) {
    const originalHTML = button.innerHTML;
    button.disabled = true;
    button.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 2 v6 m0 0 -3 -3 m3 3 3 -3" />
      </svg>Generating...`;

    try {
      const data = extractSignalData(card);

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const logo = await loadImage(LOGO_URL);

      // Retina canvas: draw at 2x, export at 2160x2160
      const canvas = document.createElement("canvas");
      canvas.width  = W * SCALE;
      canvas.height = H * SCALE;
      const ctx = canvas.getContext("2d");
      ctx.scale(SCALE, SCALE);

      // Background
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      drawTicker(ctx, data);
      drawBrandBar(ctx, logo);
      drawCard(ctx, data);
      drawOuterFooter(ctx);

      const filename = "signal-"
        + slugify(data.institution) + "-"
        + slugify(data.date) + ".png";

      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href     = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, "image/png");

    } catch (err) {
      console.error("[StreetSignals] Export failed:", err);
      alert("Export failed:\n" + (err && err.message ? err.message : String(err)));
    } finally {
      button.disabled = false;
      button.innerHTML = originalHTML;
    }
  }

  // ---------- Button injection ----------
  function injectButtonIntoCard(card) {
    if (card.querySelector(".ss-download-btn")) return;

    const footer = card.querySelector(".signal-footer") ||
                   card.querySelector(".priority-signal-card-footer");
    if (!footer) return;

    const btn = document.createElement("button");
    btn.className = "ss-download-btn";
    btn.type = "button";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      ${BUTTON_LABEL}
    `;
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      generateImage(card, btn);
    });
    footer.appendChild(btn);
  }

  function processAllCards() {
    CARD_SELECTORS.forEach(sel =>
      document.querySelectorAll(sel).forEach(injectButtonIntoCard)
    );
  }

  function observeNewCards() {
    const obs = new MutationObserver(() => {
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
