# Use the Docker Official Node image from AWS Public ECR to avoid Docker Hub auth outages/rate limits in CI.
FROM public.ecr.aws/docker/library/node:24-slim

# Install system dependencies for Chromium (required by Puppeteer)
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy workspace manifests and install dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
RUN mkdir -p "Free CV Builder"
COPY ["Free CV Builder/package.json", "./Free CV Builder/package.json"]
RUN corepack enable && corepack pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

WORKDIR "/app/Free CV Builder"

# Expose ports for Vite (3000) and Express Server (3002)
EXPOSE 3000 3002

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3002

# Run both Vite and Express using concurrently
CMD ["corepack", "pnpm", "dev:all"]
