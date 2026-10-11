FROM debian:bookworm-slim AS download
ARG TARGETARCH
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip && rm -rf /var/lib/apt/lists/*
RUN case "$TARGETARCH" in \
    amd64) checksum=9042ec818570e79c3628dadcd0a756c1496d9e1173918ec409d133c02f82e5fa ;; \
    arm64) checksum=86095bf8ed9345954f0d2bf0a5fb9b57584ae60b77ebf3b6cd23a8003a3fd418 ;; \
    *) exit 1 ;; esac && \
    curl -fsSL --retry 3 "https://github.com/pocketbase/pocketbase/releases/download/v0.40.4/pocketbase_0.40.4_linux_${TARGETARCH}.zip" -o /tmp/pb.zip && \
    echo "$checksum  /tmp/pb.zip" | sha256sum -c - && unzip /tmp/pb.zip -d /tmp/pb

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/* && \
    groupadd --gid 1000 pocketbase && useradd --uid 1000 --gid 1000 pocketbase && mkdir /pb_data && chown 1000:1000 /pb_data
COPY --from=download /tmp/pb/pocketbase /usr/local/bin/pocketbase
COPY pb/pb_migrations /pb_migrations
COPY pb/pb_hooks /pb_hooks
USER pocketbase
EXPOSE 8090
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s CMD curl -fsS http://127.0.0.1:8090/api/health || exit 1
ENTRYPOINT ["pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--migrationsDir=/pb_migrations", "--hooksDir=/pb_hooks", "--automigrate=0"]
