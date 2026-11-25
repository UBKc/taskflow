import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

import { swaggerSpec } from './config/swagger.js';
import authRoutes from './routes/auth.js';
import boardRoutes from './routes/boards.js';
import listRoutes from './routes/lists.js';
import { listCardsRouter, cardActionsRouter } from './routes/cards.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();

// guvenlik basliklari
// swagger ui calissin diye csp'de inline script/style'a izin var
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
      },
    },
  })
);

// sadece frontend origin'i (ilk surumde * idi, zap taramasinda cikti)
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin }));

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'taskflow-backend', time: new Date().toISOString() });
});

// swagger ui -> /api-docs
// /api-docs -> /api-docs/ yonlendirmesini kendim yapiyorum, yoksa serve-static'in
// 301 cevabinda csp eksik kaliyordu
app.get('/api-docs', (req, res) => res.redirect(301, '/api-docs/'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'TaskFlow API' }));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/boards/:boardId/lists', listRoutes);
app.use('/api/lists/:listId/cards', listCardsRouter);
app.use('/api/cards', cardActionsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Kaynak bulunamadı.' });
});

// hata yakalayici en sonda olmali
app.use(errorHandler);

export default app;
