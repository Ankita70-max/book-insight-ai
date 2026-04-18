from django.urls import path
from . import views

urlpatterns = [
    # Specific string paths FIRST
    path('books/upload/', views.BookUploadView.as_view(), name='book-upload'),
    path('books/index/', views.IndexBooksView.as_view(), name='index-books'),

    # Parameterized paths
    path('books/<int:pk>/insights/', views.AIInsightView.as_view(), name='book-insights'),
    path('books/<int:book_id>/recommend/', views.recommend_books, name='book-recommend'),
    path('books/<int:pk>/delete/', views.BookDeleteView.as_view(), name='book-delete'),
    path('books/<int:pk>/', views.BookDetailView.as_view(), name='book-detail'),

    # List
    path('books/', views.BookListView.as_view(), name='book-list'),

    # Other
    path('scrape/', views.ScrapeView.as_view(), name='scrape'),
    path('query/history/', views.QueryHistoryView.as_view(), name='query-history'),
    path('query/', views.RAGQueryView.as_view(), name='rag-query'),
    path('genres/', views.get_genres, name='genres'),
    path('stats/', views.get_stats, name='stats'),
    path('debug/', views.debug_index, name='debug'),
]
