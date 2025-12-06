# Use Apify's Node.js base image
FROM apify/actor-node:20

# Install required packages and Bun
RUN apk add --no-cache bash curl unzip && \
    curl -fsSL https://bun.sh/install | bash && \
    ln -s /root/.bun/bin/bun /usr/local/bin/bun

# Copy all files
COPY . ./

# Install dependencies using Bun
RUN bun install --production

# Run the actor
CMD bun run src/main.ts
