"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");

function readProject(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

function loadBrowserScript(relativePath, additions) {
  const window = Object.assign({ ND: {} }, additions || {});
  window.window = window;
  window.globalThis = window;
  const context = vm.createContext({
    window,
    globalThis: window,
    console,
    Math,
    Number,
    Object,
    Array,
    Set,
    Map,
    JSON,
    Date,
    String,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Infinity,
    NaN
  });
  vm.runInContext(readProject(relativePath), context, {
    filename: relativePath,
    timeout: 2000
  });
  return { window, context };
}

function approximately(actual, expected, epsilon, label) {
  const difference = Math.abs(actual - expected);
  assert.ok(
    difference <= epsilon,
    `${label || "value"}: expected ${actual} to be within ${epsilon} of ${expected}`
  );
}

function listFiles(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...listFiles(absolute));
    else output.push(absolute);
  }
  return output;
}

module.exports = {
  assert,
  fs,
  path,
  vm,
  PROJECT_ROOT,
  readProject,
  loadBrowserScript,
  approximately,
  listFiles
};
