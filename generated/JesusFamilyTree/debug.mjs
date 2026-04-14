import fs from 'fs';
const js = fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const mm = js.match(/cvs\.addEventListener\('mousemove'[\s\S]*?\n\}\);/);
if(mm) console.log(mm[0]);
