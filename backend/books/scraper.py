"""
Book scraper - collects book data from Books to Scrape (free/legal practice site)
and Open Library API. No auth needed, no ToS violations.
"""
import requests
from bs4 import BeautifulSoup
import logging
import time
import re

logger = logging.getLogger(__name__)

BOOKS_TO_SCRAPE_BASE = "https://books.toscrape.com"
OPEN_LIBRARY_SEARCH = "https://openlibrary.org/search.json"
OPEN_LIBRARY_BOOK = "https://openlibrary.org"


def scrape_books_to_scrape(max_pages: int = 3) -> list[dict]:
    """
    Scrape books from books.toscrape.com — a legal practice scraping site.
    Returns list of book dicts.
    """
    books = []
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; BookInsightBot/1.0; educational project)"
    }

    for page_num in range(1, max_pages + 1):
        url = f"{BOOKS_TO_SCRAPE_BASE}/catalogue/page-{page_num}.html"
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, 'lxml')

            articles = soup.select('article.product_pod')
            for article in articles:
                try:
                    book_data = _parse_book_card(article, headers)
                    if book_data:
                        books.append(book_data)
                except Exception as e:
                    logger.warning(f"Failed to parse book card: {e}")

            logger.info(f"Scraped page {page_num}, total books so far: {len(books)}")
            time.sleep(1)  # Be polite

        except Exception as e:
            logger.error(f"Failed to scrape page {page_num}: {e}")
            break

    return books


def _parse_book_card(article, headers: dict) -> dict | None:
    """Parse a single book card from books.toscrape.com"""
    try:
        title_tag = article.select_one('h3 a')
        title = title_tag['title'] if title_tag else 'Unknown Title'

        price_tag = article.select_one('p.price_color')
        price = price_tag.text.strip() if price_tag else ''

        rating_map = {'One': 1, 'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5}
        rating_tag = article.select_one('p.star-rating')
        rating_word = rating_tag['class'][1] if rating_tag else 'Zero'
        rating = rating_map.get(rating_word, 0)

        availability_tag = article.select_one('p.availability')
        available = 'In stock' in (availability_tag.text if availability_tag else '')

        img_tag = article.select_one('img.thumbnail')
        img_url = ''
        if img_tag:
            src = img_tag.get('src', '')
            img_url = f"{BOOKS_TO_SCRAPE_BASE}/{src.replace('../', '')}"

        book_link = title_tag['href'] if title_tag else ''
        book_url = ''
        description = ''
        genre = 'General'

        if book_link:
            clean_link = book_link.replace('../', '')
            book_url = f"{BOOKS_TO_SCRAPE_BASE}/catalogue/{clean_link}"
            # Fetch detail page for description and genre
            try:
                detail_resp = requests.get(book_url, headers=headers, timeout=10)
                detail_resp.raise_for_status()
                detail_soup = BeautifulSoup(detail_resp.text, 'lxml')

                desc_tag = detail_soup.select_one('#product_description ~ p')
                description = desc_tag.text.strip() if desc_tag else ''

                breadcrumb = detail_soup.select('ul.breadcrumb li')
                if len(breadcrumb) >= 3:
                    genre = breadcrumb[2].text.strip()
            except Exception as e:
                logger.debug(f"Could not fetch book detail for {title}: {e}")

        return {
            'title': title,
            'author': 'Various Authors',  # books.toscrape doesn't show authors
            'description': description or f"A {genre} book available in our collection.",
            'rating': float(rating),
            'rating_count': 0,
            'genre': genre,
            'cover_image_url': img_url,
            'book_url': book_url,
            'reviews': '',
            'source': 'books_to_scrape',
            'is_available': available,
        }
    except Exception as e:
        logger.error(f"Error parsing book card: {e}")
        return None


def search_open_library(query: str, limit: int = 10) -> list[dict]:
    """
    Search Open Library API for books. Free, no auth required.
    """
    books = []
    params = {
        'q': query,
        'limit': limit,
        'fields': 'key,title,author_name,first_publish_year,cover_i,subject,number_of_pages_median,ratings_average,ratings_count'
    }
    headers = {"User-Agent": "BookInsightApp/1.0 (educational project)"}

    try:
        resp = requests.get(OPEN_LIBRARY_SEARCH, params=params, headers=headers, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        for doc in data.get('docs', []):
            cover_id = doc.get('cover_i')
            cover_url = f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg" if cover_id else ''

            book_key = doc.get('key', '')
            book_url = f"https://openlibrary.org{book_key}" if book_key else ''

            subjects = doc.get('subject', [])
            genre = subjects[0] if subjects else 'General'

            books.append({
                'title': doc.get('title', 'Unknown Title'),
                'author': ', '.join(doc.get('author_name', ['Unknown Author'])),
                'description': f"Published in {doc.get('first_publish_year', 'N/A')}. Subjects: {', '.join(subjects[:3])}.",
                'rating': round(float(doc.get('ratings_average', 0)), 1),
                'rating_count': doc.get('ratings_count', 0),
                'genre': genre[:200],
                'cover_image_url': cover_url,
                'book_url': book_url,
                'reviews': '',
                'source': 'open_library',
                'is_available': True,
            })
    except Exception as e:
        logger.error(f"Open Library search failed: {e}")

    return books


def scrape_and_save_books(max_pages: int = 2) -> dict:
    """
    Main function: scrapes books and returns them.
    Called from Django management command or API view.
    """
    from books.models import Book

    scraped = scrape_books_to_scrape(max_pages=max_pages)
    # Also get some Open Library books
    ol_books = search_open_library("fiction classics", limit=20)

    all_books = scraped + ol_books
    saved_count = 0
    skipped_count = 0

    for book_data in all_books:
        if not book_data.get('title'):
            continue
        obj, created = Book.objects.get_or_create(
            title=book_data['title'],
            source=book_data.get('source', 'unknown'),
            defaults=book_data
        )
        if created:
            saved_count += 1
        else:
            skipped_count += 1

    return {
        'scraped': len(all_books),
        'saved': saved_count,
        'skipped': skipped_count,
    }
