import express from 'express';
import { exec } from 'child_process';
const app = express();

app.get('/run-script', (req, res) => {

  const command = "node scraping/getCardData.js && node index.js && node scraping/getCardData.js adi && node index.js adi"

  // Execute the script
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing script: ${error.message}`);
      return res.status(500).json({ status: 'Error', error: error.message });
    }

    console.log(`Script output: ${stdout}`);
    res.json({ status: 'Resolved', output: stdout.trim() });
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
