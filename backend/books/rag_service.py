"""
RAG Pipeline using ChromaDB with its built-in embedding function.
This avoids sentence-transformers installation issues entirely.
"""
import logging
import os
from typing import Optional
from django.conf import settings

logger = logging.getLogger(__name__)

_chroma_client = None
_collection = None


def get_chroma_client():
    global _chroma_client
    if _chroma_client is None:
        import chromadb
        path = settings.CHROMA_DB_PATH
        os.makedirs(path, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(path=path)
    return _chroma_client


def get_collection():
    global _collection
    if _collection is None:
        import chromadb
        from chromadb.utils import embedding_functions
        client = get_chroma_client()
        # Use ChromaDB's default embedding function (no extra install needed)
        ef = embedding_functions.DefaultEmbeddingFunction()
        _collection = client.get_or_create_collection(
            name="books",
            embedding_function=ef,
            metadata={"hnsw:space": "cosine"}
        )
    return _collection


def chunk_text(text: str, chunk_size: int = 400, overlap: int = 50) -> list:
    """Sliding window chunking."""
    if not text or len(text.strip()) < 5:
        return [text.strip()] if text.strip() else []

    import re
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())

    chunks = []
    current = []
    current_len = 0

    for sentence in sentences:
        slen = len(sentence)
        if current_len + slen > chunk_size and current:
            chunks.append(' '.join(current))
            # keep last few sentences as overlap
            overlap_sents = []
            olen = 0
            for s in reversed(current):
                if olen + len(s) <= overlap:
                    overlap_sents.insert(0, s)
                    olen += len(s)
                else:
                    break
            current = overlap_sents
            current_len = olen
        current.append(sentence)
        current_len += slen

    if current:
        chunks.append(' '.join(current))

    return chunks or [text[:chunk_size]]


def index_book(book) -> bool:
    """Index a book into ChromaDB."""
    try:
        # Build text to embed
        parts = [f"Title: {book.title}"]
        if book.author:
            parts.append(f"Author: {book.author}")
        if book.genre:
            parts.append(f"Genre: {book.genre}")
        if book.description:
            parts.append(f"Description: {book.description}")
        if book.reviews:
            parts.append(f"Reviews: {book.reviews}")

        full_text = '\n'.join(parts)
        chunks = chunk_text(full_text)
        if not chunks:
            logger.warning(f"No chunks for book {book.id}: {book.title}")
            return False

        collection = get_collection()

        # Delete old entries for this book
        try:
            old = collection.get(where={"book_id": str(book.id)})
            if old and old.get('ids'):
                collection.delete(ids=old['ids'])
        except Exception:
            pass

        chunk_ids = [f"book_{book.id}_chunk_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "book_id": str(book.id),
                "book_title": str(book.title)[:100],
                "author": str(book.author or '')[:100],
                "genre": str(book.genre or '')[:100],
                "chunk_index": str(i),
            }
            for i in range(len(chunks))
        ]

        # ChromaDB handles embedding internally
        collection.add(
            ids=chunk_ids,
            documents=chunks,
            metadatas=metadatas
        )

        book.chroma_indexed = True
        book.save(update_fields=['chroma_indexed'])
        logger.info(f"Indexed '{book.title}' — {len(chunks)} chunks")
        return True

    except Exception as e:
        logger.error(f"Failed to index book {book.id} '{book.title}': {e}", exc_info=True)
        return False


def semantic_search(query: str, book_id: Optional[int] = None, top_k: int = 5) -> list:
    """Search ChromaDB for relevant chunks."""
    try:
        collection = get_collection()
        total = collection.count()
        if total == 0:
            return []

        n = min(top_k, total)
        where = {"book_id": str(book_id)} if book_id else None

        results = collection.query(
            query_texts=[query],
            n_results=n,
            where=where,
            include=['documents', 'metadatas', 'distances']
        )

        chunks = []
        if results and results.get('documents'):
            for doc, meta, dist in zip(
                results['documents'][0],
                results['metadatas'][0],
                results['distances'][0]
            ):
                chunks.append({
                    'text': doc,
                    'metadata': meta,
                    'similarity': round(1 - float(dist), 4)
                })
        return chunks

    except Exception as e:
        logger.error(f"Semantic search failed: {e}", exc_info=True)
        return []


def generate_answer(question: str, context_chunks: list) -> dict:
    """Generate LLM answer from retrieved chunks."""
    if not context_chunks:
        return {
            "answer": (
                "No indexed books found to answer your question.\n\n"
                "Please go to Admin Panel → click 'Index All Unindexed Books' first."
            ),
            "sources": []
        }

    context = "\n\n---\n\n".join(c['text'] for c in context_chunks)

    seen = set()
    sources = []
    for c in context_chunks:
        t = c['metadata'].get('book_title', 'Unknown')
        if t not in seen:
            sources.append({
                'book_id': c['metadata'].get('book_id'),
                'title': t,
                'author': c['metadata'].get('author', ''),
                'similarity': c['similarity']
            })
            seen.add(t)

    system_prompt = (
        "You are BookInsight AI, an intelligent book assistant. "
        "Answer questions about books using the provided context. "
        "Be informative and reference specific books when relevant."
    )
    user_message = f"Context from book database:\n{context}\n\nQuestion: {question}"

    try:
        if settings.ANTHROPIC_API_KEY:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=800,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}]
            )
            return {"answer": msg.content[0].text, "sources": sources}

        elif settings.OPENAI_API_KEY:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=800
            )
            return {"answer": resp.choices[0].message.content, "sources": sources}

        else:
            # Fallback — no API key
            top = context_chunks[0]
            return {
                "answer": (
                    f"Based on '{top['metadata'].get('book_title', 'a book in our library')}':\n\n"
                    f"{top['text']}\n\n"
                    "💡 Tip: Add ANTHROPIC_API_KEY or OPENAI_API_KEY to backend/.env for full AI answers."
                ),
                "sources": sources
            }

    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        return {
            "answer": f"Found {len(context_chunks)} relevant chunks but LLM failed: {e}",
            "sources": sources
        }


def generate_summary(book) -> str:
    text = f"Title: {book.title}\nAuthor: {book.author}\nGenre: {book.genre}\nDescription: {book.description}"
    try:
        if settings.ANTHROPIC_API_KEY:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                messages=[{"role": "user", "content": f"Write a 2-3 sentence engaging summary:\n{text}"}]
            )
            return msg.content[0].text
        elif settings.OPENAI_API_KEY:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            resp = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": f"Write a 2-3 sentence engaging summary:\n{text}"}],
                max_tokens=300
            )
            return resp.choices[0].message.content
        else:
            return book.description[:300] if book.description else "No description available."
    except Exception as e:
        return book.description[:300] if book.description else f"Summary failed: {e}"


def classify_genre(book) -> str:
    text = f"Title: {book.title}\nDescription: {book.description}"
    try:
        if settings.ANTHROPIC_API_KEY:
            import anthropic
            client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=50,
                messages=[{"role": "user", "content": f"What genre is this book? Reply with ONLY the genre name:\n{text}"}]
            )
            return msg.content[0].text.strip()
        return book.genre or "General"
    except Exception:
        return book.genre or "General"


def sentiment_analysis(text: str) -> dict:
    pos = ['excellent', 'amazing', 'wonderful', 'great', 'love', 'fantastic',
           'brilliant', 'outstanding', 'superb', 'perfect', 'enjoyed', 'recommend']
    neg = ['terrible', 'awful', 'boring', 'disappointing', 'bad', 'poor',
           'worst', 'hate', 'dull', 'waste', 'overrated', 'mediocre']
    tl = (text or '').lower()
    pc = sum(1 for w in pos if w in tl)
    nc = sum(1 for w in neg if w in tl)
    if pc > nc:
        sentiment, score = 'positive', min(0.5 + (pc - nc) * 0.1, 1.0)
    elif nc > pc:
        sentiment, score = 'negative', max(0.5 - (nc - pc) * 0.1, 0.0)
    else:
        sentiment, score = 'neutral', 0.5
    return {'sentiment': sentiment, 'score': round(score, 2),
            'positive_signals': pc, 'negative_signals': nc}


def get_recommendations(book_id: int, top_k: int = 5) -> list:
    from books.models import Book
    try:
        book = Book.objects.get(id=book_id)
        query = f"{book.title} {book.genre} {book.description[:200]}"
        chunks = semantic_search(query, top_k=top_k * 3)

        seen = {str(book_id)}
        recs = []
        for c in chunks:
            bid = c['metadata'].get('book_id')
            if bid and bid not in seen:
                try:
                    rb = Book.objects.get(id=int(bid))
                    recs.append({
                        'id': rb.id, 'title': rb.title, 'author': rb.author,
                        'genre': rb.genre, 'rating': rb.rating,
                        'cover_image_url': rb.cover_image_url,
                        'similarity': c['similarity'],
                        'description': rb.description[:200]
                    })
                    seen.add(bid)
                    if len(recs) >= top_k:
                        break
                except Book.DoesNotExist:
                    pass
        return recs
    except Exception as e:
        logger.error(f"Recommendations failed: {e}")
        return []
