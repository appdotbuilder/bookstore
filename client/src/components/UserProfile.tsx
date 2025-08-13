import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/utils/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { User, Package, Star, Calendar, MapPin, CreditCard, Eye } from 'lucide-react';
import type { User as UserType, Order, Review, Book } from '../../../server/src/schema';

interface UserProfileProps {
  user: UserType;
}

export function UserProfile({ user }: UserProfileProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [reviews, setReviews] = useState<(Review & { book: Book })[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  const loadOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    try {
      const result = await trpc.getOrders.query({ userId: user.id });
      setOrders(result);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [user.id]);

  const loadReviews = useCallback(async () => {
    setIsLoadingReviews(true);
    try {
      // Note: We'd need to modify the backend to get user's reviews
      // For now, we'll use a placeholder approach
      setReviews([]);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setIsLoadingReviews(false);
    }
  }, [user.id]);

  useEffect(() => {
    loadOrders();
    loadReviews();
  }, [loadOrders, loadReviews]);

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderStatusEmoji = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'confirmed':
        return '✅';
      case 'shipped':
        return '🚚';
      case 'delivered':
        return '📦';
      case 'cancelled':
        return '❌';
      default:
        return '📋';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const getTotalSpent = () => {
    return orders
      .filter(order => order.status !== 'cancelled')
      .reduce((total, order) => total + order.total_amount, 0);
  };

  const getTotalOrders = () => {
    return orders.length;
  };

  const getAverageOrderValue = () => {
    const completedOrders = orders.filter(order => order.status !== 'cancelled');
    if (completedOrders.length === 0) return 0;
    return getTotalSpent() / completedOrders.length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-indigo-800 mb-2">👤 Your Profile</h2>
        <p className="text-gray-600">Manage your account and view your order history</p>
      </div>

      {/* User Info Card */}
      <Card className="border-2 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-6 w-6 mr-2" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Full Name</label>
                <p className="text-lg font-semibold">
                  {user.first_name} {user.last_name} 👋
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email Address</label>
                <p className="text-lg">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Member Since</label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <p>{user.created_at.toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{getTotalOrders()}</div>
                  <div className="text-sm text-blue-600">Orders</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">${getTotalSpent().toFixed(2)}</div>
                  <div className="text-sm text-green-600">Total Spent</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">${getAverageOrderValue().toFixed(2)}</div>
                  <div className="text-sm text-purple-600">Avg Order</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Orders and Reviews */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="orders" className="flex items-center">
            <Package className="h-4 w-4 mr-2" />
            Order History ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center">
            <Star className="h-4 w-4 mr-2" />
            My Reviews ({reviews.length})
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {isLoadingOrders ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardContent className="text-center py-16">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No orders yet</h3>
                <p className="text-gray-500">
                  Start shopping to see your orders here!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order: Order) => (
                <Card key={order.id} className="border-2 border-gray-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Order #{order.id}
                        </CardTitle>
                        <p className="text-sm text-gray-600">
                          {order.created_at.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getOrderStatusColor(order.status)}>
                          {getOrderStatusEmoji(order.status)} {order.status.toUpperCase()}
                        </Badge>
                        <div className="text-lg font-bold text-green-600 mt-1">
                          ${order.total_amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Shipping Address */}
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 mt-1 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Shipping Address:</p>
                          <p className="text-sm text-gray-600">{order.shipping_address}</p>
                        </div>
                      </div>

                      <Separator />

                      {/* Order Items */}
                      <div>
                        <p className="text-sm font-medium mb-2">Items Ordered:</p>
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm text-gray-600 italic">
                            📦 Order details will be available once the backend is fully implemented
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          {isLoadingReviews ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-16">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Reviews feature coming soon!</h3>
                <p className="text-gray-500 mb-4">
                  We're working on bringing you a comprehensive review management system.
                </p>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>📝 View all your book reviews</p>
                  <p>✏️ Edit and update your reviews</p>
                  <p>📊 See your review statistics</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}