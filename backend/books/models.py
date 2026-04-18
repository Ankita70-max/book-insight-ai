from django.db import models


class Book(models.Model):
    title = models.CharField(max_length=500)
    author = models.CharField(max_length=300, blank=True, default='')
    description = models.TextField(blank=True, default='')
    rating = models.FloatField(null=True, blank=True)
    rating_count = models.IntegerField(default=0)
    genre = models.CharField(max_length=200, blank=True, default='')
    cover_image_url = models.URLField(max_length=1000, blank=True, default='')
    book_url = models.URLField(max_length=1000, blank=True, default='')
    reviews = models.TextField(blank=True, default='')
    is_available = models.BooleanField(default=True)
    source = models.CharField(max_length=100, default='goodreads')
    chroma_indexed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'books'

    def __str__(self):
        return f"{self.title} by {self.author}"


class QueryLog(models.Model):
    question = models.TextField()
    answer = models.TextField()
    book = models.ForeignKey(Book, null=True, blank=True, on_delete=models.SET_NULL)
    sources_used = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'query_logs'

    def __str__(self):
        return f"Q: {self.question[:80]}"
