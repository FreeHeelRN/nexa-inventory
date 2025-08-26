import React, { useState, useEffect } from 'react';

const NEXAAddInventoryApp = () => {
  const [screen, setScreen] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newItemId, setNewItemId] = useState('');
  const [newProduct, setNewProduct] = useState({
    itemId: '',
    brand: '',
    name: '',
    bottleSize: '',
    price: '',
    quantity: 1,
    minimum: '',
    notes: '',
    vendor: '',
    vendorContact: ''
  });

  const GOOGLE_SHEETS_CONFIG = {
    SHEET_ID: '1U1SmQThzUECR_0uFDmTIa4M_lyKgKyTqnhbsQl-zhK8',
    API_KEY: 'AIzaSyBH70BfRf8m3qs2K4WqnUKzLD8E1YY6blo',
    RANGE: 'A:K',
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxuRWjKteYzumXLMJClMELECCwOaM5t89kbpb96Pd3Vq1G4bYeRjEi94PhP70EtGyy2PQ/exec'
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

  // Search products by name or brand
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    const results = inventory.filter(product => 
      product.name.toLowerCase().includes(term.toLowerCase()) ||
      product.brand.toLowerCase().includes(term.toLowerCase()) ||
      product.itemId.toLowerCase().includes(term.toLowerCase())
    );
    
    setSearchResults(results.slice(0, 20)); // Limit to 20 results
  };

  // Update ItemId for existing product
  const updateProductItemId = async (product, newId) => {
    setProcessing(true);
    setStatusMessage(`Updating barcode for ${product.name}...`);
    
    try {
      const url = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=updateItemId&oldItemId=${encodeURIComponent(product.itemId)}&newItemId=${encodeURIComponent(newId)}&productName=${encodeURIComponent(product.name)}&brand=${encodeURIComponent(product.brand)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      if (responseText.includes('SUCCESS')) {
        setStatusMessage(`✅ Updated barcode for ${product.name}`);
        setSelectedProduct(null);
        setNewItemId('');
        setSearchTerm('');
        setSearchResults([]);
        
        // Refresh inventory
        setTimeout(() => {
          fetchInventory();
          setStatusMessage('');
        }, 2000);
        
        return true;
      } else {
        setStatusMessage(`❌ Error: ${responseText}`);
        return false;
      }
      
    } catch (error) {
      setStatusMessage(`❌ Connection error: ${error.message}`);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Add new product to Google Sheets
  const addNewProductToInventory = async (productData) => {
    setProcessing(true);
    setStatusMessage('Adding new product to inventory...');
    
    try {
      const url = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=addNewProduct&itemId=${encodeURIComponent(productData.itemId)}&brand=${encodeURIComponent(productData.brand)}&name=${encodeURIComponent(productData.name)}&bottleSize=${encodeURIComponent(productData.bottleSize)}&price=${encodeURIComponent(productData.price)}&quantity=${encodeURIComponent(productData.quantity)}&minimum=${encodeURIComponent(productData.minimum)}&notes=${encodeURIComponent(productData.notes)}&vendor=${encodeURIComponent(productData.vendor)}&vendorContact=${encodeURIComponent(productData.vendorContact)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      if (responseText.includes('SUCCESS')) {
        setStatusMessage(`✅ Successfully added: ${productData.brand} ${productData.name}`);
        
        // Reset form
        setNewProduct({
          itemId: '',
          brand: '',
          name: '',
          bottleSize: '',
          price: '',
          quantity: 1,
          minimum: '',
          notes: '',
          vendor: '',
          vendorContact: ''
        });
        
        // Refresh inventory
        setTimeout(() => {
          fetchInventory();
          setStatusMessage('');
        }, 2000);
        
        return true;
      } else {
        setStatusMessage(`❌ Error: ${responseText}`);
        return false;
      }
      
    } catch (error) {
      setStatusMessage(`❌ Connection error: ${error.message}`);
      return false;
    } finally {
      setProcessing(false);
    }
  };

  // Handle new product form submission
  const handleNewProductSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newProduct.itemId.trim()) {
      alert('❌ Item ID is required');
      return;
    }
    
    if (!newProduct.name.trim()) {
      alert('❌ Product name is required');
      return;
    }
    
    // Check if product already exists
    const existingProduct = inventory.find(item => item.itemId === newProduct.itemId.trim());
    if (existingProduct) {
      if (!confirm(`Product with ID "${newProduct.itemId}" already exists.\n\nDo you want to continue anyway?`)) {
        return;
      }
    }
    
    await addNewProductToInventory(newProduct);
  };

  // Handle ItemId update submission
  const handleItemIdUpdate = async (e) => {
    e.preventDefault();
    
    if (!newItemId.trim()) {
      alert('❌ Please enter a new barcode/Item ID');
      return;
    }

    if (newItemId.trim() === selectedProduct.itemId) {
      alert('❌ New barcode is the same as current barcode');
      return;
    }

    // Check if new ItemId already exists
    const existingProduct = inventory.find(item => item.itemId === newItemId.trim());
    if (existingProduct) {
      if (!confirm(`Barcode "${newItemId}" is already used by "${existingProduct.name}".\n\nDo you want to continue anyway?`)) {
        return;
      }
    }

    await updateProductItemId(selectedProduct, newItemId.trim());
  };

  // Clear form
  const clearForm = () => {
    setNewProduct({
      itemId: '',
      brand: '',
      name: '',
      bottleSize: '',
      price: '',
      quantity: 1,
      minimum: '',
      notes: '',
      vendor: '',
      vendorContact: ''
    });
    setStatusMessage('');
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
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    padding: '30px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '16px',
    margin: '8px 0',
    fontSize: '18px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: 'white',
    transition: 'all 0.2s'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    fontSize: '16px',
    marginBottom: '12px',
    boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontWeight: '600',
    color: '#374151'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: 'center', color: '#6b7280' }}>Loading NEXA...</h1>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #8b5cf6',
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
          <h1 style={{ textAlign: 'center', color: '#dc2626' }}>Connection Error</h1>
          <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '30px' }}>{error}</p>
          <button onClick={fetchInventory} style={{...buttonStyle, background: '#dc2626'}}>
            🔄 Try Again
          </button>
        </div>
      </div>
    );
  }

  // HOME SCREEN
  if (screen === 'home') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              NEXA
            </h1>
            <p style={{ color: '#6b7280', fontSize: '18px' }}>Add Inventory System</p>
            <p style={{ fontSize: '14px', color: '#059669', marginTop: '8px' }}>
              📊 {inventory.length} products in database
            </p>
          </div>

          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
              border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px', 
              textAlign: 'center',
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b'
            }}>
              {statusMessage}
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            <button 
              onClick={() => setScreen('newProduct')}
              style={{...buttonStyle, background: '#8b5cf6'}}
            >
              ➕ Add New Product
            </button>

            <button 
              onClick={() => setScreen('searchUpdate')}
              style={{...buttonStyle, background: '#f59e0b'}}
            >
              🔍 Search & Update Barcode
            </button>

            <button 
              onClick={() => alert('🚧 Barcode scanning coming soon!')}
              style={{...buttonStyle, background: '#3b82f6'}}
            >
              📱 Scan Barcode
            </button>

            <button 
              onClick={() => alert('🚧 Invoice scanning coming soon!')}
              style={{...buttonStyle, background: '#10b981'}}
            >
              📄 Scan Invoice
            </button>

            <button 
              onClick={fetchInventory}
              style={{...buttonStyle, background: '#6b7280', fontSize: '16px', padding: '12px'}}
            >
              🔄 Refresh Inventory
            </button>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ color: '#374151', marginBottom: '16px' }}>📋 Recent Products:</h3>
            {inventory.slice(0, 5).map(product => (
              <div key={product.itemId} style={{ 
                background: '#f9fafb', 
                margin: '8px 0', 
                padding: '12px', 
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                  {product.brand} {product.name}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  ID: {product.itemId} • Stock: {product.currentStock} • ${product.price}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // SEARCH & UPDATE SCREEN
  if (screen === 'searchUpdate') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button 
              onClick={() => {
                setScreen('home');
                setSearchTerm('');
                setSearchResults([]);
                setSelectedProduct(null);
                setNewItemId('');
                setStatusMessage('');
              }}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '24px',
                marginRight: '12px'
              }}
            >
              ⬅️
            </button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              Search & Update Barcode
            </h2>
          </div>

          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
              border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px', 
              textAlign: 'center',
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b'
            }}>
              {statusMessage}
            </div>
          )}

          {!selectedProduct ? (
            <>
              {/* Search Interface */}
              <div style={{ marginBottom: '24px' }}>
                <label style={labelStyle}>Search Products</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by product name, brand, or current barcode..."
                  style={inputStyle}
                />
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                  Type at least 2 characters to search through {inventory.length} products
                </p>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h3 style={{ color: '#374151', marginBottom: '16px' }}>
                    🔍 Found {searchResults.length} product{searchResults.length !== 1 ? 's' : ''}:
                  </h3>
                  <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {searchResults.map(product => (
                      <div 
                        key={product.itemId} 
                        onClick={() => {
                          setSelectedProduct(product);
                          setNewItemId(product.itemId);
                        }}
                        style={{ 
                          background: '#f9fafb', 
                          margin: '8px 0', 
                          padding: '16px', 
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.target.style.borderColor = '#f59e0b'}
                        onMouseOut={(e) => e.target.style.borderColor = '#e5e7eb'}
                      >
                        <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                          {product.brand} {product.name} {product.bottleSize}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                          Current Barcode: <strong>{product.itemId}</strong>
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          Stock: {product.currentStock} • Price: ${product.price} • {product.vendor}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchTerm.length >= 2 && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  <p>No products found matching "{searchTerm}"</p>
                  <p style={{ fontSize: '14px', marginTop: '16px' }}>
                    Try searching by:
                  </p>
                  <ul style={{ textAlign: 'left', display: 'inline-block', fontSize: '14px' }}>
                    <li>Product name (e.g. "neutral")</li>
                    <li>Brand name (e.g. "calura")</li>
                    <li>Current barcode/ID</li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Update ItemId Interface */}
              <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                <h3 style={{ color: '#92400e', marginTop: 0, marginBottom: '8px' }}>Selected Product:</h3>
                <p style={{ color: '#92400e', marginBottom: '8px' }}>
                  <strong>{selectedProduct.brand} {selectedProduct.name} {selectedProduct.bottleSize}</strong>
                </p>
                <p style={{ color: '#92400e', fontSize: '14px', margin: 0 }}>
                  Current Barcode: <strong>{selectedProduct.itemId}</strong>
                </p>
              </div>

              <form onSubmit={handleItemIdUpdate}>
                <label style={labelStyle}>New Barcode / Item ID *</label>
                <input
                  type="text"
                  value={newItemId}
                  onChange={(e) => setNewItemId(e.target.value)}
                  placeholder="Enter new barcode or Item ID"
                  style={inputStyle}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
                  <button 
                    type="button"
                    onClick={() => {
                      setSelectedProduct(null);
                      setNewItemId('');
                    }}
                    style={{
                      ...buttonStyle,
                      background: '#6b7280',
                      margin: 0
                    }}
                  >
                    ↩️ Back to Search
                  </button>

                  <button 
                    type="submit"
                    disabled={processing}
                    style={{
                      ...buttonStyle,
                      background: processing ? '#9ca3af' : '#f59e0b',
                      cursor: processing ? 'not-allowed' : 'pointer',
                      margin: 0
                    }}
                  >
                    {processing ? '⏳ Updating...' : '✅ Update Barcode'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // NEW PRODUCT FORM SCREEN (keeping existing functionality)
  if (screen === 'newProduct') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button 
              onClick={() => setScreen('home')}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                fontSize: '24px',
                marginRight: '12px'
              }}
            >
              ⬅️
            </button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              Add New Product
            </h2>
          </div>

          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
              border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              padding: '16px', 
              borderRadius: '8px', 
              marginBottom: '24px', 
              textAlign: 'center',
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b'
            }}>
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleNewProductSubmit}>
            {/* Required Fields */}
            <div style={{ marginBottom: '24px', padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
              <h3 style={{ color: '#92400e', marginTop: 0, marginBottom: '16px' }}>Required Information</h3>
              
              <label style={labelStyle}>Item ID / Barcode *</label>
              <input
                type="text"
                value={newProduct.itemId}
                onChange={(e) => setNewProduct({...newProduct, itemId: e.target.value})}
                style={{...inputStyle, borderColor: !newProduct.itemId.trim() ? '#ef4444' : '#e5e7eb'}}
                placeholder="Enter barcode or product ID"
                required
              />

              <label style={labelStyle}>Product Name *</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                style={{...inputStyle, borderColor: !newProduct.name.trim() ? '#ef4444' : '#e5e7eb'}}
                placeholder="Enter product name"
                required
              />
            </div>

            {/* Product Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <input
                  type="text"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g. CALURA"
                />
              </div>
              <div>
                <label style={labelStyle}>Size</label>
                <input
                  type="text"
                  value={newProduct.bottleSize}
                  onChange={(e) => setNewProduct({...newProduct, bottleSize: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g. 2oz"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  style={inputStyle}
                  placeholder="8.75"
                />
              </div>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input
                  type="number"
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({...newProduct, quantity: parseInt(e.target.value) || 1})}
                  style={inputStyle}
                  min="1"
                />
              </div>
              <div>
                <label style={labelStyle}>Min Stock</label>
                <input
                  type="number"
                  value={newProduct.minimum}
                  onChange={(e) => setNewProduct({...newProduct, minimum: e.target.value})}
                  style={inputStyle}
                  placeholder="2"
                />
              </div>
            </div>

            <label style={labelStyle}>Vendor</label>
            <input
              type="text"
              value={newProduct.vendor}
              onChange={(e) => setNewProduct({...newProduct, vendor: e.target.value})}
              style={inputStyle}
              placeholder="Vendor name"
            />

            <label style={labelStyle}>Vendor Contact</label>
            <input
              type="email"
              value={newProduct.vendorContact}
              onChange={(e) => setNewProduct({...newProduct, vendorContact: e.target.value})}
              style={inputStyle}
              placeholder="vendor@example.com"
            />

            <label style={labelStyle}>Notes</label>
            <textarea
              value={newProduct.notes}
              onChange={(e) => setNewProduct({...newProduct, notes: e.target.value})}
              style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
              placeholder="Additional notes about this product"
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
              <button 
                type="button"
                onClick={clearForm}
                style={{
                  ...buttonStyle,
                  background: '#6b7280',
                  margin: 0
                }}
              >
                🗑️ Clear Form
              </button>

              <button 
                type="submit"
                disabled={processing}
                style={{
                  ...buttonStyle,
                  background: processing ? '#9ca3af' : '#059669',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  margin: 0
                }}
              >
                {processing ? '⏳ Adding...' : '✅ Add Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return null;
};

export default NEXAAddInventoryApp;
