"""
JWT Authentication Middleware for Django Channels WebSocket connections.

Expects a JWT token passed as a query parameter: ws://host/ws/chat/1/?token=<jwt>
"""

import jwt
from django.conf import settings
from django.contrib.auth.models import AnonymousUser, User
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from urllib.parse import parse_qs


@database_sync_to_async
def get_user_from_token(token: str):
    """Validate JWT and return the corresponding User, or AnonymousUser."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"],
        )
        user_id = payload.get("user_id")
        if user_id is None:
            return AnonymousUser()
        return User.objects.get(id=user_id)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Channels middleware that authenticates WebSocket connections via JWT.
    The token must be supplied as a query parameter: ?token=<jwt>
    """

    async def __call__(self, scope, receive, send):
        # Extract token from query string
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        token_list = params.get("token", [])

        if token_list:
            scope["user"] = await get_user_from_token(token_list[0])
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)
