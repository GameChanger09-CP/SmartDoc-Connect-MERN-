import google.generativeai as genai
from rest_framework import viewsets, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import User, Document, Department
from .serializers import UserSerializer, DocumentSerializer, DepartmentSerializer
import os

# --- CONFIGURE GEMINI (Replace with your actual key) ---
# genai.configure(api_key="YOUR_GEMINI_API_KEY") 

class AuthViewSet(viewsets.ViewSet):
    permission_classes = [permissions.AllowAny]
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)

    @action(detail=False, methods=['post'])
    def login(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            if user.role in ['Dept_Admin', 'Vendor'] and user.kyc_status != 'Verified':
                return Response({'error': 'Account Pending Approval.'}, status=403)
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'role': user.role, 'status': user.kyc_status, 'username': user.username})
        return Response({'error': 'Invalid Credentials'}, status=400)

    @action(detail=False, methods=['post'])
    def register(self, request):
        data = request.data.copy()
        if data.get('role') in ['Dept_Admin', 'Main_Admin', 'Vendor']:
            data['kyc_status'] = 'Pending'
        else:
            data['kyc_status'] = 'Verified'
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user.set_password(data['password'])
            user.save()
            return Response({'status': 'Registered'})
        return Response(serializer.errors, status=400)

class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(kyc_status='Pending')

    def create(self, request, *args, **kwargs):
        if request.user.role != 'Main_Admin' and not request.user.is_superuser:
            return Response({'error': 'Unauthorized'}, status=403)
        data = request.data.copy()
        
        # Auto-create Department if Dept_Admin
        if data.get('role') == 'Dept_Admin':
            dept_name = data.get('username') # Username IS Dept Name
            Department.objects.get_or_create(name=dept_name, defaults={'keywords': dept_name.lower()})
        
        data['kyc_status'] = 'Verified'
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user.set_password(data['password'])
            user.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'Main_Admin' and not request.user.is_superuser: return Response(status=403)
        user = self.get_object()
        user.kyc_status = 'Verified'
        user.save()
        return Response({'status': 'Approved'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role != 'Main_Admin' and not request.user.is_superuser: return Response(status=403)
        user = self.get_object()
        user.kyc_status = 'Rejected'
        user.save()
        return Response({'status': 'Rejected'})

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)  
    def get_queryset(self):
        user = self.request.user
        # 1. Main Admin: Sees EVERYTHING except Declined
        if user.role == 'Main_Admin' or user.is_superuser:
            return Document.objects.exclude(status='Declined')
        
        # 2. Dept Admin: Sees ONLY docs assigned to their Department (Username = Dept Name)
        if user.role == 'Dept_Admin':
            return Document.objects.filter(current_dept__name=user.username).exclude(status='Declined')
        
        # 3. Client: Sees only their own docs
        return Document.objects.filter(user=user)

    def perform_create(self, serializer):
        # AI LOGIC PLACEHOLDER (Replace with real Gemini call)
        # 1. Get file content
        # 2. Call Gemini API: "Classify this document..."
        # 3. For now, we simulate AI by checking filename keywords
        
        file_name = self.request.FILES['file'].name.lower()
        suggested_dept = None
        
        # Simple Keyword Matching (Simulating AI)
        if 'invoice' in file_name or 'bill' in file_name:
            suggested_dept = Department.objects.filter(name__icontains='Accounts').first()
        elif 'drawing' in file_name or 'plan' in file_name:
             suggested_dept = Department.objects.filter(name__icontains='Civil').first()
        
        doc = serializer.save(user=self.request.user)
        
        # If AI found a match, auto-route or tag it (Here we just note it)
        if suggested_dept:
             print(f"AI Suggestion: Document belongs to {suggested_dept.name}")
             # Optional: Auto-route
             # doc.current_dept = suggested_dept
             # doc.save()

    @action(detail=True, methods=['post'])
    def freeze(self, request, pk=None):
        # Only Main Admin
        if request.user.role != 'Main_Admin' and not request.user.is_superuser: return Response(status=403)
        doc = self.get_object()
        doc.is_frozen = not doc.is_frozen
        doc.status = 'Frozen' if doc.is_frozen else 'In_Progress'
        doc.save()
        return Response({'status': 'Toggled'})

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        # Main Admin Only
        if request.user.role != 'Main_Admin' and not request.user.is_superuser: return Response(status=403)
        doc = self.get_object()
        doc.status = 'Declined'
        doc.save()
        return Response({'status': 'Declined'})

    @action(detail=True, methods=['post'])
    def route_to(self, request, pk=None):
        # Main Admin Only
        if request.user.role != 'Main_Admin' and not request.user.is_superuser: return Response(status=403)
        dept_id = request.data.get('department_id')
        try:
            new_dept = Department.objects.get(id=dept_id)
            doc = self.get_object()
            doc.current_dept = new_dept
            doc.status = 'In_Progress' # Reset status
            doc.save()
            return Response({'status': f'Routed to {new_dept.name}'})
        except:
            return Response({'error': 'Department not found'}, status=404)

    # --- NEW: Department Admin Actions ---

    @action(detail=True, methods=['post'])
    def dept_complete(self, request, pk=None):
        # Only the Assigned Dept Admin can do this
        doc = self.get_object()
        if request.user.username != doc.current_dept.name: return Response(status=403)
        
        doc.status = 'Completed'
        doc.save()
        return Response({'status': 'Completed'})

    @action(detail=True, methods=['post'])
    def dept_return(self, request, pk=None):
        # "Not Our Document" - Sends back to Main Admin
        doc = self.get_object()
        if request.user.username != doc.current_dept.name: return Response(status=403)
        
        doc.current_dept = None # Remove from department
        doc.status = 'Returned' # Special status for Admin to see
        doc.save()
        return Response({'status': 'Returned to Admin'})

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None