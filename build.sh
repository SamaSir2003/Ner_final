#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input

# Wait for database to be available
echo "Waiting for PostgreSQL to be ready..."
python -c "
import time
import psycopg2
import os
import urllib.parse

db_url = os.environ.get('DATABASE_URL')
if db_url:
    result = urllib.parse.urlparse(db_url)
    dbname = result.path[1:]
    user = result.username
    password = result.password
    host = result.hostname
    port = result.port

    retry_count = 0
    max_retries = 10
    while retry_count < max_retries:
        try:
            connection = psycopg2.connect(
                dbname=dbname,
                user=user,
                password=password,
                host=host,
                port=port,
            )
            connection.close()
            print('Database connection successful!')
            break
        except psycopg2.OperationalError:
            retry_count += 1
            print(f'Database connection failed. Retrying {retry_count}/{max_retries}')
            time.sleep(5)
    
    if retry_count == max_retries:
        print('Failed to connect to database after maximum retries')
        exit(1)
"

# Run migrations after connection is established
python manage.py migrate

if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput
    echo "Superuser created successfully."
else
    echo "Superuser environment variables not set. Skipping superuser creation."
fi