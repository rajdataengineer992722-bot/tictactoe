FROM node:20-alpine AS runtime-builder
WORKDIR /runtime
COPY package.json tsconfig.json ./
COPY types ./types
COPY src ./src
RUN npm install
RUN npm run build

FROM heroiclabs/nakama:3.22.0
COPY local.yml /nakama/data/local.yml
COPY start.sh /nakama/data/start.sh
COPY --from=runtime-builder /runtime/build /nakama/data/build
ENTRYPOINT ["/bin/sh", "/nakama/data/start.sh"]
