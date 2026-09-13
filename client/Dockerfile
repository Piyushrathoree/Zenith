FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Next.js writes .next at runtime; the image user must own the tree.
RUN mkdir -p .next && chown -R bun:bun /app

USER bun

ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
# Browser-facing URL. Overridden at runtime by compose; keep a local default.
ENV NEXT_PUBLIC_API_URL=http://localhost:8000

EXPOSE 3000

# Bind all interfaces so port mapping from the host works.
CMD ["bun", "x", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]
