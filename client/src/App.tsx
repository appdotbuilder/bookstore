import { useState, useEffect } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Search, BookOpen, User, Star, Heart } from 'lucide-react';
import type { Book, User as UserType, CartItem, Order, Review } from '../../server/src/schema';

// Import components
import { BookCatalog } from '@/components/BookCatalog';
import { ShoppingCartComponent } from '@/components/ShoppingCartComponent';
import { UserAuth } from '@/components/UserAuth';
import { UserProfile } from '@/components/UserProfile';
import { BookDetails } from '@/components/BookDetails';
import { SearchBooks } from '@/components/SearchBooks';
import { Checkout } from '@/components/Checkout';

function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [currentTab, setCurrentTab] = useState('catalog');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Load cart when user changes
  useEffect(() => {
    if (currentUser) {
      loadCart();
    } else {
      setCartItems([]);
    }
  }, [currentUser]);

  const loadCart = async () => {
    if (!currentUser) return;
    try {
      const cart = await trpc.getCart.query({ userId: currentUser.id });
      setCartItems(cart);
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const handleLogin = (user: UserType) => {
    setCurrentUser(user);
    setCurrentTab('catalog');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentTab('catalog');
    setSelectedBook(null);
    setCartItems([]);
    setIsCheckingOut(false);
  };

  const handleBookSelect = (book: Book) => {
    setSelectedBook(book);
    setCurrentTab('book-details');
  };

  const handleAddToCart = async (bookId: number, quantity: number = 1) => {
    if (!currentUser) {
      alert('Please login to add items to cart');
      return;
    }

    try {
      await trpc.addToCart.mutate({
        userId: currentUser.id,
        book_id: bookId,
        quantity
      });
      await loadCart();
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add item to cart');
    }
  };

  const getTotalCartItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalCartValue = () => {
    // Using placeholder price since CartItem doesn't include book details yet
    return cartItems.reduce((total, item) => total + (29.99 * item.quantity), 0);
  };

  const handleStartCheckout = () => {
    setIsCheckingOut(true);
    setCurrentTab('checkout');
  };

  const handleCheckoutComplete = () => {
    setIsCheckingOut(false);
    setCartItems([]);
    setCurrentTab('profile');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-indigo-500">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-indigo-600" />
              <h1 className="text-2xl font-bold text-indigo-800">📚 BookHaven</h1>
            </div>

            <div className="flex items-center space-x-4">
              {currentUser ? (
                <>
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-medium">
                      Hello, {currentUser.first_name}! 👋
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentTab('cart')}
                    className="relative"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Cart
                    {getTotalCartItems() > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500">
                        {getTotalCartItems()}
                      </Badge>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </>
              ) : (
                <Button onClick={() => setCurrentTab('auth')}>
                  Login / Register
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="catalog">📖 Catalog</TabsTrigger>
            <TabsTrigger value="search">🔍 Search</TabsTrigger>
            {currentUser && (
              <>
                <TabsTrigger value="cart">🛒 Cart ({getTotalCartItems()})</TabsTrigger>
                <TabsTrigger value="profile">👤 Profile</TabsTrigger>
                <TabsTrigger value="book-details" disabled={!selectedBook}>
                  📝 Details
                </TabsTrigger>
                <TabsTrigger value="checkout" disabled={!isCheckingOut}>
                  💳 Checkout
                </TabsTrigger>
              </>
            )}
            {!currentUser && (
              <>
                <TabsTrigger value="auth">🔐 Login</TabsTrigger>
                <TabsTrigger value="cart" disabled>Cart</TabsTrigger>
                <TabsTrigger value="profile" disabled>Profile</TabsTrigger>
                <TabsTrigger value="checkout" disabled>Checkout</TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="catalog">
            <BookCatalog onBookSelect={handleBookSelect} onAddToCart={handleAddToCart} />
          </TabsContent>

          <TabsContent value="search">
            <SearchBooks onBookSelect={handleBookSelect} onAddToCart={handleAddToCart} />
          </TabsContent>

          {currentUser && (
            <>
              <TabsContent value="cart">
                <ShoppingCartComponent
                  cartItems={cartItems}
                  onUpdateCart={loadCart}
                  onStartCheckout={handleStartCheckout}
                  userId={currentUser.id}
                />
              </TabsContent>

              <TabsContent value="profile">
                <UserProfile user={currentUser} />
              </TabsContent>

              <TabsContent value="book-details">
                {selectedBook && (
                  <BookDetails
                    book={selectedBook}
                    onAddToCart={handleAddToCart}
                    userId={currentUser.id}
                  />
                )}
              </TabsContent>

              <TabsContent value="checkout">
                <Checkout
                  cartItems={cartItems}
                  totalAmount={getTotalCartValue()}
                  onCheckoutComplete={handleCheckoutComplete}
                  userId={currentUser.id}
                />
              </TabsContent>
            </>
          )}

          <TabsContent value="auth">
            <UserAuth onLogin={handleLogin} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-indigo-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="h-6 w-6" />
            <span className="text-xl font-bold">BookHaven</span>
          </div>
          <p className="text-indigo-200">
            Your favorite online bookstore 📚 Discover, read, and love books! ❤️
          </p>
          <div className="mt-4 text-sm text-indigo-300">
            Built with React, TypeScript, and lots of love for books 💙
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;