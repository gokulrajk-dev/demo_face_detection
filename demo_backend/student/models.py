from django.db import models

# Create your models here.

class Student(models.Model):
    student_name = models.CharField(max_length=100)
    s_no = models.IntegerField(unique=True)
    register_no = models.BigIntegerField(unique=True)
    timing = models.DateField(auto_now_add=True)
    stu_photo = models.ImageField(upload_to="student_photo/")

    def __str__(self):
        return f"{self.student_name} - {self.register_no}"

class stu_attendance(models.Model):
    class att_status(models.TextChoices):
        PRESENT ="P",
        ABSENT = "A"
    student = models.ForeignKey(Student,on_delete=models.CASCADE,related_name="studentAttendance")
    period = models.PositiveIntegerField(
        blank=True,null=True,
        choices=[
            (1, "1"),
            (2, "2"),
            (3, "3"),
            (4, "4"),
            (5, "5"),
        ]
    )

    status = models.CharField(max_length=1,
                              choices= att_status.choices)
    timing = models.DateField(auto_now_add=True)
    update_time = models.DateTimeField()

    def __str__(self):
        return self.student.student_name

    class Meta:
        unique_together =("student","timing","period")
