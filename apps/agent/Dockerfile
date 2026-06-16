FROM node:20-alpine AS base
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json turbo.json ./
COPY apps/agent/package.json ./apps/agent/

# Install all workspace deps from root
RUN npm install --ignore-scripts

# Copy agent source
COPY apps/agent ./apps/agent

# Build (type-check + emit JS)
RUN npm run build --workspace=apps/agent

# ---- runtime image ----
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=base /app/package.json ./
COPY --from=base /app/package-lock.json ./
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/apps/agent ./apps/agent

WORKDIR /app/apps/agent

RUN mkdir -p .data

EXPOSE 3010

# Use tsx to run compiled output (handles moduleResolution: Bundler)
CMD ["node", "--env-file-if-exists=.env", "--import", "tsx/esm", "dist/server.js"]
