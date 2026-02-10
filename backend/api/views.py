import google.generativeai as genai
from .ai_utils import analyze_document_with_gemini
from rest_framework import viewsets, permissions, status, parsers
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User, Document, Department, ActivityLog
from .serializers import UserSerializer, DocumentSerializer, DepartmentSerializer, ActivityLogSerializer

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
            # STRICT CHECK: If Client/Dept_Admin is not verified, BLOCK login
            if user.role != 'Main_Admin' and user.kyc_status != 'Verified':
                return Response({'error': 'Account Pending Approval. Please wait for Main Admin verification.'}, status=403)
            
            token, _ = Token.objects.get_or_create(user=user)
            ActivityLog.objects.create(user=user, action="Login", details="Logged in")
            return Response({'token': token.key, 'role': user.role, 'username': user.username})
        return Response({'error': 'Invalid Credentials'}, status=400)

    @action(detail=False, methods=['post'])
    def register(self, request):
        data = request.data.copy()
        # Clients and Dept Admins start as Pending
        if data.get('role') != 'Main_Admin':
            data['kyc_status'] = 'Pending'
        
        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({'status': 'Registered. Please wait for approval.'})
        return Response(serializer.errors, status=400)

# --- USER MANAGEMENT ---
class UserManagementViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admin sees pending users
        if self.request.user.role == 'Main_Admin':
            return User.objects.filter(kyc_status='Pending')
        return User.objects.none()

    def create(self, request, *args, **kwargs):
        # Allow Admin to create users manually
        if request.user.role != 'Main_Admin':
            return Response({'error': 'Unauthorized'}, status=403)
        
        data = request.data.copy()
        if data.get('role') == 'Dept_Admin':
            dept_name = data.get('username')
            Department.objects.get_or_create(name=dept_name, defaults={'keywords': dept_name.lower()})
        
        data['kyc_status'] = 'Verified' # Admin created users are auto-verified
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            user.set_password(data['password'])
            user.save()
            ActivityLog.objects.create(user=request.user, action="Created User", details=f"Created user: {user.username}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=400)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        if request.user.role != 'Main_Admin': return Response(status=403)
        user = self.get_object()
        user.kyc_status = 'Verified'
        user.save()
        
        # If approving a Dept_Admin, auto-create the department
        if user.role == 'Dept_Admin':
             Department.objects.get_or_create(name=user.username, defaults={'keywords': user.username.lower()})

        ActivityLog.objects.create(user=request.user, action="Approved User", details=f"Approved: {user.username}")
        return Response({'status': 'Approved'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        if request.user.role != 'Main_Admin': return Response(status=403)
        user = self.get_object()
        user.kyc_status = 'Rejected'
        user.save()
        return Response({'status': 'Rejected'})

# --- DOCUMENTS ---
class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (parsers.MultiPartParser, parsers.FormParser, parsers.JSONParser)

    def get_queryset(self):
        user = self.request.user
        
        # 1. Main Admin: Sees EVERYTHING
        if user.role == 'Main_Admin' or user.is_superuser:
            return Document.objects.all().order_by('-uploaded_at')
            
        # 2. Dept Admin: Sees only docs assigned to their Dept
        if user.role == 'Dept_Admin':
            return Document.objects.filter(current_dept__name=user.username).exclude(status='Declined')
            
        # 3. Client: Sees only THEIR OWN docs
        return Document.objects.filter(user=user)

    def perform_create(self, serializer):
        uploaded_file = self.request.FILES['file']
        user = self.request.user
        
        # AI Analysis
        active_depts = list(Department.objects.values_list('name', flat=True))
        ai_result = analyze_document_with_gemini(uploaded_file, active_depts)
        
        target_dept = None
        doc_status = 'Review_Required'
        confidence = 0.0
        
        if ai_result:
            confidence = ai_result.get('confidence', 0)
            suggested_dept = ai_result.get('department')
            if confidence > 80:
                try:
                    target_dept = Department.objects.get(name__iexact=suggested_dept)
                    doc_status = 'In_Progress'
                except: pass

        doc = serializer.save(
            user=user, 
            current_dept=target_dept, 
            status=doc_status,
            ai_confidence=confidence,
        )
        
        if target_dept:
            doc.sent_to_dept_at = timezone.now()
            doc.save()

        ActivityLog.objects.create(user=user, action="Uploaded", details=f"File: {uploaded_file.name}")

    @action(detail=True, methods=['post'])
    def route_to(self, request, pk=None):
        if request.user.role != 'Main_Admin': return Response(status=403)
        
        dept_id = request.data.get('department_id')
        new_dept = Department.objects.get(id=dept_id)
        
        doc = self.get_object()
        doc.current_dept = new_dept
        doc.status = 'In_Progress'
        doc.sent_to_dept_at = timezone.now()
        doc.save()
        
        ActivityLog.objects.create(user=request.user, action="Routed", details=f"To {new_dept.name}")
        return Response({'status': f'Routed to {new_dept.name}'})

    @action(detail=True, methods=['post'])
    def dept_submit_report(self, request, pk=None):
        doc = self.get_object()
        if request.user.username != doc.current_dept.name: 
            return Response({'error': 'Not your department'}, status=403)

        report_file = request.FILES.get('report_file')
        if not report_file:
            return Response({'error': 'Report PDF is required'}, status=400)

        doc.dept_report = report_file
        doc.status = 'Dept_Reported'
        doc.dept_processed_at = timezone.now()
        doc.save()

        ActivityLog.objects.create(user=request.user, action="Report Submitted", details=f"Doc {doc.tracking_id}")
        return Response({'status': 'Report sent to Main Admin'})

    @action(detail=True, methods=['post'])
    def forward_to_client(self, request, pk=None):
        if request.user.role != 'Main_Admin': return Response(status=403)
        
        doc = self.get_object()
        doc.status = 'Completed'
        doc.final_report_sent_at = timezone.now()
        doc.save()
        
        ActivityLog.objects.create(user=request.user, action="Closed", details=f"Report sent to Client {doc.user.username}")
        return Response({'status': 'Report forwarded to Client'})
    
    @action(detail=True, methods=['post'])
    def freeze(self, request, pk=None):
        if request.user.role != 'Main_Admin': return Response(status=403)
        doc = self.get_object()
        doc.is_frozen = not doc.is_frozen
        doc.save()
        return Response({'status': 'Toggled Freeze'})

    @action(detail=True, methods=['post'])
    def decline(self, request, pk=None):
        if request.user.role != 'Main_Admin': return Response(status=403)
        doc = self.get_object()
        doc.status = 'Declined'
        doc.save()
        return Response({'status': 'Declined'})

class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_queryset(self):
        return ActivityLog.objects.filter(user=self.request.user)