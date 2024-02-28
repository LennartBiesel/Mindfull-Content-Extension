from rest_framework import serializers
from .models import Task, Video

class VideoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Video
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    videos = serializers.PrimaryKeyRelatedField(queryset=Video.objects.all(), many=True, required=False)

    class Meta:
        model = Task
        fields = ['id', 'user', 'taskName', 'done', 'videos_watched', 'videos', 'is_current']

