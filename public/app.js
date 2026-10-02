// ===== CONFIG =====
// ⚠️ Frontend-only approach: API key is visible in browser network requests.
// Fine for a capped/free hackathon key — do NOT commit this key to a public repo.
const GEMINI_API_KEY = "YOUR_API_KEY_HERE";
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

// ===== STATE =====
let conversationHistory = []; // array of {role: "user"|"model", parts: [{text}]}

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

// ===== EVENTS =====
startBtn.addEventListener("click", startScenario);
scenarioInput.addEventListener("keydown", (e) => { if (e.key === "Enter") startScenario(); });

sendBtn.addEventListener("click", () => sendMessage(messageInput.value));
messageInput.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(messageInput.value); });

coachBtn.addEventListener("click", () => {
  sendMessage("Stepping out of the practice round for a second — as a coach, what was strong or weak about my last point? Be honest and specific.");
});

newRoundBtn.addEventListener("click", () => {
  conversationHistory = [];
  messagesEl.innerHTML = "";
  chatScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");
  scenarioInput.value = "";
  scenarioInput.focus();
});

// ===== CORE FLOW =====
async function startScenario() {
  const scenario = scenarioInput.value.trim();
  if (!scenario) return;

  setupScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  const openingUserTurn = `I want to practice: ${scenario}. Set the scene with a real current local issue and give your opening point.`;
  await sendMessage(openingUserTurn, { hideUserBubble: true });
}

async function sendMessage(text, opts = {}) {
  const trimmed = text.trim();
  if (!trimmed) return;

  if (!opts.hideUserBubble) {
    addMessageBubble(trimmed, "user");
  }
  messageInput.value = "";
  setLoading(true);

  conversationHistory.push({ role: "user", parts: [{ text: trimmed }] });

  try {
    const content = await callGemini(conversationHistory);
    // Push the model's parts back verbatim so thought signatures survive into the
    // next turn — Gemini 3 uses them to keep reasoning context across calls.
    conversationHistory.push({ role: "model", parts: content.parts });

    const replyText = textFromContent(content) || "(no response text)";
    const isCoach = trimmed.toLowerCase().includes("stepping out") || trimmed.toLowerCase().includes("as a coach");
    addMessageBubble(replyText, isCoach ? "coach" : "ai");
  } catch (err) {
    console.error(err);
    conversationHistory.pop(); // drop the unanswered user turn so history stays alternating
    addMessageBubble("Something went wrong talking to Gemini. Check the console and your API key.", "ai");
  } finally {
    setLoading(false);
  }
}

async function callGemini(history) {
  const body = {
    contents: history,
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    tools: [{ google_search: {} }] // verified against current Gemini API docs (generateContent uses snake_case here)
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.candidates?.[0]?.content;
  if (!content) {
    throw new Error(`Gemini returned no candidate: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return content;
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

function setLoading(isLoading) {
  loadingEl.classList.toggle("hidden", !isLoading);
  sendBtn.disabled = isLoading;
  startBtn.disabled = isLoading;
}
