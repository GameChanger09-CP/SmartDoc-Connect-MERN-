from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    ROLE_CHOICES = [
        ('Client', 'Client'),
        ('Vendor', 'Vendor'),  # <--- THIS WAS MISSING
        ('Dept_Admin', 'Department Admin'),
        ('Main_Admin', 'Main Admin'),
    ]
    
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='Client')
    
    # KYC Fields
    kyc_status = models.CharField(
        max_length=20, 
        choices=[('Pending', 'Pending'), ('Verified', 'Verified'), ('Rejected', 'Rejected')],
        default='Pending'
    )
    gov_id = models.FileField(upload_to='kyc_docs/', null=True, blank=True)

class Department(models.Model):
    name = models.CharField(max_length=100)
    keywords = models.TextField(help_text="Comma-separated keywords for AI routing (e.g., invoice, salary, tax)")

    def __str__(self):
        return self.name

class Document(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20, 
        default='Review_Required'
    )
    priority = models.CharField(max_length=20, default='Normal')
    current_dept = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL)
    tracking_id = models.CharField(max_length=10, unique=True, editable=False)
    ai_confidence = models.FloatField(default=0.0)
    is_frozen = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            import uuid
            self.tracking_id = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)