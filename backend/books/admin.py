from django.contrib import admin
from .models import Book, QueryLog


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'genre', 'rating', 'chroma_indexed', 'source', 'created_at']
    list_filter = ['genre', 'chroma_indexed', 'source', 'is_available']
    search_fields = ['title', 'author', 'description']
    readonly_fields = ['chroma_indexed', 'created_at', 'updated_at']


@admin.register(QueryLog)
class QueryLogAdmin(admin.ModelAdmin):
    list_display = ['question', 'book', 'created_at']
    search_fields = ['question', 'answer']
    readonly_fields = ['created_at']
