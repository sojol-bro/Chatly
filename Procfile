web: gunicorn chat_backend.wsgi:application
worker: uvicorn chat_backend.asgi:application --host 0.0.0.0 --port $PORT
