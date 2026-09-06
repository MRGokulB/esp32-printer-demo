import React, { useState } from 'react';
import usePrinter from './hooks/usePrinter';
import { Bluetooth, BluetoothConnected, Printer, Plus, Minus, X, CheckCircle2, AlertCircle } from 'lucide-react';

const DUMMY_PRODUCTS = [
  { id: 1, name: 'Special Veg Thali', price: 120, category: 'Meals' },
  { id: 2, name: 'Mini Thali', price: 80, category: 'Meals' },
  { id: 3, name: 'Butter Roti', price: 15, category: 'Breads' },
  { id: 4, name: 'Plain Roti', price: 12, category: 'Breads' },
  { id: 5, name: 'Paneer Masala', price: 90, category: 'Curries' },
  { id: 6, name: 'Dal Fry', price: 60, category: 'Curries' },
  { id: 7, name: 'Jeera Rice', price: 70, category: 'Rice' },
  { id: 8, name: 'Masala Chaas', price: 20, category: 'Beverages' },
];

function App() {
  const {
    printerStatus,
    isPrinting,
    isSupported,
    isConnected,
    connect,
    disconnect,
    printReceipt,
    printToken,
  } = usePrinter();

  const [cart, setCart] = useState([]);
  const [lastOrder, setLastOrder] = useState(null);

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQ = item.quantity + delta;
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const orderData = {
      id: 'ORD-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      items: cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      total: totalAmount,
      customerName: 'Walk-in Customer'
    };
    
    setLastOrder(orderData);
    
    if (isConnected) {
      try {
        await printReceipt(orderData);
        setCart([]); // clear cart on success
      } catch (err) {
        alert('Failed to print receipt: ' + err.message);
      }
    } else {
      alert('Checkout successful, but printer is not connected. Connect printer to print receipt.');
      setCart([]);
    }
  };

  const handleReprintReceipt = async () => {
    if (!lastOrder) return;
    if (!isConnected) {
      alert('Please connect the printer first.');
      return;
    }
    try {
      await printReceipt(lastOrder);
    } catch (err) {
      alert('Failed to reprint: ' + err.message);
    }
  };

  const handlePrintToken = async () => {
    if (!isConnected) {
      alert('Please connect the printer first.');
      return;
    }
    try {
      const tokenData = {
        tokenNumber: Math.floor(Math.random() * 900) + 100, // 100-999
        type: 'DINE-IN',
        time: new Date().toLocaleTimeString()
      };
      await printToken(tokenData);
    } catch (err) {
      alert('Failed to print token: ' + err.message);
    }
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Browser Not Supported</h2>
          <p className="text-gray-600">
            Web Bluetooth is not supported in this browser. Please use Chrome or Edge on a compatible device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 rounded-lg">
              <Printer className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">ManeMess POS</h1>
            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Hardware Demo
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
              {printerStatus.status === 'connecting' ? 'Connecting...' : 
               isConnected ? printerStatus.deviceName || 'Connected' : 'Offline'}
            </div>
            
            {isConnected ? (
              <button
                onClick={disconnect}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <BluetoothConnected className="w-4 h-4" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={connect}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
              >
                <Bluetooth className="w-4 h-4" />
                Connect Printer
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column - Products */}
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Menu Items</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {DUMMY_PRODUCTS.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-orange-500 hover:shadow-md transition-all text-left flex flex-col justify-between aspect-square"
              >
                <div>
                  <span className="text-xs font-medium text-gray-500 mb-1 block">{product.category}</span>
                  <h3 className="font-semibold text-gray-900 leading-tight">{product.name}</h3>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-orange-600">₹{product.price}</span>
                  <div className="bg-gray-100 p-1.5 rounded-md text-gray-600">
                    <Plus className="w-4 h-4" />
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-100 rounded-xl p-6">
            <h3 className="text-md font-semibold text-blue-900 mb-2">Printer Utilities</h3>
            <p className="text-sm text-blue-700 mb-4">Test raw token generation independent of the cart.</p>
            <div className="flex gap-4">
              <button
                onClick={handlePrintToken}
                disabled={!isConnected || isPrinting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  !isConnected || isPrinting
                    ? 'bg-blue-200 text-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                <Printer className="w-4 h-4" />
                {isPrinting ? 'Printing...' : 'Print Queue Token'}
              </button>
              
              {lastOrder && (
                <button
                  onClick={handleReprintReceipt}
                  disabled={!isConnected || isPrinting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    !isConnected || isPrinting
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                  Reprint Last Order
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Cart */}
        <div className="w-full lg:w-96 flex flex-col">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-full max-h-[80vh] overflow-hidden sticky top-24">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Current Order</h2>
              <span className="bg-gray-200 text-gray-700 py-0.5 px-2.5 rounded-full text-sm font-medium">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Printer className="w-12 h-12 mb-3 text-gray-300" />
                  <p>Order is empty</p>
                  <p className="text-sm mt-1">Select items from the menu to begin</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                        <span className="text-gray-500 text-sm">₹{item.price}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1 hover:bg-white rounded-md text-gray-600 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-4 text-center font-medium text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1 hover:bg-white rounded-md text-gray-600 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="w-16 text-right font-semibold text-gray-900 text-sm">
                        ₹{item.price * item.quantity}
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="text-xl font-bold text-gray-900">₹{totalAmount}</span>
              </div>
              
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || isPrinting}
                className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  cart.length === 0 || isPrinting
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                {isPrinting ? 'Printing Receipt...' : `Charge ₹${totalAmount}`}
              </button>
              
              {!isConnected && cart.length > 0 && (
                <p className="text-xs text-center text-orange-600 mt-2 font-medium">
                  ?? Printer disconnected. Receipt won't print.
                </p>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
