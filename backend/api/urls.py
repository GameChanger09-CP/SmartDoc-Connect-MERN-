# In backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet, DocumentViewSet, DepartmentViewSet, UserManagementViewSet, ActivityLogViewSet # Import this!

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'documents', DocumentViewSet, basename='documents')
router.register(r'departments', DepartmentViewSet, basename='departments')
router.register(r'users', UserManagementViewSet, basename='users')
router.register(r'logs', ActivityLogViewSet, basename='logs') # Add this line

urlpatterns = router.urls