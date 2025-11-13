# Use lightweight Node image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files for dependency install
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy service source code
COPY . .

# Copy shared folder from monorepo
COPY ./shared ./shared

# Expose port
EXPOSE 4001

# Start service
CMD ["node", "server.js"]
