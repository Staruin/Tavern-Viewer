# Build stage: compile frontend
FROM node:20-alpine AS build

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage: run server
FROM node:20-alpine

WORKDIR /app

# Copy built frontend
COPY --from=build /app/dist ./dist

# Copy server files
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm install --production

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
