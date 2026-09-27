from django.shortcuts import render
from .models import *
from .serializers import *
from rest_framework.response import Response
from rest_framework import status
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework import generics, mixins
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from deepface import DeepFace
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, pagination, viewsets
from django.utils import timezone

class student_detials(viewsets.ModelViewSet):

    queryset = Student.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return showGetSerializer
        return  StudentSerilaizer

class stu_attendance_detials(viewsets.ModelViewSet):
    queryset = stu_attendance.objects.all()
    serializer_class= stu_attendanceSerilaizer
    # filter_backends=[DjangoFilterBackend,
    #                 filters.SearchFilter,
    #                 filters.OrderingFilter
    #                 ]

    # filterset_fields ={
    #     "period":["exact"],
    #     "timing":["exact"]
    # }
    
class VerifyStudentFace(APIView):

    def post(self, request):

        captured_image = request.FILES.get("image")
        timing_in = request.data.get("timing")
        in_period = request.data.get("period")

        if not captured_image:
            return Response(
                {
                    "success": False,
                    "message": "Captured image is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not timing_in:
            return Response(
                {
                    "success": False,
                    "message": "Date is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        if not in_period:
            return Response(
                {
                    "success": False,
                    "message": "Period is required."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        students = Student.objects.exclude(
            stu_photo=""
        )

        for student in students:

            try:

                result = DeepFace.verify(
                    img1_path=captured_image,
                    img2_path=student.stu_photo.path,
                    model_name="VGG-Face",
                    detector_backend="opencv",
                    enforce_detection=True,
                    anti_spoofing=False
                )

                if result["verified"]:

                    attendance, created = stu_attendance.objects.update_or_create(
                        student_id=student.id,
                        timing=timing_in,
                        period=in_period,
                        defaults={
                            "status": "P",
                            "update_time": timezone.now()
                        }
                    )

                    return Response(
                        {
                            "success": True,
                            "matched": True,

                            "student": {
                                "id": student.id,
                                "student_name": student.student_name,
                                "s_no": student.s_no,
                                "register_no": student.register_no,
                                "stu_photo": request.build_absolute_uri(
                                    student.stu_photo.url
                                )
                            },

                            "attendance": {
                                "id": attendance.id,
                                "status": attendance.status,
                                "period": attendance.period,
                                "timing": attendance.timing,
                                "update_time": attendance.update_time
                            },

                            "verification": {
                                "distance": result["distance"],
                                "confidence": result.get("confidence"),
                                "model": result.get("model")
                            }
                        },
                        status=status.HTTP_200_OK
                    )

            except Exception as error:

                print(
                    f"Verification failed for "
                    f"{student.student_name}: {error}"
                )

                continue

        return Response(
            {
                "success": True,
                "matched": False,
                "message": "No matching student found."
            },
            status=status.HTTP_200_OK
        )