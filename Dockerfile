# To get the same files as the release, build with its commit and timestamp:
#
#   docker build \
#     --build-arg GITHUB_SHA=$(git rev-parse HEAD) \
#     --build-arg SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) \
#     --tag pgp-converter .

# build runs once, natively: the site it makes is the same on every platform
FROM --platform=$BUILDPLATFORM node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072 AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# npm ci, as in the README's steps for reproducing a build. The workflows use
# npm install (see tests.yml), and image.yml's check job compares the image's
# files with a build made that way.
RUN npm ci --no-audit --no-fund
COPY . .
ARG GITHUB_SHA
ARG SOURCE_DATE_EPOCH
RUN npm run build && node scripts/write-caddy-headers.ts build build-headers.caddy

FROM caddy:2.11.9-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
# Replaces Caddy's labels. image.yml sets the version and revision.
LABEL org.opencontainers.image.title="PGP Converter" \
	org.opencontainers.image.description="PGP Converter: encrypt, decrypt, sign and verify with PGP in the browser" \
	org.opencontainers.image.url="https://pgp-converter.com" \
	org.opencontainers.image.documentation="https://github.com/polyym/pgp-converter#run-it-yourself" \
	org.opencontainers.image.source="https://github.com/polyym/pgp-converter" \
	org.opencontainers.image.vendor="polyym" \
	org.opencontainers.image.licenses="AGPL-3.0-or-later" \
	org.opencontainers.image.version=""
COPY --from=build /app/build /srv
COPY --from=build /app/build-headers.caddy /etc/caddy/build-headers.caddy
COPY docker/Caddyfile /etc/caddy/Caddyfile
# nobody
USER 65534:65534
# Caddy's image also exposes 80, 443 and 2019, but nothing listens there
EXPOSE 8080
HEALTHCHECK CMD wget --quiet --spider http://127.0.0.1:8080/ || exit 1
