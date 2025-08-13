import { useState } from 'react';
import { trpc } from '@/utils/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { CreditCard, MapPin, Package, CheckCircle, Truck, Shield } from 'lucide-react';
import type { CartItem, Book, CreateOrderInput } from '../../../server/src/schema';

interface CheckoutProps {
  cartItems: CartItem[];
  totalAmount: number;
  onCheckoutComplete: () => void;
  userId: number;
}

export function Checkout({ cartItems, totalAmount, onCheckoutComplete, userId }: CheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<'shipping' | 'payment' | 'review' | 'complete'>('shipping');
  
  // Form states
  const [shippingData, setShippingData] = useState({
    fullName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: ''
  });

  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });

  const getTaxAmount = () => totalAmount * 0.08;
  const getShippingAmount = () => 0; // Free shipping
  const getFinalTotal = () => totalAmount + getTaxAmount() + getShippingAmount();

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!shippingData.fullName || !shippingData.address || !shippingData.city || !shippingData.state || !shippingData.zipCode) {
      setError('Please fill in all shipping information');
      return;
    }
    
    setError(null);
    setCurrentStep('payment');
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardName) {
      setError('Please fill in all payment information');
      return;
    }

    // Basic card number validation (should be 16 digits)
    if (paymentData.cardNumber.replace(/\s/g, '').length !== 16) {
      setError('Please enter a valid 16-digit card number');
      return;
    }
    
    setError(null);
    setCurrentStep('review');
  };

  const handleCompleteOrder = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const fullAddress = `${shippingData.address}, ${shippingData.city}, ${shippingData.state} ${shippingData.zipCode}`;
      
      await trpc.createOrder.mutate({
        userId,
        shipping_address: fullAddress
      });

      setCurrentStep('complete');
      
      // Complete checkout after 3 seconds
      setTimeout(() => {
        onCheckoutComplete();
      }, 3000);
      
    } catch (error: any) {
      setError(error.message || 'Failed to process order');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Step indicator component
  const StepIndicator = () => {
    const steps = [
      { id: 'shipping', name: 'Shipping', icon: MapPin },
      { id: 'payment', name: 'Payment', icon: CreditCard },
      { id: 'review', name: 'Review', icon: Package },
      { id: 'complete', name: 'Complete', icon: CheckCircle }
    ];

    const getCurrentStepIndex = () => {
      return steps.findIndex(step => step.id === currentStep);
    };

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = index < getCurrentStepIndex();
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive 
                  ? 'border-indigo-600 bg-indigo-600 text-white' 
                  : isCompleted 
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 bg-white text-gray-400'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-indigo-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${
                  isCompleted ? 'bg-green-600' : 'bg-gray-300'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (currentStep === 'complete') {
    return (
      <div className="max-w-md mx-auto text-center">
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-8 pb-8">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-800 mb-2">Order Complete!</h2>
            <p className="text-green-700 mb-4">
              Thank you for your purchase! Your order has been successfully placed.
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-green-600">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-1" />
                Order Confirmed
              </div>
              <div className="flex items-center">
                <Truck className="h-4 w-4 mr-1" />
                Processing
              </div>
            </div>
            <div className="mt-6 p-4 bg-white rounded-lg border border-green-200">
              <p className="text-sm text-gray-600">
                📧 A confirmation email has been sent to your email address.
              </p>
              <p className="text-sm text-gray-600 mt-1">
                🚚 Your books will be shipped within 2-3 business days.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-indigo-800 mb-2">💳 Checkout</h2>
        <p className="text-gray-600">Complete your purchase securely</p>
      </div>

      <StepIndicator />

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            ❌ {error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Shipping Information */}
          {currentStep === 'shipping' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <form onSubmit={handleShippingSubmit}>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="fullName">👤 Full Name</Label>
                    <Input
                      id="fullName"
                      value={shippingData.fullName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setShippingData(prev => ({ ...prev, fullName: e.target.value }))
                      }
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address">🏠 Street Address</Label>
                    <Input
                      id="address"
                      value={shippingData.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setShippingData(prev => ({ ...prev, address: e.target.value }))
                      }
                      placeholder="123 Main Street, Apt 4B"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">🏙️ City</Label>
                      <Input
                        id="city"
                        value={shippingData.city}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setShippingData(prev => ({ ...prev, city: e.target.value }))
                        }
                        placeholder="New York"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">🗺️ State</Label>
                      <Input
                        id="state"
                        value={shippingData.state}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setShippingData(prev => ({ ...prev, state: e.target.value }))
                        }
                        placeholder="NY"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipCode">📮 ZIP Code</Label>
                      <Input
                        id="zipCode"
                        value={shippingData.zipCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setShippingData(prev => ({ ...prev, zipCode: e.target.value }))
                        }
                        placeholder="10001"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">📞 Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={shippingData.phone}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setShippingData(prev => ({ ...prev, phone: e.target.value }))
                        }
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full">
                    Continue to Payment
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Payment Information */}
          {currentStep === 'payment' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Information
                </CardTitle>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Shield className="h-4 w-4" />
                  <span>Your payment information is encrypted and secure</span>
                </div>
              </CardHeader>
              <form onSubmit={handlePaymentSubmit}>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="cardName">💳 Name on Card</Label>
                    <Input
                      id="cardName"
                      value={paymentData.cardName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPaymentData(prev => ({ ...prev, cardName: e.target.value }))
                      }
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cardNumber">🔢 Card Number</Label>
                    <Input
                      id="cardNumber"
                      value={paymentData.cardNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPaymentData(prev => ({ ...prev, cardNumber: formatCardNumber(e.target.value) }))
                      }
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiryDate">📅 Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        value={paymentData.expiryDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPaymentData(prev => ({ ...prev, expiryDate: formatExpiryDate(e.target.value) }))
                        }
                        placeholder="MM/YY"
                        maxLength={5}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">🔒 CVV</Label>
                      <Input
                        id="cvv"
                        type="password"
                        value={paymentData.cvv}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPaymentData(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '') }))
                        }
                        placeholder="123"
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep('shipping')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1">
                    Review Order
                  </Button>
                </CardFooter>
              </form>
            </Card>
          )}

          {/* Order Review */}
          {currentStep === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Review Your Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shipping Address */}
                <div>
                  <h3 className="font-semibold mb-2">📍 Shipping Address</h3>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p>{shippingData.fullName}</p>
                    <p>{shippingData.address}</p>
                    <p>{shippingData.city}, {shippingData.state} {shippingData.zipCode}</p>
                    {shippingData.phone && <p>📞 {shippingData.phone}</p>}
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <h3 className="font-semibold mb-2">💳 Payment Method</h3>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm">
                    <p>Credit Card ending in {paymentData.cardNumber.slice(-4)}</p>
                    <p>{paymentData.cardName}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2">📚 Order Items</h3>
                  <div className="space-y-2">
                    {cartItems.map((item: CartItem) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded flex items-center justify-center">
                            📖
                          </div>
                          <div>
                            <p className="font-medium text-sm">Book #{item.book_id}</p>
                            <p className="text-xs text-gray-600">Details pending backend implementation</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${(29.99 * item.quantity).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep('payment')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleCompleteOrder}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Place Order
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="border-2 border-indigo-200 sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Order Summary
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Items */}
              <div className="space-y-2">
                {cartItems.map((item: CartItem) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="flex-1 truncate">
                      Book #{item.book_id} × {item.quantity}
                    </span>
                    <span>${(29.99 * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${totalAmount.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-600">FREE 🎉</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>${getTaxAmount().toFixed(2)}</span>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-600">
                  ${getFinalTotal().toFixed(2)}
                </span>
              </div>

              {/* Security Badge */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <Shield className="h-5 w-5 mx-auto text-green-600 mb-1" />
                <p className="text-xs text-green-700">
                  🔒 Secure SSL Encryption
                  <br />
                  Your payment is protected
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}