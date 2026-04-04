from django.contrib import admin
from django.contrib.auth import get_user_model
from .models import ClubSettings, Project, Transaction

# Force Django to grab the exact active user model from the settings
User = get_user_model()

class CustomUserAdmin(admin.ModelAdmin):
    list_display = ['username', 'first_name', 'last_name', 'email', 'is_approved_member', 'is_staff']
    list_editable = ['is_approved_member']
    list_filter = ['is_approved_member', 'is_staff']
    search_fields = ['username', 'email']

# Unregister it just in case Django tangled it up in the background
try:
    admin.site.unregister(User)
except admin.sites.NotRegistered:
    pass

# Register it forcefully
admin.site.register(User, CustomUserAdmin)
admin.site.register(ClubSettings)
admin.site.register(Project)
admin.site.register(Transaction)