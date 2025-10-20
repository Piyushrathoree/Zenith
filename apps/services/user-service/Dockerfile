FROM node:22-alpine

WORKDIR /app

# Install bun
RUN npm install -g bun

# Copy dependency files first for better caching
COPY package.json bun.lock ./

RUN bun install

COPY .env ./
# Copy the rest of the app
COPY . .

EXPOSE 8000

CMD ["bun", "start"]


# needs to be updated -- for now its not good 
