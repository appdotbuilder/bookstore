import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, ShoppingCart, Calendar, Package, Tag, User, MessageCircle, Plus } from 'lucide-react';
import type { Book, Review, CreateReviewInput } from '../../../server/src/schema';

interface BookDetailsProps {
  book: Book;
  onAddToCart: (bookId: number) => void;
  userId: number;
}

export function BookDetails({ book, onAddToCart, userId }: BookDetailsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Review form state
  const [reviewData, setReviewData] = useState<CreateReviewInput>({
    book_id: book.id,
    rating: 5,
    comment: null
  });

  const loadReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      const result = await trpc.getReviews.query({ bookId: book.id });
      setReviews(result);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [book.id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    setError(null);

    try {
      await trpc.createReview.mutate({
        userId,
        ...reviewData
      });
      setSuccess('Review submitted successfully! 🎉');
      setShowReviewForm(false);
      setReviewData({
        book_id: book.id,
        rating: 5,
        comment: null
      });
      await loadReviews();
    } catch (error: any) {
      setError(error.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getAverageRating = () => {
    if (reviews.length === 0) return 0;
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    return sum / reviews.length;
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const starSize = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const userHasReviewed = reviews.some(review => review.user_id === userId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-indigo-800 mb-2">📖 Book Details</h2>
        <p className="text-gray-600">Everything you need to know about this book</p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            ❌ {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-700">
            ✅ {success}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Book Cover and Basic Info */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-indigo-200">
            <CardContent className="p-6">
              {/* Cover Image */}
              <div className="aspect-[3/4] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg mb-4 flex items-center justify-center">
                {book.cover_image_url ? (
                  <img
                    src={book.cover_image_url}
                    alt={book.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <div className="text-6xl">📖</div>
                )}
              </div>

              {/* Price and Stock */}
              <div className="text-center mb-4">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  ${book.price.toFixed(2)}
                </div>
                <div className={`font-medium ${book.stock_quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {book.stock_quantity > 0 
                    ? `✅ ${book.stock_quantity} in stock`
                    : '❌ Out of stock'
                  }
                </div>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={() => onAddToCart(book.id)}
                disabled={book.stock_quantity === 0}
                className="w-full mb-4"
                size="lg"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>

              {/* Rating Summary */}
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center mb-2">
                  {renderStars(Math.round(getAverageRating()), 'lg')}
                </div>
                <div className="text-lg font-semibold">
                  {getAverageRating().toFixed(1)} / 5.0
                </div>
                <div className="text-sm text-gray-600">
                  Based on {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Book Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title and Author */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{book.title}</CardTitle>
              <p className="text-xl text-gray-600">by {book.author}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="flex items-center">
                  <Tag className="h-3 w-3 mr-1" />
                  {book.category}
                </Badge>
                {book.publication_year && (
                  <Badge variant="outline" className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {book.publication_year}
                  </Badge>
                )}
                {book.publisher && (
                  <Badge variant="outline">
                    {book.publisher}
                  </Badge>
                )}
                {book.isbn && (
                  <Badge variant="outline">
                    ISBN: {book.isbn}
                  </Badge>
                )}
              </div>

              {/* Description */}
              {book.description && (
                <div>
                  <h3 className="font-semibold mb-2">📝 Description</h3>
                  <p className="text-gray-700 leading-relaxed">{book.description}</p>
                </div>
              )}

              {/* Book Details Table */}
              <div>
                <h3 className="font-semibold mb-3">📋 Book Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Author:</span>
                    <p>{book.author}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Category:</span>
                    <p>{book.category}</p>
                  </div>
                  {book.publication_year && (
                    <div>
                      <span className="font-medium text-gray-600">Publication Year:</span>
                      <p>{book.publication_year}</p>
                    </div>
                  )}
                  {book.publisher && (
                    <div>
                      <span className="font-medium text-gray-600">Publisher:</span>
                      <p>{book.publisher}</p>
                    </div>
                  )}
                  {book.isbn && (
                    <div>
                      <span className="font-medium text-gray-600">ISBN:</span>
                      <p>{book.isbn}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-gray-600">Stock:</span>
                    <p>{book.stock_quantity} available</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Customer Reviews ({reviews.length})
                </CardTitle>
                {!userHasReviewed && (
                  <Button
                    variant="outline"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Write Review
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {/* Review Form */}
              {showReviewForm && !userHasReviewed && (
                <form onSubmit={handleSubmitReview} className="mb-6 p-4 border-2 border-indigo-200 rounded-lg bg-indigo-50">
                  <h4 className="font-semibold mb-3">✍️ Write Your Review</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">⭐ Rating</label>
                      <Select
                        value={reviewData.rating.toString()}
                        onValueChange={(value: string) =>
                          setReviewData((prev: CreateReviewInput) => ({ 
                            ...prev, 
                            rating: parseInt(value) 
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">⭐⭐⭐⭐⭐ (5 stars)</SelectItem>
                          <SelectItem value="4">⭐⭐⭐⭐☆ (4 stars)</SelectItem>
                          <SelectItem value="3">⭐⭐⭐☆☆ (3 stars)</SelectItem>
                          <SelectItem value="2">⭐⭐☆☆☆ (2 stars)</SelectItem>
                          <SelectItem value="1">⭐☆☆☆☆ (1 star)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">💭 Comment (Optional)</label>
                      <Textarea
                        placeholder="Share your thoughts about this book..."
                        value={reviewData.comment || ''}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setReviewData((prev: CreateReviewInput) => ({ 
                            ...prev, 
                            comment: e.target.value || null 
                          }))
                        }
                        rows={3}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" disabled={isSubmittingReview}>
                        {isSubmittingReview ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Submitting...
                          </>
                        ) : (
                          'Submit Review'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowReviewForm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              )}

              {userHasReviewed && (
                <Alert className="mb-6 border-blue-200 bg-blue-50">
                  <AlertDescription className="text-blue-700">
                    ℹ️ You have already reviewed this book. Thank you for your feedback!
                  </AlertDescription>
                </Alert>
              )}

              {/* Reviews List */}
              {isLoadingReviews ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💭</div>
                  <p className="text-gray-500">No reviews yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review: Review) => (
                    <div key={review.id} className="border-b pb-4 last:border-b-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">
                            Anonymous User
                          </span>
                          {renderStars(review.rating)}
                        </div>
                        <span className="text-sm text-gray-500">
                          {review.created_at.toLocaleDateString()}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 ml-6">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}