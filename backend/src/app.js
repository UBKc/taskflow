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

// --- Güvenlik başlıkları (helmet) ---
// CSP, X-Frame-Options, X-Content-Type-Options, HSTS ekler ve X-Powered-By'ı kaldırır.
// CSP, Swagger UI'ın çalışabilmesi için inline script/style'a izin verecek şekilde ayarlandı.
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

// --- CORS ---
// 2. faz: yalnızca frontend origin'ine izin verilir (önceki sürümde "*" idi).
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: corsOrigin }));

app.use(express.json());

// --- Sağlık kontrolü ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'taskflow-backend', time: new Date().toISOString() });
});

// --- API dokümantasyonu (Swagger UI) -> /api-docs ---
// "/api-docs" -> "/api-docs/" yönlendirmesini kendimiz yapıyoruz; böylece helmet'in
// tam CSP başlığı uygulanır (serve-static'in eksik CSP'li 301'i yerine).
app.get('/api-docs', (req, res) => res.redirect(301, '/api-docs/'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'TaskFlow API' }));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// --- API route'ları ---
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/boards/:boardId/lists', listRoutes);
app.use('/api/lists/:listId/cards', listCardsRouter);
app.use('/api/cards', cardActionsRouter);

// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: 'Kaynak bulunamadı.' });
});

// --- Merkezi hata yakalayıcı (en sonda) ---
app.use(errorHandler);

export default app;
