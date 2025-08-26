import React, { useState, useEffect } from 'react';

const NEXAAddInventoryApp = () => {
  const [screen, setScreen] = useState('home');
  const [scannedItems, setScannedItems] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  const GOOGLE_SHEETS_CONFIG = {
    SHEET_ID: '1U1SmQThzUECR_0uFDmTIa4M_lyKgKyTqnhbsQl-zhK8',
    API_KEY: 'AIzaSyBH70BfRf8m3qs2K4WqnUKzLD8E1YY6blo',
    RANGE: 'A:K',
    SCRIPT_URL: 'SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwDKTHZd-Tl-IyB1SW_EHjBUkJntffkJ4AAJ2glvKM3NG0nqNTliaviU7dUzlkvT47axA/exec'
  };

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo('Fetching inventory...');
      
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEETS_CONFIG.SHEET_ID}/values/${GOOGLE_SHEETS_CONFIG.RANGE}?key=${GOOGLE_SHEETS_CONFIG.API_KEY}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.values || data.values.length < 2) throw new Error('No data found');
      
      const [headers, ...rows] = data.values;
      const inventoryData = rows.map(row => ({
        itemId: row[0] || '',
        brand: row[1] || '',
        name: row[2] || '',
        bottleSize: row[3] || '',
        price: parseFloat(row[4]) || 0,
        currentStock: parseInt(row[5]) || 0,
        minimum: parseInt(row[6]) || 0,
        notes: row[7] || '',
        vendor: row[9] || '',
        vendorContact: row[10] || ''
      }));
      
      setInventory(inventoryData);
      setLoading(false);
      setDebugInfo(`Loaded ${inventoryData.length} products successfully`);
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setDebugInfo(`Read error: ${err.message}`);
    }
  };

  const updateStock = async (itemId, quantity) => {
    setProcessing(true);
    setDebugInfo('Starting stock update...');
    
    try {
      setDebugInfo(`Sending POST to: ${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}`);
      
      const requestBody = { 
        action: 'updateStock', 
        itemId: itemId, 
        quantity: quantity 
      };
      
      setDebugInfo(`Request body: ${JSON.stringify(requestBody)}`);

      const response = await fetch(GOOGLE_SHEETS_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      setDebugInfo(`Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      setDebugInfo(`Raw response: ${responseText}`);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid JSON response: ${responseText}`);
      }

      if (result.success) {
        setDebugInfo(`Success! New stock: ${result.newStock}`);
        alert(`Stock updated! ${itemId} new stock: ${result.newStock}`);
        await fetchInventory();
        return true;
      } else {
        setDebugInfo(`Server error: ${result.error}`);
        alert('Server error: ' + result.error);
        return false;
      }
      
    } catch (error) {
      const errorMsg = `Connection error: ${error.message}`;
      setDebugInfo(errorMsg);
      alert(errorMsg);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const testDirectConnection = async () => {
    setDebugInfo('Testing direct connection...');
    try {
      const response = await fetch(GOOGLE_SHEETS_CONFIG.SCRIPT_URL);
      const text = await response.text();
      setDebugInfo(`Direct GET response: ${text}`);
      alert(`Direct connection works: ${text}`);
    } catch (error) {
      const errorMsg = `Direct connection failed: ${error.message}`;
      setDebugInfo(errorMsg);
      alert(errorMsg);
    }
  };

  const testAddStock = async () => {
    if (inventory.length > 0) {
      const firstProduct = inventory[0];
      setDebugInfo(`Testing with product: ${firstProduct.itemId} (${firstProduct.name})`);
      await updateStock(firstProduct.itemId, 1);
    } else {
      setDebugInfo('No inventory loaded to test with');
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #e0e7ff 0%, #fce7f3 100%)',
    padding: '20px'
  };

  const cardStyle = {
    maxWidth: '600px',
    margin: '0 auto',
    background: 'white',
    borderRadius: '10px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    padding: '30px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '15px',
    margin: '10px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'white'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: 'center' }}>Loading inventory...</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: 'center', color: 'red' }}>Error: {error}</h1>
          <button onClick={fetchInventory} style={{...buttonStyle, background: '#dc3545'}}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <h1 style={{ textAlign: 'center', fontSize: '36px', color: '#333', marginBottom: '10px' }}>
          NEXA
        </h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
          Connected to Google Sheets ({inventory.length} products)
        </p>

        {processing && (
          <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px', marginBottom: '20px', textAlign: 'center' }}>
            Updating Google Sheets...
          </div>
        )}

        <button 
          onClick={testDirectConnection}
          style={{...buttonStyle, background: '#17a2b8'}}
        >
          Test Direct Connection
        </button>

        <button 
          onClick={testAddStock}
          disabled={processing}
          style={{
            ...buttonStyle, 
            background: processing ? '#6c757d' : '#28a745'
          }}
        >
          {processing ? 'Updating...' : 'Test: Add 1 to First Product'}
        </button>

        <button 
          onClick={fetchInventory}
          style={{...buttonStyle, background: '#007bff'}}
        >
          Refresh Inventory
        </button>

        {/* Debug Information */}
        <div style={{ 
          marginTop: '30px', 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <h4>Debug Info:</h4>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {debugInfo || 'No debug info yet'}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3>First 3 Products:</h3>
          {inventory.slice(0, 3).map(product => (
            <div key={product.itemId} style={{ 
              background: '#f8f9fa', 
              margin: '5px 0', 
              padding: '10px', 
              borderRadius: '5px',
              fontSize: '14px'
            }}>
              <strong>{product.brand} {product.name}</strong><br/>
              ID: {product.itemId} | Stock: {product.currentStock} | Price: ${product.price}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NEXAAddInventoryApp;
