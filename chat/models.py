"""
Database models for the chat application.
"""

from django.contrib.auth.models import User
from django.db import models


class Conversation(models.Model):
    """
    Represents a chat conversation.
    Supports both 1-on-1 and group chats through a ManyToMany relationship.
    """
    participants = models.ManyToManyField(
        User,
        related_name="conversations",
        blank=False,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        usernames = ", ".join(
            self.participants.values_list("username", flat=True)
        )
        return f"Conversation({self.id}) [{usernames}]"

    @property
    def is_group(self):
        """Returns True if the conversation has more than 2 participants."""
        return self.participants.count() > 2


class Message(models.Model):
    """
    Represents a single message within a conversation.
    Supports text content and an optional image URL.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    text = models.TextField(blank=True, default="")
    image_url = models.URLField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"Message({self.id}) from {self.sender.username} at {self.timestamp:%Y-%m-%d %H:%M}"
