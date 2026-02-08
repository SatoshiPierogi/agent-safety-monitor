FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package.json tsconfig.json ./
COPY .yarnrc.yml ./

# Copy source and config
COPY src/ ./src/
COPY skills/ ./skills/
COPY workspace/ ./workspace/
COPY config/ ./config/
COPY logs/ ./logs/

# Install dependencies
RUN corepack enable && yarn install --immutable 2>/dev/null || yarn install

# Create logs directory
RUN mkdir -p logs/daily

# Health check
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

EXPOSE 3001

# Run the agent
CMD ["npx", "tsx", "src/index.ts"]
