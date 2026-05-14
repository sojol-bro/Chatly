"""Seed test users, conversation, and messages into the database."""
import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chat_backend.settings")
django.setup()

from django.contrib.auth.models import User
from chat.models import Conversation, Message

u1, _ = User.objects.get_or_create(username="alice")
u1.set_password("alice123"); u1.save()

u2, _ = User.objects.get_or_create(username="bob")
u2.set_password("bob123"); u2.save()

conv, created = Conversation.objects.get_or_create(id=1)
conv.participants.set([u1, u2])
conv.save()

if Message.objects.filter(conversation=conv).count() == 0:
    Message.objects.create(conversation=conv, sender=u1, text="Hey Bob! This is a seeded message.")
    Message.objects.create(conversation=conv, sender=u2, text="Hey Alice! Got it.")

print(f"[OK] Users: alice(id={u1.id}), bob(id={u2.id})")
print(f"[OK] Conversation id={conv.id}, participants={list(conv.participants.values_list('username', flat=True))}")
print(f"[OK] Messages in conv: {Message.objects.filter(conversation=conv).count()}")
