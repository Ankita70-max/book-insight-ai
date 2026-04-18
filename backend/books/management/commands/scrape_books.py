from django.core.management.base import BaseCommand
from books.scraper import scrape_and_save_books
from books.rag_service import index_book
from books.models import Book


class Command(BaseCommand):
    help = 'Scrape books from the web and index them into ChromaDB'

    def add_arguments(self, parser):
        parser.add_argument('--pages', type=int, default=2, help='Number of pages to scrape')
        parser.add_argument('--index', action='store_true', help='Also index books into ChromaDB')

    def handle(self, *args, **options):
        self.stdout.write('Starting book scraping...')
        result = scrape_and_save_books(max_pages=options['pages'])
        self.stdout.write(self.style.SUCCESS(
            f"Done! Scraped: {result['scraped']}, Saved: {result['saved']}, Skipped: {result['skipped']}"
        ))

        if options['index']:
            self.stdout.write('Indexing books into ChromaDB...')
            books = Book.objects.filter(chroma_indexed=False)
            indexed = 0
            for book in books:
                try:
                    if index_book(book):
                        indexed += 1
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Failed to index {book.title}: {e}"))

            self.stdout.write(self.style.SUCCESS(f"Indexed {indexed} books into ChromaDB"))
