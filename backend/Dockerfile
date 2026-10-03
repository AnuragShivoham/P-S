FROM node:22-alpine

# Install dependencies required to compile native Node.js modules like `node-pty`
RUN apk add --no-cache python3 make g++ linux-headers bash git su-exec

WORKDIR /app

# Copy package info and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Create necessary directories for volumes
RUN mkdir -p data workspace
RUN chmod 755 /app/docker-entrypoint.sh && chown -R node:node /app

EXPOSE 3001
ENV NODE_ENV=production WORKSPACE_PATH=/app/workspace

# Render's persistent disk is mounted at runtime; entrypoint fixes its ownership,
# then drops root before Node starts. The app itself never runs as root.
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "src/server.js"]
