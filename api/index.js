import express from 'express';
import { mapExpenses } from '../mapper/mapper.js';
import { downloadExpenses } from '../scraping/getCardData.js';
const app = express();

app.get('/run-script', async (req, res) => {

  await downloadExpenses(false);
  await mapExpenses(false);
  await downloadExpenses(true);
  await mapExpenses(true);
  res.send('Script has finished running');

});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});

export default app;