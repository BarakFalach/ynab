import { mapExpenses } from './mapper/mapper.js';
import { downloadExpenses } from './scraping/getCardData.js';

const main = async () => {
  await downloadExpenses(false);
  await mapExpenses(false);
  await downloadExpenses(true);
  await mapExpenses(true);

};

await main();