from rest_framework import serializers
from .models import User, Document, Department, ActivityLog

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role', 'kyc_status', 'gov_id']
        extra_kwargs = {
            'password': {'write_only': True},
            'gov_id': {'required': False} 
        }

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            role=validated_data.get('role', 'Client'),
            kyc_status=validated_data.get('kyc_status', 'Pending')
        )
        user.set_password(validated_data['password'])
        if 'gov_id' in validated_data:
            user.gov_id = validated_data['gov_id']
        user.save()
        return user

class DocumentSerializer(serializers.ModelSerializer):
    # Format Dates for easy reading
    uploaded_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)
    sent_to_dept_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)
    dept_processed_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)
    final_report_sent_at = serializers.DateTimeField(format="%Y-%m-%d %H:%M", read_only=True)
    
    # --- NEW FIELDS FOR INFO BOX (CRITICAL) ---
    client_username = serializers.CharField(source='user.username', read_only=True)
    client_id = serializers.IntegerField(source='user.id', read_only=True)
    # ------------------------------------------

    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = [
            'id', 'status', 'ai_confidence', 'tracking_id', 'user', 'current_dept', 'is_frozen',
            'uploaded_at', 'sent_to_dept_at', 'dept_processed_at', 'final_report_sent_at',
            'client_username', 'client_id'
        ]

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class ActivityLogSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(format="%Y-%m-%d %H:%M:%S")
    # Show who performed the action
    user_username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = ActivityLog
        fields = ['id', 'action', 'details', 'timestamp', 'user_username']