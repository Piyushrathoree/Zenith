FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies in a separate layer for Docker cache efficiency
# This layer is only rebuilt when package.json or bun.lock changes
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Expose the API port
EXPOSE 8000

# Security: run as non-root user
USER bun

# Start the server using bun directly (no build step needed)
CMD ["bun", "src/index.ts"]
