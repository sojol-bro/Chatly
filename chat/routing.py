"""
WebSocket URL routing for the chat application.

Maps WebSocket connection URLs to the ChatConsumer.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # ws://host/ws/chat/<conversation_id>/?token=<jwt>
    re_path(r"^ws/chat/(?P<conversation_id>\d+)/$", consumers.ChatConsumer.as_asgi()),
]
