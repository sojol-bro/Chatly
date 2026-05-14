"""
WebSocket Consumer for the chat application.

Handles real-time messaging over WebSocket connections.
Connection URL: ws://<host>/ws/chat/<conversation_id>/?token=<jwt>
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser

from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):
    """
    Async WebSocket consumer that handles a single chat conversation.

    Groups are keyed by conversation ID so all participants in the same
    conversation receive broadcasted messages in real-time.
    """

    # ─── Connection Lifecycle ─────────────────────────────────────────────────

    async def connect(self):
        """
        Called when a WebSocket handshake is initiated.
        - Rejects unauthenticated connections.
        - Joins the channel group for the given conversation.
        - Verifies the user is a participant of the conversation.
        """
        self.user = self.scope.get("user")

        # Reject anonymous users — accept first so the close code is transmitted
        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.accept()
            await self.close(code=4001)
            return

        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.group_name = f"chat_{self.conversation_id}"

        # Verify the user is a participant in this conversation
        is_participant = await self._is_participant()
        if not is_participant:
            await self.accept()
            await self.close(code=4003)
            return

        # Join conversation group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Notify the user that the connection is established
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": f"Connected to conversation {self.conversation_id}",
        }))

    async def disconnect(self, close_code):
        """
        Called when the WebSocket closes.
        Leaves the channel group so no more messages are received.
        """
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ─── Message Handling ─────────────────────────────────────────────────────

    async def receive(self, text_data):
        """
        Called when a message is received from the WebSocket client.

        Expected JSON payload:
        {
            "text": "Hello!",           # optional
            "image_url": "https://..."  # optional
        }

        At least one of text or image_url must be provided.
        """
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON payload.",
            }))
            return

        text = data.get("text", "").strip()
        image_url = data.get("image_url", None)

        if not text and not image_url:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "A message must contain text or an image_url.",
            }))
            return

        # Persist the message to the database
        message = await self._save_message(text=text, image_url=image_url)

        # Broadcast to all members of the conversation group (including sender)
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",          # maps to chat_message() handler below
                "message_id": message.id,
                "sender_id": self.user.id,
                "sender_username": self.user.username,
                "text": message.text,
                "image_url": message.image_url,
                "timestamp": message.timestamp.isoformat(),
                "is_read": message.is_read,
            },
        )

    async def chat_message(self, event):
        """
        Handler called by the channel layer when a 'chat_message' event is sent
        to the group. Forwards the message to the WebSocket client.
        """
        await self.send(text_data=json.dumps({
            "type": "chat_message",
            "message_id": event["message_id"],
            "sender_id": event["sender_id"],
            "sender_username": event["sender_username"],
            "text": event["text"],
            "image_url": event["image_url"],
            "timestamp": event["timestamp"],
            "is_read": event["is_read"],
        }))

    # ─── Database Helpers ─────────────────────────────────────────────────────

    @database_sync_to_async
    def _is_participant(self) -> bool:
        """Check if the authenticated user is a participant of the conversation."""
        return Conversation.objects.filter(
            id=self.conversation_id,
            participants=self.user,
        ).exists()

    @database_sync_to_async
    def _save_message(self, text: str, image_url: str | None) -> Message:
        """Persist a new Message to the database and return it."""
        return Message.objects.create(
            conversation_id=self.conversation_id,
            sender=self.user,
            text=text,
            image_url=image_url,
        )
