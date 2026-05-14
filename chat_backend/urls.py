"""
URL configuration for chat_backend project.
"""

from django.contrib import admin
from django.urls import path
from chat.api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    # All REST API endpoints mounted at /api/
    path("api/", api.urls),
]
