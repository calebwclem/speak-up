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
- [ ] Know whether grounding is live. If it fell back, say so up front — see Hardships.

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

## Hardships overcome — Presentation is explicitly scored on this

Pick whichever is true at demo time. Be straight about it; judges respond well
to a specific debugging story and badly to a vague one.

- **Search grounding is gated behind billing.** Grounded calls returned 429
  RESOURCE_EXHAUSTED on the free tier regardless of model, while identical
  ungrounded calls returned 200. Grounding draws on a separate quota that needs
  the project upgraded to a paid tier — linking a Cloud billing account isn't
  enough on its own. We traced it by isolating the one variable (the search
  tool) rather than guessing, and redeemed the event credits to unblock it.
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

## Likely questions

**"Isn't this just a ChatGPT wrapper?"**
> "The grounding is the difference — rounds are tied to real current issues with
> citations you can click. And the calibration is doing real work: it tells a
> strong argument from a weak one and names the fallacy."

**"How do you know the search is real and not made up?"**
> "The response carries the actual queries it ran and the source URLs. They're
> on screen and they're clickable — that's not something the model can fake."

**"What stops someone practising a harmful position?"**
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
