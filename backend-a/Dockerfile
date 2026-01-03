#==============================================================================
# Backend-A Service - Dockerfile
#==============================================================================
#
# This Dockerfile creates a containerized Node.js application for Backend-A.
# It uses a lightweight Alpine Linux base image for minimal footprint.
#
# Base Image: node:18-alpine (Node.js 18 LTS on Alpine Linux)
# Exposed Port: 8080
# Working Directory: /app
#
# Build Command:
#   docker build -t backend-a:latest .
#
# Run Command:
#   docker run -p 8080:8080 \
#     -e DB_HOST=<postgres-host> \
#     -e DB_USER=<db-user> \
#     -e DB_PASSWORD=<db-password> \
#     -e DB_NAME=<db-name> \
#     backend-a:latest
#==============================================================================

# Use Node.js 18 LTS on Alpine Linux for small image size
FROM node:18-alpine

# Set working directory for application files
WORKDIR /app

# Copy package.json first for efficient layer caching
# Docker will only re-install dependencies if package.json changes
COPY package.json ./

# Install production dependencies only (excludes devDependencies)
# --production flag reduces image size by excluding dev tools
RUN npm install --production

# Copy application source code
# This includes index.js and any other application files
COPY . .

# Expose port 8080 for the Express server
# This port is mapped to Kubernetes Service port 80
EXPOSE 8080

# Start the Node.js application
# Runs index.js which starts the Express server
CMD ["node", "index.js"]
