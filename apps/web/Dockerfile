# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_MQTT_URI
ARG VITE_MQTT_USERNAME
ARG VITE_MQTT_PASSWORD
ARG VITE_MQTT_CLIENT_ID
ARG VITE_MQTT_AUTO_RECONNECT=true

ENV VITE_MQTT_URI=$VITE_MQTT_URI \
    VITE_MQTT_USERNAME=$VITE_MQTT_USERNAME \
    VITE_MQTT_PASSWORD=$VITE_MQTT_PASSWORD \
    VITE_MQTT_CLIENT_ID=$VITE_MQTT_CLIENT_ID \
    VITE_MQTT_AUTO_RECONNECT=$VITE_MQTT_AUTO_RECONNECT

RUN pnpm build

FROM nginx:1.27-alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ > /dev/null || exit 1
