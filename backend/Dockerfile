# ==============================================================================
# NestJS Backend Production Dockerfile
# Multi-stage build for minimal image size and unprivileged execution
# ==============================================================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production runtime stage
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /usr/src/app/dist ./dist

# Use non-root node user for container security
USER node

EXPOSE 3001

CMD ["node", "dist/main.js"]
