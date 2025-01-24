import express from 'express';
import { exec } from 'child_process';
import { createServer } from 'http';

const app = express();

app.get('/run-script', (req, res) => {
  const command = "node scraping/getCardData.js && node index.js && node scraping/getCardData.js adi && node index.js adi";

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ status: 'Error', error: error.message });
    }

    console.log(`Script output: ${stdout}`);
    res.json({ status: 'Resolved', output: stdout.trim() });
  });
});

export default (req, res) => {
  const server = createServer(app);
  server.emit('request', req, res);
};
