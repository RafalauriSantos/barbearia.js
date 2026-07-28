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

# Switch to non-root user
USER node

# Expose backend port
EXPOSE 3000

# Environment defaults
ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=development

# Command to start dev server
CMD ["npm", "run", "dev"]
