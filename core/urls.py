from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# A router automatically creates standard URLs for our ViewSets
router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'projects', views.ProjectViewSet)
router.register(r'transactions', views.TransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('api/user/', views.current_user, name='current_user'),
    path('user/', views.current_user, name='current_user'),
]