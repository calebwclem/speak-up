# PLAN.md — Build Plan

## STATUS as of 11:00 AM event start
- [x] Gemini API key created via Google AI Studio, tested working (free tier, no billing).
- [x] Google Cloud project shell created, no billing attached yet.
- [x] Cloud Run + Firestore APIs pre-enabled.
- [x] System prompt drafted, tested, and refined in AI Studio across multiple scenarios + multi-turn exchanges.
- [x] Skeleton app built and in repo (index.html, style.css, app.js, firebase.json, README.md).
- [x] API key inserted — lives in `public/config.js`, which is **gitignored** (template: `config.example.js`). Verified absent from git history.
- [x] app.js model name + grounding syntax VERIFIED against Gemini API docs: `gemini-3.1-flash-lite` is a real stable endpoint and supports Search grounding; grounding tool field corrected to `google_search: {}` (snake_case, as documented for `:generateContent`). Response parsing + multi-turn history also fixed for Gemini 3 (multi-part replies, thought signatures).
- [x] Tested locally in a browser — real Gemini response, persona and coach button both working. Grounding fell back (see blocker).
- [x] DEPLOYED: https://gen-lang-client-0428218194.web.app (Firebase Hosting, project `gen-lang-client-0428218194` — the same project that owns the Gemini key). Redeploy with `firebase deploy --only hosting`.
- [ ] Cloud credits: billing account linked to the project, but **Search grounding still returns 429**.

## ⚠️ OPEN BLOCKER: Search grounding returns 429
Confirmed by direct API calls, repeatedly, over ~40 minutes:
- `gemini-3.1-flash-lite` **ungrounded** → 200 OK. Key is valid, model name is right.
- Same model **with `google_search`** → 429 RESOURCE_EXHAUSTED. Same for other models.
- Both `google_search` and `googleSearch` behave identically, so field spelling is not the cause.

Cause: Search grounding draws on a **separate quota that requires the project on a paid
tier**. Linking a Cloud billing account is NOT sufficient — the upgrade has to be completed
through **"Set up billing" in AI Studio** (https://aistudio.google.com/apikey) for the project
that owns this key. Tier changes then apply within ~10 minutes. Watch out: that flow may ask
for a Prepay minimum — use the event billing account, never a personal card.

Impact is contained: the app falls back to an ungrounded round with a visible notice, so the
demo works either way. But grounding is the Track Application argument, so this stays priority #1.
- [ ] Organizer questions (pre-event code allowance, exact ShipYard requirements) — resolve ASAP this morning if not already answered; don't block building on this, just note the answer once known.

## FIRST THING TO DO RIGHT NOW
1. Complete "Set up billing" in AI Studio for the key's project (see blocker above) — unblocks grounding.
2. `firebase login`, then `firebase use --add` to pick the project and write `.firebaserc`.
3. Local browser test at http://localhost:8777/index.html — confirm a real reply comes back.
4. Restrict the API key (HTTP referrer → the Firebase Hosting domain) before the repo goes public.

## Event day timeline (target, ~11:00 AM–4:45 PM hacking window)

**11:00–11:30 — Setup**
- Create fresh GitHub repo, first commit.
- Scaffold project structure (see below).
- Redeem Google Cloud coupon via the organizers' specific redemption link (NOT any "Free Trial" prompt inside Console — that requires a card).

**11:30–12:30 — Core loop**
- Wire up Gemini API call (direct from frontend for speed, unless Functions decision below says otherwise).
- Paste in validated system prompt from CLAUDE.md.
- Confirm grounding tool is enabled in the actual API call (config flag, not just the AI Studio toggle).
- Test end-to-end: one scenario, one exchange, confirm real grounded response comes back.

**12:30–1:00 — Workshop #1 (optional, can work through it)**

**1:00–2:00 — Lunch**

**2:00–3:00 — Chat UI**
- Basic interface: scenario input, message history display, input box, send button.
- Wire multi-turn history correctly (pass full conversation back each call).
- Style pass — keep simple, legible, mobile-friendly if time allows.

**2:30–3:30 — Workshop #2 (optional, can work through it)**

**3:00–3:45 — Coach mode + polish**
- Confirm coach-mode trigger still works in the deployed app, not just in AI Studio.
- Add a visible "Get Coaching Feedback" button as an explicit trigger (more reliable than relying on users typing the magic phrase).
- Bug pass.

**3:45–4:15 — Deploy**
- `firebase init` (Hosting, +Functions if going that route).
- `firebase deploy`.
- Test the live URL end-to-end, not just localhost.

**4:15–4:45 — Submission + demo prep**
- Submit via ShipYard with repo link + live URL + description.
- Write/rehearse the 5-minute demo: problem statement, who benefits, Gemini's role, Google tool used, how it could continue at SFSU/Berkeley/wherever post-hackathon.
- Buffer time for submission platform issues — don't wait until 4:44 PM.

**4:45–5:00 — Breathe**

**5:00–5:45 — Judging / live demo**

## Decision points still open
1. **Frontend-only Gemini calls vs. Cloud Functions backend** — frontend-only is faster to build and avoids the Blaze-plan question entirely if the coupon redemption path is unclear in the moment. Functions is more "correct" (protects API key) and uses the Cloud credit more concretely. DEFAULT: start frontend-only, upgrade to Functions only if time allows and coupon redemption goes smoothly.
2. **Stretch goal: voice (STT/TTS)** — only attempt after the text version is fully working and deployed. Use browser-native Web Speech API, not a paid service.
3. **Firestore session history** — nice-to-have for "track your growth over time" narrative, not required for a working demo. Add only if core loop + coach mode + deploy are all solid with time to spare.

## Minimal file structure (frontend-only version)
```
project-root/
  public/
    index.html      (chat UI)
    app.js           (Gemini API calls, conversation state, coach-mode trigger)
    style.css
  firebase.json
  .firebaserc
  README.md          (problem statement, who benefits, tech used — also doubles as demo talking points)
```

## System prompt (current validated version — paste into app.js as the system instruction)
See CLAUDE.md for the full validated prompt text and testing notes. Key points to not lose in translation to code:
- 50-90 words, one point per turn, conversational tone
- Explicit first-turn format rule (don't drop this — it was the fix for the scene-narration bug)
- Coach-mode trigger phrases and behavior
- Google Search grounding tool must be enabled in the actual API request config
