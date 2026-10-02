// Exercises the voice path with the Web Speech APIs PRESENT.
// test/smoke.js only covers the unsupported branch, so without this the real
// recognition and synthesis code never runs outside a browser.
//
//   node test/voice.js

const fs = require("fs");
const path = require("path");
const PUBLIC = path.join(__dirname, "..", "public");

let failures = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) console.log(`          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`);
}

function makeEl(tag, id) {
  const el = {
    tagName: tag, id: id || "", _classes: [], textContent: "", value: "",
    disabled: false, children: [], scrollTop: 0, scrollHeight: 0, _listeners: {}, _attrs: {},
    addEventListener(ev, fn) { (this._listeners[ev] ||= []).push(fn); },
    dispatch(ev, arg) { (this._listeners[ev] || []).forEach((fn) => fn(arg)); },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this._attrs[k] = v; },
    focus() {},
    get className() { return this._classes.join(" "); },
    set className(v) { this._classes = v.trim().split(/\s+/).filter(Boolean); }
  };
  el.classList = {
    add: (c) => { if (!el._classes.includes(c)) el._classes.push(c); },
    remove: (c) => { el._classes = el._classes.filter((x) => x !== c); },
    contains: (c) => el._classes.includes(c),
    toggle: (c, force) => { if (force) { if (!el._classes.includes(c)) el._classes.push(c); } else { el._classes = el._classes.filter((x) => x !== c); } }
  };
  Object.defineProperty(el, "innerHTML", { get() { return this._html || ""; }, set(v) { this._html = v; } });
  return el;
}

const ids = ["setup-screen", "chat-screen", "scenario-input", "start-btn", "messages",
             "message-input", "send-btn", "coach-btn", "new-round-btn", "loading",
             "mic-btn", "speak-toggle-btn", "voice-status", "setup-mic-btn", "setup-voice-status", "voice-select", "voice-pick"];
const registry = {};
ids.forEach((id) => (registry[id] = makeEl("div", id)));

global.document = {
  createElement: (t) => makeEl(t),
  getElementById: (id) => registry[id] || null,
  querySelector: () => makeEl("p")
};

// --- fake Web Speech APIs ---
const recognitions = [];
class FakeRecognition {
  constructor() { this.started = false; recognitions.push(this); }
  start() { this.started = true; if (this.onstart) this.onstart(); }
  stop() { this.started = false; }
  // helpers for the test
  emitResult(text, isFinal) {
    this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal })] });
  }
  emitError(code) { this.onerror({ error: code }); }
}
const spoken = [];
global.lastUtterance = null;
const synth = {
  speaking: false, pending: false, paused: false,
  getVoices: () => [
    { name: "Albert", lang: "en-US" },
    { name: "Samantha", lang: "en-US", default: true },
    { name: "Ava (Premium)", lang: "en-US" },
    { name: "Amelie", lang: "fr-CA" }
  ],
  addEventListener: () => {},
  resume() {},
  speak(u) { spoken.push(u.text); global.lastUtterance = u; },
  cancel() { spoken.push("<cancel>"); }
};
global.SpeechSynthesisUtterance = class { constructor(text) { this.text = text; } };
global.window = { webkitSpeechRecognition: FakeRecognition, speechSynthesis: synth };
global.localStorage = { getItem: () => null, setItem: () => {} };

let fetchCalls = 0;
global.fetch = async () => {
  fetchCalls++;
  return {
    ok: true, status: 200,
    json: async () => ({ candidates: [{ content: { role: "model", parts: [{ text: "Counter-point." }] } }] }),
    text: async () => ""
  };
};

const src = fs.readFileSync(path.join(PUBLIC, "config.example.js"), "utf8").replace("YOUR_API_KEY_HERE", "k")
  + "\n" + fs.readFileSync(path.join(PUBLIC, "app.js"), "utf8");
const mod = { exports: {} };
new Function("module", "window", "document", "fetch", "console", "setTimeout", "localStorage", "SpeechSynthesisUtterance", `
${src}
module.exports = { speak, startListening, isSupported: () => !!SpeechRecognitionCtor };
`)(mod, global.window, global.document, global.fetch, console, setTimeout, global.localStorage, global.SpeechSynthesisUtterance);

(async () => {
  console.log("\n1. Detection with the APIs present");
  check("recognition detected", mod.exports.isSupported(), true);
  check("chat mic NOT hidden", registry["mic-btn"].classList.contains("hidden"), false);
  check("setup mic NOT hidden", registry["setup-mic-btn"].classList.contains("hidden"), false);
  check("speak toggle NOT hidden", registry["speak-toggle-btn"].classList.contains("hidden"), false);
  check("toggle label reflects default on", registry["speak-toggle-btn"].textContent, "🔊 Reading replies aloud");

  console.log("\n2. Clicking the setup mic starts recognition");
  registry["setup-mic-btn"].dispatch("click");
  check("a recognition object was created", recognitions.length, 1);
  check("start() was called", recognitions[0].started, true);
  check("status shows listening", registry["setup-voice-status"].textContent, "Listening… speak, then pause.");
  check("button shows the stop glyph", registry["setup-mic-btn"].textContent, "⏹");

  console.log("\n3. A final transcript starts the round");
  recognitions[0].emitResult("public comment on a housing proposal", true);
  await new Promise((r) => setTimeout(r, 10));
  check("scenario input filled", registry["scenario-input"].value, "public comment on a housing proposal");
  check("a request went out", fetchCalls, 1);

  console.log("\n4. The reply is spoken aloud");
  check("utterance queued", spoken.includes("Counter-point."), true);

  console.log("\n4b. The best available voice is chosen, not the default");
  check("premium voice preferred over the default", lastUtterance && lastUtterance.voice.name, "Ava (Premium)");
  check("non-English voice ignored", lastUtterance && lastUtterance.voice.lang, "en-US");

  console.log("\n4c. The voice picker lists voices and an explicit choice wins");
  check("picker revealed", registry["voice-pick"].classList.contains("hidden"), false);
  check("all voices listed", registry["voice-select"].children.map((o) => o.value),
        ["Albert", "Samantha", "Ava (Premium)", "Amelie"]);
  check("picker reflects the active voice", registry["voice-select"].value, "Ava (Premium)");
  registry["voice-select"].value = "Albert";
  registry["voice-select"].dispatch("change");
  check("explicit choice overrides the heuristic", lastUtterance.voice.name, "Albert");
  check("choice previewed aloud", lastUtterance.text, "This is how I'll sound.");

  console.log("\n5. Clicking the chat mic works too");
  registry["mic-btn"].dispatch("click");
  check("second recognition created", recognitions.length, 2);
  check("chat status shows listening", registry["voice-status"].textContent, "Listening… speak, then pause.");

  console.log("\n6. Errors surface a human message");
  recognitions[1].emitError("not-allowed");
  check("blocked-mic message shown", registry["voice-status"].textContent.includes("Microphone blocked"), true);
  check("button reset", registry["mic-btn"].textContent, "🎤");

  console.log("\n7. Muting stops speech");
  registry["speak-toggle-btn"].dispatch("click");
  check("label flips", registry["speak-toggle-btn"].textContent, "🔇 Replies are silent");
  const before = spoken.length;
  mod.exports.speak("should not be spoken");
  check("nothing queued while muted", spoken.length, before);

  console.log(failures === 0 ? "\nAll voice checks passed.\n" : `\n${failures} voice check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
