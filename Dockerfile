# Use Apify's Node.js base image
FROM apify/actor-node:20

# Install required packages and Bun
RUN apk add --no-cache bash curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Copy package files first
COPY package.json ./

# Install dependencies using npm (more reliable in Docker)
RUN npm install --omit=dev

# Copy the rest of the application
COPY . ./

# Run the actor with Bun
CMD bun run src/main.ts
