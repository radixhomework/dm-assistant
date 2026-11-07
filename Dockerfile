# Build the whole workspace (schemas -> app-web -> app)
FROM node:26-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY packages/schemas/package.json packages/schemas/
COPY app/package.json app/
COPY app-web/package.json app-web/
RUN npm ci --no-audit --no-fund
COPY tsconfig.base.json eslint.config.mjs ./
COPY packages/schemas packages/schemas
COPY app app
COPY app-web app-web
ARG VITE_UI_LOCALE=en
ENV VITE_UI_LOCALE=${VITE_UI_LOCALE}
RUN npm run build

# Runtime: the single door — one Node process serves /api, /mcp and the shell
FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo /repo
EXPOSE 3000
CMD ["node", "app/dist/main.js"]
