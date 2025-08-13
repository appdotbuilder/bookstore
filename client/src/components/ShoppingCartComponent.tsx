import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Minus, Plus, Trash2, ShoppingBag, CreditCard } from 'lucide-react';
import type { CartItem, Book } from '../../../server/src/schema';

interface ShoppingCartProps {
  cartItems: CartItem[];
  onUpdateCart: () => void;
  onStartCheckout: () => void;
  userId: number;
}

export function ShoppingCartComponent({ cartItems, onUpdateCart, onStartCheckout, userId }: ShoppingCartProps) {
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const updateQuantity = async (cartItemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setIsUpdating(cartItemId);
    setError(null);
    
    try {
      await trpc.updateCartItem.mutate({
        userId,
        cart_item_id: cartItemId,
        quantity: newQuantity
      });
      await onUpdateCart();
    } catch (error: any) {
      setError('Failed to update item quantity');
    } finally {
      setIsUpdating(null);
    }
  };

  const removeFromCart = async (cartItemId: number) => {
    setIsUpdating(cartItemId);
    setError(null);
    
    try {
      await trpc.removeFromCart.mutate({
        userId,
        cartItemId
      });
      await onUpdateCart();
    } catch (error: any) {
      setError('Failed to remove item from cart');
    } finally {
      setIsUpdating(null);
    }
  };

  const getTotalAmount = () => {
    // Since we don't have book data in cart items from backend yet, return placeholder
    return cartItems.reduce((total, item) => total + (29.99 * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🛒</div>
        <h3 className="text-2xl font-bold text-gray-700 mb-2">Your cart is empty</h3>
        <p className="text-gray-500 mb-6">
          Discover amazing books and add them to your cart!
        </p>
        <div className="text-4xl">📚✨</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-indigo-800 mb-2">🛒 Your Shopping Cart</h2>
        <p className="text-gray-600">
          {getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''} ready for checkout
        </p>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            ❌ {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItems.map((item: CartItem) => (
            <Card key={item.id} className="border-2 border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Book Cover */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-md flex items-center justify-center">
                      <div className="text-2xl">📖</div>
                    </div>
                  </div>

                  {/* Book Details */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Book #{item.book_id}</h3>
                    <p className="text-gray-600 mb-2">Details will be loaded when backend is implemented</p>
                    <Badge variant="secondary" className="text-xs">
                      General
                    </Badge>
                    
                    <Alert className="mt-2 border-blue-200 bg-blue-50">
                      <AlertDescription className="text-blue-700 text-sm">
                        ℹ️ Book details will be available once cart includes book information
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Price and Controls */}
                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        ${(29.99 * item.quantity).toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        $29.99 each (placeholder)
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isUpdating === item.id}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={isUpdating === item.id}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                      disabled={isUpdating === item.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {isUpdating === item.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-indigo-200 sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingBag className="h-5 w-5 mr-2" />
                Order Summary
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>Items ({getTotalItems()})</span>
                <span>${getTotalAmount().toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Shipping</span>
                <span className="text-green-600">FREE 🎉</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span>Tax</span>
                <span>${(getTotalAmount() * 0.08).toFixed(2)}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-600">
                  ${(getTotalAmount() * 1.08).toFixed(2)}
                </span>
              </div>

              {/* Savings Display */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 text-center">
                  🎉 You're getting FREE shipping!
                  <br />
                  <span className="font-medium">
                    You save: $9.99
                  </span>
                </p>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                onClick={onStartCheckout} 
                className="w-full"
                size="lg"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}