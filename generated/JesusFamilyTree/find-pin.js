import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FILE = path.join(__dirname, 'index.html');
const html = fs.readFileSync(FILE, 'utf8');
const lines = html.split('\n');
lines.forEach((l,i)=>{ if(l.includes('\u{1F4CC}')) console.log((i+1)+': '+l.trim()); });
