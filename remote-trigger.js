import express from 'express';
import { exec } from 'child_process';

const app = express();

app.get('/run-script', (req, res) => {
  exec('npm start', { encoding: 'utf8' }, (error, stdout, stderr) => {
    const output = [
      '📱 Script triggered via Shortcut',
      stdout,
      stderr,
      error ? `❌ Error: ${error.message}` : '✅ Finished with no errors',
    ]
      .filter(Boolean)
      .join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(output);
  });
});

app.listen(3000, () => {
  console.log('🚀 Trigger server running on http://localhost:3000');
});
