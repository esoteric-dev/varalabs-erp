# Build Stage
FROM clux/muslrust:stable as builder

WORKDIR /app

# Step 1: Initialize dummy Rust project to cache dependencies
RUN cargo new --bin app-gateway
WORKDIR /app/app-gateway

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Cache cargo dependencies (This pulls all packages ahead of time)
RUN cargo build --release --target x86_64-unknown-linux-musl || true
RUN rm src/*.rs

# Step 2: Build actual source code
COPY ./src ./src
COPY ./migrations ./migrations

# Build the final binary in release mode
RUN rustup target add x86_64-unknown-linux-musl
RUN cargo build --release --target x86_64-unknown-linux-musl

# ---
# Production Serving Stage
# We're using a scratch or alpine container since rust compiles to statically linked binary
FROM alpine:3.18 as runtime

# Install CA certificates to enable outgoing HTTPS requests, and tzdata for timezone accuracy
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy the statically compiled binary from the builder
COPY --from=builder /app/app-gateway/target/x86_64-unknown-linux-musl/release/app-gateway /app/app-gateway

# Set execution rights
RUN chmod +x /app/app-gateway

# Create a non-root user to run the API for better security
RUN adduser -D runner
USER runner

# Run on port 8080 as expected by docker-compose and local Azure VM tests
EXPOSE 8080
ENV PORT=8080

CMD ["/app/app-gateway"]
