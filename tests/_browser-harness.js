"use strict";

const { vm, readProject } = require("./_harness");

const RUNTIME_SCRIPTS = [
  "js/config.js",
  "js/core.js",
  "js/audio.js",
  "js/render.js",
  "js/game.js"
];

function makeClassList(initial) {
  const values = new Set(String(initial || "").split(/\s+/).filter(Boolean));
  return {
    add: (...tokens) => tokens.forEach((token) => values.add(token)),
    remove: (...tokens) => tokens.forEach((token) => values.delete(token)),
    toggle(token, force) {
      if (force === true) { values.add(token); return true; }
      if (force === false) { values.delete(token); return false; }
      if (values.has(token)) { values.delete(token); return false; }
      values.add(token); return true;
    },
    contains: (token) => values.has(token),
    toString: () => Array.from(values).join(" ")
  };
}

function makeGradient() {
  return { addColorStop() {} };
}

function makeCanvasContext() {
  const methods = new Set([
    "arc", "beginPath", "clearRect", "closePath", "drawImage", "ellipse", "fill",
    "fillRect", "fillText", "lineTo", "moveTo", "quadraticCurveTo", "rect", "restore",
    "rotate", "save", "scale", "setLineDash", "setTransform", "stroke", "strokeRect",
    "translate"
  ]);
  return new Proxy({
    canvas: null,
    createLinearGradient: makeGradient,
    createRadialGradient: makeGradient
  }, {
    get(target, key) {
      if (key in target) return target[key];
      if (methods.has(key)) return () => {};
      return target[key];
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    }
  });
}

function makeElement(id, className, tagName) {
  const listeners = new Map();
  const attributes = new Map();
  const isCanvas = id === "game" || String(tagName || "").toLowerCase() === "canvas";
  const context = isCanvas ? makeCanvasContext() : null;
  let textContent = "";
  const element = {
    id,
    nodeType: 1,
    tagName: isCanvas ? "CANVAS" : String(tagName || "div").toUpperCase(),
    className: className || "",
    classList: makeClassList(className),
    style: { setProperty(name, value) { this[name] = value; }, removeProperty(name) { delete this[name]; } },
    dataset: {},
    children: [],
    parentElement: null,
    get textContent() { return textContent; },
    set textContent(value) {
      textContent = String(value == null ? "" : value);
      for (const child of this.children) child.parentElement = null;
      this.children.length = 0;
    },
    disabled: false,
    inert: false,
    open: false,
    width: id === "game" ? 1280 : 0,
    height: id === "game" ? 720 : 0,
    clientWidth: id === "game" ? 1280 : 200,
    clientHeight: id === "game" ? 720 : 80,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      if (!listeners.has(type)) return;
      listeners.set(type, listeners.get(type).filter((candidate) => candidate !== listener));
    },
    dispatchEvent(event) {
      event.target = event.target || element;
      event.currentTarget = element;
      if (typeof event.preventDefault !== "function") event.preventDefault = () => {};
      for (const listener of listeners.get(event.type) || []) listener.call(element, event);
      return !event.defaultPrevented;
    },
    click() {
      if (this.disabled) return;
      this.dispatchEvent({ type: "click", detail: 0, pointerType: "", preventDefault() {} });
    },
    focus() { if (typeof this._focus === "function") this._focus(); },
    blur() { if (typeof this._blur === "function") this._blur(); },
    _capturedPointers: new Set(),
    setPointerCapture(pointerId) { this._capturedPointers.add(pointerId); },
    releasePointerCapture(pointerId) { this._capturedPointers.delete(pointerId); },
    hasPointerCapture(pointerId) { return this._capturedPointers.has(pointerId); },
    getContext: () => context,
    _bounds: { left: 0, top: 0, right: 1280, bottom: 720, width: 1280, height: 720 },
    getBoundingClientRect() { return Object.assign({}, this._bounds); },
    setBoundingClientRect(bounds) {
      const next = Object.assign({}, this._bounds, bounds || {});
      if (Number.isFinite(next.left) && Number.isFinite(next.width)) next.right = next.left + next.width;
      if (Number.isFinite(next.top) && Number.isFinite(next.height)) next.bottom = next.top + next.height;
      this._bounds = next;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
      if (name === "inert") this.inert = true;
    },
    getAttribute(name) { return attributes.has(name) ? attributes.get(name) : null; },
    removeAttribute(name) {
      attributes.delete(name);
      if (name === "inert") this.inert = false;
    },
    hasAttribute(name) { return attributes.has(name); },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
    querySelectorAll(selector) {
      const matches = [];
      const match = (candidate) => {
        if (!candidate || candidate.nodeType !== 1) return false;
        if (selector.startsWith(".")) {
          return String(candidate.className || "").split(/\s+/).includes(selector.slice(1));
        }
        if (selector.startsWith("#")) return candidate.id === selector.slice(1);
        return candidate.tagName === selector.toUpperCase();
      };
      const visit = (parent) => {
        for (const child of parent.children || []) {
          if (match(child)) matches.push(child);
          visit(child);
        }
      };
      visit(this);
      return matches;
    },
    appendChild(child) {
      if (child.parentElement && child.parentElement !== this && Array.isArray(child.parentElement.children)) {
        const previousIndex = child.parentElement.children.indexOf(child);
        if (previousIndex >= 0) child.parentElement.children.splice(previousIndex, 1);
      }
      child.parentElement = this;
      this.children.push(child);
      return child;
    },
    replaceChildren(...children) {
      for (const child of this.children) child.parentElement = null;
      this.children.length = 0;
      for (const child of children) this.appendChild(child);
    },
    showModal() { this.open = true; },
    close() { this.open = false; }
  };
  if (context) context.canvas = element;
  return element;
}

function buildBrowser(options) {
  const settings = options || {};
  const html = readProject("index.html");
  const elementClasses = new Map();
  for (const match of html.matchAll(/<[^>]+\bid=["']([^"']+)["'][^>]*>/gi)) {
    const tag = match[0];
    const classMatch = tag.match(/\bclass=["']([^"']*)["']/i);
    elementClasses.set(match[1], classMatch ? classMatch[1] : "");
  }
  let activeElement = null;
  function bindFocus(element) {
    element._focus = () => { activeElement = element; };
    element._blur = () => { if (activeElement === element) activeElement = null; };
    return element;
  }
  const elements = new Map(Array.from(elementClasses, ([id, className]) => [id, bindFocus(makeElement(id, className))]));
  const shell = elements.get("game-shell");
  if (shell) {
    const topLevelIds = [
      "game", "canvas-instructions", "orientation-overlay", "hud", "boss-hud",
      "objective-hud", "meters", "announcement", "menu-overlay", "pause-overlay",
      "gameover-overlay", "controls-modal", "settings-modal", "stage-select-modal",
      "new-game-modal", "enigma-upgrade-modal", "touch-controls"
    ];
    shell.children = topLevelIds.map((id) => elements.get(id)).filter(Boolean);
    for (const child of shell.children) child.parentElement = shell;
  }
  const enigmaModal = elements.get("enigma-upgrade-modal");
  const enigmaStatus = elements.get("enigma-upgrade-status");
  if (enigmaModal && enigmaStatus) enigmaStatus.parentElement = enigmaModal;
  for (const [zoneId, knobId] of [["move-zone", "move-knob"], ["aim-zone", "aim-knob"]]) {
    const zone = elements.get(zoneId);
    const knob = elements.get(knobId);
    if (!zone || !knob) continue;
    const ring = makeElement(`${zoneId}-ring`, "stick-ring");
    knob.parentElement = ring;
    ring.parentElement = zone;
    zone.querySelector = (selector) => selector === ".stick-ring" ? ring : null;
    zone._stickRing = ring;
  }
  const listeners = new Map();
  const frameQueue = [];
  let now = 0;
  const storage = settings.storage || new Map();
  const createdElements = [];

  const document = {
    readyState: "loading",
    hidden: false,
    visibilityState: "visible",
    fullscreenElement: null,
    body: makeElement("body", ""),
    documentElement: makeElement("html", ""),
    get activeElement() { return activeElement; },
    getElementById: (id) => elements.get(id) || null,
    querySelector(selector) {
      if (selector.startsWith("#")) return elements.get(selector.slice(1)) || null;
      return null;
    },
    querySelectorAll() { return []; },
    createElement(tag) {
      const element = bindFocus(makeElement(`created-${tag}-${createdElements.length}`, "", tag));
      createdElements.push(element);
      return element;
    },
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      if (!listeners.has(type)) return;
      listeners.set(type, listeners.get(type).filter((candidate) => candidate !== listener));
    },
    exitFullscreen() { this.fullscreenElement = null; return Promise.resolve(); }
  };
  document.documentElement.requestFullscreen = () => {
    document.fullscreenElement = document.documentElement;
    return Promise.resolve();
  };

  class FakeImage {
    constructor() {
      this.complete = true;
      this.naturalWidth = 1024;
      this.naturalHeight = 1024;
      this.decoding = "auto";
      this.onload = null;
      this.onerror = null;
      this._src = "";
    }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  }

  const windowListeners = new Map();
  const NativeDate = Date;
  class FixedDate extends NativeDate {
    static now() { return Number.isFinite(settings.now) ? settings.now : 1700000000000; }
  }

  class FakePointerEvent {
    constructor(type, initial) {
      Object.assign(this, {
        type,
        pointerId: 0,
        pointerType: "",
        isPrimary: false,
        clientX: 0,
        clientY: 0,
        button: 0,
        buttons: 0,
        cancelable: true,
        defaultPrevented: false
      }, initial || {});
    }

    preventDefault() {
      if (this.cancelable) this.defaultPrevented = true;
    }

    stopPropagation() {}
  }

  const mediaMatches = Object.assign({}, settings.mediaMatches || {});
  const orientation = settings.orientation === false ? undefined : Object.assign({
    type: "landscape-primary",
    angle: 90,
    lock: () => Promise.resolve()
  }, settings.orientation || {});
  const window = {
    ND: {},
    document,
    console,
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    Image: FakeImage,
    navigator: {
      maxTouchPoints: Number.isFinite(settings.maxTouchPoints) ? settings.maxTouchPoints : 0,
      userAgent: settings.userAgent || "NeonVoyageTest",
      getGamepads: () => []
    },
    screen: orientation ? { orientation } : {},
    location: { href: "file:///Neon-Voyage/index.html", protocol: "file:" },
    performance: { now: () => now },
    Date: FixedDate,
    localStorage: {
      getItem: (key) => typeof storage.getItem === "function"
        ? storage.getItem(key)
        : storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => typeof storage.setItem === "function"
        ? storage.setItem(key, String(value))
        : storage.set(key, String(value)),
      removeItem: (key) => typeof storage.removeItem === "function"
        ? storage.removeItem(key)
        : storage.delete(key)
    },
    matchMedia(query) {
      return {
        matches: Boolean(mediaMatches[query]),
        media: query,
        addEventListener() {},
        removeEventListener() {}
      };
    },
    addEventListener(type, listener) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      if (!windowListeners.has(type)) return;
      windowListeners.set(type, windowListeners.get(type).filter((candidate) => candidate !== listener));
    },
    dispatchEvent(event) {
      for (const listener of windowListeners.get(event.type) || []) listener.call(window, event);
    },
    requestAnimationFrame(callback) { frameQueue.push(callback); return frameQueue.length; },
    PointerEvent: FakePointerEvent,
    AudioContext: undefined,
    webkitAudioContext: undefined
  };
  window.window = window;
  window.self = window;
  window.globalThis = window;

  const context = vm.createContext(Object.assign(window, {
    window,
    self: window,
    globalThis: window,
    document,
    console,
    Math,
    Number,
    Object,
    Array,
    Set,
    Map,
    WeakSet,
    JSON,
    Date: FixedDate,
    String,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Uint8ClampedArray,
    Promise
  }));

  function emit(target, type, extras) {
    const event = Object.assign({ type, preventDefault() {}, stopPropagation() {} }, extras || {});
    if (target === document) {
      for (const listener of listeners.get(type) || []) listener.call(document, event);
    } else target.dispatchEvent(event);
  }

  function pumpFrames(count, milliseconds) {
    const step = milliseconds || 1000 / 60;
    for (let index = 0; index < count; index += 1) {
      now += step;
      const callbacks = frameQueue.splice(0, frameQueue.length);
      for (const callback of callbacks) callback(now);
    }
  }

  return { window, document, elements, createdElements, storage, context, emit, pumpFrames, frameQueue };
}

function loadRuntimeScripts(browser) {
  for (const script of RUNTIME_SCRIPTS) {
    vm.runInContext(readProject(script), browser.context, { filename: script, timeout: 3000 });
  }
}

module.exports = { buildBrowser, loadRuntimeScripts };
