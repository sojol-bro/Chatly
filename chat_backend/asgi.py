"""
ASGI config for chat_backend project.

Routes HTTP requests to Django and WebSocket connections to Django Channels.
"""

import os

from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chat_backend.settings")

# Initialize Django ASGI application early to populate the app registry
django_asgi_app = get_asgi_application()

# Import routing after Django setup to avoid AppRegistryNotReady errors
from chat.routing import websocket_urlpatterns  # noqa: E402
from chat.middleware import JWTAuthMiddleware  # noqa: E402

application = ProtocolTypeRouter(
    {
        # HTTP → standard Django views
        "http": django_asgi_app,
        # WebSocket → JWT auth middleware → URL router → consumers
        "websocket": AllowedHostsOriginValidator(
            JWTAuthMiddleware(
                URLRouter(websocket_urlpatterns)
            )
        ),
    }
)
