FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
COPY yarn.lock ./

# Install dependencies
RUN yarn install

# Copy app source code
COPY . .

# Build the application
RUN yarn build

# Expose the port the app runs on
EXPOSE 3000

# Create volume for persistent storage
VOLUME /usr/src/app/uploads

# Start the application
CMD ["yarn", "start"]