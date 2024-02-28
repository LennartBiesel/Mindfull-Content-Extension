# Generated by Django 4.2.2 on 2024-02-25 14:09

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('tasks', '0007_delete_notioncredentials'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotionCredentials',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('access_token', models.CharField(max_length=255)),
                ('database_id', models.CharField(max_length=255)),
                ('is_connected_to_notion', models.BooleanField(default=False)),
                ('is_connected_to_notion_database', models.BooleanField(default=False)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]