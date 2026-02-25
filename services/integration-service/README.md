sequenceDiagram
    participant IntegrationService
    participant Database
    participant GitHub/Google

    IntegrationService->>Database: Get Integration Doc
    Database-->>IntegrationService: Returns Encrypted Token
    IntegrationService->>IntegrationService: Decrypts Token
    IntegrationService->>GitHub/Google: API Request (e.g., Search Issues)
    GitHub/Google-->>IntegrationService: Returns Raw JSON
    IntegrationService->>IntegrationService: Adapter Normalizes Data
    Note right of IntegrationService: Output: UniversalTask[]
```

---

### 2. Implementation Steps

Here is your checklist to build this service from scratch.

#### Step 1: Project Skeleton & Dependencies
Set up the environment.

* **Action:** Create the folder `services/integration-service`.
* **Action:** Initialize `package.json`.
* **Dependencies:**
    ```bash
    bun add express mongoose dotenv zod googleapis
    bun add -d typescript @types/node @types/express nodemon
    ```
    *(Note: We use `googleapis` for Gmail, but standard `fetch` is fine for GitHub).*

#### Step 2: The Security Layer (`crypto.ts`)
**Goal:** Never store plain text tokens.
**Task:** Create a utility to Encrypt/Decrypt strings using `aes-256-ctr`.

```typescript
// src/utils/crypto.ts
import crypto from 'crypto';
// You need an ENCRYPTION_KEY in your .env (32 chars)
const algorithm = 'aes-256-ctr';

export const encrypt = (text: string) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, Buffer.from(process.env.ENCRYPTION_KEY!), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return { iv: iv.toString('hex'), content: encrypted.toString('hex') };
};

export const decrypt = (hash: { iv: string, content: string }) => {
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(process.env.ENCRYPTION_KEY!), Buffer.from(hash.iv, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);
    return decrypted.toString();
};
```

#### Step 3: The Database Model (`integration.model.ts`)
**Goal:** Define how we store the keys.
**Task:** Create the Mongoose schema.

```typescript
// src/models/integration.model.ts
import mongoose from 'mongoose';

const IntegrationSchema = new mongoose.Schema({
    userId: { type: String, required: true }, // From your User Service
    provider: { type: String, enum: ['github', 'gmail'], required: true },
    accessToken: { 
        iv: { type: String, required: true }, 
        content: { type: String, required: true } 
    },
    refreshToken: { 
        iv: { type: String }, 
        content: { type: String } 
    },
    profile: { type: mongoose.Schema.Types.Mixed }, // Store username/email for UI
}, { timestamps: true });

// Ensure one user can't connect the same provider twice
IntegrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

export const Integration = mongoose.model('Integration', IntegrationSchema);
```

#### Step 4: The Config Map (`oauth.config.ts`)
**Goal:** Store the URLs and IDs for GitHub and Google in one place.
**Task:** Create a config file that exports an object with `authUrl`, `tokenUrl`, `scopes`, etc., for both providers.

#### Step 5: The OAuth Controller (`oauth.controller.ts`)
**Goal:** Handle the "Connect" and "Callback" routes.
**Task:**
1.  **`connect` function:** Reads the config, builds the URL with `client_id`, `redirect_uri`, and `scope`, and redirects the user.
2.  **`callback` function:**
    * Gets `code` from query.
    * POSTs code to provider to get Token.
    * Calls `encrypt(token)`.
    * Saves to DB using `Integration.findOneAndUpdate` (Upsert).

#### Step 6: The Adapters (The Core Logic)
**Goal:** Standardize the data fetching.

**Task 6.1: Define the Interface (`base.adapter.ts`)**
```typescript
export interface UniversalTask {
    externalId: string;
    title: string;
    link: string;
    status: string;
    type: 'issue' | 'pr' | 'email';
    provider: 'github' | 'gmail';
}

export interface IntegrationAdapter {
    fetchItems(): Promise<UniversalTask[]>;
}