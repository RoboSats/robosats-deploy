# Stage 1: Build Haskell Simplex Chat Backend
ARG TAG=22.04
FROM ubuntu:${TAG} AS haskell-build

# Install dependencies for building simplex-chat
RUN apt-get update && apt-get install -y curl git build-essential libgmp3-dev zlib1g-dev llvm-12 llvm-12-dev libnuma-dev libssl-dev

# Set up environment variables for GHC and Cabal versions
ENV BOOTSTRAP_HASKELL_GHC_VERSION=9.6.3
ENV BOOTSTRAP_HASKELL_CABAL_VERSION=3.10.1.0

# Install ghcup for managing GHC and Cabal versions
RUN curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | BOOTSTRAP_HASKELL_NONINTERACTIVE=1 sh

# Add GHCup and Cabal to PATH
ENV PATH="/root/.cabal/bin:/root/.ghcup/bin:$PATH"

# Set the default GHC and Cabal versions
RUN ghcup set ghc "${BOOTSTRAP_HASKELL_GHC_VERSION}" && \
    ghcup set cabal "${BOOTSTRAP_HASKELL_CABAL_VERSION}"

# Copy the project source code into the container
RUN git clone https://github.com/simplex-chat/simplex-chat /project
WORKDIR /project

# Copy Linux-specific cabal configuration file
RUN cp ./scripts/cabal.project.local.linux ./cabal.project.local

# Update Cabal package list and build the executable
RUN cabal update
RUN cabal build exe:simplex-chat

# Strip debug symbols to reduce the binary size
RUN bin=$(find /project/dist-newstyle -name "simplex-chat" -type f -executable) && \
    mv "$bin" ./ && \
    strip ./simplex-chat

# Stage 2: Build Node.js Simplex Chat Client and Bot
FROM node:18 AS node-build

# Install git for cloning repositories
RUN apt-get update && apt-get install -y git

# Clone the SimpleX Chat repository
RUN git clone https://github.com/simplex-chat/simplex-chat /app/simplex-chat

# Set working directory to the TypeScript client folder
WORKDIR /app/simplex-chat/packages/simplex-chat-client/typescript

# Copy your bot script into the examples directory
COPY ./bot/simplex_bot.js /app/simplex-chat/packages/simplex-chat-client/typescript/bot/simplex_bot.js

# Copy the updated package.json and package-lock.json into the container
COPY ./package.json ./package-lock.json ./

# Install the required npm packages, including sqlite3
RUN npm install

# Build the client
RUN npm run build

# Final Stage: Combine Haskell Backend and Node.js Bot
FROM ubuntu:${TAG}

# Install runtime dependencies for the Haskell backend and Node.js
RUN apt-get update && apt-get install -y libgmp10 zlib1g curl

# Install Node.js and npm in the final stage
RUN curl -sL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Set working directory for the final container
WORKDIR /app/simplex-chat/packages/simplex-chat-client/typescript

# Copy the built Haskell executable from the build stage
COPY --from=haskell-build /project/simplex-chat /usr/local/bin/simplex-chat

# Copy the built Node.js client and bot script from the node-build stage
COPY --from=node-build /app/simplex-chat /app/simplex-chat

# Install the required npm packages, including sqlite3
RUN npm install sqlite3 pg

# Expose necessary ports
EXPOSE 5225 3000
