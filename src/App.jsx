import React, { useState, useEffect } from 'react';

const NEXAAddInventoryApp = () => {
  const [screen, setScreen] = useState('home');
  const [scannedItems, setScannedItems] = useState([]);
  const [processing, setProcessing] = useState(false);

  const GOOGLE_SHEETS_CONFIG = {
    SHEET_ID: '1U1SmQThzUECR_0uFDmTIa4M_lyKgKyTqnhbsQl-zhK8',
    API_KEY: 'AIzaSyBH70BfRf8m3qs2K4WqnUKzLD8E1YY6blo',
    RANGE: 'A:K',
    SCRIPT_URL: 'https://script.googleusercontent.com/macros/echo?user_content_key=AehSKLhUJmcUGjooXhPGIC0InDCXq4ZdgGw4eXy43-kHIiIbGB49XI1nIResJ-u6oaC3x7mm8wJYD_UVWGZHkktdMOMBlOcqAXVZ_888yGHlzHC08nwyvQpXuF8C6ojftDrfIesJZvRCYJLVQkYHEKPg0QrynVM4-6dmGL0KjoDLi-NHU9g4j76B75zrttSQx2GWoXP3zCTMS4WnP9KgYwBTcxRbZ8ELPO6MwUpub1JDHQENkETrhTyvBtt7LBWbr1V3K6OPdXMFMaY9IzuQVJ2oyYFOHOSIpQ&lib=MEqmvP8e7l_q5GZQTUohLwXqBTKkOvMGY'
  };

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);
      
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
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const updateStock = async (itemId, quantity) => {
    setProcessing(true);
    try {
      const response = await fetch(GOOGLE_SHEETS_CONFIG.SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStock', itemId, quantity })
      });

      const result = await response.json();
      if (result.success) {
        alert(`Stock updated! New stock: ${result.newStock}`);
        await fetchInventory(); // Refresh to show changes
        return true;
      } else {
        alert('Error: ' + result.error);
        return false;
      }
    } catch (error) {
      alert('Connection error: ' + error.message);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  const testAddStock = async () => {
    if (inventory.length > 0) {
      const firstProduct = inventory[0];
      await updateStock(firstProduct.itemId, 1);
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
    maxWidth: '500px',
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

        <div style={{ marginTop: '30px' }}>
          <h3>First 5 Products:</h3>
          {inventory.slice(0, 5).map(product => (
            <div key={product.itemId} style={{ 
              background: '#f8f9fa', 
              margin: '5px 0', 
              padding: '10px', 
              borderRadius: '5px',
              fontSize: '14px'
            }}>
              <strong>{product.brand} {product.name}</strong><br/>
              Stock: {product.currentStock} | Price: ${product.price}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NEXAAddInventoryApp;
