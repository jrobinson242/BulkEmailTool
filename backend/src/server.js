require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const EmailWorker = require('./workers/emailWorker');

// Import routes
const authRoutes = require('./routes/auth');
const contactRoutes = require('./routes/contacts');
const contactListRoutes = require('./routes/contactLists');
const templateRoutes = require('./routes/templates');
const campaignRoutes = require('./routes/campaigns');
const analyticsRoutes = require('./routes/analytics');
const queueRoutes = require('./routes/queue');
const adminRoutes = require('./routes/admin');
const admin365Routes = require('./routes/admin365');
const rateCalculatorRoutes = require('./routes/rateCalculator');
const rateClientsRoutes = require('./routes/rateClients');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize and start email worker
const emailWorker = new EmailWorker();
emailWorker.initialize()
  .then(() => {
    emailWorker.start();
    logger.info('Email worker started successfully');
  })
  .catch(error => {
    logger.error('Failed to start email worker', { error: error.message });
  });

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/contact-lists', contactListRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', admin365Routes);
// app.use('/api/rate-calculator', rateCalculatorRoutes); // Disabled - using local DB instead of SharePoint
app.use('/api/rate-calculator', rateClientsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server and stopping email worker');
  emailWorker.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server and stopping email worker');
  emailWorker.stop();
  process.exit(0);
});

module.exports = app;
