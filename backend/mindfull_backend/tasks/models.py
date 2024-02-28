from django.db import models
from django.contrib.auth.models import User

class NotionCredentials(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    access_token = models.CharField(max_length=255)
    database_id = models.CharField(max_length=255)
    is_connected_to_notion = models.BooleanField(default=False)
    is_connected_to_notion_database = models.BooleanField(default=False)

class Video(models.Model):
    name = models.CharField(max_length=255)
    length = models.FloatField()
    creator = models.CharField(max_length=255)
    link = models.CharField(max_length=255)
    notes = models.TextField()

    def __str__(self):
        return self.name

class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    is_current = models.BooleanField(default=False)
    taskName = models.CharField(max_length=255)
    done = models.BooleanField(default=False)
    videos_watched = models.IntegerField(default=0)
    videos = models.ManyToManyField(Video, blank=True)

    def __str__(self):
        return self.taskName
