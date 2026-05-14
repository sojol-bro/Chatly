"""
REST API for the chat application using Django Ninja.

Endpoints:
  GET  /api/conversations/                   - List conversations for the authenticated user
  GET  /api/conversations/{id}/messages/     - Fetch paginated message history
  POST /api/auth/token/                      - Obtain a JWT token (login)

All conversation and message endpoints require a Bearer JWT in the Authorization header:
  Authorization: Bearer <token>
"""

import jwt
import datetime
from typing import List, Optional

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User

from ninja import NinjaAPI, Schema
from ninja.security import HttpBearer

from .models import Conversation, Message


# ─── JWT Authentication ───────────────────────────────────────────────────────

class JWTAuth(HttpBearer):
    """
    Django Ninja HTTP Bearer authentication.
    Decodes the JWT from the Authorization header and attaches the user to the request.
    """

    def authenticate(self, request, token: str):
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
            user_id = payload.get("user_id")
            user = User.objects.get(id=user_id)
            request.user = user
            return user
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
            return None


# ─── API Instance ─────────────────────────────────────────────────────────────

api = NinjaAPI(
    title="Chat API",
    version="1.0.0",
    description="Real-time Chat Backend — REST API powered by Django Ninja",
    auth=JWTAuth(),
)


# ─── Schemas ─────────────────────────────────────────────────────────────────

class TokenRequestSchema(Schema):
    username: str
    password: str


class TokenResponseSchema(Schema):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str


class ParticipantSchema(Schema):
    id: int
    username: str


class ConversationSchema(Schema):
    id: int
    participants: List[ParticipantSchema]
    is_group: bool
    created_at: datetime.datetime
    last_message: Optional[str] = None


class MessageSchema(Schema):
    id: int
    sender_id: int
    sender_username: str
    text: str
    image_url: Optional[str]
    timestamp: datetime.datetime
    is_read: bool


class PaginatedMessagesSchema(Schema):
    conversation_id: int
    total: int
    page: int
    page_size: int
    results: List[MessageSchema]


class ErrorSchema(Schema):
    detail: str


# ─── Auth Endpoints (no auth required) ───────────────────────────────────────

@api.post("/auth/token/", response={200: TokenResponseSchema, 401: ErrorSchema}, auth=None, tags=["Auth"])
def obtain_token(request, payload: TokenRequestSchema):
    """
    Authenticate with username + password and receive a JWT access token.

    The token expires in 24 hours. Pass it as:
        Authorization: Bearer <token>
    in all subsequent requests.
    """
    user = authenticate(username=payload.username, password=payload.password)
    if user is None:
        return 401, {"detail": "Invalid credentials."}

    token_payload = {
        "user_id": user.id,
        "username": user.username,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        "iat": datetime.datetime.utcnow(),
    }
    token = jwt.encode(token_payload, settings.JWT_SECRET_KEY, algorithm="HS256")

    return 200, {
        "access_token": token,
        "user_id": user.id,
        "username": user.username,
    }


# ─── Conversation Endpoints ───────────────────────────────────────────────────

@api.get("/conversations/", response=List[ConversationSchema], tags=["Conversations"])
def list_conversations(request):
    """
    Returns all conversations that the authenticated user is a participant in,
    ordered by most recently created. Includes the last message text as a preview.
    """
    conversations = (
        Conversation.objects.filter(participants=request.user)
        .prefetch_related("participants", "messages")
        .order_by("-created_at")
    )

    result = []
    for conv in conversations:
        last_msg = conv.messages.order_by("-timestamp").first()
        result.append(ConversationSchema(
            id=conv.id,
            participants=[
                ParticipantSchema(id=p.id, username=p.username)
                for p in conv.participants.all()
            ],
            is_group=conv.is_group,
            created_at=conv.created_at,
            last_message=last_msg.text if last_msg else None,
        ))

    return result


@api.get(
    "/conversations/{conversation_id}/messages/",
    response={200: PaginatedMessagesSchema, 403: ErrorSchema, 404: ErrorSchema},
    tags=["Messages"],
)
def get_message_history(
    request,
    conversation_id: int,
    page: int = 1,
    page_size: int = 50,
):
    """
    Returns paginated message history for a specific conversation.

    - **conversation_id**: The ID of the conversation.
    - **page**: Page number (default: 1).
    - **page_size**: Messages per page (default: 50, max: 200).

    Only accessible by participants of the conversation.
    """
    # Validate participation
    try:
        conversation = Conversation.objects.get(id=conversation_id)
    except Conversation.DoesNotExist:
        return 404, {"detail": f"Conversation {conversation_id} not found."}

    if not conversation.participants.filter(id=request.user.id).exists():
        return 403, {"detail": "You are not a participant of this conversation."}

    # Clamp page_size
    page_size = min(page_size, 200)
    offset = (page - 1) * page_size

    messages_qs = conversation.messages.select_related("sender").order_by("timestamp")
    total = messages_qs.count()
    messages = messages_qs[offset: offset + page_size]

    return 200, PaginatedMessagesSchema(
        conversation_id=conversation_id,
        total=total,
        page=page,
        page_size=page_size,
        results=[
            MessageSchema(
                id=msg.id,
                sender_id=msg.sender.id,
                sender_username=msg.sender.username,
                text=msg.text,
                image_url=msg.image_url,
                timestamp=msg.timestamp,
                is_read=msg.is_read,
            )
            for msg in messages
        ],
    )


# ─── User Discovery & Chat Initialization ─────────────────────────────────────

class UserSearchSchema(Schema):
    id: int
    username: str


class StartChatSchema(Schema):
    username: str


@api.get("/users/search/", response=List[UserSearchSchema], tags=["Users"])
def search_users(request, q: str):
    """
    Search for users by username to start a new chat.
    Excludes the current user from results.
    """
    if not q or len(q) < 2:
        return []

    users = User.objects.filter(username__icontains=q).exclude(id=request.user.id)[:10]
    return [UserSearchSchema(id=u.id, username=u.username) for u in users]


@api.post("/conversations/start/", response={200: ConversationSchema, 404: ErrorSchema}, tags=["Conversations"])
def start_conversation(request, payload: StartChatSchema):
    """
    Starts a 1-on-1 conversation with another user by their username.
    If a 1-on-1 conversation already exists between the two users, it returns the existing one.
    """
    try:
        other_user = User.objects.get(username=payload.username)
    except User.DoesNotExist:
        return 404, {"detail": f"User '{payload.username}' not found."}

    # Find existing 1-on-1 conversation
    existing_conv = (
        Conversation.objects.filter(participants=request.user)
        .filter(participants=other_user)
        .filter(is_group=False)
        .first()
    )

    if existing_conv:
        return 200, ConversationSchema(
            id=existing_conv.id,
            participants=[
                ParticipantSchema(id=p.id, username=p.username)
                for p in existing_conv.participants.all()
            ],
            is_group=existing_conv.is_group,
            created_at=existing_conv.created_at,
            last_message=existing_conv.messages.order_by("-timestamp").first().text if existing_conv.messages.exists() else None
        )

    # Create new conversation
    new_conv = Conversation.objects.create(is_group=False)
    new_conv.participants.add(request.user, other_user)

    return 200, ConversationSchema(
        id=new_conv.id,
        participants=[
            ParticipantSchema(id=p.id, username=p.username)
            for p in new_conv.participants.all()
        ],
        is_group=False,
        created_at=new_conv.created_at,
        last_message=None
    )

