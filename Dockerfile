# Use Apify's Node.js base image
FROM apify/actor-node:20

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

# Add Bun to PATH
ENV PATH="/root/.bun/bin:${PATH}"

# Copy all files
COPY . ./

# Install dependencies using Bun
RUN bun install --production

# Run the actor
CMD bun run src/main.ts
