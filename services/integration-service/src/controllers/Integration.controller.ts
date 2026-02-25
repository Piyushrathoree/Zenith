import type { Request, Response } from "express";
import { OAUTH_CONFIG } from "../config/oauth.config";
import { decryptData, encryptData } from "../util/crypto";
import { env } from "../util/env";
import { Integration } from "../model/integration.mode";
import { ApiResponse } from "../util/ApiResponse";
import { ApiError } from "../util/ApiError";

export const connectProvider = async (req: Request, res: Response) => {
    const { provider } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];
    if (!config) {
        res.status(400).json({ message: "Invalid provider" });
        return;
    }
    // this is important , this is being used to prevent CSRF attacks -- important !!
    const statePayload = JSON.stringify({
        u: userId,
        e: Date.now() + 10 * 60 * 1000,
    });
    const state = encryptData(statePayload, process.env.KEY as string);

    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: `${env.API_BASE_URL}/api/v1/integrations/auth/${provider}/callback`,
        scope: config.scope,
        response_type: "code",
        state: state,
        ...config.params,
    });
    res.redirect(`${config.authUrl}?${params.toString()}`);
};

export const callbackProvider = async (req: Request, res: Response) => {
    const { provider } = req.params;
    const { code, state } = req.query;

    const config = OAUTH_CONFIG[provider as keyof typeof OAUTH_CONFIG];
    if (!config) {
        res.status(400).json({ message: "Invalid provider" });
        return;
    }
    if (!code || !state) {
        res.status(400).json({ message: "Missing code or state" });
        return;
    }
    try {
        let userId: string;
        try {
            const decryptedString = decryptData(
                state as string,
                process.env.KEY as string
            );

            if (!decryptedString) throw new Error("Decryption failed");
            const decryptedState = JSON.parse(decryptedString);

            if (Date.now() > decryptedState.e) throw new Error("State expired");
            userId = decryptedState.u;
        } catch (e) {
            console.error("State verification failed:", e);
            return res.redirect(
                `${env.FRONTEND_URL}/dashboard?integration_error=csrf_violation`
            );
        }

        const tokenResponse = await fetch(config.tokenUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: config.clientId,
                client_secret: config.clientSecret,
                code: code,
                redirect_uri: `${env.API_BASE_URL}/api/v1/integrations/auth/${provider}/callback`,
                grant_type: "authorization_code",
            }),
        });
        if (!tokenResponse.ok || !tokenResponse) {
            throw new Error(
                `Token request failed with status ${tokenResponse.status}`
            );
        }
        const tokenData = (await tokenResponse.json()) as {
            access_token: string;
            refresh_token: string;
            expires_in?: number;
        };
        const encryptAccess = encryptData(
            tokenData.access_token,
            process.env.KEY as string
        );
        const encryptRefresh = encryptData(
            tokenData.refresh_token,
            process.env.KEY as string
        );
        const integration = await Integration.findOneAndUpdate(
            { userId, provider },
            {
                userId,
                provider,
                accessToken: encryptAccess,
                refreshToken: encryptRefresh,
                expiresAt: tokenData.expires_in
                    ? new Date(Date.now() + tokenData.expires_in * 1000)
                    : undefined,
                status: "active",
            },
            { upsert: true, new: true }
        );
        res.status(200).json(
            new ApiResponse(201, Integration, "Integration successful")
        );
        res.redirect(
            `${env.FRONTEND_URL}/dashboard?integration_success=${provider}`
        );
    } catch (error) {
        res.status(500).json(new ApiError(500, "Integration failed"));
        console.error(`[OAuth Error] ${provider}:`, error);
        res.redirect(
            `${env.FRONTEND_URL}/dashboard?integration_error=server_error`
        );
    }
};
