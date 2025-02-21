import express from 'express';
import { exec } from 'child_process';
import { mapExpenses } from '../mapper/mapper.js';
const app = express();

app.get('/run-script', async (req, res) => {

  await mapExpenses();
  res.send('Script has finished running');

});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

export default app;