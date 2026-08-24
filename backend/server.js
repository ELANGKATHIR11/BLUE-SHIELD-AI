/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 *
 * OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)
 * ============================================================================
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Route imports
import healthRoutes from './routes/healthRoutes.js';
import vesselRoutes from './routes/vesselRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';
import predictionRoutes from './routes/predictionRoutes.js';
import telemetryRoutes from './routes/telemetryRoutes.js';

// Service imports
import { alertService } from './services/alertService.js';
import { locationService } from './services/locationService.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Socket.IO Setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

// Bind Socket.IO instance to services
alertService.setSocketIO(io);
locationService.setSocketIO(io);

// Security & Optimization Middlewares
app.use(helmet({
  contentSecurityPolicy: false // Allow map tiles and cross-origin assets in client
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());
app.use(morgan('short'));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Rate Limiter (High-capacity for continuous vessel telemetry streams)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000, // Allow up to 10,000 requests per 15 min window
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP. Please try again later.'
    }
  }
});
app.use('/api/', limiter);

// API Route Registration
app.use('/health', healthRoutes);
app.use('/api/vessels', vesselRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/predictions', predictionRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Blue Shield AI — Maritime Defense & Safety API',
    version: '2.0.0',
    database: 'Google Cloud Firestore',
    status: 'OPERATIONAL',
    endpoints: {
      health: '/health',
      vessels: '/api/vessels',
      alerts: '/api/alerts',
      zones: '/api/zones',
      predictions: '/api/predictions'
    }
  });
});

// Real-Time Socket.IO Subscriptions
io.on('connection', (socket) => {
  console.log(`🔌 Client connected to Real-Time Stream: ${socket.id}`);

  socket.on('subscribe:vessel', (aisId) => {
    socket.join(`vessel:${aisId}`);
  });

  socket.on('unsubscribe:vessel', (aisId) => {
    socket.leave(`vessel:${aisId}`);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Centralized 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('💥 API Error Handler:', err.message);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred'
    }
  });
});

const PORT = parseInt(process.env.PORT) || 5000;
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`\n==================================================`);
    console.log(`🛡️  BLUE SHIELD AI — PRODUCTION NODE SERVER`);
    console.log(`==================================================`);
    console.log(`🚀 Port:             http://localhost:${PORT}`);
    console.log(`🔥 Database:         Firestore (Single Source of Truth)`);
    console.log(`🤖 ML Inference:     ${process.env.PYTHON_ML_URL || 'http://127.0.0.1:5000'}`);
    console.log(`🌊 Geofence Engine:  Authoritative Turf.js / GeoJSON`);
    console.log(`==================================================\n`);
  });
}

export { app, httpServer, io };
export default app;
