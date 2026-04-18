# ── Stage 1: build the React app ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# REACT_APP_API_PREFIX is injected at build time by docker-compose.
# It becomes window.name in the browser, setting the API base URL.
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN NODE_ENV=production npx craco build

# ── Stage 2: serve the built app with nginx ───────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
