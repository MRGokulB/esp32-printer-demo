import { useState, useRef, useCallback } from 'react';
import usePrinter from './hooks/usePrinter';
import { Printer, X, Plus, Minus, History, CheckSquare, Square, Banknote, QrCode, Bluetooth, BluetoothOff, BluetoothConnected, Loader2, Unplug, Sparkles } from 'lucide-react';

const DAILY_MENU = {
  priceFull: 100,
  priceHalf: 60,
  priceNonVegFull: 150,
  priceNonVegHalf: 100,
  isNonVegAvailable: true,
  special: 'Paneer Butter Masala',
  items: ['Dal Fry', 'Jeera Rice', 'Roti', 'Papad', 'Salad'],
};

const PRINTER_STATUS_CONFIG = {
  idle: { icon: BluetoothOff, label: 'Connect Printer', color: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
  scanning: { icon: Loader2, label: 'Scanning...', color: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-400', spin: true },
  connecting: { icon: Loader2, label: 'Connecting...', color: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400', spin: true },
  connected: { icon: BluetoothConnected, label: 'Connected', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  disconnected: { icon: BluetoothOff, label: 'Disconnected', color: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-400' },
  cancelled: { icon: BluetoothOff, label: 'Connect Printer', color: 'bg-gray-100 text-gray-500 border-gray-200', dot: 'bg-gray-400' },
  error: { icon: BluetoothOff, label: 'Error', color: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-400' },
};

const THALI_COLORS = {
  'Full': { bg: 'bg-blue-600', light: 'bg-blue-50' },
  'Half': { bg: 'bg-green-600', light: 'bg-green-50' },
  'Non-Veg Full': { bg: 'bg-red-600', light: 'bg-red-50' },
  'Non-Veg Half': { bg: 'bg-orange-500', light: 'bg-orange-50' },
};

const PrinterStatusBar = ({ printerStatus, isConnected, isPrinting, isSupported, onConnect, onDisconnect }) => {
  if (!isSupported) return null;

  const config = PRINTER_STATUS_CONFIG[printerStatus.status] || PRINTER_STATUS_CONFIG.idle;
  const Icon = config.icon;
  const isLoading = config.spin;
  const deviceName = printerStatus.deviceName;

  return (
    <div className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${config.color}`}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {isConnected && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`} />}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
        </span>
        <Icon size={14} className={isLoading ? 'animate-spin' : ''} />
        <span>{deviceName && isConnected ? deviceName : config.label}</span>
        {isPrinting && <span className="ml-1 opacity-70">(Printing...)</span>}
      </div>
      {isConnected ? (
        <button onClick={onDisconnect} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/70 hover:bg-white border border-current/10 transition-colors">
          <Unplug size={12} /> Disconnect
        </button>
      ) : (
        <button onClick={onConnect} disabled={isLoading} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/70 hover:bg-white border border-current/10 transition-colors disabled:opacity-50">
          <Bluetooth size={12} /> Pair
        </button>
      )}
    </div>
  );
};

const SalesHistoryModal = ({ onClose, onPrint, sales }) => {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <History size={20} className="text-gray-500" /> Transactions
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-0">
          {sales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <History size={48} className="mb-4 opacity-20" />
              <p>No transactions yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sales.map((sale) => (
                <div key={sale.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold">Order #{sale.id.toString().slice(-4)}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {new Date(sale.timestamp).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-bold ${sale.paymentMode === 'UPI' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                        {sale.paymentMode === 'UPI' ? <QrCode size={10} /> : <Banknote size={10} />}
                        {sale.paymentMode || 'Cash'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {sale.items.map(i => `${i.qty} x ${i.name}`).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg mb-1">₹{sale.total}</div>
                    <button onClick={() => onPrint(sale)} className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ml-auto">
                      <Printer size={12} /> Print
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function App() {
  const { printerStatus, isPrinting, isSupported, isConnected, connect, disconnect, printReceipt } = usePrinter();
  const [cart, setCart] = useState([]);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [lastOrder, setLastOrder] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sales, setSales] = useState([]);
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [autoPrint, setAutoPrint] = useState(true);

  const handleBluetoothConnect = async () => {
    try {
      await connect();
    } catch (err) {
      alert(`Connection failed: ${err.message}`);
    }
  };

  const handlePrint = useCallback((order) => {
    if (!order || !isConnected) return;
    printReceipt(order).catch((err) => alert(`Print failed: ${err.message}`));
  }, [isConnected, printReceipt]);

  const addToCart = (type) => {
    let price = 0;
    if (type === 'Full') price = DAILY_MENU.priceFull;
    else if (type === 'Half') price = DAILY_MENU.priceHalf;
    else if (type === 'Non-Veg Full') price = DAILY_MENU.priceNonVegFull;
    else if (type === 'Non-Veg Half') price = DAILY_MENU.priceNonVegHalf;

    const existing = cart.find(i => i.type === type);
    if (existing) {
      setCart(cart.map(i => i.type === type ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { type, name: `${type} Thali`, printName: `${type} Thali`, price, qty: 1 }]);
    }
  };

  const updateQuantity = (type, change) => {
    setCart(prev => prev.map(item => {
      if (item.type === type) return { ...item, qty: Math.max(0, item.qty + change) };
      return item;
    }).filter(item => item.qty > 0));
  };

  const removeItem = (type) => setCart(cart.filter(i => i.type !== type));

  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const orderData = {
      id: Date.now(),
      items: cart,
      total: calculateTotal(),
      paymentMode,
      timestamp: new Date().toISOString(),
    };
    setSales(prev => [orderData, ...prev]);
    setLastOrder(orderData);
    setCart([]);
    if (autoPrint) handlePrint(orderData);
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-xl shadow-sm max-w-sm w-full text-center border border-red-100">
          <p className="text-red-600 font-medium mb-2">Browser Not Supported</p>
          <p className="text-gray-500 text-sm">Please use Chrome or Edge to access Web Bluetooth.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {showHistory && <SalesHistoryModal onClose={() => setShowHistory(false)} onPrint={handlePrint} sales={sales} />}

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-4 lg:gap-8 pb-24 lg:pb-0">

          {/* Menu Section */}
          <div className="space-y-4 md:space-y-6">
            <header>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Point of Sale</h2>
              <p className="text-sm text-gray-500">Quick billing & thermal printing</p>
            </header>

            <div className={`grid ${DAILY_MENU.isNonVegAvailable ? 'grid-cols-2 xl:grid-cols-4' : 'grid-cols-2'} gap-3 md:gap-4`}>
              <button onClick={() => addToCart('Full')} className="p-4 md:p-6 bg-blue-600 border border-blue-700 rounded-2xl shadow-sm hover:bg-blue-700 transition-colors text-left">
                <div className="text-white">
                  <div className="text-xs md:text-sm font-bold text-blue-100 mb-0.5 tracking-wider">Full Thali</div>
                  <div className="text-[10px] text-blue-200 font-medium mb-1 md:mb-2">पूर्ण थाळी</div>
                  <div className="text-2xl md:text-4xl font-black mb-0.5 md:mb-1">₹{DAILY_MENU.priceFull}</div>
                  <div className="text-[10px] md:text-xs text-blue-200">Regular</div>
                </div>
              </button>

              <button onClick={() => addToCart('Half')} className="p-4 md:p-6 bg-green-600 border border-green-700 rounded-2xl shadow-sm hover:bg-green-700 transition-colors text-left">
                <div className="text-white">
                  <div className="text-xs md:text-sm font-bold text-green-100 mb-0.5 tracking-wider">Half Thali</div>
                  <div className="text-[10px] text-green-200 font-medium mb-1 md:mb-2">अर्धी थाळी</div>
                  <div className="text-2xl md:text-4xl font-black mb-0.5 md:mb-1">₹{DAILY_MENU.priceHalf}</div>
                  <div className="text-[10px] md:text-xs text-green-200">Light</div>
                </div>
              </button>

              {DAILY_MENU.isNonVegAvailable && (
                <>
                  <button onClick={() => addToCart('Non-Veg Full')} className="p-4 md:p-6 bg-red-600 border border-red-700 rounded-2xl shadow-sm hover:bg-red-700 transition-colors text-left">
                    <div className="text-white">
                      <div className="text-xs md:text-sm font-bold text-red-100 mb-0.5 tracking-wider">Non-Veg Full</div>
                      <div className="text-[10px] text-red-200 font-medium mb-1 md:mb-2">नॉन-व्हेज पूर्ण</div>
                      <div className="text-2xl md:text-4xl font-black mb-0.5 md:mb-1">₹{DAILY_MENU.priceNonVegFull}</div>
                      <div className="text-[10px] md:text-xs text-red-200">Regular</div>
                    </div>
                  </button>

                  <button onClick={() => addToCart('Non-Veg Half')} className="p-4 md:p-6 bg-orange-500 border border-orange-600 rounded-2xl shadow-sm hover:bg-orange-600 transition-colors text-left">
                    <div className="text-white">
                      <div className="text-xs md:text-sm font-bold text-orange-100 mb-0.5 tracking-wider">Non-Veg Half</div>
                      <div className="text-[10px] text-orange-200 font-medium mb-1 md:mb-2">नॉन-व्हेज अर्धी</div>
                      <div className="text-2xl md:text-4xl font-black mb-0.5 md:mb-1">₹{DAILY_MENU.priceNonVegHalf}</div>
                      <div className="text-[10px] md:text-xs text-orange-200">Light</div>
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* Custom Item Add */}
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-sm">
              <h4 className="font-bold text-sm text-gray-800 flex items-center gap-2 mb-3">
                <Plus size={16} /> Add Custom Item
              </h4>
              <div className="flex flex-col gap-3">
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="Item name"
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                />
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="number"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder="Price (₹)"
                    className="flex-1 min-w-0 px-3 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-500 transition-colors bg-gray-50 focus:bg-white"
                  />
                  <button
                    onClick={() => {
                      if (customName && customPrice) {
                        setCart(prev => [...prev, { type: 'Custom', name: customName, printName: customName, price: Number(customPrice), qty: 1 }]);
                        setCustomName('');
                        setCustomPrice('');
                      }
                    }}
                    className="px-4 sm:px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black text-sm transition-colors active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <Plus size={16} /><span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h4 className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-2"><Sparkles size={16} /> Today's Special</h4>
              <p className="text-blue-700 text-sm font-medium">{DAILY_MENU.special} <span className="opacity-70 font-normal">({DAILY_MENU.items.join(', ')})</span></p>
            </div>
          </div>

          {/* Cart / Bill Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-200 flex flex-col h-auto lg:h-[calc(100vh-80px)] lg:sticky lg:top-6 overflow-hidden">
            <div className="px-4 pt-3 md:px-6 md:pt-4">
              <PrinterStatusBar
                printerStatus={printerStatus}
                isConnected={isConnected}
                isPrinting={isPrinting}
                isSupported={isSupported}
                onConnect={handleBluetoothConnect}
                onDisconnect={disconnect}
              />
            </div>
            <div className="p-4 md:p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 text-lg">Current Bill</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setAutoPrint(!autoPrint)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${autoPrint ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500'}`}
                >
                  {autoPrint ? <CheckSquare size={14} /> : <Square size={14} />}
                  Auto Print
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="text-gray-500 hover:text-gray-900 p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1 text-sm font-medium"
                >
                  <History size={18} /><span className="hidden sm:inline">History</span>
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 md:p-6 space-y-4 overflow-y-auto max-h-[400px] lg:max-h-none">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                  <Printer size={48} className="mb-4 opacity-20" />
                  <p>No items in bill</p>
                </div>
              ) : (
                cart.map((item, i) => {
                  const thaliColor = THALI_COLORS[item.type];
                  return (
                    <div key={i} className={`flex items-stretch rounded-xl border border-gray-100 overflow-hidden ${thaliColor?.light || 'bg-gray-50'}`}>
                      {thaliColor && <div className={`w-2 shrink-0 ${thaliColor.bg}`} />}
                      <div className="flex-1 flex justify-between items-center p-3">
                        <div>
                          <div className="font-bold text-gray-900 text-sm md:text-base">{item.name}</div>
                          <div className="text-xs text-gray-400">₹{item.price} each</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
                            <button onClick={() => updateQuantity(item.type, -1)} className="w-6 h-6 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded transition-colors">
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-bold w-4 text-center">{item.qty}</span>
                            <button onClick={() => updateQuantity(item.type, 1)} className="w-6 h-6 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors">
                              <Plus size={14} />
                            </button>
                          </div>
                          <div className="font-bold text-gray-900 min-w-[3rem] text-right">₹{item.price * item.qty}</div>
                          <button onClick={() => removeItem(item.type)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 md:p-6 border-t border-gray-200 space-y-3 md:space-y-4 bg-gray-50">
              <div className="flex justify-between items-center text-lg md:text-xl font-bold text-gray-900">
                <span>Total</span>
                <span className="text-2xl font-black">₹{calculateTotal()}</span>
              </div>

              {lastOrder ? (
                <div className="space-y-3">
                  <div className="bg-green-100 text-green-700 p-3 rounded-xl text-center font-bold text-sm">
                    Order Placed! #{lastOrder.id.toString().slice(-4)}
                  </div>
                  <button
                    onClick={() => handlePrint(lastOrder)}
                    className="w-full bg-gray-900 text-white py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-colors text-sm md:text-base"
                  >
                    <Printer size={18} /> Reprint Receipt
                  </button>
                  <button
                    onClick={() => setLastOrder(null)}
                    className="w-full bg-white border border-gray-200 text-gray-900 py-3 md:py-4 rounded-xl font-bold hover:bg-gray-50 text-sm md:text-base"
                  >
                    New Order
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2 p-1 bg-gray-100/50 rounded-xl border border-gray-200/50">
                    <button
                      onClick={() => setPaymentMode('Cash')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${paymentMode === 'Cash' ? 'bg-white text-green-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                      <Banknote size={16} /><span>Cash</span>
                    </button>
                    <button
                      onClick={() => setPaymentMode('UPI')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${paymentMode === 'UPI' ? 'bg-white text-blue-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                    >
                      <QrCode size={16} /><span>UPI</span>
                    </button>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    className={`w-full text-white py-3 md:py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed ${paymentMode === 'UPI' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
                  >
                    {autoPrint ? (<>Accept & Print <Printer size={16} className="ml-1 opacity-80" /></>) : 'Accept Payment'}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
