import mongoose from 'mongoose';
import { env } from '../config/env.ts';
import { ApiError } from '../utils/ApiError.ts';

const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(env.MONGO_URI);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }

    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
        console.log('✅ MongoDB reconnected');
    });
};

export default connectDB;
