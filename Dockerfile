FROM ctfd/ctfd:latest

USER root

RUN (/opt/venv/bin/pip install --no-cache-dir psycopg2-binary || (/opt/venv/bin/python -m ensurepip && /opt/venv/bin/pip install --no-cache-dir psycopg2-binary)) \
    && sed -i 's/if not database_exists_util(url):/if False:/g' /opt/CTFd/CTFd/utils/migrations/__init__.py \
    && chown -R 1001:1001 /opt/venv /opt/CTFd

ENV SKIP_DB_PING=true

USER 1001
