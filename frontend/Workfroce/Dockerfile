# Use Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose Vite's default port
EXPOSE 5173

# Start the Dev Server
# "--host" is REQUIRED for Docker to access the app from your browser
CMD ["npm", "run", "dev", "--", "--host"]