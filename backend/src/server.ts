import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { globalErrorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';

// Load environment variables
dotenv.config();

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Mount Routes
app.use('/api/v1/auth', authRoutes);

// Global Error Handler
app.use(globalErrorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Wadaan ERP Backend running on http://localhost:${PORT}`);
});

export default app;
