import { exec } from 'child_process';

const targetUrl = 'https://cielovistasoftware.github.io/one-electron-universe/';

function openInBrowser(url) {
  const command = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(command, (err) => {
    if (err) {
      console.error('Failed to open browser:', err.message);
      process.exitCode = 1;
      return;
    }
    console.log('Opened:', url);
  });
}

openInBrowser(targetUrl);
