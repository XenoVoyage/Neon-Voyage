#!/usr/bin/env node
"use strict";

const suites = [
  require("./config-core.test"),
  require("./offline.test"),
  require("./browser-smoke.test"),
  require("./gameplay.test"),
  require("./visuals.test"),
  require("./stress.test")
];

const tests = [];
function register(name, callback) {
  tests.push({ name, callback });
}
for (const suite of suites) suite(register);

let failures = 0;
for (const entry of tests) {
  try {
    entry.callback();
    process.stdout.write(`PASS ${entry.name}\n`);
  } catch (error) {
    failures += 1;
    process.stderr.write(`FAIL ${entry.name}\n`);
    process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  }
}

process.stdout.write(`\n${tests.length - failures}/${tests.length} tests passed\n`);
if (failures) process.exitCode = 1;
