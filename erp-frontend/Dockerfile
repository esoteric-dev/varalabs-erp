# Use Bun official image as the base for building
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package management files
COPY package.json bun.lock ./

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Set the GraphQL API endpoint for the Vite build
ARG VITE_GRAPHQL_ENDPOINT
ENV VITE_GRAPHQL_ENDPOINT=${VITE_GRAPHQL_ENDPOINT}

# Build the Vite React application
RUN bun run build

# ---
# Production Serving Stage
# We'll use a lightweight NGINX server to serve the static frontend assets dynamically
FROM nginx:alpine

# Copy custom Nginx configuration to serve static assets and SPA fallback
RUN echo 'server { \
    listen       80; \
    server_name  localhost; \
    root   /usr/share/nginx/html; \
    index  index.html index.htm; \
    \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    \
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ { \
        expires 7d; \
        add_header Cache-Control "public, max-age=604800, immutable"; \
    } \
    \
    error_page   500 502 503 504  /50x.html; \
    location = /50x.html { \
        root   /usr/share/nginx/html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Copy the built assets from the builder stage into Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port (Azure App service usually routes HTTP traffic to port 80 natively)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
