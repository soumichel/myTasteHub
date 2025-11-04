import app from './app';
import { config } from './config';
import { db } from './database';

// v1.2 - Analytics fixes
const PORT = config.port;

async function startServer() {
  try {
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 API: http://localhost:${PORT}${config.apiPrefix}`);
      console.log(`🌍 Environment: ${config.env}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
