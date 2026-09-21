from django.urls import include, path
from rest_framework.routers import DefaultRouter
from .views import *


urlpatterns=[
    path("student_detials/",student_detials.as_view({"get":"list","post":"create"}),),
    path("student_detials/<int:pk>/",student_detials.as_view({"get":"retrieve","put":"update","delete":"destroy"}),),

    path("studentatt_detials/",stu_attendance_detials.as_view({"get":"list","post":"create"}),),
    path("studentatt_detials/<int:pk>/",stu_attendance_detials.as_view({"get":"retrieve","put":"update","delete":"destroy"}),),

    path("verify-student-face/",VerifyStudentFace.as_view(),name="verify-student-face"),
]