import { Schema, model } from 'mongoose';

type ProviderEnum = 'github' | 'gmail' | 'notion';

interface IProvider {
    userId: string;
    accessToken: string;
    refreshToken: string;
    profile: { username: string; avatar: string };
    provider: ProviderEnum;
}

const IntegrationSchema = new Schema<IProvider>({
    userId: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String, required: true },
    profile: {
        username: { type: String, required: true },
        avatar: { type: String, required: true },
    },
    provider: { type: String, enum: ['github', 'gmail', 'notion'], required: true },
});

export const Integration = model<IProvider>('Integration', IntegrationSchema);