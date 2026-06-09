# Stage 1: Build Frontend
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all files
COPY . .

# Install dependencies and build frontend
RUN npm install
RUN cd frontend && npm run build

# Stage 2: Production Runtime
FROM node:20-alpine
WORKDIR /app

# Copy built app from builder stage
COPY --from=builder /app /app

# Install PM2 globally for PM2-runtime
RUN npm install -g pm2

# Expose Frontend and Backend ports
EXPOSE 5173 3000

# Run the ecosystem using pm2-runtime (Docker optimized)
CMD ["pm2-runtime", "ecosystem.config.js"]
