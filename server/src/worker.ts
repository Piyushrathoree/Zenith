// Standalone worker process. Use this in production when RUN_WORKERS=false on the API.
import './config/env.ts';
import connectDB from './db/connect.ts';
import { startWorkers } from './jobs/index.ts';

await connectDB();
startWorkers();
console.log('🛠️  Zenith worker process running');
