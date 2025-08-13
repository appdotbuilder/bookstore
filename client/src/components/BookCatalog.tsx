import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, ShoppingCart, Eye, Calendar } from 'lucide-react';
import type { Book } from '../../../server/src/schema';

interface BookCatalogProps {
  onBookSelect: (book: Book) => void;
  onAddToCart: (bookId: number) => void;
}

export function BookCatalog({ onBookSelect, onAddToCart }: BookCatalogProps) {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('title');

  const loadBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getBooks.query();
      setBooks(result);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Get unique categories from books
  const categories = Array.from(new Set(books.map(book => book.category)));

  // Filter and sort books
  const filteredAndSortedBooks = books
    .filter(book => categoryFilter === 'all' || book.category === categoryFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'year':
          return (b.publication_year || 0) - (a.publication_year || 0);
        case 'author':
          return a.author.localeCompare(b.author);
        default: // title
          return a.title.localeCompare(b.title);
      }
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading our amazing book collection...</p>
          <p className="text-sm text-gray-500">📚 Getting ready for you!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-indigo-800 mb-2">📖 Book Catalog</h2>
        <p className="text-gray-600">Discover your next favorite read from our curated collection</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg shadow-md">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📂 Filter by Category
          </label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📊 Sort by
          </label>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="title">Title (A-Z)</SelectItem>
              <SelectItem value="author">Author (A-Z)</SelectItem>
              <SelectItem value="price-low">Price (Low to High)</SelectItem>
              <SelectItem value="price-high">Price (High to Low)</SelectItem>
              <SelectItem value="year">Publication Year (Newest)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Book Grid */}
      {filteredAndSortedBooks.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No books found</h3>
          <p className="text-gray-500">Try adjusting your filters to see more books</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedBooks.length} book{filteredAndSortedBooks.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAndSortedBooks.map((book: Book) => (
              <Card key={book.id} className="hover:shadow-lg transition-shadow duration-300 border-2 border-transparent hover:border-indigo-200">
                <CardHeader className="pb-2">
                  <div className="aspect-[3/4] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-md mb-3 flex items-center justify-center">
                    {book.cover_image_url ? (
                      <img
                        src={book.cover_image_url}
                        alt={book.title}
                        className="w-full h-full object-cover rounded-md"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : (
                      <div className="text-4xl">📖</div>
                    )}
                    <div className="hidden text-4xl">📖</div>
                  </div>
                  <CardTitle className="text-lg line-clamp-2">{book.title}</CardTitle>
                  <CardDescription className="text-sm">
                    by <span className="font-medium">{book.author}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-2">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-xs">
                      {book.category}
                    </Badge>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-green-600">
                        ${book.price.toFixed(2)}
                      </span>
                      {book.publication_year && (
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {book.publication_year}
                        </div>
                      )}
                    </div>

                    {book.description && (
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {book.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm">
                      <span className={`font-medium ${book.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {book.stock_quantity > 0 
                          ? `✅ ${book.stock_quantity} in stock`
                          : '❌ Out of stock'
                        }
                      </span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onBookSelect(book)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onAddToCart(book.id)}
                    disabled={book.stock_quantity === 0}
                    className="flex-1"
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Add to Cart
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}