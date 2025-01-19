import dotenv from 'dotenv';  // Use import if using ES Modules
dotenv.config();

import { mapExpenses } from './mapper/mapper.js';
console.log('Mapping expenses...', process.argv[2]);


mapExpenses();