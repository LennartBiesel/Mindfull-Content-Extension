# Generated by Django 4.2.4 on 2023-08-30 12:18

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("tasks", "0006_notioncredentials"),
    ]

    operations = [
        migrations.DeleteModel(
            name="NotionCredentials",
        ),
    ]
