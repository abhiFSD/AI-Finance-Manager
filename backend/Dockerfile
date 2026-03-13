# Backend Dockerfile
FROM node:18-alpine

# Install Python and build tools for node-gyp
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files from parent directory
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src ./src
COPY .env* ./

# Expose port
EXPOSE 3001

# Start server in development mode
CMD ["npm", "run", "dev"]