# Practice Partner

A practice partner for high-stakes conversations — built for people who don't often get to rehearse speaking up before it counts: immigrants and English-language learners preparing for civic participation, first-generation professionals preparing for interviews or negotiations, and anyone who feels unprepared or unheard in these moments.

## The problem
Confidently speaking up — at a city council meeting, in a job interview, in a negotiation — is a skill, and like any skill it takes practice. But many people never get a low-stakes space to rehearse it: no one to push back on their argument, point out the weak spots, or help them find a stronger way to say it.

## How it works
You describe a situation you want to practice. Gemini, grounded with live Google Search, finds a real, current local issue related to your topic and plays a skeptical opposing voice — pushing back, engaging seriously with strong points, and calling out weak reasoning. At any point you can step out and ask for direct coaching feedback: what worked, what didn't, and how to say it better.

## Why Gemini
Gemini's Google Search grounding is core to how this works — it's not a decorative chatbot layer, it's what lets every practice round be based on a real, current, specific issue instead of a generic made-up scenario. Gemini's reasoning is also what calibrates the response to argument quality — engaging seriously with strong points, naming fallacies in weak ones, and switching fluidly between "opponent" and "coach" modes on request.

## Tech
- **Gemini API** (`gemini-3.1-flash-lite`) with the **Google Search grounding** tool
- **Firebase Hosting** for the deploy
- **Google Cloud** credits fund the Search grounding quota (a paid-tier Gemini feature)

Grounding is not decorative: each reply carries back the queries Gemini ran and the
source URLs it argued from, and the UI renders them under the message, so a user can
click through to the real articles behind their practice round.

## Running it locally
```bash
cp public/config.example.js public/config.js   # then paste your Gemini API key in
cd public && python3 -m http.server 8777
# open http://localhost:8777/index.html
```
`public/config.js` is gitignored so the key never enters git history. Firebase Hosting
still deploys it, because `firebase.json` only ignores dotfiles and `node_modules`.

> **Note on the key:** this is a frontend-only app, so the key is visible to anyone who
> loads the deployed page. That is a deliberate hackathon trade-off for speed. Restrict
> the key to the Hosting domain in the Cloud console, and move the call into a Cloud
> Function before this goes anywhere real.

## Deploying
```bash
firebase login
firebase use --add        # writes .firebaserc
firebase deploy --only hosting
```

## Try it
[Live URL — add after deploy]

## What's next
With more time: saved session history (Firestore) to track growth over turns, voice input/output for a more realistic rehearsal, and a wider library of scenario types.
