import * as dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import pool from '../db/pool';

const PORT = process.env.PORT ?? 3001;

const app = createApp(pool);

app.listen(PORT, () => {
  console.log(`🚢 FuelEU Backend running on http://localhost:${PORT}`);
});
