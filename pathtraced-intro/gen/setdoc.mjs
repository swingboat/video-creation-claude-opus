// Set canvas size / duration / background on a checked-out editable document: node setdoc.mjs file.json W H DURATION
import { readFileSync, writeFileSync } from 'node:fs';
const [file, w, h, dur] = process.argv.slice(2);
const doc = JSON.parse(readFileSync(file, 'utf8'));
doc.dimensions = { width: +w, height: +h };
doc.duration = +dur;
doc.backgroundColor = [0, 0, 0, 1];
writeFileSync(file, JSON.stringify(doc, null, 1));
