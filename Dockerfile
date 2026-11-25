# The Docker image of PGP Converter: the built site and a small web server,
# Caddy, on a minimal Alpine Linux. Node and the build's packages stay out of
# it. The README says how to run it ("Run It Yourself"), and
# .github/workflows/image.yml publishes it for each release.
#
# The site is built as the deploy workflow builds it, so the files in the image
# are those of a production build of the same commit. That needs the commit
# and its time:
#
#   docker build \
#     --build-arg GITHUB_SHA=$(git rev-parse HEAD) \
#     --build-arg SOURCE_DATE_EPOCH=$(git log -1 --format=%ct) \
#     --tag pgp-converter .
#
# Without them the build is named after the time it was made, and will not
# match a production build.
#
# Each base image is named by its digest as well as its version: a tag can be
# moved to different contents, a digest cannot. Dependabot proposes newer ones.

# The site is built once, on the machine that runs the build, whichever
# platforms the image is for. Only the built files go on to the next stage.
FROM --platform=$BUILDPLATFORM node:26.13.0-trixie-slim@sha256:5adad64f9a1fca2d51972caa65983634c8a774eb300d72b20f7f2a0f60368072 AS build
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# npm ci installs exactly what the lockfile names, as the README's own steps
# do. The workflows use npm install (see the note in tests.yml); image.yml's
# check job compares the image's files with a build made that way.
RUN npm ci --no-audit --no-fund
COPY . .
ARG GITHUB_SHA
ARG SOURCE_DATE_EPOCH
RUN npm run build && node scripts/write-caddy-headers.ts build build-headers.caddy

FROM caddy:2.11.9-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
# These replace the base image's own labels, which name Caddy. image.yml adds
# the version and the commit; a local build leaves the version empty.
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
# The server only reads its files, so it runs as "nobody", not as root
USER 65534:65534
# The only port it listens on. The base image also declares 80, 443 and 2019,
# which a later image cannot take back; nothing listens there.
EXPOSE 8080
