import React, { useState, useEffect } from 'react';

const NEXAAddInventoryApp = () => {
  const [processing, setProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');

  const GOOGLE_SHEETS_CONFIG = {
    SHEET_ID: '1U1SmQThzUECR_0uFDmTIa4M_lyKgKyTqnhbsQl-zhK8',
    API_KEY: 'AIzaSyBH70BfRf8m3qs2K4WqnUKzLD8E1YY6blo',
    RANGE: 'A:K',
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwDKTHZd-Tl-IyB1SW_EHjBUkJntffkJ4AAJ2glvKM3NG0nqNTliaviU7dUzlkvT47axA/exec'
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

  const updateStockViaGet = async (itemId, quantity) => {
    setProcessing(true);
    setDebugInfo(`Starting update for ItemID: "${itemId}" with quantity: ${quantity}`);
    
    try {
      // Build the URL with parameters
      const baseUrl = GOOGLE_SHEETS_CONFIG.SCRIPT_URL;
      const params = new URLSearchParams({
        action: 'updateStock',
        itemId: itemId,
        quantity: quantity.toString()
      });
      const fullUrl = `${baseUrl}?${params.toString()}`;
      
      setDebugInfo(`Full URL being called: ${fullUrl}`);
      
      const response = await fetch(fullUrl);
      setDebugInfo(`Response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();
      setDebugInfo(`Raw response text: "${responseText}"`);

      // Check if response indicates success or error
      if (responseText.includes('SUCCESS')) {
        setLastUpdate(`✅ Updated ${itemId} at ${new Date().toLocaleTimeString()}`);
        setDebugInfo(`${responseText}\n\nWill refresh inventory in 2 seconds...`);
        
        // Show success alert
        alert(`✅ ${responseText}`);
        
        // Refresh inventory after 2 seconds
        setTimeout(() => {
          fetchInventory();
        }, 2000);
        return true;
        
      } else if (responseText.includes('ERROR')) {
        setDebugInfo(`Server returned error: ${responseText}`);
        alert(`❌ ${responseText}`);
        return false;
        
      } else {
        // This is our current problem - getting the default API message
        setDebugInfo(`Unexpected response (parameters not processed): ${responseText}`);
        alert(`⚠️ Script received request but didn't process parameters.\n\nResponse: ${responseText}`);
        return false;
      }
      
    } catch (error) {
      const errorMsg = `Connection error: ${error.message}`;
      setDebugInfo(errorMsg);
      alert(`❌ ${errorMsg}`);
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
      setDebugInfo(`Direct connection response: "${text}"`);
      alert(`✅ Direct connection works:\n${text}`);
    } catch (error) {
      const errorMsg = `Direct connection failed: ${error.message}`;
      setDebugInfo(errorMsg);
      alert(`❌ ${errorMsg}`);
    }
  };

  const testManualUrl = () => {
    if (inventory.length > 0) {
      const firstProduct = inventory[0];
      const params = new URLSearchParams({
        action: 'updateStock',
        itemId: firstProduct.itemId,
        quantity: '1'
      });
      const testUrl = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?${params.toString()}`;
      
      setDebugInfo(`Opening test URL in new window: ${testUrl}`);
      
      // Open in new window so you can see the response
      window.open(testUrl, '_blank', 'width=800,height=400');
      
      alert(`🔍 Opened test URL in new window.\n\nIf it shows "SUCCESS" message, the script works.\nIf it shows "API is running", there's a parameter issue.`);
    }
  };

  const testAddStock = async () => {
    if (inventory.length > 0) {
      const firstProduct = inventory[0];
      setDebugInfo(`Preparing to update: ${firstProduct.brand} ${firstProduct.name} (ID: "${firstProduct.itemId}")`);
      await updateStockViaGet(firstProduct.itemId, 1);
    } else {
      setDebugInfo('No inventory loaded to test with');
      alert('❌ No inventory loaded');
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
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
          </div>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: 'center', color: 'red' }}>❌ Error: {error}</h1>
          <button onClick={fetchInventory} style={{...buttonStyle, background: '#dc3545'}}>
            🔄 Try Again
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
          📊 Connected to Google Sheets ({inventory.length} products)
        </p>

        {lastUpdate && (
          <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', padding: '12px', borderRadius: '5px', marginBottom: '20px', textAlign: 'center', color: '#155724' }}>
            {lastUpdate}
          </div>
        )}

        {processing && (
          <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px', marginBottom: '20px', textAlign: 'center' }}>
            ⏳ Processing update...
          </div>
        )}

        <button 
          onClick={testDirectConnection}
          style={{...buttonStyle, background: '#17a2b8'}}
        >
          🔌 Test Basic Connection
        </button>

        <button 
          onClick={testManualUrl}
          style={{...buttonStyle, background: '#ffc107', color: '#212529'}}
        >
          🔍 Test URL in New Window
        </button>

        <button 
          onClick={testAddStock}
          disabled={processing}
          style={{
            ...buttonStyle, 
            background: processing ? '#6c757d' : '#28a745'
          }}
        >
          {processing ? '⏳ Updating...' : '➕ Add 1 to First Product'}
        </button>

        <button 
          onClick={fetchInventory}
          style={{...buttonStyle, background: '#007bff'}}
        >
          🔄 Refresh Inventory
        </button>

        <div style={{ 
          marginTop: '30px', 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '5px',
          fontSize: '11px',
          fontFamily: 'monospace'
        }}>
          <h4>📝 Debug Info:</h4>
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: '200px', overflowY: 'auto' }}>
            {debugInfo || 'Ready to test...'}
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3>📋 First 3 Products:</h3>
          {inventory.slice(0, 3).map(product => (
            <div key={product.itemId} style={{ 
              background: '#f8f9fa', 
              margin: '5px 0', 
              padding: '10px', 
              borderRadius: '5px',
              fontSize: '14px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{ fontWeight: 'bold', color: '#495057' }}>
                {product.brand} {product.name}
              </div>
              <div style={{ color: '#6c757d', fontSize: '12px' }}>
                🏷️ ID: "{product.itemId}" | 📦 Stock: {product.currentStock} | 💰 ${product.price}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NEXAAddInventoryApp;
