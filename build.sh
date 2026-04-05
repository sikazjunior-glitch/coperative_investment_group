#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate

# NEW: Automatically create the admin using our Render Environment Variables
python manage.py createsuperuser --noinput || true