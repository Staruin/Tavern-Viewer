# Build stage: compile frontend
# Use Debian-based image to avoid esbuild SIGSEGV issues seen on some NAS/alpine environments.
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Allow overriding npm registry for regions/proxy-limited networks.
ARG NPM_REGISTRY=https://registry.npmjs.org

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm config set registry "$NPM_REGISTRY" \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci --no-audit --no-fund

# Copy source and build
COPY . .
RUN npm run build

# Production stage: run server
FROM node:20-bookworm-slim

WORKDIR /app

# Keep same registry behavior in runtime dependency install.
ARG NPM_REGISTRY=https://registry.npmjs.org

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server files
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm config set registry "$NPM_REGISTRY" \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --production --no-audit --no-fund

# Copy server source
COPY server/server.js ./

WORKDIR /app

# Create data mount point
RUN mkdir -p /data

# Environment variables
ENV PORT=3000
ENV DATA_DIR=/data
ENV USER_DIR=default-user
ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "server/server.js"]
