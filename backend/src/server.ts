import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { globalErrorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import systemRoutes from './routes/system.routes';
import accountRoutes from './routes/account.routes';
import journalRoutes from './routes/journal.routes';
import projectRoutes from './routes/project.routes';
import vendorRoutes from './routes/vendor.routes';
import billRoutes from './routes/bill.routes';
import paymentRoutes from './routes/payment.routes';

// Load environment variables
dotenv.config();

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/accounts', accountRoutes);
app.use('/api/v1/journals', journalRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/vendors', vendorRoutes);
app.use('/api/v1/bills', billRoutes);
app.use('/api/v1/payments', paymentRoutes);

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Wadaan ERP Backend running on http://localhost:${PORT}`);
});

export default app;
