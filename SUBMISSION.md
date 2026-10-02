# ShipYard submission copy

## Elevator pitch (128/140)
Rehearse the hard conversation before it counts — Gemini argues the other side of a real, current local issue, then coaches you.

## Tracks
- [x] Build with AI for Social Good
- [ ] Build For SFSU — not eligible (not an SFSU student)
- [ ] Best Open-Source AI Project — judgment call; repo is public, but this uses the proprietary Gemini API rather than open weights
- [ ] Best Use of Gemma 4 — not applicable, this uses Gemini

---

## Full description

### The problem

Speaking up in a high-stakes moment is a skill, and like any skill it takes practice. But the people who most need to practice get the fewest chances to.

If you are an immigrant preparing to give public comment at a city council meeting, an English-language learner facing a citizenship interview, or a first-generation professional walking into your first salary negotiation, there is usually nobody to rehearse against. You get one attempt, live, with the stakes real. Everybody else practices with a friend who already knows how those rooms work.

Speak Up is that friend.

### What it does

You type or say what you want to practice — "public comment on a local housing proposal," "negotiating a starting salary."

**It finds a real issue.** Gemini runs a live Google Search and comes back with something genuinely on an agenda right now — an actual city council item, a live ballot measure, a current policy fight. The search queries it ran and the sources it used are shown on screen, with clickable links, so you can verify the scenario is real rather than taking my word for it.

**It argues against you.** Gemini plays a skeptical opponent holding a consistent position. It engages seriously with a strong argument and names the problem when you make a weak one — cherry-picking, a strawman, an anecdote standing in for evidence — without dropping character. Responses stay 50-90 words and make one point per turn, because that is what a real exchange sounds like, not an essay.

**It coaches you.** At any point you can step out of the round and ask what just went wrong. It drops the opponent persona entirely and gives direct, specific feedback with alternative phrasings you could actually say out loud.

**It reports on the whole round.** One button produces a report on the full exchange: your strongest point and why it landed, the habit that weakened you *across* turns, and two concrete phrasings to try next time. That pattern-level feedback is the thing you cannot see about yourself while practicing alone.

**You can do all of it by voice.** Speak your points, hear the replies. That is the situation you are actually preparing for.

### How I built it

**Gemini API** (`gemini-3.1-flash-lite`) with the **Google Search grounding tool**, called from the browser. **Firebase Hosting** for the deploy. **Google Cloud** for the paid tier that funds the grounding quota. The browser-native **Web Speech API** for speech-to-text and text-to-speech, so voice adds no cost and no extra service.

The interesting decision is how grounding is used, because the obvious approach does not work.

I first tried a single call: hand Gemini the search tool and ask it to find a real issue and argue it. Measured across repeated trials, it only actually ran a search about two times in three. The rest of the time it answered from memory and sounded completely confident. That is worse than not grounding at all, because it looks real and is not.

So I split it into two calls. One grounded call whose only job is to search and identify the issue — 4 out of 4 reliable in testing — returning the queries and sources that get rendered on screen. Then a second call, carrying no search tool, where Gemini plays the opponent. That made it both more reliable *and* faster, because conversation turns are no longer dragging a search tool along: roughly 1 second per turn instead of 2.6.

### Challenges I ran into

**Search grounding is gated behind billing.** Grounded calls returned 429 RESOURCE_EXHAUSTED while identical ungrounded calls returned 200, which told me the key and model were fine and the feature itself was gated. It needs the project on a paid tier; linking a billing account is not sufficient on its own.

**Grounding worked and still was not trustworthy.** That is the measurement above, and the two-call split that fixed it.

**Gemini 3 multi-turn needs care.** Responses arrive as multiple parts carrying thought signatures that must be passed back verbatim on the next request. Reading just the first part — the obvious implementation — silently breaks the conversation.

**The coaching report invented a quote.** It attributed a point to me I had never made. The fix was structural rather than a prompt tweak: the report is now handed my exact turns and told to quote only from them and to drop any point it cannot support with a quote. Verified across three live rounds — 7 of 8 attributed quotes were verbatim, versus a clear fabrication before.

### Accomplishments I am proud of

It is deployed and it works, built solo in a day. The grounding is real and provable on screen rather than claimed. And when something fails, the app says so: if the search genuinely does not happen, the round is labelled ungrounded instead of passing an unsearched scenario off as current. Two headless test suites (28 and 20 checks) run the real application against a stubbed API and caught two genuine bugs during the build.

### What I learned

That a feature appearing to work is not the same as it working. The grounding bug produced plausible, confident, well-written output — it just was not grounded. Catching it meant measuring, not reading the output and nodding.

### What is next

Firestore session history so somebody can see themselves improve across rounds, with a coaching report that tracks the habits they are working on. Moving the API call into a Cloud Function so the key never reaches the browser. And a scenario library built with an actual community partner — a civic-participation nonprofit or an ESL program — rather than one I guessed at.
