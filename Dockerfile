# Use an official Node.js image as a base
FROM node:20-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the package.json file
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Expose the port
EXPOSE 3000

# Run the command to start the Node.js server
CMD ["npm", "start"]