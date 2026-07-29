FROM node:20-alpine

# Install wget for container healthchecks
RUN apk add --no-cache wget

# Set working directory
WORKDIR /app

# Copy dependency manifests with node user ownership
COPY --chown=node:node package*.json ./

# Install dependencies
RUN npm ci

# Copy remaining source code
COPY --chown=node:node . .

# Ensure node user owns /app directory and node_modules
RUN mkdir -p /app/node_modules && chown -R node:node /app

# Switch to non-root user
USER node

# Expose frontend port
EXPOSE 3333

# Environment defaults
ENV NODE_ENV=development

# Command to start Vite dev server without xdg-open for containerized dev
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "3333"]
