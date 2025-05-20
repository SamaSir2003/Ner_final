from django.shortcuts import render,redirect
from django.http import JsonResponse
from django.contrib.auth import authenticate,login,logout
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from .models import TagManager,Annotators
from django.core.files.storage import default_storage
from django.conf import settings
from django.http import JsonResponse, FileResponse, HttpResponseBadRequest
import json
import os
from django.shortcuts import get_object_or_404
import pandas as pd
import requests
import re
from datetime import datetime, timezone

# Define the API endpoint for ner model
url = os.environ.get("PREDICT_API_URL", "http://127.0.0.1:8002/predict")
url_learn = os.environ.get("LEARN_API_URL", "http://127.0.0.1:8002/learn")

@login_required(login_url='')
def home(request):
    tag_manager = TagManager.get_instance()
    return render(request, 'tags/home.html', {'tags': tag_manager.tags ,'tags2': tag_manager.tags_med,'tags3':tag_manager.tags_fin})

@login_required(login_url='')
def domain(request):
    return render(request, 'tags/domain.html')

@login_required(login_url='')
def inference(request):
    tag_manager = TagManager.get_instance()
    return render(request, 'tags/inference.html', {'tags': tag_manager.tags,'tags2': tag_manager.tags_med,'tags3':tag_manager.tags_fin})

@staff_member_required
@login_required(login_url='')
def adminhome(request):
    tag_manager = TagManager.get_instance()
    return render(request, 'tags/adminhome.html', {'tags': tag_manager.tags,'tags2': tag_manager.tags_med,'tags3':tag_manager.tags_fin})

@csrf_exempt
def add_tag(request):
    if request.method == 'POST':
        tag_manager = TagManager.get_instance()
        data = json.loads(request.body.decode("utf-8"))
        new_tag = data.get('tag')
        print("ne tag:",new_tag)
        category = data.get('category')
        print("ne cat:",category)
        if new_tag and new_tag not in tag_manager.tags and category=="Gen":
            tag_manager.tags.append(new_tag)
            tag_manager.save()
            return JsonResponse({'status': 'success', 'tags': tag_manager.tags})
        elif new_tag and new_tag not in tag_manager.tags_med and category=="Med":
            tag_manager.tags_med.append(new_tag)
            tag_manager.save()
            print(tag_manager.tags_med)
            return JsonResponse({'status': 'success', 'tags': tag_manager.tags_med})
        elif new_tag and new_tag not in tag_manager.tags_fin and category=="Fin":
            tag_manager.tags_fin.append(new_tag)
            tag_manager.save()
            print(tag_manager.tags_fin)
            return JsonResponse({'status': 'success', 'tags': tag_manager.tags_fin})

    return JsonResponse({'status': 'error'})

# Create your views here.
@csrf_exempt
def clear_tags(request):
    if request.method == 'POST':
        try:
            # Get or create the TagManager instance
            tag_manager = TagManager.get_instance()
            
            # Clear the tags
            tag_manager.tags = []
            tag_manager.tags_med = []
            tag_manager.save()

            return JsonResponse({'status': 'success', 'message': 'All tags removed successfully.'})
        except Exception as e:
            print(e)
            return JsonResponse({'status': 'error', 'message': str(e)})

    return JsonResponse({'status': 'error', 'message': 'Invalid request method.'})

#deletes individual tag
@csrf_exempt
def delete_tag(request):
    if request.method == 'POST':
        try:
            tag_to_delete = request.POST.get('tag')
            if not tag_to_delete:
                return JsonResponse({'status': 'error', 'message': 'No tag specified.'})

            # Get or create the TagManager instance
            tag_manager = TagManager.get_instance()

            # Check if the tag exists
            if tag_to_delete in tag_manager.tags:
                tag_manager.tags.remove(tag_to_delete)
                tag_manager.save()
                return JsonResponse({'status': 'success', 'message': f'Tag "{tag_to_delete}" deleted successfully.'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Tag not found.'})
        except Exception as e:
            print(e)
            return JsonResponse({'status': 'error', 'message': str(e)})

    return JsonResponse({'status': 'error', 'message': 'Invalid request method.'})

@csrf_exempt
def add_annotator(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')
            password = data.get('password')

            # Validate required fields
            if not username or not password:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Username and password are required'
                })

            # Check if username already exists
            if Annotators.objects.filter(username=username).exists():
                return JsonResponse({
                    'status': 'error',
                    'message': 'Username already exists'
                })

            # Generate next ID
            last_annotator = Annotators.objects.order_by('-ID').first()
            next_id = 1 if not last_annotator else last_annotator.ID + 1

            user = User.objects.create_user(username=username,email=username,password=password)
            Annotators.objects.create(ID=next_id,username=username, password=password)

            return JsonResponse({
                'status': 'success',
                'message': 'Annotator created successfully',
                'data': {
                    'id': next_id,
                    'username': username
                }
            })

        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            })

    return JsonResponse({
        'status': 'error',
        'message': 'Invalid request method'
    })
    
@csrf_exempt
def remove_annotator(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            username = data.get('username')

            if not username:
                return JsonResponse({'status': 'error', 'message': 'Username is required.'})

            # First, delete from the Annotators table
            annotator = Annotators.objects.filter(username=username).first()
            if annotator:
                annotator.delete()
            else:
                return JsonResponse({'status': 'error', 'message': 'Annotator not found in Annotators table.'})

            # Then, delete from the User model
            user = User.objects.filter(username=username).first()
            if user:
                user.delete()
            else:
                return JsonResponse({'status': 'error', 'message': 'User not found in auth system.'})

            return JsonResponse({'status': 'success', 'message': f'Annotator "{username}" removed successfully.'})
        
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

    return JsonResponse({'status': 'error', 'message': 'Invalid request method.'})


@csrf_exempt
def submit_file(request):
    if request.method == 'POST':
        print("hit")
        # Parse the filename from the POST request
        # body = json.loads(request.body)
        # filename = body.get('filename')
        
        data = json.loads(request.body)

        filename = data.get("filename", "default.xlsx")
        annotations = data.get("data", [])
        auto_ann = data.get("autotaglist",[])
        # try:
        #     response = requests.post(url_learn, json={'ann': annotations, 'autotaglist': auto_ann})
        #     if response.status_code == 200:
        #         print("success")
        #     else:
        #         print("fail")
        # except Exception as e:
        #     print("fail")
        ct = sum(1 for sentence in annotations for tag in sentence['annotations'].values() if tag != 'O')
        print("count non zero :",ct)
        username = request.user.username
        print("curr user",username)
        annotator = get_object_or_404(Annotators, username=username)
        print(annotator)
        category = data.get("domain", None)
        print("ann:",annotations,"\nautotaglist:",auto_ann,"\ndone")
        if(data.get("remainingData",{})):
            remaining_data = data.get("remainingData",{})
            print(remaining_data)
            sentence_list= []
            for sentence_number, sentence_data in remaining_data.items():
                words = [word_data["word"] for word_data in sentence_data["annotations"].values()]
                sentence_list.append(" ".join(words))
            remaining_text = ".\n".join(sentence_list)
            if category =="Gen":
                annotator.general_tagged_count += ct
                print("annotation count:",annotator.general_tagged_count)
                results_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files')
                os.makedirs(results_dir, exist_ok=True)
            elif category=="Med":
                annotator.medical_tagged_count += ct
                results_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files_med')
                os.makedirs(results_dir, exist_ok=True)
            else:
                annotator.financial_tagged_count += ct
                results_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files_fin')
                os.makedirs(results_dir, exist_ok=True)
            remaining_file_path = os.path.join(results_dir, f"{filename}_remaining.txt")

            with open(remaining_file_path, "w", encoding="utf-8") as file:
                file.write(remaining_text)
        if category =="Gen":
            annotator.general_tagged_count += ct
            results_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'results')
            os.makedirs(results_dir, exist_ok=True)
            file_path = os.path.join(results_dir, "annotations_gen.xlsx")
        elif category=="Med":
            annotator.medical_tagged_count += ct
            results_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'results')
            os.makedirs(results_dir, exist_ok=True)
            file_path = os.path.join(results_dir, "annotations_med.xlsx")
        else:
            annotator.financial_tagged_count += ct
            results_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'results')
            os.makedirs(results_dir, exist_ok=True)
            file_path = os.path.join(results_dir, "annotations_fin.xlsx")
        annotator.save()
        

        # Convert annotations to DataFrame
        records = []
        for sentence in annotations:
            print(sentence)
            sentence_number = sentence.get("sentence_number", "")
            for word_data,tags in sentence.get("annotations", {}).items():
                print(word_data)
                records.append({
                    "Sentence Number": sentence_number,
                    "Word": word_data[0:],
                    "Tag": tags[0:]
                })

        df = pd.DataFrame(records)

        # Append or create the file
        print("the file path",file_path)
        if os.path.exists(file_path):
            print("true it exits")
            existing_df = pd.read_excel(file_path)
            df = pd.concat([existing_df, df], ignore_index=True)
            print("concat done successfully")

        df.to_excel(file_path, index=False)

        if not filename:
            return JsonResponse({"status": "error", "message": "Filename is required."})

        # Path to the picked files JSON
        if category == "Gen":
            picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files.json')
        elif category =="Med":
            picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files_med.json')

        # Ensure the JSON file exists
        if not os.path.exists(picked_files_path):
            with open(picked_files_path, 'w') as f:
                json.dump({}, f)

        # Load the picked files list
        with open(picked_files_path, 'r') as f:
            picked_files = json.load(f)

        # Add the filename if not already present
        if filename not in picked_files:
            # picked_files.append(filename)
            picked_files[filename] = {
                "picked_at": datetime.now(timezone.utc).isoformat(),
                "permanent":True
            }
            
        else:
            picked_files[filename] = {
                "picked_at": datetime.now(timezone.utc).isoformat(),
                "permanent":True
            }
        with open(picked_files_path, 'w') as f:
                json.dump(picked_files, f)
        return JsonResponse({"status": "success", "message": f"File '{filename}' has been submitted."})

    return JsonResponse({"status": "error", "message": "Invalid request method."})


PICKED_FILE_PATH = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files.json')
PICKED_FILE_PATH_MED = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files_med.json')

@csrf_exempt
def heartbeat(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            current_file = data.get("current_file")
            category = data.get("category")
            print("heartbeat:",current_file,category)
            if not current_file or not category:
                return JsonResponse({"error": "Missing file name or category"}, status=400)
            if category == "Gen":
                if not os.path.exists(PICKED_FILE_PATH):
                    return JsonResponse({"error": "Picked file list not found"}, status=500)

                with open(PICKED_FILE_PATH, "r+") as f:
                    picked_files = json.load(f)

                    if current_file in picked_files:
                        picked_files[current_file]["picked_at"] = datetime.now(timezone.utc).isoformat()

                        f.seek(0)
                        f.truncate()
                        json.dump(picked_files, f, indent=2)

                return JsonResponse({"status": "alive"})
            elif category == "Med":
                if not os.path.exists(PICKED_FILE_PATH):
                    return JsonResponse({"error": "Picked file list not found"}, status=500)

                with open(PICKED_FILE_PATH, "r+") as f:
                    picked_data = json.load(f)
                    picked_files = picked_data.get("picked_files", {})

                    if current_file in picked_files:
                        picked_files[current_file]["picked_at"] = datetime.now(timezone.utc).isoformat()

                        f.seek(0)
                        f.truncate()
                        json.dump(picked_files, f, indent=2)

                return JsonResponse({"status": "alive"})
            else:
                return JsonResponse({"error": "category not found"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)


def get_paragraph(request):
    selected_domain = request.GET.get("selectedDomain", "default")  # Get from query params
    print("Selected Domain:", selected_domain)  # Debugging
    # Define the path to the text files directory
    if selected_domain=="Gen":
        text_files_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files')
        picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files.json')
    elif selected_domain == "Med":
        text_files_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files_med')
        picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files_med.json')
    else:
        text_files_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files_fin')
        picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files_fin.json')
    print(text_files_dir,picked_files_path)
    
    # Define the path for the JSON file to track picked files
    

    # If the JSON file doesn't exist, create it with an empty list
    if not os.path.exists(picked_files_path):
        with open(picked_files_path, 'w') as f:
            json.dump({}, f)

    # Load the list of picked files
    with open(picked_files_path, 'r') as f:
        picked_data = json.load(f)
        picked_files = set(picked_data.keys())
    print("here are the keys:",picked_files)

    # List all text files in the directory
    all_text_files = [f for f in os.listdir(text_files_dir) if f.endswith('.txt')]

    # Find the remaining files that have not been picked yet
    remaining_files = [f for f in all_text_files if f not in picked_files]

    # Handle case when there are no remaining files
    if not remaining_files:
        return JsonResponse({"status": "error", "message": "All text files have been picked."})

    # Pick the next file (no sorting, just the first unpicked file in the list)
    next_file = remaining_files[0]
    file_path = os.path.join(text_files_dir, next_file)

    # Read the content of the picked file
    with open(file_path, 'r') as file:
        content = file.read()
    print(content)
    payload = {"paragraph": content}

    # Add the filename if not already present
    if next_file not in picked_data:
        # picked_files.append(filename)
        picked_data[next_file] = {
            "picked_at": datetime.now(timezone.utc).isoformat(),
            "permanent":False
        }
    with open(picked_files_path, 'w') as f:
        json.dump(picked_data, f)
    # Send the POST request
    response = requests.post(url, json=payload)
    
    # Print the response
    if response.status_code == 200:
        print(response.json())  # This will contain the allTagData output
    else:
        print("Error:", response.status_code, response.text)
    print("here")
    return JsonResponse({"status": "success", "paragraph": content, "filename": next_file,"taglist":response.json()})

@csrf_exempt
def auto_tag(request):
     if request.method == 'POST':
        print("hit auto tag")
        
        data = json.loads(request.body)
        txttotag = data.get("texttotag", "")
        print(txttotag)
        payload = {"paragraph": txttotag}

        # Send the POST request
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print(response.json())  # This will contain the allTagData output
        else:
            print("Error:", response.status_code, response.text)
        return JsonResponse({"status": "success", "paragraph": txttotag,"taglist":response.json()})

def skip_file(request):
    # Ensure session variable exists
    if 'skipped_files' not in request.session:
        request.session['skipped_files'] = []
    selected_domain = request.GET.get('selectedDomain', None)
    # Path to text files and picked files JSON
    if selected_domain=="Gen":
        text_files_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files')
        picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files.json')
    elif selected_domain=="Med":
        text_files_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files_med')
        picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files_med.json')
    else:
        text_files_dir = os.path.join(settings.BASE_DIR, 'tagproject', 'text_files_fin')
        picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files_fin.json')

    # Ensure the picked files JSON exists
    if not os.path.exists(picked_files_path):
        with open(picked_files_path, 'w') as f:
            json.dump({}, f)

    # Load the picked files list
    with open(picked_files_path, 'r') as f:
        picked_data = json.load(f)
        picked_files = picked_data.keys()

    # Parse the current filename from the frontend
    current_file = request.GET.get('currentFileName', None)
    if current_file in picked_data:
        del picked_data[current_file]

    if current_file and current_file not in request.session['skipped_files']:
        request.session['skipped_files'].append(current_file)
        request.session.modified = True

    # List all text files in the directory
    all_text_files = [f for f in os.listdir(text_files_dir) if f.endswith('.txt')]

    # Find files not yet picked or skipped
    remaining_files = [f for f in all_text_files if f not in picked_files and f not in request.session['skipped_files']]

    # Handle case when no files are left
    if not remaining_files:
        request.session['skipped_files'] = []  # Clear session variable
        request.session.modified = True
        return JsonResponse({"status": "error", "message": "Last file reached."})


    # Pick the next file
    next_file = remaining_files[0]
    file_path = os.path.join(text_files_dir, next_file)
    # Add the filename if not already present
    if next_file not in picked_data:
        # picked_files.append(filename)
        picked_data[next_file] = {
            "picked_at": datetime.now(timezone.utc).isoformat(),
            "permanent":False
        }
    with open(picked_files_path, 'w') as f:
        json.dump(picked_data, f)
    # Read the content of the next file
    with open(file_path, 'r') as file:
        content = file.read()

    payload = {"paragraph": content}

    # Send the POST request
    response = requests.post(url, json=payload)
    
    # Print the response
    if response.status_code == 200:
        print(response.json())  # This will contain the allTagData output
    else:
        print("Error:", response.status_code, response.text)
    print("here")
    return JsonResponse({"status": "success", "paragraph": content, "filename": next_file,"taglist":response.json()})

def reset_picked_files(request):
    picked_files_path = os.path.join(settings.BASE_DIR, 'tagproject', 'picked_files.json')

    try:
        print(f"Attempting to reset the file at {picked_files_path}")  # Debugging line
        with open(picked_files_path, 'w') as f:
            json.dump({}, f)

        return JsonResponse({"status": "success", "message": "Picked files list has been reset."})
    
    except Exception as e:
        print(f"Error resetting picked files: {str(e)}")  # Debugging line
        return JsonResponse({"status": "error", "message": str(e)})

def login_page(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            print(f"User {user.username} authenticated successfully.")

            # Check if the user is an admin (Django built-in system)
            if user.is_staff or user.is_superuser:
                print("Redirecting to admin home")
                return redirect("/adminhome")

            # Otherwise, redirect to user home
            print("Redirecting to user home")
            return redirect("/selection")

        else:
            print("Invalid credentials")
            return render(request, "registration/login.html", {"msg": "Invalid username or password"})

    return render(request, "registration/login.html")

def logout_view(request):
    logout(request)
    return redirect("/")  


 # Ensure directory exists

@csrf_exempt
def upload_file(request):
    if request.method == 'POST':
        print("checking",request.FILES.get('file'))
        uploaded_file = request.FILES['file']
        if not uploaded_file.name.endswith('.txt'):
            return JsonResponse({})
        category = request.POST.get('category', 'text_files')

        print("This is the category from frontend:", category)

        upload_dir = os.path.join(settings.BASE_DIR, 'tagproject', category)
        os.makedirs(upload_dir, exist_ok=True)

        file_path = os.path.join(upload_dir, uploaded_file.name)

        with default_storage.open(file_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        return JsonResponse({'status': 'success', 'message': 'File uploaded successfully!'})

    # If we get here, it means file was not received
    return JsonResponse({'status': 'error', 'message': 'No file provided!'}, status=400)

RESULTS_DIR = os.path.join(settings.BASE_DIR,'output')
UPLOAD_DIR = os.path.join(settings.BASE_DIR, 'tagproject','text_files')
def list_result_files(request):
    if request.method == 'GET':
        try:
            files = [f for f in os.listdir(RESULTS_DIR) if f.endswith('.xlsx')]
            print(files)
            return JsonResponse({'files': files})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})
        
TEXT_FILES_DIR = os.path.join(settings.BASE_DIR, 'tagproject','text_files')
TEXT_FILES_FIN_DIR = os.path.join(settings.BASE_DIR, 'tagproject','text_files_fin')
TEXT_FILES_MED_DIR = os.path.join(settings.BASE_DIR, 'tagproject','text_files_med')

def list_uploaded_files(request):
    if request.method == 'GET':
        try:
            text_files = [f for f in os.listdir(TEXT_FILES_DIR) if f.endswith('.txt')]
            text_files_fin = [f for f in os.listdir(TEXT_FILES_FIN_DIR) if f.endswith('.txt')]
            text_files_med = [f for f in os.listdir(TEXT_FILES_MED_DIR) if f.endswith('.txt')]

            print("Text files:", text_files)
            print("Text files FIN:", text_files_fin)
            print("Text files MED:", text_files_med)

            return JsonResponse({
                'text_files': text_files,
                'text_files_fin': text_files_fin,
                'text_files_med': text_files_med
            })

        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)})

def download_result_file(request):
    filename = request.GET.get('filename')
    if not filename:
        return HttpResponseBadRequest('Missing filename')

    file_path = os.path.join(RESULTS_DIR, filename)
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'), as_attachment=True)
    else:
        return JsonResponse({'status': 'error', 'message': 'File not found'})

@csrf_exempt
def delete_result_file(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        filename = data.get('filename')
        if not filename:
            return JsonResponse({'status': 'error', 'message': 'Filename is required'})

        file_path = os.path.join(RESULTS_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return JsonResponse({'status': 'success', 'message': 'File deleted successfully'})
        else:
            return JsonResponse({'status': 'error', 'message': 'File not found'})

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

@csrf_exempt
def delete_upload_file(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        filename = data.get('filename')
        folder_path = data.get('folder')
        print(folder_path)
        if not filename:
            return JsonResponse({'status': 'error', 'message': 'Filename is required'})
        UPLOAD_DIR = os.path.join(settings.BASE_DIR, 'tagproject',folder_path)
        file_path = os.path.join(UPLOAD_DIR, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return JsonResponse({'status': 'success', 'message': 'File deleted successfully'})
        else:
            return JsonResponse({'status': 'error', 'message': 'File not found'})

    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})

def users(request):
    users = Annotators.objects.all()
    return render(request, 'tags/users.html', {'users': users})

def tags(request):
    tag_manager = TagManager.get_instance()
    return render(request, 'tags/tagpage.html', {
        'tags': tag_manager.tags,
        'tags_med': tag_manager.tags_med,
        'tags_fin': tag_manager.tags_fin
    })

@login_required(login_url='')
def selection(request):
    return render(request, 'tags/selection.html')

# Add a new view for the validation page


# Update your views.py with these new view functions

@login_required(login_url='')
def validation(request):
    # This is the first validation page where users choose validation mode
    tag_manager = TagManager.get_instance()
    return render(request, 'tags/validation_domain.html')

@login_required(login_url='')
def validation_domain(request):
    """Render the validation domain selection page"""
    tag_manager = TagManager.get_instance()
    return render(request, 'tags/validation_domain.html')

@login_required(login_url='')
def validation_home(request):
    """
    Render the validation home page with tags based on selected domain.
    This page will automatically load data from domain-specific Excel files.
    """
    # Get the domain parameter from the query string
    domain = request.GET.get('domain', 'Gen')
    tag_manager = TagManager.get_instance()
    
    # Select tags based on domain
    if domain == 'Gen':
        tags = tag_manager.tags
        tags2 = tag_manager.tags_med  # For UI consistency with home page
    elif domain == 'Med':
        tags = tag_manager.tags_med
        tags2 = tag_manager.tags_med
    else:  # Financial domain
        tags = tag_manager.tags_fin if hasattr(tag_manager, 'tags_fin') else []
        tags2 = tag_manager.tags_med  # For UI consistency
    
    return render(request, 'tags/validation_home.html', {
        'tags': tags,
        'tags2': tags2,
        'domain': domain
    })

@login_required(login_url='')
def get_annotations(request):
    """
    Get annotations from the appropriate Excel file based on domain.
    Returns the annotations in a format suitable for the validation page.
    """
    domain = request.GET.get('domain', 'Gen')

    processed_file = os.path.join(settings.BASE_DIR, 'tagproject', f'processed_paragraphs_{domain.lower()}.json')
    processed_ids = []
    if os.path.exists(processed_file):
        try:
            with open(processed_file, 'r') as f:
                processed_ids = json.load(f)
        except:
            processed_ids = []
    
    # Map domain to filename
    filename_map = {
        'Gen': 'annotations_gen.xlsx',
        'Med': 'annotations_med.xlsx',
        'Fin': 'annotations_fin.xlsx'
    }
    
    filename = filename_map.get(domain, 'annotations.xlsx')
    file_path = os.path.join(settings.BASE_DIR, 'tagproject', 'results', filename)
    
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            return JsonResponse({
                'status': 'error',
                'message': f'Annotation file not found for {domain} domain'
            })
            
        # Read Excel file
        df = pd.read_excel(file_path)
        
        # Convert dataframe to list of annotations
        annotations = []
        
        # Assign paragraph IDs - FIXED LOGIC
        paragraph_ids = []
        current_para_id = 0
        last_sentence_num = None
        
        for _, row in df.iterrows():
            sentence_num = int(row['Sentence Number'])
            
            # Start a new paragraph when:
            # 1. We see sentence number 0 AND
            # 2. The previous sentence was NOT 0 AND NOT None (beginning of file)
            if sentence_num == 0 and last_sentence_num is not None and last_sentence_num != 0:
                current_para_id += 1
                
            paragraph_ids.append(current_para_id)
            last_sentence_num = sentence_num
            
        # Add paragraph ID to dataframe
        df['paragraph_id'] = paragraph_ids
        
        # Group by paragraph_id and sentence_number
        groups = df.groupby(['paragraph_id', 'Sentence Number'])
        
        # Process each group (each sentence)
        for (para_id, sentence_number), group in groups:
            sentence_annotations = {}
            
            # Process each word in the sentence
            for i, (_, row) in enumerate(group.iterrows()):
                word = str(row['Word'])
                tag = str(row['Tag'])
                
                # Add word to the sentence's annotations
                sentence_annotations[i] = {
                    'word': word,
                    'tag': tag
                }
                
            # Create annotation object
            annotations.append({
                'paragraph_id': int(para_id),
                'sentence_number': int(sentence_number),
                'annotations': sentence_annotations
            })
        filtered_annotations = [a for a in annotations if a['paragraph_id'] not in processed_ids]    
        
        return JsonResponse({
            'status': 'success',
            'annotations': filtered_annotations,
            'filename': filename
        })
    
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': str(e)
        })

@csrf_exempt
@login_required(login_url='')
def submit_validation(request):
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Only POST method is allowed'})

    try:
        # Parse the JSON data
        data = json.loads(request.body)
        domain = data.get('domain', 'Gen')
        annotations = data.get('annotations', [])
        is_valid = data.get('isValid', True)  # Default to valid if not specified
        processed_paragraphs = data.get('processed_paragraphs', [])


        if processed_paragraphs:
            store_processed_paragraphs(domain, processed_paragraphs)

        if len(annotations) == 0:
            return JsonResponse({'status': 'error', 'message': 'No annotations provided'})
        
        # Mark these annotations as processed so they don't appear in future validations
        # This would depend on your annotation storage system
        # Assume we have a function to mark annotations as processed
        mark_annotations_as_processed(annotations)
        
        if is_valid:
            # Handle valid annotations - save to Excel
            output_filename = data.get('filename', 'final_gen.xlsx')
            if domain == 'Gen':
                output_path = os.path.join(settings.BASE_DIR, 'output', output_filename)
            elif domain == 'Med':
                output_path = os.path.join(settings.BASE_DIR, 'output', 'final_med.xlsx')
            elif domain == 'Fin':
                output_path = os.path.join(settings.BASE_DIR, 'output', 'final_fin.xlsx')
            
            # Create output directory if it doesn't exist
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Save annotations to Excel file (append if exists)
            save_annotations_to_excel(annotations, output_path)
            
            # Update annotator statistics
            try:
                user = request.user
                annotator = user.annotator
                if domain == "Gen":
                    annotator.general_validated_count = annotator.general_validated_count + 1 if hasattr(annotator, 'general_validated_count') else 1
                elif domain == "Med":
                    annotator.medical_validated_count = annotator.medical_validated_count + 1 if hasattr(annotator, 'medical_validated_count') else 1
                elif domain == "Fin":
                    annotator.financial_validated_count = annotator.financial_validated_count + 1 if hasattr(annotator, 'financial_validated_count') else 1
                annotator.save()
            except Exception as e:
                print(f"Could not update annotator statistics: {str(e)}")
            
            return JsonResponse({
                'status': 'success',
                'message': f'Validation saved successfully to {output_filename}'
            })
        else:
            # Handle invalid annotations - save to text file
            text_folder = ""
            if domain == "Gen":
                text_folder = os.path.join(settings.BASE_DIR,'tagproject', 'text_files')
            elif domain == "Med":
                text_folder = os.path.join(settings.BASE_DIR, '..', 'tagproject', 'text_files_med')
            elif domain == "Fin":
                text_folder = os.path.join(settings.BASE_DIR, '..', 'tagproject', 'text_files_fin')
            
            # Create directory if it doesn't exist
            os.makedirs(text_folder, exist_ok=True)
            
            # Generate a unique filename based on timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            text_file = os.path.join(text_folder, f"invalid_{timestamp}.txt")
            
            # Write paragraph content to text file
            with open(text_file, 'w', encoding='utf-8') as f:
                
                
                for annotation in annotations:
                
                    
                    sorted_words = []
                    for word_idx in sorted(annotation['annotations'].keys(), key=int):
                        sorted_words.append(annotation['annotations'][word_idx]['word'])
                    
                    paragraph_text = ' '.join(sorted_words)
                    # Clean up extra spaces around punctuation
                    paragraph_text = re.sub(r'\s+([,.!?;:])', r'\1', paragraph_text)
                    
                    f.write(f"{paragraph_text}\n")
            
            return JsonResponse({
                'status': 'success',
                'message': f'Invalid annotation saved to text file'
            })
            
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        return JsonResponse({
            'status': 'error',
            'message': f'Error saving validation: {str(e)}'
        })

def store_processed_paragraphs(domain, paragraph_ids):
    """Store processed paragraph IDs in a JSON file to prevent them from showing again"""
    processed_file = os.path.join(settings.BASE_DIR, 'tagproject', f'processed_paragraphs_{domain.lower()}.json')
    
    # Load existing processed IDs
    existing_ids = []
    if os.path.exists(processed_file):
        try:
            with open(processed_file, 'r') as f:
                existing_ids = json.load(f)
        except:
            existing_ids = []
    
    # Add new IDs
    existing_ids.extend(paragraph_ids)
    # Remove duplicates
    existing_ids = list(set(existing_ids))
    
    # Save back to file
    with open(processed_file, 'w') as f:
        json.dump(existing_ids, f)

# Helper function to mark annotations as processed
def mark_annotations_as_processed(annotations):
    """
    Mark annotations as processed so they don't appear in future validations.
    This function needs to be implemented based on your data storage system.
    """
    # Example implementation - would need to be adjusted for your specific database setup
    annotation_ids = [ann.get('id') for ann in annotations if 'id' in ann]
    if annotation_ids:
        # Assuming you have a model called Annotation with a "processed" field
        # Annotation.objects.filter(id__in=annotation_ids).update(processed=True)
        pass  # Replace with actual implementation

# Helper function to save annotations to Excel
def save_annotations_to_excel(annotations, output_path):
    """
    Save annotations to an Excel file.
    If the file exists, append the new annotations.
    """
    # First check if file exists and load existing data if it does
    existing_data = []
    try:
        if os.path.exists(output_path):
            # Read existing data
            df = pd.read_excel(output_path)
            existing_data = df.to_dict('records')
    except Exception as e:
        print(f"Error reading existing Excel file: {str(e)}")
    
    # Prepare data for Excel export
    excel_data = []
    
    for annotation in annotations:
        paragraph_id = annotation.get('paragraph_id', '')
        sentence_number = annotation.get('sentence_number', '')
        
        # Process each word in the annotation
        for word_idx, word_data in annotation.get('annotations', {}).items():
            word = word_data.get('word', '')
            tag = word_data.get('tag', 'O')
            
            excel_data.append({
                'paragraph_id': paragraph_id,
                'sentence_number': sentence_number,
                'word_index': word_idx,
                'word': word,
                'tag': tag
            })
    
    # Combine with existing data
    all_data = existing_data + excel_data
    
    # Convert to DataFrame and save
    df = pd.DataFrame(all_data)
    df.to_excel(output_path, index=False)

@login_required(login_url='')
def skip_annotation(request):
    """
    Skip to another annotation set if available.
    Similar to skip_file but for validation mode.
    """
    domain = request.GET.get('domain', 'Gen')
    current_index = request.GET.get('current', 0)
    
    # For now, just return the same annotations but starting from a different point
    # You could implement more sophisticated logic here if needed
    
    # This simply reuses the get_annotations function
    return get_annotations(request)