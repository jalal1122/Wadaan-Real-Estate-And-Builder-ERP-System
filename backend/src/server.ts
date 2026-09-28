import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { globalErrorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import systemRoutes from './routes/system.routes';
import accountRoutes from './routes/account.routes';
import journalRoutes from './routes/journal.routes';
import projectRoutes from './routes/project.routes';
import vendorRoutes from './routes/vendor.routes';
import billRoutes from './routes/bill.routes';
import paymentRoutes from './routes/payment.routes';
import inflowRoutes from './routes/inflow.routes';
import reportRoutes from './routes/report.routes';
import documentRoutes from './routes/document.routes';
import personalRoutes from './routes/personal.routes';
import assetRoutes from './routes/asset.routes';
import { AuthService } from './services/auth.service';

// Load environment variables
dotenv.config();

const app = express();

// Allowed origins for desktop and browser clients
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Electron file/internal desktop requests, mobile, curl)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow loopback origins on any port
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Lightweight health check endpoint for process supervisor & Electron startup checks
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/journals', journalRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/bills', billRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1', inflowRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/personal', personalRoutes);
app.use('/api/v1/assets', assetRoutes);

// Static frontend serving (for Electron production bundle or standalone executable)
const frontendOutDir = process.env.FRONTEND_STATIC_PATH || path.resolve(__dirname, '../../frontend/out');
if (fs.existsSync(frontendOutDir)) {
  console.log(`[Express] Mounting static frontend bundle from ${frontendOutDir}`);
  app.use(express.static(frontendOutDir, { extensions: ['html'] }));

  // HTML5 History API fallback for client-side navigation
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }
    const cleanPath = req.path.replace(/^\//, '').replace(/\/$/, '');
    const specificHtml = path.join(frontendOutDir, `${cleanPath}.html`);
    if (cleanPath && fs.existsSync(specificHtml)) {
      return res.sendFile(specificHtml);
    }
    const indexPath = path.join(frontendOutDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Wadaan ERP Backend running on http://localhost:${PORT}`);
  // Pre-warm single-tenant master administrator cache
  AuthService.getMasterAdmin().catch((err) => {
    console.warn('[Auth] Pre-warming admin cache skipped:', err.message);
  });
});

export default app;
