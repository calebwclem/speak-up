// ===== CONFIG =====
// ⚠️ Frontend-only approach: the API key is visible in browser network requests.
// Fine for a capped/free hackathon key, but it must never reach git — it lives in
// public/config.js, which is gitignored (see config.example.js for the template).
const GEMINI_API_KEY = window.GEMINI_CONFIG?.apiKey || "";
const MODEL = "gemini-3.1-flash-lite"; // verified: stable endpoint, supports Google Search grounding
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ===== SYSTEM PROMPT (validated tonight in AI Studio) =====
const SYSTEM_PROMPT = `You are a debate and public-speaking practice partner, built specifically to help people who often don't get the chance to practice speaking up in high-stakes situations — immigrants and English-language learners preparing for civic participation (public comment at a city meeting, a citizenship interview, workplace advocacy), first-generation professionals preparing for interviews or negotiations, and others who may feel unprepared or unheard in these moments.

You are having a live, spoken-style back-and-forth — not writing essays.

## Response style
- Make exactly ONE point per turn. Do not use numbered lists, headers, or multiple sub-arguments.
- Keep responses between 50 and 90 words — short enough to say out loud in under 20 seconds without rushing.
- Speak naturally, like a real person in conversation: contractions, direct phrasing ("Look," "Here's the thing," "Come on"), not formal written transitions like "Furthermore" or "In conclusion."
- Do not summarize or recap the whole conversation so far. Respond only to the user's most recent point.

## Starting a new scenario
Your first message in any new scenario must also follow all style rules above (one point, 50-90 words, no lists). State the real context in one short clause, then immediately make your opening point in character — do not narrate "let's begin" or describe the scene at length before starting.

## Calibration to argument quality
- If the user makes a genuinely strong, well-reasoned argument, engage with it seriously and respond with your strongest real counter-point.
- If the user makes a weak argument (a logical fallacy, an irrelevant tangent, a strawman, etc.), you may call this out directly and briefly explain why it doesn't land, in the same conversational tone — but still stay in character as their opponent, not a lecturer.
- Don't manufacture disagreement for its own sake. If the user makes a point with no real counter, it's fine to concede a narrow piece of it before pivoting to your broader position.

## Topic grounding
Use Google Search grounding to find a real, current local issue relevant to the user's chosen scenario — an actual city council agenda item, a real local ballot measure, a genuine current policy debate — rather than a generic or made-up topic. State the real issue in your first message as part of your one short clause of context.

## Coach mode
If the user explicitly signals they want to step outside the practice round — phrases like "stepping out," "as a coach," "give me feedback," "what was wrong with that" — switch modes completely:
- Drop the opponent persona and speak as a direct, honest coach.
- In this mode only, longer responses are fine (no word limit applies).
- Be specific: name the actual technique or issue involved, explain why it didn't work, and give 1-3 concrete alternative ways to phrase the point.
- Once the user re-engages with a new point (not asking for more feedback), return to normal practice mode and its length rules.`;

// Must stay in sync with the coach-mode triggers listed in SYSTEM_PROMPT above —
// the model switches mode on these, so the bubble styling has to recognise them too.
const COACH_TRIGGERS = [
  "stepping out",
  "step out",
  "as a coach",
  "give me feedback",
  "what was wrong with that"
];

function isCoachRequest(text) {
  const lower = text.toLowerCase();
  return COACH_TRIGGERS.some((t) => lower.includes(t));
}

// ===== STATE =====
let conversationHistory = []; // array of {role: "user"|"model", parts: [{text}]}
let isSending = false; // guards against overlapping requests scrambling history order
let groundingNoticeShown = false; // only warn once per round that grounding is unavailable

// ===== DOM =====
const setupScreen = document.getElementById("setup-screen");
const chatScreen = document.getElementById("chat-screen");
const scenarioInput = document.getElementById("scenario-input");
const startBtn = document.getElementById("start-btn");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const coachBtn = document.getElementById("coach-btn");
const newRoundBtn = document.getElementById("new-round-btn");
const loadingEl = document.getElementById("loading");
const micBtn = document.getElementById("mic-btn");
const setupMicBtn = document.getElementById("setup-mic-btn");
const setupVoiceStatusEl = document.getElementById("setup-voice-status");
const speakToggleBtn = document.getElementById("speak-toggle-btn");
const voiceStatusEl = document.getElementById("voice-status");

// ===== STARTUP CHECK =====
if (!GEMINI_API_KEY) {
  console.error("No Gemini API key found. Copy public/config.example.js to public/config.js and paste your key in.");
  startBtn.disabled = true;
  document.querySelector("#setup-screen .hint").textContent =
    "Missing API key — copy public/config.example.js to public/config.js and add your Gemini key.";
}

// ===== VOICE (browser-native Web Speech API — no paid service, no API key) =====
// Speaking out loud is the point of the tool, so both screens take voice: the setup
// screen to say what you want to rehearse, the chat screen to make your points.

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSynth = typeof window !== "undefined" ? window.speechSynthesis : null;

let recognition = null;
let isListening = false;
let voiceTarget = null; // { input, statusEl, micBtn, onFinal } for whichever screen is live
let speakReplies = loadSpeakPref();

function loadSpeakPref() {
  // Browser storage can throw in private mode — never let it break startup.
  try {
    const stored = localStorage.getItem("speakReplies");
    return stored === null ? true : stored === "true";
  } catch (err) {
    return true;
  }
}

function saveSpeakPref(value) {
  try {
    localStorage.setItem("speakReplies", String(value));
  } catch (err) {
    /* nothing to do — the preference just won't persist */
  }
}

function setVoiceStatus(statusEl, text) {
  if (!statusEl) return;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("hidden", !text);
}

function initVoice() {
  if (speakToggleBtn) {
    if (!speechSynth) speakToggleBtn.classList.add("hidden");
    else updateSpeakToggle();
  }

  if (!SpeechRecognitionCtor) {
    // Firefox has no speech recognition; typing still works, so just say so.
    [micBtn, setupMicBtn].forEach((b) => b && b.classList.add("hidden"));
    setVoiceStatus(setupVoiceStatusEl, "Voice input needs Chrome, Edge or Safari — typing works everywhere.");
    setVoiceStatus(voiceStatusEl, "Voice input needs Chrome, Edge or Safari — typing works everywhere.");
    console.info("[voice] SpeechRecognition unavailable in this browser.");
    return;
  }
  console.info("[voice] SpeechRecognition available:", SpeechRecognitionCtor.name || "webkitSpeechRecognition");
}

function updateSpeakToggle() {
  speakToggleBtn.textContent = speakReplies ? "🔊 Reading replies aloud" : "🔇 Replies are silent";
  speakToggleBtn.setAttribute("aria-pressed", String(speakReplies));
  speakToggleBtn.classList.toggle("voice-off", !speakReplies);
}

function speak(text) {
  if (!speakReplies || !speechSynth || !text) return;
  stopSpeaking();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02; // conversational, not newsreader-slow
  utterance.lang = "en-US";
  utterance.onstart = () => console.info("[voice] speaking");
  utterance.onerror = (e) => console.warn("[voice] speech error:", e.error);

  // Chrome quirks worth guarding against, both of which fail silently:
  // the synthesiser can be left in a paused state by an earlier cancel, and
  // speak() before the voice list has loaded can be dropped on the floor.
  const say = () => {
    try {
      if (speechSynth.paused) speechSynth.resume();
      speechSynth.speak(utterance);
    } catch (err) {
      console.warn("[voice] speak() threw:", err);
    }
  };

  const voices = typeof speechSynth.getVoices === "function" ? speechSynth.getVoices() : [];
  if (voices.length === 0 && typeof speechSynth.addEventListener === "function") {
    speechSynth.addEventListener("voiceschanged", say, { once: true });
    // Don't hang on a browser that never fires the event.
    setTimeout(say, 250);
    return;
  }
  say();
}

function stopSpeaking() {
  if (speechSynth && (speechSynth.speaking || speechSynth.pending)) {
    speechSynth.cancel();
  }
}

function startListening(target) {
  if (isListening) {
    stopListening();
    return;
  }

  if (!SpeechRecognitionCtor) {
    setVoiceStatus(target.statusEl, "Voice input isn't supported in this browser — type instead.");
    return;
  }

  // Acknowledge the click immediately. If the browser then refuses, the message is
  // replaced by the real reason rather than leaving the button looking dead.
  voiceTarget = target;
  setVoiceStatus(target.statusEl, "Starting microphone…");
  console.info("[voice] starting recognition");

  // Never listen while a reply is still playing, or the mic hears the app.
  stopSpeaking();

  recognition = new SpeechRecognitionCtor();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    if (target.micBtn) {
      target.micBtn.classList.add("listening");
      target.micBtn.textContent = "⏹";
    }
    setVoiceStatus(target.statusEl, "Listening… speak, then pause.");
    console.info("[voice] onstart");
  };

  recognition.onaudiostart = () => console.info("[voice] onaudiostart — mic is open");
  recognition.onspeechstart = () => console.info("[voice] onspeechstart — speech detected");

  recognition.onresult = (event) => {
    let interim = "";
    let final = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const chunk = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += chunk;
      else interim += chunk;
    }
    // Show words landing as they are recognised, so a mishearing is visible early.
    target.input.value = (final || interim).trim();
    console.info("[voice] onresult", { interim, final });
    if (final.trim()) {
      const spoken = final.trim();
      setVoiceStatus(target.statusEl, "Heard you.");
      stopListening();
      target.onFinal(spoken);
    }
  };

  recognition.onerror = (event) => {
    const messages = {
      "not-allowed": "Microphone blocked. Click the icon in the address bar and allow the mic, then try again.",
      "service-not-allowed": "The browser blocked speech recognition. Try Chrome, or type instead.",
      "no-speech": "Didn't catch anything — tap the mic and speak a little louder.",
      "audio-capture": "No microphone found. Check your input device, or type instead.",
      "network": "Speech recognition needs a network connection to Google's service. Type instead.",
      "aborted": ""
    };
    const msg = messages[event.error] !== undefined
      ? messages[event.error]
      : `Voice input error: ${event.error}`;
    console.warn("[voice] onerror", event.error, event);
    setVoiceStatus(target.statusEl, msg);
    stopListening({ keepStatus: true });
  };

  recognition.onend = () => {
    console.info("[voice] onend");
    stopListening({ keepStatus: true });
  };

  try {
    recognition.start();
  } catch (err) {
    console.error("[voice] start() threw", err);
    setVoiceStatus(target.statusEl, `Couldn't start the microphone: ${err.message}`);
    stopListening({ keepStatus: true });
  }
}

function stopListening(opts = {}) {
  const target = voiceTarget;
  isListening = false;
  if (target && target.micBtn) {
    target.micBtn.classList.remove("listening");
    target.micBtn.textContent = "🎤";
  }
  if (target && !opts.keepStatus) {
    setVoiceStatus(target.statusEl, "");
  }
  if (recognition) {
    try {
      recognition.stop();
    } catch (err) {
      /* already stopped */
    }
    recognition = null;
  }
}

function setupVoiceTarget() {
  return {
    input: scenarioInput,
    statusEl: setupVoiceStatusEl,
    micBtn: setupMicBtn,
    onFinal: (spoken) => {
      scenarioInput.value = spoken;
      startScenario();
    }
  };
}

function chatVoiceTarget() {
  return {
    input: messageInput,
    statusEl: voiceStatusEl,
    micBtn: micBtn,
    onFinal: (spoken) => sendMessage(spoken)
  };
}

// ===== EVENTS =====
startBtn.addEventListener("click", startScenario);
scenarioInput.addEventListener("keydown", (e) => { if (e.key === "Enter") startScenario(); });

sendBtn.addEventListener("click", () => sendMessage(messageInput.value));
messageInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(messageInput.value); });

if (micBtn) {
  micBtn.addEventListener("click", () => startListening(chatVoiceTarget()));
}

if (setupMicBtn) {
  setupMicBtn.addEventListener("click", () => startListening(setupVoiceTarget()));
}

if (speakToggleBtn) {
  speakToggleBtn.addEventListener("click", () => {
    speakReplies = !speakReplies;
    if (!speakReplies) stopSpeaking();
    saveSpeakPref(speakReplies);
    updateSpeakToggle();
  });
}

coachBtn.addEventListener("click", () => {
  sendMessage("Stepping out of the practice round for a second — as a coach, what was strong or weak about my last point? Be honest and specific.");
});

newRoundBtn.addEventListener("click", () => {
  stopSpeaking();
  stopListening();
  setVoiceStatus(voiceStatusEl, "");
  setVoiceStatus(setupVoiceStatusEl, "");
  conversationHistory = [];
  groundingNoticeShown = false;
  messagesEl.innerHTML = "";
  chatScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
  scenarioInput.value = "";
  scenarioInput.focus();
});

initVoice();

// ===== CORE FLOW =====
async function startScenario() {
  const scenario = scenarioInput.value.trim();
  if (!scenario) return;

  setupScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  addMessageBubble(`Practising: ${scenario}`, "context");

  const openingUserTurn = `I want to practice: ${scenario}. Set the scene with a real current local issue and give your opening point.`;
  await sendMessage(openingUserTurn, { hideUserBubble: true });
}

async function sendMessage(text, opts = {}) {
  const trimmed = text.trim();
  if (!trimmed || isSending) return;
  isSending = true;

  if (!opts.hideUserBubble) {
    addMessageBubble(trimmed, "user");
  }
  messageInput.value = "";
  setLoading(true);

  conversationHistory.push({ role: "user", parts: [{ text: trimmed }] });

  try {
    const { candidate, grounded } = await callGeminiWithFallback(conversationHistory);
    // Push the model's parts back verbatim so thought signatures survive into the
    // next turn — Gemini 3 uses them to keep reasoning context across calls.
    conversationHistory.push({ role: "model", parts: candidate.content.parts });

    const replyText = textFromContent(candidate.content) || "(no response text)";
    const isCoach = isCoachRequest(trimmed);
    addMessageBubble(replyText, isCoach ? "coach" : "ai");
    speak(replyText); // read the opponent/coach back, never the sources panel
    addGroundingPanel(candidate.groundingMetadata);
    if (!grounded && !groundingNoticeShown) {
      addGroundingNotice();
      groundingNoticeShown = true;
    }
  } catch (err) {
    console.error(err);
    // Drop the unanswered user turn so history stays alternating.
    if (conversationHistory[conversationHistory.length - 1]?.role === "user") {
      conversationHistory.pop();
    }
    addMessageBubble("Something went wrong talking to Gemini. Check the console and your API key.", "ai");
  } finally {
    isSending = false;
    setLoading(false);
    messageInput.focus();
  }
}

// Search grounding draws on a separate quota that needs billing enabled on the
// key's Cloud project. If it is unavailable we still want a usable practice round,
// so grounding is a flag rather than a hard requirement.
async function callGeminiWithFallback(history) {
  try {
    return { candidate: await callGroundedWithRetry(history), grounded: true };
  } catch (err) {
    if (err.status !== 429 && err.status !== 403) throw err;
    console.warn("Search grounding unavailable, retrying ungrounded:", err.message);
    return { candidate: await callGemini(history, { grounded: false }), grounded: false };
  }
}

// 500/503 from Gemini means transient overload, not a bad request — one quick retry
// is the difference between a hiccup and a dead round in front of judges.
async function callGroundedWithRetry(history) {
  try {
    return await callGemini(history, { grounded: true });
  } catch (err) {
    if (err.status !== 500 && err.status !== 503) throw err;
    console.warn("Gemini transient error, retrying once:", err.message);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return await callGemini(history, { grounded: true });
  }
}

async function callGemini(history, { grounded = true } = {}) {
  const body = {
    contents: history,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
  };
  // Field name per current Gemini API docs; camelCase googleSearch also works.
  if (grounded) body.tools = [{ google_search: {} }];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Gemini API error ${res.status}: ${errText}`);
    err.status = res.status; // callGeminiWithFallback needs this to spot quota failures
    throw err;
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  if (!candidate?.content) {
    throw new Error(`Gemini returned no candidate: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return candidate;
}

// A grounded Gemini 3 reply can be several parts, and some carry no user-facing
// text (thought parts, thought signatures). Take every real text part, in order.
function textFromContent(content) {
  return (content.parts || [])
    .filter((p) => p.text && !p.thought)
    .map((p) => p.text)
    .join("")
    .trim();
}

// ===== UI HELPERS =====
function addMessageBubble(text, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// When the model actually searched, the response carries groundingMetadata.
// Google's Search grounding terms require showing the Search Suggestions widget
// and the sources — and it doubles as the clearest proof to the user (or a judge)
// that the scenario is a real current issue, not something the model invented.
function addGroundingPanel(groundingMetadata) {
  if (!groundingMetadata) return;

  const chunks = groundingMetadata.groundingChunks || [];
  const queries = groundingMetadata.webSearchQueries || [];
  const entryPointHtml = groundingMetadata.searchEntryPoint?.renderedContent;
  if (!chunks.length && !queries.length && !entryPointHtml) return;

  const panel = document.createElement("div");
  panel.className = "grounding";

  const heading = document.createElement("p");
  heading.className = "grounding-heading";
  heading.textContent = "Grounded in a live Google Search";
  panel.appendChild(heading);

  if (queries.length) {
    const q = document.createElement("p");
    q.className = "grounding-queries";
    q.textContent = `Searched: ${queries.join("  ·  ")}`;
    panel.appendChild(q);
  }

  const list = document.createElement("ol");
  list.className = "grounding-sources";
  chunks.forEach((chunk) => {
    const web = chunk.web;
    if (!web?.uri) return;
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = web.uri;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = web.title || web.uri;
    li.appendChild(a);
    list.appendChild(li);
  });
  if (list.children.length) panel.appendChild(list);

  if (entryPointHtml) {
    // Required by the grounding terms: render Google's widget exactly as provided.
    const entry = document.createElement("div");
    entry.className = "grounding-entry-point";
    entry.innerHTML = entryPointHtml;
    panel.appendChild(entry);
  }

  messagesEl.appendChild(panel);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addGroundingNotice() {
  const note = document.createElement("div");
  note.className = "grounding grounding-warn";
  note.textContent =
    "Practicing without live grounding — the Google Search quota is unavailable, " +
    "so this scenario isn't tied to a verified current issue.";
  messagesEl.appendChild(note);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setLoading(isLoading) {
  loadingEl.classList.toggle("hidden", !isLoading);
  sendBtn.disabled = isLoading;
  coachBtn.disabled = isLoading;
  if (micBtn) micBtn.disabled = isLoading;
  if (setupMicBtn) setupMicBtn.disabled = isLoading;
  // Never re-enable the start button if there is no key to call with.
  startBtn.disabled = isLoading || !GEMINI_API_KEY;
}
