# Generated by Django 4.2.4 on 2023-08-23 20:02

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0004_rename_name_task_taskname"),
    ]

    operations = [
        migrations.AddField(
            model_name="task",
            name="is_current",
            field=models.BooleanField(default=False),
        ),
    ]