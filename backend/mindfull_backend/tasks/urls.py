from django.urls import path
from .views import TaskCreateView, UserTasksView, UpdateTaskView, GetCurrentTaskView, SaveVideoNotesView, SetCurrentTaskView
# from .views import NotionAuthRedirectView, NotionConnectionStatusView, SubmitDatabaseLinkView  
from .views import ExportNotesCSVView
urlpatterns = [
    path('create-task/', TaskCreateView.as_view(), name='create_task'),
    path('user-tasks/', UserTasksView.as_view(), name='user_tasks'),
    path('update_task/<int:task_id>/', UpdateTaskView.as_view(), name='update_task'),
    path('current_task/', GetCurrentTaskView.as_view(), name='get-current-task'),
    path('save_video_notes/', SaveVideoNotesView.as_view(), name='save_video_details'),
    path('set_current_task/<int:task_id>/', SetCurrentTaskView.as_view(), name='set-current-task'),
    path('export-notes/', ExportNotesCSVView.as_view(), name='ExportNotesCSVView'),
    # path('notion/redirect/', NotionAuthRedirectView.as_view(), name='notion_redirect'),
    # path('notion-connection-status/', NotionConnectionStatusView.as_view(), name='notion_connection_status'),
    # path('submit_database_link', SubmitDatabaseLinkView.as_view(), name='submit_database_link'),
]
