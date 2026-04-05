from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# This tells Django to use the secure password-hashing screens for our custom user
class CustomUserAdmin(UserAdmin):
    # This adds your custom 'is_approved_member' checkbox to the admin panel
    fieldsets = UserAdmin.fieldsets + (
        ('CIG Hub Permissions', {'fields': ('is_approved_member',)}),
    )

admin.site.register(User, CustomUserAdmin)