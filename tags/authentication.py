# from django.contrib.auth.backends import BaseBackend
# from django.contrib.auth.models import User
# from .models import Admin, Annotators  # Import your custom models

# class CustomAuthenticationBackend(BaseBackend):
#     def authenticate(self, request, username=None, password=None):
#         # Check if the user is an admin
#         try:
#             admin_user = Admin.objects.get(username=username)
#             if admin_user.password == password:  # You might want to hash the password in production
#                 return admin_user  # Return the admin user if authenticated
#         except Admin.DoesNotExist:
#             pass  # Continue checking Annotator if admin doesn't exist
        
#         # Check if the user is an annotator
#         try:
#             annotator_user = Annotators.objects.get(username=username)
#             if annotator_user.password == password:  # You might want to hash the password in production
#                 return annotator_user  # Return the annotator user if authenticated
#         except Annotators.DoesNotExist:
#             return None  # Return None if both fail
