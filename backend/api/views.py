import google.generativeai as genai
# 1. IMPORT THE NEW AI FUNCTION
from .ai_utils import analyze_document_with_gemini 
from rest_framework import viewsets, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from .models import User, Document, Department, ActivityLog
from .serializers import UserSerializer, DocumentSerializer, DepartmentSerializer, ActivityLogSerializer
import os

# --- AUTH ---
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
            
            # LOG LOGIN
            ActivityLog.objects.create(user=user, action="Login", details="User logged in successfully")
            
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

# --- LOGS ---
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users only see THEIR own logs
        return ActivityLog.objects.filter(user=self.request.user)

# --- USER MANAGEMENT ---
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
        if data.get('role') == 'Dept_Admin':
            dept_name = data.get('username')
            Department.objects.get_or_create(name=dept_name, defaults={'keywords': dept_name.lower()})
        
        data['kyc_status'] = 'Verified'
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user.set_password(data['password'])
            user.save()
            
            # LOG USER CREATION
            ActivityLog.objects.create(user=request.user, action="Created User", details=f"Created user: {user.username}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'Main_Admin' and not request.user.is_superuser: return Response(status=403)
        user = self.get_object()
        user.kyc_status = 'Verified'
        user.save()
        ActivityLog.objects.create(user=request.user, action="Approved User", details=f"Approved: {user.username}")
        return Response({'status': 'Approved'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role != 'Main_Admin' and not request.user.is_superuser: return Response(status=403)
        user = self.get_object()
        user.kyc_status = 'Rejected'
        user.save()
        ActivityLog.objects.create(user=request.user, action="Rejected User", details=f"Rejected: {user.username}")
        return Response({'status': 'Rejected'})

# --- DOCUMENTS (VISION AI UPDATED) ---
class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)

    def get_queryset(self):
        user = self.request.user
        # FIX 1: VISIBILITY OVERRIDE for Admin
        if user.username == 'admin' or user.role == 'Main_Admin' or user.is_superuser:
            return Document.objects.exclude(status='Declined')
            
        if user.role == 'Dept_Admin':
            return Document.objects.filter(current_dept__name=user.username).exclude(status='Declined')
            
        return Document.objects.filter(user=user)

    def perform_create(self, serializer):
        # 1. Get the file and user
        uploaded_file = self.request.FILES['file']
        user = self.request.user
        
        # 2. Get active Departments
        active_depts = list(Department.objects.values_list('name', flat=True))
        
        # 3. Ask Gemini (VISION - Handles Scanned PDFs)
        # We now pass the file object directly, not extracted text
        ai_result = analyze_document_with_gemini(uploaded_file, active_depts)
        
        # Default values 
        target_dept = None
        status = 'Review_Required'
        confidence = 0.0
        
        # 4. AUTO-ROUTING LOGIC
        if ai_result:
            confidence = ai_result.get('confidence', 0)
            suggested_dept_name = ai_result.get('department')
            
            print(f"AI LOG: Suggested '{suggested_dept_name}' with {confidence}% confidence.")

            # CRITICAL CHECK: Only route if Confidence > 80%
            if confidence > 80:
                try:
                    target_dept = Department.objects.get(name__iexact=suggested_dept_name)
                    status = 'In_Progress'
                except Department.DoesNotExist:
                    print(f"AI hallucinated a department: {suggested_dept_name}")
        
        # 5. Save the Document
        file_name = uploaded_file.name
        doc = serializer.save(
            user=user, 
            current_dept=target_dept, 
            status=status,
            ai_confidence=confidence
        )
        
        # 6. Log the Action
        log_msg = f"Uploaded: {file_name}"
        if target_dept:
            log_msg += f" | AI Auto-Routed to {target_dept.name} ({confidence}%)"
        else:
            log_msg += f" | Low Confidence ({confidence}%) - Sent to Admin"
            
        ActivityLog.objects.create(user=user, action="Uploaded Document", details=log_msg)

    @action(detail=True, methods=['post'])
    def freeze(self, request, pk=None):
        if request.user.username != 'admin' and request.user.role != 'Main_Admin' and not request.user.is_superuser: 
            return Response(status=403)
            
        doc = self.get_object()
        doc.is_frozen = not doc.is_frozen
        doc.status = 'Frozen' if doc.is_frozen else 'In_Progress'
        doc.save()
        ActivityLog.objects.create(user=request.user, action="Toggled Freeze", details=f"Doc ID: {doc.tracking_id}")
        return Response({'status': 'Toggled'})

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        if request.user.username != 'admin' and request.user.role != 'Main_Admin' and not request.user.is_superuser: 
            return Response(status=403)
            
        doc = self.get_object()
        doc.status = 'Declined'
        doc.save()
        ActivityLog.objects.create(user=request.user, action="Declined Document", details=f"Doc ID: {doc.tracking_id}")
        return Response({'status': 'Declined'})

    @action(detail=True, methods=['post'])
    def route_to(self, request, pk=None):
        # FIX 2: ROUTING OVERRIDE for Admin (CRITICAL FIX)
        if request.user.username != 'admin' and request.user.role != 'Main_Admin' and not request.user.is_superuser: 
            print(f"DEBUG: BLOCKED User {request.user.username} with role {request.user.role}")
            return Response({'error': 'Permission Denied'}, status=403)
        
        dept_id = request.data.get('department_id')
        try:
            new_dept = Department.objects.get(id=dept_id)
            doc = self.get_object()
            doc.current_dept = new_dept
            doc.status = 'In_Progress'
            doc.save()
            
            ActivityLog.objects.create(user=request.user, action="Routed Document", details=f"Doc {doc.tracking_id} -> {new_dept.name}")
            
            return Response({'status': f'Routed to {new_dept.name}'})
        except Department.DoesNotExist:
            return Response({'error': 'Department not found'}, status=404)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

    @action(detail=True, methods=['post'])
    def dept_complete(self, request, pk=None):
        doc = self.get_object()
        if request.user.username != doc.current_dept.name: return Response(status=403)
        doc.status = 'Completed'
        doc.save()
        ActivityLog.objects.create(user=request.user, action="Completed Document", details=f"Doc ID: {doc.tracking_id}")
        return Response({'status': 'Completed'})

    @action(detail=True, methods=['post'])
    def dept_return(self, request, pk=None):
        doc = self.get_object()
        if request.user.username != doc.current_dept.name: return Response(status=403)
        old_dept = doc.current_dept.name
        doc.current_dept = None
        doc.status = 'Returned'
        doc.save()
        ActivityLog.objects.create(user=request.user, action="Returned Document", details=f"Doc {doc.tracking_id} returned from {old_dept}")
        return Response({'status': 'Returned to Admin'})

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None