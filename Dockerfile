# Multi-stage build for Morele Price Tracker
# Build: docker build -t morele-tracker:latest .
# Run: docker run -p 3000:3000 \
#        -e DATABASE_URL="mysql://user:pass@host:3306/db" \
#        -e MAIL_HOST="smtp.gmail.com" \
#        -e MAIL_PORT="587" \
#        -e MAIL_USER="your-email@gmail.com" \
#        -e MAIL_PASSWORD="your-app-password" \
#        -e MAIL_FROM="noreply@example.com" \
#        morele-tracker:latest

# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@10.4.1

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including dev)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Install pnpm and MySQL client
RUN npm install -g pnpm@10.4.1 && \
    apk add --no-cache mysql-client

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Start application
CMD ["node", "dist/index.js"]
