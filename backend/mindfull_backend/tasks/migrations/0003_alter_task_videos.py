# Generated by Django 4.2.4 on 2023-08-21 09:27

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0002_video_rename_is_done_task_done_task_videos"),
    ]

    operations = [
        migrations.AlterField(
            model_name="task",
            name="videos",
            field=models.ManyToManyField(blank=True, to="tasks.video"),
        ),
    ]
