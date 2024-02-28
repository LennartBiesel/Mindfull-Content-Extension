from django.contrib import admin
from .models import Task, Video, NotionCredentials

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'taskName', 'user', 'done', 'videos_watched')
    list_filter = ('user', 'done')
    search_fields = ('taskName', 'user__username')

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'creator', 'length')
    search_fields = ('name', 'creator')

@admin.register(NotionCredentials)
class NotionCredentials(admin.ModelAdmin):
    list_display = ('id','user',"access_token","database_id","is_connected_to_notion","is_connected_to_notion_database")