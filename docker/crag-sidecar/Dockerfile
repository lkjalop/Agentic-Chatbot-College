# CRAG Sidecar Service
# Lightweight service for enhanced query processing
# Runs independently from main application

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for CRAG processing
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy CRAG-specific modules
COPY lib/cache ./lib/cache
COPY lib/monitoring ./lib/monitoring
COPY lib/security ./lib/security
COPY sidecar ./sidecar

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S crag -u 1001
USER crag

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Expose sidecar port
EXPOSE 8001

# Start the sidecar service
CMD ["node", "sidecar/server.js"]