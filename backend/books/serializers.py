from rest_framework import serializers
from .models import Book, QueryLog


class BookSerializer(serializers.ModelSerializer):
    class Meta:
        model = Book
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'chroma_indexed']


class BookListSerializer(serializers.ModelSerializer):
    """Lighter serializer for list views"""
    class Meta:
        model = Book
        fields = [
            'id', 'title', 'author', 'description', 'rating',
            'rating_count', 'genre', 'cover_image_url', 'book_url', 'source'
        ]


class BookUploadSerializer(serializers.Serializer):
    """For uploading/processing a book URL"""
    url = serializers.URLField(required=False)
    title = serializers.CharField(required=False, max_length=500)
    author = serializers.CharField(required=False, max_length=300)
    description = serializers.CharField(required=False)
    genre = serializers.CharField(required=False, max_length=200)
    cover_image_url = serializers.URLField(required=False)
    book_url = serializers.URLField(required=False)
    rating = serializers.FloatField(required=False)


class RAGQuerySerializer(serializers.Serializer):
    question = serializers.CharField(max_length=1000)
    book_id = serializers.IntegerField(required=False)
    top_k = serializers.IntegerField(default=5, min_value=1, max_value=20)


class QueryLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryLog
        fields = '__all__'
