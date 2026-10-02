// Headless smoke test for public/app.js.
//
// The app has no build step and no browser automation is available in this
// environment, so this runs the real app.js against a minimal DOM shim and a
// stubbed fetch. It is not a substitute for loading the page, but it does catch
// broken event wiring, render-path exceptions, malformed conversation history,
// and regressions in the grounding/fallback/retry branches.
//
//   node test/smoke.js

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

// ---------- DOM shim ----------
function makeClassList(el) {
  return {
    add: (c) => { if (!el._classes.includes(c)) el._classes.push(c); },
    remove: (c) => { el._classes = el._classes.filter((x) => x !== c); },
    contains: (c) => el._classes.includes(c),
    toggle: (c, force) => (force ? el._classes.includes(c) || el._classes.push(c) : el._classes = el._classes.filter((x) => x !== c))
  };
}

function makeEl(tag, id) {
  const el = {
    tagName: tag, id: id || "", _classes: [], textContent: "", innerHTML: "",
    value: "", disabled: false, href: "", target: "", rel: "",
    children: [], scrollTop: 0, scrollHeight: 0, _listeners: {},
    addEventListener(ev, fn) { (this._listeners[ev] ||= []).push(fn); },
    dispatch(ev, arg) { (this._listeners[ev] || []).forEach((fn) => fn(arg)); },
    appendChild(c) { this.children.push(c); return c; },
    focus() { this._focused = true; },
    get className() { return this._classes.join(" "); },
    set className(v) { this._classes = v.trim().split(/\s+/).filter(Boolean); },
    set innerHTML_(v) { this.innerHTML = v; }
  };
  el.classList = makeClassList(el);
  Object.defineProperty(el, "innerHTML", {
    get() { return this._html || ""; },
    set(v) { this._html = v; if (v === "") this.children = []; }
  });
  return el;
}

const ids = ["setup-screen", "chat-screen", "scenario-input", "start-btn", "messages",
             "message-input", "send-btn", "coach-btn", "report-btn", "new-round-btn", "loading",
             "mic-btn", "speak-toggle-btn", "voice-status",
             "setup-mic-btn", "setup-voice-status"];
const registry = {};
ids.forEach((id) => (registry[id] = makeEl("div", id)));
const hintEl = makeEl("p");

global.document = {
  createElement: (tag) => makeEl(tag),
  getElementById: (id) => registry[id] || null,
  querySelector: (sel) => (sel === "#setup-screen .hint" ? hintEl : null)
};
global.window = { GEMINI_CONFIG: null };

// ---------- fetch stub ----------
let queue = [];
let requests = [];
global.fetch = async (url, opts) => {
  requests.push(JSON.parse(opts.body));
  const next = queue.shift();
  if (!next) throw new Error("smoke test: fetch called more times than queued");
  return {
    ok: next.status === 200,
    status: next.status,
    json: async () => next.body,
    text: async () => JSON.stringify(next.body)
  };
};

function groundedReply(text) {
  return {
    status: 200,
    body: {
      candidates: [{
        content: {
          role: "model",
          parts: [
            { text, thoughtSignature: "sig-abc" },
            { text: "", thought: true }
          ]
        },
        groundingMetadata: {
          webSearchQueries: ["berkeley college ave height limit"],
          searchEntryPoint: { renderedContent: "<div>chips</div>" },
          groundingChunks: [{ web: { uri: "https://berkeleyside.org/x", title: "berkeleyside.org" } }]
        }
      }]
    }
  };
}
const plainReply = (text) => ({
  status: 200,
  body: { candidates: [{ content: { role: "model", parts: [{ text }] } }] }
});
const errReply = (status) => ({ status, body: { error: { code: status, status: "RESOURCE_EXHAUSTED" } } });

// ---------- load the real app in one scope ----------
const src = fs.readFileSync(path.join(PUBLIC, "config.example.js"), "utf8").replace("YOUR_API_KEY_HERE", "test-key")
  + "\n" + fs.readFileSync(path.join(PUBLIC, "app.js"), "utf8");

const harness = `
${src}
module.exports = {
  startScenario, sendMessage, textFromContent,
  history: () => conversationHistory,
  reset: () => { conversationHistory = []; groundingNoticeShown = false; messagesEl.children = []; },
  messages: () => messagesEl.children
};
`;
const mod = { exports: {} };
new Function("module", "window", "document", "fetch", "console", "setTimeout", harness)(
  mod, global.window, global.document, global.fetch, console, setTimeout
);
const app = mod.exports;
const msgs = () => app.messages();
const classes = () => msgs().map((m) => m.className);

(async () => {
  console.log("\n1. Wiring");
  check("all 16 elements resolved", ids.filter((i) => !registry[i]).length, 0);
  check("start button enabled with a key present", registry["start-btn"].disabled, false);

  console.log("\n1b. Voice degrades without Web Speech support");
  check("chat mic hidden when recognition unsupported", registry["mic-btn"].classList.contains("hidden"), true);
  check("setup mic hidden too", registry["setup-mic-btn"].classList.contains("hidden"), true);
  check("setup status explains why", registry["setup-voice-status"].textContent.includes("Chrome, Edge, or Safari"), true);
  check("status explains why", registry["voice-status"].textContent.includes("Chrome, Edge, or Safari"), true);
  check("speak toggle hidden without synthesis", registry["speak-toggle-btn"].classList.contains("hidden"), true);
  check("no exception reached the app", typeof app.sendMessage, "function");

  console.log("\n2. Grounded opening round (search call, then persona call)");
  queue = [groundedReply("Berkeley is debating height limits on College Ave."),
           plainReply("Look, the height limit exists for a reason.")];
  registry["scenario-input"].value = "public comment on a local housing proposal";
  await app.startScenario();
  check("context, sources, then the reply", classes(), ["message context", "grounding", "message ai"]);
  check("two calls were made", requests.length, 2);
  check("search tool on the FIRST call only", requests[0].tools, [{ google_search: {} }]);
  check("persona call carries no search tool", requests[1].tools, undefined);
  check("the found issue is handed to the persona",
        requests[1].contents[0].parts[0].text.includes("Berkeley is debating height limits"), true);
  check("system instruction on the persona call", typeof requests[1].systemInstruction.parts[0].text, "string");
  check("history is user then model", app.history().map((h) => h.role), ["user", "model"]);
  check("reply text rendered", msgs()[2].textContent, "Look, the height limit exists for a reason.");
  const panel = msgs()[1];
  check("panel shows the query", panel.children[1].textContent.includes("berkeley college ave"), true);
  check("panel links the real source", panel.children[2].children[0].children[0].href, "https://berkeleyside.org/x");

  console.log("\n3. Coach mode styling");
  queue = [groundedReply("Here is what did not land.")];
  await app.sendMessage("Stepping out of the practice round — give me feedback");
  check("coach reply styled as coach", classes().slice(-2), ["message user", "message coach"]);

  console.log("\n4. Trigger the model does not share a phrase with the button");
  queue = [groundedReply("Specifics.")];
  await app.sendMessage("what was wrong with that");
  check("alternate trigger also styled as coach", classes().slice(-2), ["message user", "message coach"]);

  console.log("\n4d. Round report asks about the whole round");
  requests = [];
  queue = [groundedReply("Across the round you leaned on anecdote twice.")];
  registry["report-btn"].dispatch("click");
  await new Promise((r) => setTimeout(r, 10));
  const sent = requests[0].contents[requests[0].contents.length - 1].parts[0].text;
  check("prompt covers the whole round, not one point", sent.includes("whole round, not just my last point"), true);
  check("report styled distinctly from coach", classes().slice(-2), ["message context", "message report"]);
  check("the long prompt is not shown as a user bubble", classes().filter((c) => c === "message user").length, 2);

  console.log("\n5. Search unavailable — the round says so instead of faking it");
  app.reset();
  requests = [];
  queue = [errReply(429), plainReply("No sources, but here is my position.")];
  registry["scenario-input"].value = "public comment on a local housing proposal";
  await app.startScenario();
  check("notice rendered", classes().filter((c) => c.includes("grounding-warn")).length, 1);
  check("no sources panel claimed", classes().filter((c) => c === "grounding").length, 0);
  check("the round still runs", classes().filter((c) => c === "message ai").length, 1);

  console.log("\n6. A 200 with no search metadata also counts as ungrounded");
  app.reset();
  queue = [plainReply("I know a thing about housing."), plainReply("Opening point.")];
  await app.startScenario();
  check("unsearched answer does not pass as grounded", classes().filter((c) => c === "grounding").length, 0);
  check("notice shown instead", classes().filter((c) => c.includes("grounding-warn")).length, 1);

  console.log("\n7. Transient 503 retries");
  requests = [];
  queue = [{ status: 503, body: { error: { code: 503 } } }, groundedReply("Recovered.")];
  await app.sendMessage("Third point.");
  check("two grounded attempts were made", requests.length, 2);
  check("reply rendered after the retry", msgs()[msgs().length - 1].textContent, "Recovered.");

  console.log("\n8. Hard failure leaves history alternating");
  const before = app.history().length;
  queue = [{ status: 400, body: { error: { code: 400 } } }];
  await app.sendMessage("This one fails.");
  check("history length unchanged", app.history().length, before);
  check("last turn is still a model turn", app.history()[app.history().length - 1].role, "model");

  console.log("\n9. Concurrent sends are ignored");
  queue = [plainReply("Only one.")];
  const a = app.sendMessage("First.");
  const b = app.sendMessage("Second, should be dropped.");
  await Promise.all([a, b]);
  check("only one request issued", queue.length, 0);

  console.log("\n10. Missing key disables the start button");
  global.window.GEMINI_CONFIG = { apiKey: "" };
  const noKey = fs.readFileSync(path.join(PUBLIC, "app.js"), "utf8");
  registry["start-btn"].disabled = false;
  new Function("window", "document", "fetch", "console", "setTimeout", noKey)(
    global.window, global.document, global.fetch, console, setTimeout
  );
  check("start disabled", registry["start-btn"].disabled, true);
  check("hint explains why", hintEl.textContent.includes("Missing API key"), true);

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
  process.exit(failures === 0 ? 0 : 1);
})();
