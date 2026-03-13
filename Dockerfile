# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Install system dependencies for OCR and image processing
RUN apk add --no-cache \
    tesseract-ocr \
    tesseract-ocr-data-eng \
    imagemagick \
    poppler-utils \
    vips-dev \
    python3 \
    make \
    g++

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src/ ./src/

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p uploads temp logs && \
    chown -R node:node uploads temp logs

# Switch to non-root user
USER node

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Default command
CMD ["npm", "start"]