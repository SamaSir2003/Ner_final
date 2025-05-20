"""
URL configuration for tagproject project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path,include
from tags import views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', views.login_page, name='login'),
    path("logout/", views.logout_view, name="logout"),
    path('home/', views.home, name='home'),
    path('domain/', views.domain, name='domain'),
    path('inference/', views.inference, name='inference'),
    path('adminhome/', views.adminhome, name='adminhome'),
    path('adminhome/users/', views.users, name='users'),
    path('adminhome/tags/', views.tags, name='tags'),
    path('add_tag/', views.add_tag, name='add_tag'),
    path('auto_tag/', views.auto_tag, name='auto_tag'),
    path('admin/', admin.site.urls),
    path('get_paragraph/', views.get_paragraph, name='get_paragraph'),
    path('submit_file/', views.submit_file, name='submit_file'),
    path('reset_picked_files/', views.reset_picked_files, name='reset_picked_files'),
    path('clear_tags/', views.clear_tags, name='clear_tags'),
    path('accounts/', include('django.contrib.auth.urls')),
    path('skip_file/', views.skip_file, name='skip_file'),
    path('add_annotator/', views.add_annotator, name='add_annotator'),
    path('remove_annotator/', views.remove_annotator, name='remove_annotator'),
    path('upload_file/', views.upload_file, name='upload_file'),
    path('list_results/', views.list_result_files, name='list_results'),
    path('list_uploads/', views.list_uploaded_files, name='list_uploads'),
    path('download_result/', views.download_result_file, name='download_result'),
    path('delete_result/', views.delete_result_file, name='delete_result'),
    path('delete_upload/', views.delete_upload_file, name='delete_upload'),
    path('delete_tag/', views.delete_tag, name='delete_tag'),
    path('heartbeat/',views.heartbeat,name="heartbeat"),
    path('selection/', views.selection, name='selection'),  
    path('validation/', views.validation, name='validation'),
    path('validation_domain/', views.validation_domain, name='validation_domain'),
    path('validation_home/', views.validation_home, name='validation_home'),
    path('get_annotations/', views.get_annotations, name='get_annotations'),
    path('skip_annotation/', views.skip_annotation, name='skip_annotation'),
    path('submit_validation/', views.submit_validation, name='submit_validation'),
]
