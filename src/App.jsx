import React, { useState, useEffect } from 'react';

const NEXAAddInventoryApp = () => {
  const [processing, setProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

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

  // CORS workaround - use hidden form submission
  const updateStockViaForm = (itemId, quantity) => {
    setProcessing(true);
    setDebugInfo(`Updating stock for ${itemId} by ${quantity}...`);

    // Create hidden form
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GOOGLE_SHEETS_CONFIG.SCRIPT_URL;
    form.target = 'hidden_iframe';
    form.style.display = 'none';

    // Add data as form fields
    const actionField = document.createElement('input');
    actionField.name = 'action';
    actionField.value = 'updateStock';
    form.appendChild(actionField);

    const itemIdField = document.createElement('input');
    itemIdField.name = 'itemId';
    itemIdField.value = itemId;
    form.appendChild(itemIdField);

    const quantityField = document.createElement('input');
    quantityField.name = 'quantity';
    quantityField.value = quantity;
    form.appendChild(quantityField);

    // Create hidden iframe to catch response
    let iframe = document.getElementById('hidden_iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'hidden_iframe';
      iframe.name = 'hidden_iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    // Submit form
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);

    // Simulate success (since we can't read the response due to CORS)
    setTimeout(() => {
      setProcessing(false);
      setDebugInfo(`Form submitted successfully for ${itemId}`);
      alert(`Stock update submitted for ${itemId}!\n\nCheck your Google Sheet to confirm the change.`);
      
      // Refresh inventory to show changes
      setTimeout(() => {
        fetchInventory();
      }, 2000);
    }, 1000);
  };

  // Alternative: Open Google Apps Script in new window
  const updateStockViaWindow = (itemId, quantity) => {
    const url = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=updateStock&itemId=${itemId}&quantity=${quantity}`;
    const popup = window.open(url, 'stock_update', 'width=500,height=300');
    
    setDebugInfo(`Opened update window for ${itemId}`);
    alert(`Update window opened!\n\nThe stock should be updated automatically.\nClose the popup window and click "Refresh Inventory" to see changes.`);
  };

  const testAddStock = () => {
    if (inventory.length > 0) {
      const firstProduct = inventory[0];
      const method = confirm(
        `Update stock for: ${firstProduct.brand} ${firstProduct.name}\n\n` +
        `Click OK for Form Method (hidden)\n` +
        `Click Cancel for Window Method (visible popup)`
      );
      
      if (method) {
        updateStockViaForm(firstProduct.itemId, 1);
      } else {
        updateStockViaWindow(firstProduct.itemId, 1);
      }
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
          Inventory System ({inventory.length} products)
        </p>

        {processing && (
          <div style={{ background: '#fff3cd', padding: '15px', borderRadius: '5px', marginBottom: '20px', textAlign: 'center' }}>
            Processing update...
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
          {processing ? 'Processing...' : 'Test: Add 1 to First Product'}
        </button>

        <button 
          onClick={fetchInventory}
          style={{...buttonStyle, background: '#007bff'}}
        >
          Refresh Inventory
        </button>

        <div style={{ 
          marginTop: '30px', 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '5px',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          <h4>Status:</h4>
          <div>{debugInfo || 'Ready to test'}</div>
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
