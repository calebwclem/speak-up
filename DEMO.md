# DEMO.md — Speak Up: 5-minute table demo

Judges come to the table. ~5 minutes total including 1–2 questions, so the
walkthrough itself needs to land in about 3.5. All four judging criteria are
weighted equally and **Track Application is scored on whether you say it out
loud** — don't make them infer anything below.

## Before they arrive
- [ ] Live URL open in a tab, already loaded. Never demo from localhost.
- [ ] One practice round already run, then **New Scenario** — proves it works, leaves a clean screen.
- [ ] Scenario text ready to paste: `public comment on a local housing proposal`
- [ ] Phone on the live URL too, in case they ask about mobile (Design criterion).
- [ ] Microphone permission already granted on the demo browser, and the mic tested once.
- [ ] If the room is loud, turn **🔊 off** before demoing voice input so the reply audio
      does not get picked up by the mic mid-round.
- [ ] Run one round and confirm the sources panel appears. If it says ungrounded, say so up front.

## The script

**1. Problem + who it's for (~30s)** — *Idea*

> "Speaking up in a high-stakes moment is a skill, and like any skill it takes
> practice. But most people never get a safe space to rehearse it. We built this
> for people who get that chance least often — immigrants and English-language
> learners preparing to give public comment at a city meeting or sit a
> citizenship interview, and first-generation professionals walking into a
> negotiation with no one to practice against."

**2. Live round (~60s)** — *Implementation + Design*

Type the scenario, hit Start. While it loads:

> "It's finding a real, current local issue right now — not a made-up topic."

When the reply lands, point at the sources panel:

> "That's the actual Google Search it ran and the real articles it's arguing
> from. You can click them. This is a live issue, not something the model
> invented."

Make one deliberately weak argument (a cherry-picked statistic or a strawman).
Let it call the weakness out by name. **That beat is the demo** — it's the thing
a generic chatbot wrapper cannot do.

**2b. Do one exchange by voice (~30s)** — *Implementation + Idea*

Hit the 🎤, say your next point out loud, let the reply read itself back.

> "This is the part that matters for who we built it for. You're not typing an essay —
> you're saying it out loud and hearing someone push back, which is the thing you're
> actually about to do at the microphone."

Mic permission is granted per-origin, so **grant it once before judging starts** — do not
let the browser permission prompt eat your demo time.

**3. Coach mode (~45s)** — *Implementation*

Hit **Get Coaching Feedback**.

> "Same conversation, different mode. It drops the opponent persona, names what
> I actually did wrong, and gives me concrete alternative phrasings. Then I make
> a new point and it goes straight back to arguing."

**3b. Close with the round report (~30s)** — *Implementation + Presentation*

Hit **End Round & Get Report**.

> "And at the end it stops being an opponent entirely and tells me what to work on —
> not just my last point, but the pattern across the whole round. That's the thing a
> person practising alone can't see about themselves."

This is your closing beat. It gives the demo a clean ending instead of trailing off
mid-argument, and it is the moment that reads as coaching rather than chatting.

**4. Why Gemini specifically (~45s)** — *Track Application, say this explicitly*

> "Two things here are Gemini doing real work, not decoration. One: Google
> Search grounding is what makes every round about a real current issue — those
> sources are the proof. Two: it calibrates to argument quality, engaging
> seriously with a strong point and naming the fallacy in a weak one, and
> switches between opponent and coach without losing the thread."

**5. The rest of the track box (~30s)** — *Track Application*

> "Beyond Gemini we're on Firebase Hosting for the deploy, and the Google Cloud
> credits from the event are what fund the Search grounding quota — that's a
> paid Gemini feature, not the free tier."

**6. What's next (~30s)** — *Presentation*

> "Firestore for session history, so someone can see themselves improve across
> rounds, and a coaching report that tracks the habits they're working on. And a
> scenario library built with a specific community partner rather than guessed at."

## The four things judges explicitly ask for

Say these out loud. Judges score what you say, not what they infer.

### 1. The problem you're solving (~30s)

> "Speaking up in a high-stakes moment is a skill, and like any skill it takes
> practice. But the people who most need to practice get the fewest chances to.
> If you're an immigrant preparing to give public comment at a city meeting, or
> an English-language learner facing a citizenship interview, or a
> first-generation professional walking into your first salary negotiation, there
> is no one to rehearse against. You get one shot, live, with the stakes real.
> Everyone else practices with a friend who already knows how these rooms work."

### 2. Your solution (~30s)

> "Speak Up is a rehearsal partner. You say what you want to practice, and it
> finds a real, current local issue — not a made-up one — and argues the other
> side. It pushes back on your weak points and engages seriously with your strong
> ones. Any time, you can step out and ask for coaching, and at the end of a round
> it tells you what pattern weakened you across the whole conversation. And you
> can do the entire thing out loud, by voice, because that's the situation you're
> actually preparing for."

### 3. What makes it unique (~30s)

> "Three things. First, it's grounded in reality — every round is built on an
> actual city council agenda item or live policy debate, and we show you the
> search queries and the source links so you can check. Second, it calibrates: it
> names the fallacy when you make a weak argument, and concedes when you make a
> strong one, instead of agreeing with everything. Third, it's a coach as well as
> an opponent — it switches between arguing with you and telling you how to argue
> better, which is the part you can't get from practicing alone in front of a
> mirror."

### 4. The technology you used (~60s) — the one they care most about

Lead with Gemini, name the specific tool use, then the architecture decision.

> "The core is the **Gemini API** — `gemini-3.1-flash-lite` — with the **Google
> Search grounding tool**. And the interesting part is *how* we use it, because the
> obvious way doesn't work.
>
> We first tried a single call: give Gemini the grounding tool and ask it to find a
> real issue and argue it. We tested that, and it only actually ran a search about
> two times in three. The rest of the time it answered from memory and sounded
> completely confident. That's worse than not grounding at all, because it looks
> real and isn't.
>
> So we split it into two calls. One grounded call whose only job is to search and
> find the issue — that's 4 out of 4 reliable — and it returns the queries it ran
> and the sources it used, which we render on screen. Then a second call, with no
> search tool, where Gemini plays the opponent. That made it both more reliable
> *and* faster, because the conversation turns aren't carrying a search tool
> anymore — about 1 second instead of 2.6.
>
> Around that: **Firebase Hosting** for the deploy, **Google Cloud** for the paid
> tier that funds the grounding quota, and the browser-native **Web Speech API**
> for speech-to-text and text-to-speech — no paid speech service, so voice costs
> nothing to run.
>
> One more Gemini 3 specific detail: responses come back as multiple parts carrying
> thought signatures, and you have to pass those back verbatim on the next turn or
> the model loses its reasoning thread. Reading just the first part — the obvious
> implementation — silently breaks multi-turn."

**If they ask what you'd do differently or next:** move the API key behind a Cloud
Function (right now it's a frontend-only call, which is a deliberate hackathon
trade-off), and add Firestore session history so someone can see themselves improve
across rounds.

**If they ask about the Cloud credits:** be straight — the event coupon didn't
redeem successfully, so the paid tier was self-funded to get grounding working. Don't
claim credits you couldn't redeem.

## Hardships overcome — Presentation is explicitly scored on this

Pick whichever is true at demo time. Be straight about it; judges respond well
to a specific debugging story and badly to a vague one.

- **Search grounding is gated behind billing.** Grounded calls returned 429
  RESOURCE_EXHAUSTED on the free tier regardless of model, while identical
  ungrounded calls returned 200 — so we knew the key and model were fine and the
  feature was gated. It needs the project on a paid tier; linking a billing
  account isn't enough on its own.
- **Then grounding worked and still wasn't trustworthy.** Asking the persona to
  search and argue in one call, it only actually searched about two times in
  three — the rest it answered from memory, which looks grounded without being
  grounded. We measured it (4 trials per variant), found prompt wording didn't
  fix it and a bigger model cost 8-10s per turn, and split it into a dedicated
  search call plus a persona call. Now 4/4 grounded, and turns got faster
  because the persona call no longer carries the search tool.
- **We verified the API surface instead of trusting assumptions.** The model
  name and grounding field in our first draft were written from memory. We
  checked both against the live docs before debugging anything else.
- **Gemini 3 multi-turn needed real care.** Replies come back as multiple parts
  and carry thought signatures that have to go back in the next request, so
  reading `parts[0].text` and rebuilding history as plain text would have
  silently broken the conversation. We pass the model's parts back verbatim.
- **It degrades instead of dying.** If the grounding quota is unavailable mid-demo
  the app falls back to an ungrounded round and says so, rather than showing an
  error. Same for a transient 503.

## If they ask about the code

The handbook says production-readiness and code cleanliness are **not** judged, so
don't volunteer a code tour. But have these ready.

**The shape of it, in one breath:**
> "About 1,100 lines of plain HTML, CSS and JavaScript, no framework and no build
> step — zero dependencies, so what's in the repo is exactly what runs in the
> browser. Plus about 400 lines of tests. 25 commits today."

**"Can we see it?"** — `github.com/calebwclem/speak-up`. ⚠️ It is PRIVATE right now.
Make it public before judging or you cannot show it.

**"How do you know it works?"**
> "Two headless test suites — 28 checks and 20 — that run the real app against a
> fake DOM and a stubbed Gemini API. They cover the grounded path, what happens
> when the search fails, the retry on a 503, conversation-history integrity, and
> the voice paths. They caught two real bugs today: a duplicate click listener that
> made the microphone start and immediately stop itself, and a crash in how we read
> multi-part Gemini responses."

**"Did you use AI to write it?"** — Be straight; everyone did, and evasion reads worse
than the truth.
> "Yes, heavily — it's an AI hackathon. What I owned was the decisions: the system
> prompt is mine, tested across multiple scenarios last night before any code
> existed. And the architecture call that matters — splitting search from
> argument — came from measuring that a single call only grounded two times in
> three. The code is assisted; the judgement about what to build and what was
> actually broken is mine."

**"Why is the API key in the frontend?"**
> "Deliberate trade-off for a six-hour build. It's a capped hackathon key, restricted
> to this domain, and it's kept out of git in a gitignored config file. The right fix
> is a Cloud Function so the key never reaches the browser — that's the first thing
> I'd change."

**"What was the hardest part?"** — Point at the grounding story in Hardships below.
It's the strongest thing you have: a failure that looked like success.

## Known limitation — be ready for this one
The coaching report is generated by the model, and models can invent a quote and
attribute it to you. We reduced that by handing the report your exact turns and
forbidding any claim it cannot quote from them — measured at 7 of 8 attributed quotes
clean across three reports, versus a clear fabrication before the change. It is reduced,
not eliminated. If a judge asks about reliability, say that plainly: the honest answer is
that we constrained it with the transcript and verified the improvement, and that a
production version would verify each quote against the transcript programmatically
before showing it.

## Likely questions

**"Isn't this just a ChatGPT wrapper?"**
> "The grounding is the difference — rounds are tied to real current issues with
> citations you can click. And the calibration is doing real work: it tells a
> strong argument from a weak one and names the fallacy."

**"How do you know the search is real and not made up?"**
> "The response carries the actual queries it ran and the source URLs. They're
> on screen and they're clickable — that's not something the model can fake."

**"What stops someone practicing a harmful position?"**
> "Honest answer: nothing structural yet. It's a rehearsal tool with a skeptical
> opponent, so a weak or bad-faith argument gets pushed back on rather than
> affirmed. Real deployment would need a content policy and a community partner
> shaping the scenario library — that's exactly the Firestore + partner work in
> what's next."

**"Who would actually use this?"**
> Name one concrete pairing — a civic-participation nonprofit running public
> comment workshops, or an ESL program adding a speaking module.

**"How much does it cost to run?"**
> "Grounded search queries are the real cost driver, billed per thousand. The
> model itself is Flash-Lite, which is the cheap tier. At workshop scale this is
> very low cost; the credits cover the hackathon."

## Don't
- Don't open the editor. If they ask about code, describe it and offer the repo link.
- Don't demo an un-rehearsed scenario. Housing and transit ground well; something
  obscure may ground thinly and waste your 5 minutes.
- Don't claim grounding is live if it fell back. The notice is on screen and they'll see it.
