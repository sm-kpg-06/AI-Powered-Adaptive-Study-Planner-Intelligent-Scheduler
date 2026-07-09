# Build stage
FROM node:18-slim AS builder
WORKDIR /app

# Install python and other build tools for compilation (e.g. bcrypt, sqlite3)
RUN apt-get update && apt-get install -y python3 build-essential && rm -rf /var/lib/apt/lists/*

# Build frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Build backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/
RUN cd backend && npx prisma generate && npm run build

# Final runner stage
FROM node:18-slim
WORKDIR /app

# Install Python 3 (required for the AI scheduler engine)
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

# Copy compiled outputs and node_modules from builder
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/prisma ./backend/prisma

WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

# Push Prisma schemas (deploy DB models) and start the node server
CMD ["sh", "-c", "npx prisma db push && npm start"]
