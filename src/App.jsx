import React from 'react';
import usePrinter from './hooks/usePrinter';

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
        id: 'DEMO-' + Math.floor(Math.random() * 10000),
        items: [
          { name: 'Demo Item 1', quantity: 2, price: 100 },
          { name: 'Demo Item 2', quantity: 1, price: 50 },
        ],
        total: 250,
        customerName: 'Demo Customer'
      };
      await printReceipt(demoOrder);
      alert('Receipt sent to printer!');
    } catch (err) {
      console.error(err);
      alert('Error printing receipt: ' + err.message);
    }
  };

  const handlePrintToken = async () => {
    try {
      const demoToken = {
        tokenNumber: Math.floor(Math.random() * 100),
        type: 'DEMO',
        time: new Date().toLocaleTimeString()
      };
      await printToken(demoToken);
      alert('Token sent to printer!');
    } catch (err) {
      console.error(err);
      alert('Error printing token: ' + err.message);
    }
  };

  if (!isSupported) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>Web Bluetooth is not supported in this browser.</h2>
        <p>Please use Chrome, Edge, or another supported browser on a compatible device.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Thermal Printer Demo</h1>
      
      <div style={{ 
        padding: '15px', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        marginBottom: '20px',
        backgroundColor: isConnected ? '#e6ffe6' : '#ffe6e6'
      }}>
        <h3>Status: <strong>{printerStatus.status}</strong></h3>
        {printerStatus.deviceName && <p>Device: {printerStatus.deviceName}</p>}
        
        <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
          {!isConnected ? (
            <button 
              onClick={connect}
              style={{ padding: '10px 15px', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Connect Printer
            </button>
          ) : (
            <button 
              onClick={disconnect}
              style={{ padding: '10px 15px', backgroundColor: '#cc0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div style={{ 
        padding: '15px', 
        border: '1px solid #ccc', 
        borderRadius: '8px',
        opacity: isConnected ? 1 : 0.5,
        pointerEvents: isConnected ? 'auto' : 'none'
      }}>
        <h3>Print Actions</h3>
        <p>{isPrinting ? 'Printing in progress...' : 'Ready to print.'}</p>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
          <button 
            onClick={handlePrintReceipt}
            disabled={!isConnected || isPrinting}
            style={{ padding: '10px 15px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Print Demo Receipt
          </button>
          
          <button 
            onClick={handlePrintToken}
            disabled={!isConnected || isPrinting}
            style={{ padding: '10px 15px', backgroundColor: '#17a2b8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Print Demo Token
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
