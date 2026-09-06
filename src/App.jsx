import React from 'react';
import usePrinter from './hooks/usePrinter';
import { Bluetooth, BluetoothConnected, Printer, ReceiptText, Ticket } from 'lucide-react';

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

  const handlePrintReceipt = async () => {
    try {
      const demoOrder = {
        id: 'DEMO-1234',
        items: [
          { name: 'Special Veg Thali', quantity: 2, price: 120 },
          { name: 'Masala Chaas', quantity: 2, price: 20 },
        ],
        total: 280,
        customerName: 'Demo User'
      };
      await printReceipt(demoOrder);
    } catch (err) {
      alert('Error printing receipt: ' + err.message);
    }
  };

  const handlePrintToken = async () => {
    try {
      const demoToken = {
        tokenNumber: 42,
        type: 'DINE-IN',
        time: new Date().toLocaleTimeString()
      };
      await printToken(demoToken);
    } catch (err) {
      alert('Error printing token: ' + err.message);
    }
  };

  if (!isSupported) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-6 rounded-xl shadow-sm max-w-sm w-full text-center border border-red-100">
          <p className="text-red-600 font-medium mb-2">Browser Not Supported</p>
          <p className="text-gray-500 text-sm">Please use Chrome or Edge to access Web Bluetooth features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md w-full overflow-hidden">
        
        {/* Header section */}
        <div className="bg-blue-600 p-6 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Printer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Printer Demo</h1>
          <p className="text-blue-100 mt-1 text-sm">ESP32 Thermal Printer Bridge</p>
        </div>

        {/* Content section */}
        <div className="p-6 space-y-6">
          
          {/* Connection Status Panel */}
          <div className={`p-4 rounded-xl border ${isConnected ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500 font-medium">Status</p>
                <p className={`font-bold ${isConnected ? 'text-green-700' : 'text-gray-700'}`}>
                  {printerStatus.status === 'connecting' ? 'Connecting...' : 
                   isConnected ? (printerStatus.deviceName || 'Connected') : 'Disconnected'}
                </p>
              </div>
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`} />
            </div>

            {isConnected ? (
              <button
                onClick={disconnect}
                className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <BluetoothConnected className="w-4 h-4" />
                Disconnect
              </button>
            ) : (
              <button
                onClick={connect}
                className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Bluetooth className="w-4 h-4" />
                Connect Printer
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <p className="text-sm text-gray-500 font-medium px-1">Test Actions</p>
            
            <button
              onClick={handlePrintReceipt}
              disabled={!isConnected || isPrinting}
              className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                !isConnected || isPrinting 
                  ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' 
                  : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm group'
              }`}
            >
              <div className={`p-3 rounded-lg ${!isConnected || isPrinting ? 'bg-gray-200' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'}`}>
                <ReceiptText className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Print Receipt</p>
                <p className="text-sm text-gray-500">Demo order bill</p>
              </div>
            </button>

            <button
              onClick={handlePrintToken}
              disabled={!isConnected || isPrinting}
              className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                !isConnected || isPrinting 
                  ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' 
                  : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-sm group'
              }`}
            >
              <div className={`p-3 rounded-lg ${!isConnected || isPrinting ? 'bg-gray-200' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'}`}>
                <Ticket className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Print Token</p>
                <p className="text-sm text-gray-500">Queue token ticket</p>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
