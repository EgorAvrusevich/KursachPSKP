FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM alpine:latest
COPY --from=build /app/dist /dist
CMD ["sh", "-c", "cp -r /dist/* /output/ && echo 'Frontend built and copied' && sleep infinity"]
VOLUME ["/output"]
