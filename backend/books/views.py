import logging
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Book, QueryLog
from .serializers import (
    BookSerializer, BookListSerializer, BookUploadSerializer,
    RAGQuerySerializer, QueryLogSerializer
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
#  GET APIs
# ─────────────────────────────────────────────────────────────

class BookListView(generics.ListAPIView):
    """GET /api/books/"""
    serializer_class = BookListSerializer

    def get_queryset(self):
        qs = Book.objects.all()
        genre = self.request.query_params.get('genre')
        search = self.request.query_params.get('search')
        min_rating = self.request.query_params.get('min_rating')
        if genre:
            qs = qs.filter(genre__icontains=genre)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(author__icontains=search) |
                Q(description__icontains=search)
            )
        if min_rating:
            try:
                qs = qs.filter(rating__gte=float(min_rating))
            except ValueError:
                pass
        return qs


class BookDetailView(generics.RetrieveAPIView):
    """GET /api/books/<id>/"""
    queryset = Book.objects.all()
    serializer_class = BookSerializer


@api_view(['GET'])
def recommend_books(request, book_id):
    """GET /api/books/<id>/recommend/"""
    try:
        from .rag_service import get_recommendations
        recs = get_recommendations(book_id, top_k=6)
        return Response({'recommendations': recs, 'book_id': book_id})
    except Exception as e:
        logger.error(f"Recommendations error: {e}")
        return Response({'recommendations': [], 'book_id': book_id})


@api_view(['GET'])
def get_genres(request):
    """GET /api/genres/"""
    genres = (
        Book.objects.exclude(genre='')
        .values_list('genre', flat=True)
        .distinct()
        .order_by('genre')
    )
    return Response({'genres': list(genres)})


@api_view(['GET'])
def get_stats(request):
    """GET /api/stats/"""
    total_books = Book.objects.count()
    indexed_books = Book.objects.filter(chroma_indexed=True).count()
    total_queries = QueryLog.objects.count()
    try:
        from .rag_service import get_collection
        total_chunks = get_collection().count()
    except Exception:
        total_chunks = 0

    return Response({
        'total_books': total_books,
        'indexed_books': indexed_books,
        'total_queries': total_queries,
        'total_chunks': total_chunks,
    })


# ─────────────────────────────────────────────────────────────
#  POST APIs — all exempt from CSRF
# ─────────────────────────────────────────────────────────────

@method_decorator(csrf_exempt, name='dispatch')
class BookUploadView(APIView):
    """POST /api/books/upload/"""

    def post(self, request):
        serializer = BookUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        book_fields = {k: v for k, v in data.items() if k != 'url'}

        book, created = Book.objects.get_or_create(
            title=book_fields.get('title', 'Untitled'),
            defaults=book_fields
        )
        if not created:
            for k, v in book_fields.items():
                setattr(book, k, v)
            book.save()

        try:
            from .rag_service import index_book
            index_book(book)
        except Exception as e:
            logger.warning(f"Indexing failed for book {book.id}: {e}")

        return Response(
            BookSerializer(book).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )


@method_decorator(csrf_exempt, name='dispatch')
class ScrapeView(APIView):
    """POST /api/scrape/"""

    def post(self, request):
        max_pages = int(request.data.get('max_pages', 1))  # default 1 page = ~20 books, faster
        include_open_library = request.data.get('include_open_library', True)
        search_query = request.data.get('query', 'fiction')

        try:
            from .scraper import scrape_books_to_scrape, search_open_library
            from .rag_service import index_book

            results = {'scraped': 0, 'saved': 0, 'skipped': 0, 'indexed': 0}

            scraped_books = scrape_books_to_scrape(max_pages=max_pages)

            if include_open_library:
                ol_books = search_open_library(search_query, limit=10)
                scraped_books += ol_books

            results['scraped'] = len(scraped_books)

            for book_data in scraped_books:
                if not book_data.get('title'):
                    continue
                book, created = Book.objects.get_or_create(
                    title=book_data['title'],
                    source=book_data.get('source', 'unknown'),
                    defaults=book_data
                )
                if created:
                    results['saved'] += 1
                    try:
                        if index_book(book):
                            results['indexed'] += 1
                    except Exception as e:
                        logger.warning(f"Index failed: {e}")
                else:
                    results['skipped'] += 1

            return Response({
                'status': 'success',
                'message': f"Done! Saved {results['saved']} new books, indexed {results['indexed']}.",
                **results
            })

        except Exception as e:
            logger.exception("Scraping failed")
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class IndexBooksView(APIView):
    """POST /api/books/index/"""

    def post(self, request):
        book_id = request.data.get('book_id')
        try:
            from .rag_service import index_book

            if book_id:
                try:
                    book = Book.objects.get(id=book_id)
                    success = index_book(book)
                    return Response({'indexed': 1 if success else 0, 'book': book.title})
                except Book.DoesNotExist:
                    return Response({'error': 'Book not found'}, status=404)
            else:
                books = Book.objects.filter(chroma_indexed=False)
                total = books.count()
                indexed = 0
                for book in books:
                    try:
                        if index_book(book):
                            indexed += 1
                    except Exception as e:
                        logger.warning(f"Failed to index {book.id}: {e}")

                return Response({
                    'status': 'success',
                    'indexed': indexed,
                    'total_unindexed': total,
                    'message': f"Indexed {indexed} of {total} books into ChromaDB"
                })
        except Exception as e:
            logger.exception("Indexing failed")
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class RAGQueryView(APIView):
    """POST /api/query/"""

    def post(self, request):
        serializer = RAGQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        question = serializer.validated_data['question']
        book_id = serializer.validated_data.get('book_id')
        top_k = serializer.validated_data.get('top_k', 5)

        try:
            from .rag_service import semantic_search, generate_answer

            chunks = semantic_search(question, book_id=book_id, top_k=top_k)
            result = generate_answer(question, chunks)

            book_obj = None
            if book_id:
                try:
                    book_obj = Book.objects.get(id=book_id)
                except Book.DoesNotExist:
                    pass

            QueryLog.objects.create(
                question=question,
                answer=result['answer'],
                book=book_obj,
                sources_used=result.get('sources', [])
            )

            return Response({
                'question': question,
                'answer': result['answer'],
                'sources': result.get('sources', []),
                'chunks_retrieved': len(chunks),
            })
        except Exception as e:
            logger.exception("RAG query failed")
            return Response(
                {'status': 'error', 'message': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class AIInsightView(APIView):
    """POST /api/books/<id>/insights/"""

    def post(self, request, pk):
        try:
            book = Book.objects.get(pk=pk)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=404)

        try:
            from .rag_service import generate_summary, classify_genre, sentiment_analysis

            insight_type = request.data.get('type', 'summary')

            if insight_type == 'summary':
                result = generate_summary(book)
                return Response({'insight': result, 'type': 'summary', 'book_id': pk})
            elif insight_type == 'genre':
                result = classify_genre(book)
                return Response({'insight': result, 'type': 'genre', 'book_id': pk})
            elif insight_type == 'sentiment':
                text = book.reviews or book.description
                result = sentiment_analysis(text)
                return Response({'insight': result, 'type': 'sentiment', 'book_id': pk})
            else:
                return Response({'error': 'Unknown type. Use: summary, genre, sentiment'}, status=400)
        except Exception as e:
            logger.exception("Insight generation failed")
            return Response({'error': str(e)}, status=500)


class QueryHistoryView(generics.ListAPIView):
    """GET /api/query/history/"""
    serializer_class = QueryLogSerializer

    def get_queryset(self):
        return QueryLog.objects.all()[:50]


@method_decorator(csrf_exempt, name='dispatch')
class BookDeleteView(APIView):
    """DELETE /api/books/<id>/delete/"""

    def delete(self, request, pk):
        try:
            book = Book.objects.get(pk=pk)
            title = book.title

            # Remove from ChromaDB
            try:
                from .rag_service import get_collection
                collection = get_collection()
                old = collection.get(where={"book_id": str(pk)})
                if old and old.get('ids'):
                    collection.delete(ids=old['ids'])
            except Exception as e:
                logger.warning(f"ChromaDB delete failed for book {pk}: {e}")

            book.delete()
            return Response({'status': 'deleted', 'title': title})

        except Book.DoesNotExist:
            return Response({'error': 'Book not found'}, status=404)
        except Exception as e:
            logger.exception("Book delete failed")
            return Response({'error': str(e)}, status=500)


@api_view(['GET'])
def debug_index(request):
    """GET /api/debug/ — diagnose indexing issues"""
    import sys
    result = {
        'python_version': sys.version,
        'total_books': Book.objects.count(),
        'unindexed_books': Book.objects.filter(chroma_indexed=False).count(),
        'indexed_books': Book.objects.filter(chroma_indexed=True).count(),
        'chromadb_ok': False,
        'chromadb_count': 0,
        'chromadb_error': None,
        'sample_books': list(Book.objects.values('id', 'title', 'chroma_indexed')[:5]),
    }
    try:
        from .rag_service import get_collection
        col = get_collection()
        result['chromadb_ok'] = True
        result['chromadb_count'] = col.count()
    except Exception as e:
        result['chromadb_error'] = str(e)

    return Response(result)
