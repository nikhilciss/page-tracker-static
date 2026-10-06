import { access } from 'node:fs/promises';
for (const file of ['index.html','login.html','access.js','workspace.json','replay.webm']) await access(new URL('../public/' + file, import.meta.url));
console.info('Static workspace ready.');
