from rest_framework import serializers
from .models import User, Document, Department

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
    class Meta:
        model = Document
        fields = '__all__'
        # --- THE FIX IS HERE ---
        # We mark 'user' and 'tracking_id' as read_only so the serializer doesn't complain they are missing
        read_only_fields = [
            'id', 
            'uploaded_at', 
            'status', 
            'ai_confidence', 
            'tracking_id', 
            'user',            # <--- Vital Fix
            'current_dept', 
            'is_frozen'
        ]

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'