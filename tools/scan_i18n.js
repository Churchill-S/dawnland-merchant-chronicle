/* Scan ui.js for Chinese strings missing from the i18n dictionary. */
const fs = require('fs');

const ui = fs.readFileSync('js/ui.js', 'utf8');
const i18n = fs.readFileSync('js/i18n.js', 'utf8');

const dictMatch = i18n.match(/DICT\s*=\s*\{([\s\S]*?)\n  \};/);
if (!dictMatch) { console.error('DICT not found'); process.exit(1); }
const dictSrc = dictMatch[1];
const keys = [];
const keyRe = /'((?:[^'\\]|\\.)*)'\s*:/g;
let m;
while ((m = keyRe.exec(dictSrc))) keys.push(m[1]);

// Extract Chinese-containing string literals from ui.js
const cands = [];
const litRe = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;
let lm;
while ((lm = litRe.exec(ui))) {
  const s = lm[1] || lm[2] || '';
  if (/[\u4e00-\u9fa5]/.test(s) && s.length >= 2) cands.push(s);
}

function covered(text) {
  for (let i = 0; i < keys.length; i++) {
    if (text.indexOf(keys[i]) !== -1) return true;
  }
  return false;
}

const freq = {};
cands.forEach((c) => {
  if (covered(c)) return;
  // only whole phrases containing a CJK char
  const clean = c.replace(/\\n/g, '').replace(/\\'/g, "'").trim();
  if (clean.length < 2) return;
  freq[clean] = (freq[clean] || 0) + 1;
});

const sorted = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
sorted.slice(0, 220).forEach((s, i) => {
  console.log(freq[s] + '\t' + s);
});
console.error('TOTAL_MISSING=' + sorted.length);
