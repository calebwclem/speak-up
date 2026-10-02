# CLAUDE.md — SF Hacks x GDG AI Hackathon Project

## STATUS (updated 11:00 AM, event day)
Skeleton exists and is in this repo: `public/index.html`, `public/style.css`, `public/app.js`, `firebase.json`, `README.md`.
NOT YET DONE: API key inserted into app.js, tested end-to-end locally, verified against AI Studio's actual "Get code" syntax (model name + grounding tool field name were written from memory/assumption, not confirmed — check this first), deployed, Cloud credit coupon redeemed.
Submission deadline: 4:45 PM. ShipYard link shared during event — ask organizers what exactly it requires (repo? live URL? video?) if not yet confirmed.

## Project
A debate / difficult-conversation practice partner, built for the **GDG "Build with AI for Social Good" track**.

**Who it's for:** people who don't often get to rehearse high-stakes speaking situations before they matter — immigrants and English-language learners preparing for civic participation (public comment at a city council meeting, a citizenship interview), first-generation professionals preparing for interviews or negotiations, and others who may feel unprepared or unheard in these moments.

**Core mechanic:** user states a position out loud (typed for now, voice as a stretch goal) on a real, current local civic issue. Gemini plays a skeptical opposing voice, engages seriously with strong arguments, calls out weak ones (fallacies, cherry-picking), and can be switched into "coach mode" on request to give direct, specific feedback and alternative phrasings.

**Why Gemini specifically:** Google Search grounding is used to find a real, current local issue (not a generic/made-up topic) so practice rounds are grounded in something real — this is a meaningful, non-decorative use of Gemini's reasoning and tool-use, not a basic chatbot wrapper.

## Track requirements (GDG — Build with AI for Social Good)
- Gemini must be an important part of the project (not just a chatbot).
- Must address a clear social/community problem.
- Must use at least one other Google developer tool/Cloud service besides Gemini.
- Must use the Google Cloud credits provided at the event.
- Must have a working demo.

NOT eligible for SFSU track (no SFSU student on team). NOT eligible for MLH open-source track (using proprietary Gemini API, not open-weight).

## Tech stack
- **Model:** Gemini (via Google AI Studio / API), Google Search grounding tool enabled.
- **Hosting:** Firebase Hosting. Decision pending: frontend-only (simpler, faster, call Gemini directly from browser) vs. Cloud Functions backend (keeps API key server-side, requires Blaze plan — use the event's coupon-funded billing account, NOT a personal card, when redeeming to avoid the Free Trial card-required trap).
- **Data (optional, time permitting):** Firestore — session history, persona/topic library, "coaching report" over time.

## Validated system prompt (tested extensively in AI Studio tonight)
Validated behaviors, confirmed across multiple turns and two different real grounded scenarios (Austin "missing middle" housing, Berkeley College Ave height limits):
- Persona holds a consistent position, engages seriously with strong arguments.
- Correctly distinguishes strong vs. weak arguments (calls out fallacies/cherry-picking by name without breaking character).
- Response length: 50–90 words, one point per turn, spoken/conversational tone — holds across multi-turn exchanges.
- IMPORTANT: first turn of a new scenario needs an EXPLICIT instruction to also follow length/format rules, or it defaults to long scene-setting narration. (Fixed in current prompt version — see PLAN.md for exact text.)
- Coach mode: triggered by phrases like "stepping out of the debate," "as a coach," "give me feedback" — breaks character, gives specific named critique + concrete alternative phrasings, no word limit in this mode, returns to normal mode once user re-engages with a new point.
- Grounding: appears to reliably surface real, specific local civic issues (verify once more directly by asking the model whether a given scenario was search-grounded, for certainty when pitching to judges).

## Build philosophy
- Working, simple, demoable beats ambitious and half-broken. Judging criteria explicitly do NOT require production-quality code or a fully polished large-scale project.
- Build the plain text-chat version fully and get it deployed first. Voice (speech-to-text / text-to-speech) is a stretch goal ONLY if time remains — use the browser-native Web Speech API (free, fast, ~2-3 hrs), not a paid external STT/TTS service.
- Keep API calls isolated in one swappable function in case of any last-minute provider issues.

## Constraints
- Hacking window: ~11:00 AM – 4:45 PM submission deadline (minus lunch/workshops). Budget accordingly — this is tighter than a full day.
- Demo: ~5 minutes live, judges come to the table, ~5 min including 1-2 questions. Rehearse a tight walkthrough naming: the problem, who benefits, how Gemini is used, and how it could realistically continue at/beyond the event.

## Judging criteria (weighted equally — hit all four explicitly in the demo, out loud)
- **Idea:** alignment with theme/track.
- **Implementation:** all features shown must actually work live. Complexity is a plus but NOT required — a working prototype beats an ambitious broken one.
- **Design:** is the UI intuitive, does it guide users to features, is it scalable.
- **Presentation:** why this project/problem, hardships overcome, features clearly explained.
- **Track Application:** explicitly say how this uses the track's specific technologies/problem — don't make judges infer it.
NOT judged: production-readiness, code complexity/cleanliness. Simple + working wins over complex + broken.

## Submission checklist (from handbook)
- [ ] Submit via ShipYard before 4:45 PM sharp — late = not accepted, no exceptions.
- [ ] Confirm exactly what the submission form asks for once the link is shared.
- [ ] Don't wait until the last minute — leave buffer before 4:45.
