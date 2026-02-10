from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

class User(AbstractUser):
    ROLE_CHOICES = [
        ('Client', 'Client'),
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

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = 'Main_Admin'
            self.kyc_status = 'Verified'
            self.is_staff = True
        super().save(*args, **kwargs)

class Department(models.Model):
    name = models.CharField(max_length=100)
    keywords = models.TextField(help_text="Comma-separated keywords for AI routing")

    def __str__(self):
        return self.name

class Document(models.Model):
    # Core Info
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='uploads/')
    tracking_id = models.CharField(max_length=10, unique=True, editable=False)
    
    # Status & AI
    status = models.CharField(
        max_length=50, 
        default='Review_Required',
        choices=[
            ('Review_Required', 'Pending Admin Review'),
            ('In_Progress', 'With Department'),
            ('Dept_Reported', 'Report Submitted by Dept'),
            ('Completed', 'Sent to Client'),
            ('Declined', 'Declined')
        ]
    )
    current_dept = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL)
    ai_confidence = models.FloatField(default=0.0)
    is_frozen = models.BooleanField(default=False)

    # --- WORKFLOW TRACKING ---
    uploaded_at = models.DateTimeField(auto_now_add=True)
    sent_to_dept_at = models.DateTimeField(null=True, blank=True)
    dept_report = models.FileField(upload_to='dept_reports/', null=True, blank=True)
    dept_processed_at = models.DateTimeField(null=True, blank=True)
    final_report_sent_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            self.tracking_id = str(uuid.uuid4())[:8].upper()
        super().save(*args, **kwargs)

class ActivityLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=100)
    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']