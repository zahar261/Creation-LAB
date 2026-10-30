#!/usr/bin/env node
/* Builds kb/problems.js from kb/problems.json so the app can load it with a <script> tag
   (works offline, from file:// and under the site CSP). Usage: node tools/kb-build.js */
const fs = require("fs"), path = require("path");
const src = path.join(__dirname, "..", "kb", "problems.json"), out = path.join(__dirname, "..", "kb", "problems.js");
const js = "/* generated from kb/problems.json by tools/kb-build.js; do not edit */\nwindow.KB_V2=" + JSON.stringify(JSON.parse(fs.readFileSync(src, "utf8"))) + ";\n";
if (process.argv.includes("--check")) {
  const cur = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
  if (cur !== js) { console.log("  FAIL kb/problems.js is out of date: run node tools/kb-build.js"); process.exit(1); }
  console.log("  ok   kb/problems.js matches kb/problems.json");
} else { fs.writeFileSync(out, js); console.log("wrote kb/problems.js (" + js.length + " bytes)"); }
