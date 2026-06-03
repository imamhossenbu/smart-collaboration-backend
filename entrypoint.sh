#!/bin/sh

echo "Waiting for database..."

until npx prisma migrate deploy; do
  echo "Migration failed, retrying in 3s..."
  sleep 3
done

echo "Database is ready! Starting the application..."
exec "$@"
