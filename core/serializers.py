from rest_framework import serializers
from .models import Project, Transaction, ClubSettings
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_approved_member', 'is_staff']

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

class TransactionSerializer(serializers.ModelSerializer):
    # This explicitly tells the serializer how to handle the user field
    user_name = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Transaction
        fields = '__all__'
        
class ClubSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClubSettings
        fields = '__all__'