from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def root_view(request):
    return JsonResponse({
        "message": "📚 BookInsight AI Backend is running!",
        "status": "ok",
        "endpoints": {
            "books_list": "/api/books/",
            "book_detail": "/api/books/<id>/",
            "recommendations": "/api/books/<id>/recommend/",
            "genres": "/api/genres/",
            "stats": "/api/stats/",
            "upload_book": "/api/books/upload/",
            "scrape": "/api/scrape/",
            "index_books": "/api/books/index/",
            "rag_query": "/api/query/",
            "query_history": "/api/query/history/",
            "insights": "/api/books/<id>/insights/",
            "admin": "/admin/",
        }
    })


urlpatterns = [
    path('', root_view),
    path('admin/', admin.site.urls),
    path('api/', include('books.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
