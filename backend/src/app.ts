import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config';
import { errorHandler } from './middlewares/error-handler';
import { notFoundHandler } from './middlewares/not-found-handler';

// Routes
import analyticsRoutes from './routes/analytics.routes';
import dashboardRoutes from './routes/dashboard.routes';
import salesRoutes from './routes/sales.routes';

// v1.2 - Analytics fixes
const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: config.cors.origin }));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use(`${config.apiPrefix}/analytics`, analyticsRoutes);
app.use(`${config.apiPrefix}/dashboards`, dashboardRoutes);
app.use(`${config.apiPrefix}/sales`, salesRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
