// Load env first — must be the very first thing
import './config/env.ts';
import { env } from './config/env.ts';

// Load passport strategies (side-effect: registers Google + GitHub strategies)
import './config/passport.ts';

import app from './app.ts';
import connectDB from './db/connect.ts';
import { startWorkers } from './jobs/index.ts';

/**
 * Ordered startup:
 *  1. Validate env (already done by env.ts import above — crashes if invalid)
 *  2. Connect to MongoDB
 *  3. Start background workers (skipped when RUN_WORKERS=false, see worker.ts)
 *  4. Start Express HTTP server
 */
const startServer = async (): Promise<void> => {
    // 1. Connect DB — exits process if it fails
    await connectDB();

    // 2. Start email and scheduler workers in-process
    if (env.RUN_WORKERS === 'true') {
        startWorkers();
    }

    // 3. Start HTTP server
    app.listen(env.PORT, () => {
        console.log(`🚀 Zenith server running on port ${env.PORT}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV ?? 'development'}`);
        console.log(`📡 Frontend URL: ${env.FRONTEND_URL}`);
    });
};

startServer().catch((err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
