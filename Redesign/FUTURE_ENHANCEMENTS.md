# SftS — Future Enhancements & Recommendations

A running list of recommended follow-up work for the redesigned site, plus a
detailed spec for a LinkedIn share-card feature. Companion document to
`REDESIGN_NOTES.md`.

Last updated: May 9, 2026

---

## Completed Changes (May 2026)

The following items from the redesign and stabilization cycle are now complete
in production:

1. **Signal routing outage resolved.** Fixed a template-literal syntax error in
   `js/routes-signals.js` that prevented route registration and caused
   "Route not found" on `#/signals` routes.

2. **CDN cache bypass deployed for routing fix.** Updated the app to load
   `./js/routes-signals-v2.js` from `index.html` so Netlify edge cache served a
   guaranteed fresh route module immediately.

3. **Signal detail copy cleanup shipped.** Description rendering now removes
   trailing `…` / `...` artifacts before display for cleaner readability.

4. **Share-card description cleanup shipped.** PNG card generation now strips
   trailing `…` / `...` from the description text before rendering.

5. **Truncation transparency added.** Signals marked
   `description_truncated: true` now show a user-facing note in detail view:
   "Full article available at source — preview only."

6. **Detail-view styling support added.** Added `.detail-truncation-note` style
   treatment in `css/app.css` for the preview-only message.

7. **Dedicated analytics route launched.** Added `/analytics` as a first-class
   route with chart-heavy views for signal momentum, FMI distribution, and
   source coverage, plus date-window URL state.

---

## Recommended Follow-Up Actions

### Content & Taxonomy

1. **Resolve the 31.6% unmapped signals.** Run the suggestions in
   `SftS_Signal_Coverage_Analysis.xlsx` (Tab 3) through a human review pass
   — start with the Structural/Material rows. Many are genuine "Crypto /
   Digital Assets" or "Digital Asset Strategy" signals that may warrant a
   4th playbook theme.
    **Status: in progress (kickoff May 10, 2026).**
    - Completed: baseline snapshot captured (30.1% unmapped; Structural 26,
       Material 87, Context 100, Noise 3).
    - Completed: reviewer rubric and reason-code standard published in
       `docs/unmapped-signal-review-rubric.md`.
    - Completed: review intake template added in
       `data/unmapped_review_template.csv`.

2. **Add a Tokenized Funds sourcing plan.** All 3 Tokenized plays are
   signal-starved (<25 each). Add 4–6 RSS sources focused on Asset Managers
   (BlackRock IR, Franklin Templeton press, Apollo, Fidelity Digital
   Assets) and tokenization platforms (Securitize, Ondo, Centrifuge) to
   thicken the evidence base.

3. **Re-tag the Stablecoins Play 1 evidence.** It has 100+ signals but
   ~99% Context — either the bar for "Material" is too high for B2B
   treasury signals, or these are mostly news commentary rather than real
   institutional moves. Sample 20 and decide.

4. **Fix institution mis-tagging.** The "Mastercard / GoMining" signal on
   the Hub priority strip is an upstream attribution bug — the article is
   about GoMining but tagged as Mastercard because a Mastercard exec
   spoke. Tighten the institution-inference rules in
   `scripts/update_signals.py`.

5. **Normalize the 37 non-ISO date strings** in `data.json` (e.g.,
   "2024 (expanded through 2025-2026)", "Q3 2025"). The prototype's
   parser handles them, but normalizing them in the source removes
   ambiguity and improves recency scoring accuracy.

### Product Features

6. **Add a watchlist / alerts feature.** Let users save institutions,
   themes, or specific tier+theme combos and get email/Slack
   notifications when matching new signals land. The natural conversion
   path from "browser of signals" to "subscriber of intelligence."

7. **Build the real Positioning Radar.** The current radar uses public
   signal density as a public demo. Build the private version with:
   proprietary positioning weights, qualitative interview inputs,
   multi-institution comparison (up to 3), and a downloadable PDF brief.
   Highest-leverage productized service offering.

8. **Add an `/analytics` route** for the chart-heavy views currently
   buried in the live site (signal momentum over time, FMI distribution
   heatmap, source coverage). Keep them out of the Hub, give them a
   dedicated home. **Status: complete (May 9, 2026).**

9. **Country/region facet in the Signals workspace.** The schema supports
   it, the live site has a Country Directory, but the prototype doesn't
   expose country as a filter. Add it as a fourth filter group in the
   workspace rail.

10. **Signal-level "Discuss with NextFi" capture.** When a user clicks
    "Discuss with NextFi" on any signal detail page, route to a contact
    form pre-populated with the signal id, theme, and recommended play —
    so the BD pipeline knows what specifically caught the user's
    attention.

11. **LinkedIn share-card generation (core available; optimize next)** — see detailed spec below.

### Data Infrastructure

12. **Server-compute importance scores nightly** instead of client-side.
    The score formula currently lives in `js/data.js` and recomputes on
    every page load. Move it into `scripts/update_signals.py` so the JSON
    ships with `importance_score`, `tier`, and `_themes` baked in. Faster
    page loads, single source of truth, and lets non-web consumers (Slack
    bots, email digests) use the same scoring.

13. **Fix the `change_30d` bug in `market_overlay.json`.** Bridge volume
    showing 18M% delta is a Dune query issue. The UI caps display at
    >+5,000% so it never embarrasses you, but fix at the source.

14. **Persist persona and theme preferences.** Currently in-memory only
    because the preview iframe blocks localStorage. In the production
    Netlify deploy, re-enable storage so a returning user lands with
    their preferred persona already applied.

15. **Track signal-level engagement.** Add GA4 events for: signal opens,
    "Read source" clicks, "Read full Playbook" clicks per signal id.
    After 30 days you'll know which signals actually convert into
   playbook reads — feedback into the recommendation engine.
   **Status: complete (May 9, 2026).**

### Strategic / GTM

16. **Weekly digest email.** Auto-compile each persona's top 5
    Structural+Material signals from the week into a branded email. The
    newsletter is the most natural distribution surface for SftS — the
    site is the index, the email is the routine.

17. **Per-institution intelligence pages.** `/institutions/{slug}`
    showing every signal for that firm, plus a mini-radar against their
    peer group. Useful for sales calls and for prospects evaluating
    "what do you know about us?"

18. **Open the methodology repo more loudly.** The taxonomy is already
    public on GitHub, but it's buried. A dedicated
    `/methodology/taxonomy` page that renders the JSON Schema
    human-readably would differentiate SftS from competitors who treat
    scoring as a black box.

19. **A/B test the Hub priority strip.** Test "freshest Structural"
    (current) vs. "highest-importance score regardless of recency" vs.
    "personalized to the visitor's persona on arrival" — the priority
    strip is the primary navigation funnel and worth optimizing.

---

## LinkedIn Share-Card Generation — Detailed Spec

Generate a LinkedIn-ready 1200×627px PNG directly from any signal detail
page. Closes the loop between "I read this" and "I posted about this," and
makes every shared signal a recognizable SftS-branded asset in users'
feeds.

### Three Implementation Options

#### Option A — Pure client-side via HTML2Canvas (~60 lines, zero infra)

Already in the repo: `/assets/vendor/html2canvas.min.js` is bundled. Use it.

1. Build a hidden `<div id="share-card">` template at the bottom of the
   signal detail page, styled to exactly 1200×627 with the share-card
   design.
2. On "Share to LinkedIn" click:
   ```js
   html2canvas(el, { scale: 2 })
     .then(canvas => canvas.toBlob(b => {
       const a = document.createElement('a');
       a.href = URL.createObjectURL(b);
       a.download = `sfts-${signalId}.png`;
       a.click();
     }));
   ```
3. After download, open
   `https://www.linkedin.com/sharing/share-offsite/?url={signal-url}` in a
   new tab so the user attaches the freshly-downloaded image.

**Pros:** zero backend, ships in hours, fully styleable in CSS.
**Cons:** rendered fonts depend on the browser having loaded Cabinet
Grotesk / Satoshi at draw time (usually fine post-page-load).

#### Option B — Server-side via a Netlify Function (~1 day)

A `/api/share-card?id={signal-id}` endpoint using `@vercel/og` or
Puppeteer that returns a fresh PNG. Bonus: becomes the `og:image` meta tag
too, so when users paste a signal URL into LinkedIn, the unfurl preview
auto-generates beautifully — no manual image upload needed.

**Pros:** OG-image side-effect is huge for organic reach. Deterministic
font rendering.
**Cons:** new infra surface (Netlify Functions, ~$0/mo at current volume
but a thing to maintain).

#### Option C — Public image generator (Bannerbear / Placid / og.dev)

Pre-build a template, hit their API with signal data, get back a PNG URL.

**Pros:** zero code, prettiest output.
**Cons:** ~$30–50/mo subscription, vendor lock-in for a small feature.

### Recommended Path

**Start with Option A.** A few hours of work, dependency already in repo,
covers 90% of the value. If posting traction is good after a few weeks,
upgrade to Option B for the OG-image win.

### Share-Card Design

Keep it readable on mobile feeds (LinkedIn is 60%+ mobile):

| Position | Content |
|---|---|
| Top-left | SftS logomark + "Signals from the Street" wordmark |
| Top-right | Tier badge ("STRUCTURAL" / "MATERIAL") + theme tag |
| Center (60% of canvas) | Signal headline in big display type, max 3 lines, auto-truncated |
| Below headline | Institution name + date |
| Bottom strip | "Why this matters" snippet, ~120 chars, muted body type |
| Bottom-right | `streetsignals.nextfiadvisors.com` + small NextFi logo |

**Theme variants:** left-edge bar in violet/green/orange to match the
playbook theme. Dark background (`#0a0b0f`) with cyan accent on the tier
pill and theme color. Instantly recognizable as SftS in a feed.

### Acceptance Criteria

- [ ] Button visible on every `/signals/{id}` detail page
- [ ] Generates exactly 1200×627px PNG (LinkedIn's preferred ratio)
- [x] Renders signal headline, institution, tier, theme, "Why this matters" snippet
- [ ] Dark theme with theme-color left edge bar
- [ ] Includes SftS branding lockup + URL
- [ ] Download fires automatically; LinkedIn share dialog opens with the signal URL pre-filled
- [ ] Works in Chrome, Safari, Firefox on desktop and mobile

---

## Notes

- This list lives in the repo so it can be cross-referenced with
  GitHub issues. Convert any item into an issue with `gh issue create`
  using the item number as a reference.
- Companion documents: `REDESIGN_NOTES.md` (architecture), the prototype
  source itself, and `SftS_Signal_Coverage_Analysis.xlsx` (the data audit
  these recommendations are partly drawn from).
