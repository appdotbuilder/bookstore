import { useState, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Search, Filter, ShoppingCart, Eye, Calendar, X } from 'lucide-react';
import type { Book, SearchBooksInput } from '../../../server/src/schema';

interface SearchBooksProps {
  onBookSelect: (book: Book) => void;
  onAddToCart: (bookId: number) => void;
}

export function SearchBooks({ onBookSelect, onAddToCart }: SearchBooksProps) {
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  // Search filters state
  const [searchFilters, setSearchFilters] = useState<SearchBooksInput>({
    query: '',
    category: undefined,
    author: undefined,
    min_price: undefined,
    max_price: undefined,
    limit: 20,
    offset: 0
  });

  // Price range state for slider
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const performSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      // Prepare search input
      const searchInput: SearchBooksInput = {
        ...searchFilters,
        min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
        max_price: priceRange[1] < 100 ? priceRange[1] : undefined,
        category: searchFilters.category || undefined,
        author: searchFilters.author || undefined,
        query: searchFilters.query || undefined
      };

      const results = await trpc.searchBooks.query(searchInput);
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchFilters, priceRange]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const clearFilters = () => {
    setSearchFilters({
      query: '',
      category: undefined,
      author: undefined,
      min_price: undefined,
      max_price: undefined,
      limit: 20,
      offset: 0
    });
    setPriceRange([0, 100]);
    setSearchResults([]);
    setHasSearched(false);
  };

  const hasActiveFilters = () => {
    return searchFilters.query || 
           searchFilters.category || 
           searchFilters.author || 
           priceRange[0] > 0 || 
           priceRange[1] < 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-indigo-800 mb-2">🔍 Search Books</h2>
        <p className="text-gray-600">Find your next favorite read from our extensive collection</p>
      </div>

      {/* Search Form */}
      <Card className="border-2 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-5 w-5 mr-2" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        
        <form onSubmit={handleSearch}>
          <CardContent className="space-y-6">
            {/* Main Search */}
            <div className="space-y-2">
              <Label htmlFor="search-query">📖 Search Books</Label>
              <div className="flex space-x-2">
                <Input
                  id="search-query"
                  placeholder="Enter book title, author, or keywords..."
                  value={searchFilters.query || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearchFilters((prev: SearchBooksInput) => ({ ...prev, query: e.target.value }))
                  }
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Advanced Filters Toggle */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
                {hasActiveFilters() && (
                  <Badge variant="secondary" className="ml-2">
                    Active
                  </Badge>
                )}
              </Button>

              {hasActiveFilters() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="category-filter">📂 Category</Label>
                  <Select
                    value={searchFilters.category || ''}
                    onValueChange={(value: string) =>
                      setSearchFilters((prev: SearchBooksInput) => ({ 
                        ...prev, 
                        category: value || undefined 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      <SelectItem value="Fiction">Fiction</SelectItem>
                      <SelectItem value="Non-Fiction">Non-Fiction</SelectItem>
                      <SelectItem value="Science Fiction">Science Fiction</SelectItem>
                      <SelectItem value="Fantasy">Fantasy</SelectItem>
                      <SelectItem value="Mystery">Mystery</SelectItem>
                      <SelectItem value="Romance">Romance</SelectItem>
                      <SelectItem value="Biography">Biography</SelectItem>
                      <SelectItem value="History">History</SelectItem>
                      <SelectItem value="Self-Help">Self-Help</SelectItem>
                      <SelectItem value="Technology">Technology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="author-filter">✍️ Author</Label>
                  <Input
                    id="author-filter"
                    placeholder="Author name..."
                    value={searchFilters.author || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchFilters((prev: SearchBooksInput) => ({ 
                        ...prev, 
                        author: e.target.value || undefined 
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-2 space-y-4">
                  <Label>💰 Price Range: ${priceRange[0]} - ${priceRange[1] === 100 ? '100+' : priceRange[1]}</Label>
                  <Slider
                    value={priceRange}
                    onValueChange={(value: number[]) => setPriceRange([value[0], value[1]])}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </form>
      </Card>

      {/* Search Results */}
      {isLoading && (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-lg font-medium">Searching our library...</p>
            <p className="text-sm text-gray-500">🔍 Finding the perfect books for you!</p>
          </div>
        </div>
      )}

      {!isLoading && hasSearched && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              Search Results
              {searchResults.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {searchResults.length} book{searchResults.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </h3>
          </div>

          {searchResults.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No books found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search terms or filters
              </p>
              <div className="space-y-2 text-sm text-gray-400">
                <p>💡 Tips for better results:</p>
                <p>• Try broader search terms</p>
                <p>• Check spelling</p>
                <p>• Remove some filters</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults.map((book: Book) => (
                <Card key={book.id} className="hover:shadow-lg transition-shadow duration-300 border-2 border-transparent hover:border-indigo-200">
                  <CardHeader className="pb-2">
                    <div className="aspect-[3/4] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-md mb-3 flex items-center justify-center">
                      {book.cover_image_url ? (
                        <img
                          src={book.cover_image_url}
                          alt={book.title}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <div className="text-4xl">📖</div>
                      )}
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
          )}
        </>
      )}

      {!hasSearched && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to explore?</h3>
          <p className="text-gray-500">
            Use the search box above to find your next great read
          </p>
          <div className="mt-4 text-sm text-gray-400 space-y-1">
            <p>💡 You can search by:</p>
            <p>📖 Book title • ✍️ Author name • 🏷️ Category</p>
          </div>
        </div>
      )}
    </div>
  );
}