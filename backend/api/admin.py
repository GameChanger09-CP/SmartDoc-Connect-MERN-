from django.contrib import admin
from .models import User, Document, Department, ActivityLog

admin.site.register(User)
admin.site.register(Document)
admin.site.register(Department)
admin.site.register(ActivityLog)