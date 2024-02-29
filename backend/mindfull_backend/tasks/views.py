from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import BasePermission, IsAuthenticated
from django.shortcuts import get_object_or_404
import requests
from .models import Video, NotionCredentials, Task
from .serializers import VideoSerializer, TaskSerializer
import base64
from django.http import JsonResponse
from django.views import View
from django.shortcuts import redirect
from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from oauthlib.oauth2 import WebApplicationClient
from notion_client import Client
import secrets
import re
from urllib.parse import urlparse
import csv
authorization_base_url = settings.NOTION_AUTHORIZATION_BASE_URL
token_url = settings.NOTION_TOKEN_URL
state = secrets.token_hex(16)



def convert_duration(duration):
    minutes = 0
    seconds = 0

    # Find all minute and second values
    mins_match = re.search(r'(\d+)M', duration)
    secs_match = re.search(r'(\d+)S', duration)

    if mins_match:
        minutes = int(mins_match.group(1))
    
    if secs_match:
        seconds = int(secs_match.group(1))
    
    # Convert everything to minutes
    total_minutes = minutes + (seconds / 60)
    
    return round(total_minutes, 2)  # Round to 2 decimal places


def extract_video_id_from_url(url):
    video_id = re.search(r'(?<=v=)[^&#]+', url)
    video_id = video_id.group() if video_id else None
    return video_id

class IsTaskOwner(BasePermission):
    """
    Custom permission to only allow owners of an object to edit it.
    """
    def has_object_permission(self, request, view, obj):
        # Only allow the owner of the task to update it
        return obj.user == request.user



# Notion Auth SetUp

# checks the status of the notion connection 
# class NotionConnectionStatusView(APIView):
#     permission_classes = [IsAuthenticated]

#     def get(self, request, *args, **kwargs):
#         try:
#             notion_credentials = NotionCredentials.objects.get(user=request.user)
#             print(request.user, "is auth")
#             return Response({
#                 "is_connected_to_notion": notion_credentials.is_connected_to_notion,
#                 "is_connected_to_notion_database": notion_credentials.is_connected_to_notion_database
#             })
#         except NotionCredentials.DoesNotExist:
#             print(request.user, "is not auth")
#             return Response({
#                 "is_connected_to_notion": False,
#                 "is_connected_to_notion_database": False
#             })


#the notion request redirect Url 
# class NotionAuthRedirectView(View):
    
#     def get(self, request):
#         print(f"Session data: {request.session.items()}")
#         code = request.GET.get('code')
#         if code:
#             # Exchange the authorization code for an access token
            
#             access_token = self.exchange_code_for_token(code)
#             if access_token:
#                 # Redirect the user to Google
#                 print("for user", request.user)
#                 self.save_notion_credentials(request.user, access_token)
#                 return redirect('https://www.notion.so')
#         # Handle error case or redirect to a failure page
#         return redirect('http://localhost:8000/failure')



#     def exchange_code_for_token(self, code):
#         token_url = 'https://api.notion.com/v1/oauth/token'
#         client_id = settings.NOTION_CLIENT_ID
#         client_secret = settings.NOTION_CLIENT_SECRET
#         redirect_uri = 'http://localhost:8000/api/notion/redirect/'

#         # Prepare Basic Authentication Header
#         basic_auth_string = f"{client_id}:{client_secret}"
#         basic_auth_encoded = base64.b64encode(basic_auth_string.encode("utf-8")).decode("utf-8")
#         headers = {
#             "Authorization": f"Basic {basic_auth_encoded}",
#             "Content-Type": "application/json"
#         }

#         payload = {
#             'grant_type': 'authorization_code',
#             'code': code,
#             'redirect_uri': redirect_uri,
#         }

#         response = requests.post(token_url, json=payload, headers=headers)

#         if response.status_code == 200:
#             data = response.json()
#             print(data)
#             print("Acces token ",data.get('access_token'))
#             print("Database Id ",data.get('workspace_id'))
#             access_token = data.get('access_token')
#             return access_token

#         # Handle errors or log them for debugging purposes
#         print(f"Failed to exchange code for token. Status: {response.status_code}. Response: {response.text}")

#         return None

#     def save_notion_credentials(self, user, access_token):
#         print(f"User type: {type(user)}, User ID: {getattr(user, 'id', None)}")
#         if not user.is_authenticated:
#             print("User is not authenticated.")
#             return
#         NotionCredentials.objects.update_or_create(
#             user=user,
#             defaults={
#                 'access_token': access_token,
#                 'is_connected_to_notion': True
#             }
#         )
    
# View to handle submission of the Notion database link

# class SubmitDatabaseLinkView(APIView):
#     permission_classes = [IsAuthenticated]

#     def post(self, request):
#         database_link = request.data.get('database_link')
#         database_id = self.extract_database_id(database_link)
#         if database_id:
#             self.save_database_id(request.user, database_id)
#             return Response({'message': 'Database ID saved successfully'}, status=200)
#         return Response({'error': 'Failed to extract database ID'}, status=400)

#     def extract_database_id(self, link):
#         try:
#             path = urlparse(link).path
#             match = re.search(r'([a-f0-9]{32})', path)
#             if match:
#                 return match.group(1)
#         except Exception as e:
#             print(f"Error extracting database ID: {e}")
#         return None

#     def save_database_id(self, user, database_id):
#         # Save the database ID to the user's NotionCredentials
#         notion_credentials, created = NotionCredentials.objects.get_or_create(user=user)
#         notion_credentials.database_id = database_id
#         notion_credentials.is_connected_to_notion_database = True
#         notion_credentials.save()

class ExportNotesCSVView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        print(request.user)
        # Create the HttpResponse object with the appropriate CSV header.
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="notes.csv"'

        writer = csv.writer(response)
        writer.writerow(['Task Name', 'Video Name', 'URL', 'Video Creator', 'Notes'])  # Header

        # Fetch tasks associated with the user and then videos linked to these tasks
        tasks = Task.objects.filter(user=request.user).prefetch_related('videos')
        for task in tasks:
            print(f"Task: {task.taskName}, Videos: {task.videos.count()}")  # Debugging print
            for video in task.videos.all():
                writer.writerow([task.taskName, video.name, video.link, video.creator, video.notes])

        return response


class TaskCreateView(APIView):
    permission_classes = [IsAuthenticated, IsTaskOwner]

    def post(self, request):
        data = request.data.copy()  # create a mutable copy of the data
        data['user'] = request.user.id
        if 'videos' not in data:
            data['videos'] = []
        serializer = TaskSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SaveVideoNotesView(APIView):
    permission_classes = [IsAuthenticated]

    def add_video_to_notion(self, user, video_name, video_link, video_creator, notes):
        try:
            notion_credentials = NotionCredentials.objects.get(user=user)
        except NotionCredentials.DoesNotExist:
            print("Notion credentials not found for user.")
            return

        url = "https://api.notion.com/v1/pages"
        headers = {
            "Authorization": f"Bearer {notion_credentials.access_token}",
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        }

        data = {
            "parent": {"database_id": notion_credentials.database_id},
            "properties": {
                "Name": {
                    "title": [
                        {
                            "text": {
                                "content": video_name
                            }
                        }
                    ]
                },
                "Content Type": {
                    "select": {
                        "name": "Video"
                    }
                },
                "URL": {
                    "url": video_link
                },
                "Author": {
                    "rich_text": [
                        {
                            "text": {
                                "content": video_creator
                            }
                        }
                    ]
                }
            },
            "children": [
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [
                            {
                                "type": "text",
                                "text": {
                                    "content": notes
                                }
                            }
                        ]
                    }
                }
            ]
        }

        response = requests.post(url, headers=headers, json=data)
        if response.status_code != 200:
            print(f"Failed to add video to Notion. Error: {response.text}")

    def post(self, request):
        notes = request.data.get('notes')
        url = request.data.get('link')
        video_id = extract_video_id_from_url(url)
        print(request.data, video_id,'the video creation is called')

        if not video_id:
            return Response({'error': 'Invalid video URL'}, status=status.HTTP_400_BAD_REQUEST)

        # Use YouTube API to fetch video details
        print(f"Video ID: {video_id}")

        API_KEY = 'AIzaSyBBA-Ya5usZmqrMOe2fixrMolhBX7Fektg'
        API_ENDPOINT = f"https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={API_KEY}&part=snippet,contentDetails"

        
        print("About to make the API call")
        print(f"API_ENDPOINT: {API_ENDPOINT}")
    
        response = requests.get(API_ENDPOINT)

        data = response.json()

        print(data)

        if not data.get('items'):
            return Response({'error': 'Failed to fetch video details'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        if data.get('items'):
            print('youtube api works')

        video_data = data['items'][0]
        video_name = video_data['snippet']['title']
        video_creator = video_data['snippet']['channelTitle']
        video_length_iso = video_data['contentDetails']['duration']
        video_length = convert_duration(video_length_iso)

        # Save to your Video model
        new_video = Video.objects.create(
            name=video_name,
            length=video_length,
            creator=video_creator,
            link=url,
            notes=notes
        )

        taskName = request.data.get('taskName')
        task = get_object_or_404(Task, taskName=taskName)

        # Link the video to the task
        task.videos.add(new_video)

        # Increment videos_watched and save.
        task.videos_watched += 1
        task.save()

        return Response({'message': 'Video notes saved successfully'}, status=status.HTTP_201_CREATED)


class SetCurrentTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, task_id):
        # First, unset the current task for this user (if any)
        tasks = Task.objects.filter(user=request.user, is_current=True)
        for task in tasks:
            task.is_current = False
            task.save()

        # Now, set the new task as current
        task = get_object_or_404(Task, id=task_id, user=request.user)
        print(task.taskName)
        task.is_current = True
        task.save()

        serializer = TaskSerializer(task)
        response_data = {
        "message": "Task set as current successfully",
        "task_data": serializer.data
        }
        return Response(response_data, status=status.HTTP_200_OK)

class GetCurrentTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        print('current task is called')
        try:
            # Get the current task for the authenticated user
            task = Task.objects.filter(user=request.user, is_current=True).latest('id')
            print(task.taskName)
            serializer = TaskSerializer(task)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Task.DoesNotExist:
            return Response({"message": "No current task found for this user."}, status=status.HTTP_404_NOT_FOUND)


class UpdateTaskView(APIView):
    permission_classes = [IsAuthenticated, IsTaskOwner]

    def get_object(self, task_id):
        try:
            task = Task.objects.get(pk=task_id)
            self.check_object_permissions(self.request, task)
            return task
        except Task.DoesNotExist:
            raise Http404

    def patch(self, request, task_id):
        task = self.get_object(task_id)
        
        serializer = TaskSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Task status updated successfully"}, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserTasksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tasks = Task.objects.filter(user=request.user)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)
