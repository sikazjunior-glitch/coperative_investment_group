from django.contrib import admin
from django.urls import path, include
# Import the JWT views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')), 
    
    # --- SECURITY URLS ---
    # Users send username/password here to get their token
    path('api/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    # Tokens expire for security. This URL issues a new one.
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]