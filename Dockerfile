# syntax=docker/dockerfile:1
FROM node:24.21.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: evita husky (prepare) dentro de la imagen
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginx:alpine AS serve
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Vite (Ionic React) emite la salida en dist/
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/ || exit 1
