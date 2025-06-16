// remote-trigger.js
import express from 'express';
// const { exec } = require('child_process');
import { exec } from 'child_process';
const app = express();

app.get('/run-script', (req, res) => {
  exec('npm start', (error, stdout, stderr) => {
    if (error) return res.status(500).send(error.message);
    res.send(stdout || stderr);
  });
});

app.listen(3000, () => console.log('Trigger server running on http://localhost:3000'));
