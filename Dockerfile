## Stage 1: build frontend
FROM node:22-alpine AS frontend
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

## Stage 2: build backend (with embedded frontend)
FROM golang:1.23-alpine AS backend
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /app/web/dist ./cmd/server/web/dist
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

## Stage 3: minimal runtime image
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=backend /server /server
EXPOSE 8080
CMD ["/server"]
