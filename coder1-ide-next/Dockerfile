# ============================================
# CODER1 IDE - PRODUCTION DOCKERFILE (RENDER)
# ============================================
# Multi-stage build for optimized production deployment
# Supports unified server architecture with WebSocket
# ============================================

# ============================================
# STAGE 1: BUILD ENVIRONMENT
# ============================================
FROM node:18-alpine AS builder

# Install build dependencies for node-pty and native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    && ln -sf python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./

# Install dependencies with production optimizations
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy source code
COPY . .

# Build Next.js application with production optimizations
RUN npm run build

# ============================================
# STAGE 2: PRODUCTION RUNTIME
# ============================================
FROM node:18-alpine AS runtime

# Install runtime dependencies and security updates
RUN apk add --no-cache \
    dumb-init \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S coder1 -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=coder1:nodejs /app/.next ./.next
COPY --from=builder --chown=coder1:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=coder1:nodejs /app/package*.json ./
COPY --from=builder --chown=coder1:nodejs /app/server.js ./
COPY --from=builder --chown=coder1:nodejs /app/public ./public

# Copy essential configuration files
COPY --from=builder --chown=coder1:nodejs /app/next.config.js ./
COPY --from=builder --chown=coder1:nodejs /app/services ./services
COPY --from=builder --chown=coder1:nodejs /app/lib ./lib
COPY --from=builder --chown=coder1:nodejs /app/components ./components
COPY --from=builder --chown=coder1:nodejs /app/app ./app
COPY --from=builder --chown=coder1:nodejs /app/contexts ./contexts
COPY --from=builder --chown=coder1:nodejs /app/stores ./stores

# Create data directory for SQLite fallback
RUN mkdir -p ./data && chown coder1:nodejs ./data

# Create logs directory
RUN mkdir -p ./logs && chown coder1:nodejs ./logs

# Switch to non-root user
USER coder1

# Expose port (Render uses PORT environment variable)
EXPOSE 3001

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Set environment variables for production
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["tini", "--"]

# Start the unified server
CMD ["node", "server.js"]

# ============================================
# BUILD INSTRUCTIONS
# ============================================
# Build: docker build -t coder1-ide .
# Run: docker run -p 3001:3001 coder1-ide
# Render: Automatically builds from this Dockerfile
# ============================================