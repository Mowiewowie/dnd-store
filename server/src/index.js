import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/authRoutes.js';
import characterRoutes from './routes/characterRoutes.js';
import storeRoutes from './routes/storeRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import dmRoutes from './routes/dmRoutes.js';
import itemRoutes from './routes/itemRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/purchase', purchaseRoutes);
app.use('/api/dm', dmRoutes);
app.use('/api/items', itemRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

if (process.env.NODE_ENV === 'production') {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const clientDist = join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(join(clientDist, 'index.html')));
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
