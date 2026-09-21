from rest_framework import serializers
from .models import *

class StudentSerilaizer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = "__all__"

class stu_attendanceSerilaizer(serializers.ModelSerializer):
    student = StudentSerilaizer(read_only=True)
    student_id = serializers.PrimaryKeyRelatedField(
        queryset = stu_attendance.objects.all(),
        write_only =True,
        source = "student"
    )
    class Meta:
        model = stu_attendance
        fields = "__all__"

class showGetSerializer(serializers.ModelSerializer):
    studentAttendance = stu_attendanceSerilaizer(many=True,read_only = True)

    class Meta:
        model = Student
        fields ="__all__"
