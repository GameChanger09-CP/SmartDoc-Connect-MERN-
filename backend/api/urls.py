from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet, DocumentViewSet, DepartmentViewSet, UserManagementViewSet

router = DefaultRouter()
router.register(r'documents', DocumentViewSet, basename='documents')
router.register(r'departments', DepartmentViewSet, basename='departments')
router.register(r'users', UserManagementViewSet, basename='users') # NEW
router.register(r'auth', AuthViewSet, basename='auth')

urlpatterns = [
    path('', include(router.urls)),
]