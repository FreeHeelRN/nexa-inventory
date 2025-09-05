// NEXA ADD Inventory - Complete System with New Home Layout & Settings
// Features: Barcode scan, Product search, Add new products, Google Sheets integration, Purchase tracking, Settings
import React, { useState, useEffect } from 'react';

const NEXAAddInventoryApp = () => {
  const [screen, setScreen] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Barcode scanning states
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Edit product states
  const [editingProduct, setEditingProduct] = useState(null);
  const [newItemId, setNewItemId] = useState('');
  const [originalItemId, setOriginalItemId] = useState('');
  
  // NEW: Settings state
  const [settings, setSettings] = useState({
    defaultEmail: '',
    savedEmails: ['user@example.com'],
    defaultPhone: '',
    savedPhones: ['555-0123'],
    fiscalYearType: 'calendar', // 'calendar' or 'custom'
    fiscalStartMonth: 7, // July = 7 (for July-June fiscal year)
    username: ''
  });
  
  // NEW: Settings form state
  const [tempSettings, setTempSettings] = useState({});
  const [showAddEmail, setShowAddEmail] = useState(false);
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  
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

  // Updated Google Sheets Configuration
  const GOOGLE_SHEETS_CONFIG = {
    SHEET_ID: '1U1SmQThzUECR_0uFDmTIa4M_lyKgKyTqnhbsQl-zhK8',
    API_KEY: 'AIzaSyBH70BfRf8m3qs2K4WqnUKzLD8E1YY6blo',
    RANGE: 'A:K',
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxWXCB5nQG22wVKs5Jjt2LzXAMAnkN-fZ8PUEqUlgBnXbvQPfye2bTxep8jUHfgWErC1Q/exec'
  };

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // NEW: Load settings from localStorage on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('nexaSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
      } catch (error) {
        console.warn('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // NEW: Save settings to localStorage
  const saveSettings = (newSettings) => {
    try {
      localStorage.setItem('nexaSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      setStatusMessage('✅ Settings saved successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setStatusMessage('❌ Failed to save settings');
    }
  };

  // NEW: Month names for fiscal year selector
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

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

  // Simulate barcode scanning (for testing)
  const simulateBarcodeScan = () => {
    const barcode = prompt('Enter barcode to scan (or leave empty to test "not found"):');
    if (barcode === null) return; // User cancelled
    
    if (barcode === '') {
      // Test "not found" scenario
      handleBarcodeScanned('TEST_NOT_FOUND_123');
    } else {
      handleBarcodeScanned(barcode);
    }
  };

  // Handle barcode scanning result
  const handleBarcodeScanned = (barcode) => {
    setScannedBarcode(barcode);
    
    // Look for product by barcode/itemId
    const foundProduct = inventory.find(item => item.itemId === barcode);
    
    if (foundProduct) {
      // SCENARIO A: Barcode found - Add to inventory
      addStockToProduct(foundProduct, 1);
    } else {
      // SCENARIO B: Barcode not found - Show search
      setScreen('barcodeNotFound');
    }
  };

  // Add stock to existing product with enhanced success messages
  const addStockToProduct = async (product, quantity) => {
    setProcessing(true);
    setStatusMessage(`Adding ${quantity} to ${product.name}...`);
    
    try {
      const url = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=updateStock&itemId=${encodeURIComponent(product.itemId)}&quantity=${quantity}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      if (responseText.includes('SUCCESS')) {
        // Enhanced success message showing purchase logging
        const currentYear = new Date().getFullYear();
        let successMsg = `✅ Added ${quantity} to ${product.brand} ${product.name}`;
        successMsg += `\n📦 New stock level updated`;
        
        if (responseText.includes('Purchase logged')) {
          successMsg += `\n📊 Purchase logged to "Purchases ${currentYear}" tab`;
        }
        
        setStatusMessage(successMsg);
        
        // Refresh inventory to show updated stock
        setTimeout(() => {
          fetchInventory();
          setStatusMessage('');
        }, 4000);
        
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

  // Search products by name or brand
  const handleProductSearch = (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    const results = inventory.filter(product => 
      product.name.toLowerCase().includes(term.toLowerCase()) ||
      product.brand.toLowerCase().includes(term.toLowerCase())
    );
    
    setSearchResults(results.slice(0, 10)); // Limit to 10 results
  };

  // Handle product selection for editing
  const handleProductSelected = (product) => {
    setEditingProduct({
      itemId: product.itemId,
      brand: product.brand,
      name: product.name,
      bottleSize: product.bottleSize,
      price: product.price,
      quantity: 1, // Default quantity to add
      minimum: product.minimum,
      notes: product.notes,
      vendor: product.vendor,
      vendorContact: product.vendorContact
    });
    setOriginalItemId(product.itemId);
    setNewItemId(scannedBarcode); // Set to the scanned barcode
    setScreen('editProduct');
  };

  // Quick update barcode and add stock
  const quickUpdateBarcode = async () => {
    if (!editingProduct || !scannedBarcode) return;
    
    const updatedProduct = {
      ...editingProduct,
      itemId: scannedBarcode // Use the scanned barcode
    };
    
    await updateProductInfo(updatedProduct);
  };

  // Update product with new ItemId and other changes
  const updateProductInfo = async (productData) => {
    setProcessing(true);
    setStatusMessage('Updating product information...');
    
    try {
      const url = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=updateItemId&oldItemId=${encodeURIComponent(originalItemId)}&newItemId=${encodeURIComponent(productData.itemId)}&brand=${encodeURIComponent(productData.brand)}&name=${encodeURIComponent(productData.name)}&bottleSize=${encodeURIComponent(productData.bottleSize)}&price=${encodeURIComponent(productData.price)}&minimum=${encodeURIComponent(productData.minimum)}&notes=${encodeURIComponent(productData.notes)}&vendor=${encodeURIComponent(productData.vendor)}&vendorContact=${encodeURIComponent(productData.vendorContact)}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseText = await response.text();

      if (responseText.includes('SUCCESS')) {
        // Enhanced success message for barcode update with purchase logging
        const currentYear = new Date().getFullYear();
        let successMsg = `✅ Updated ${productData.brand} ${productData.name}`;
        successMsg += `\n🔄 Barcode changed to: ${productData.itemId}`;
        successMsg += `\n📦 Added ${productData.quantity} to stock`;
        
        if (responseText.includes('Purchase logged')) {
          successMsg += `\n📊 Purchase logged to "Purchases ${currentYear}" tab`;
        }
        
        setStatusMessage(successMsg);
        
        // Reset states and go home after showing message
        setTimeout(() => {
          setScreen('home');
          setScannedBarcode('');
          setSearchTerm('');
          setSearchResults([]);
          setEditingProduct(null);
          setSelectedProduct(null);
          setNewItemId('');
          setOriginalItemId('');
          setStatusMessage('');
          fetchInventory(); // Refresh inventory
        }, 5000);
        
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

  // Add completely new product with purchase logging
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
        // Enhanced success message for new product with purchase logging
        const currentYear = new Date().getFullYear();
        let successMsg = `✅ Successfully added: ${productData.brand} ${productData.name}`;
        successMsg += `\n📦 Initial stock: ${productData.quantity} units`;
        successMsg += `\n💰 Unit price: $${parseFloat(productData.price).toFixed(2)}`;
        
        if (responseText.includes('logged to Purchases')) {
          successMsg += `\n📊 Purchase logged to "Purchases ${currentYear}" tab`;
        }
        
        setStatusMessage(successMsg);
        
        // Reset form and go home
        setTimeout(() => {
          setScreen('home');
          setScannedBarcode('');
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
          fetchInventory();
        }, 5000);
        
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

  // Handle edit product form submission
  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    
    if (!editingProduct.itemId.trim() || !editingProduct.name.trim()) {
      alert('❌ Item ID and Product name are required');
      return;
    }
    
    await updateProductInfo(editingProduct);
  };

  // Handle new product form submission
  const handleNewProductSubmit = async (e) => {
    e.preventDefault();
    
    if (!newProduct.itemId.trim() || !newProduct.name.trim()) {
      alert('❌ Item ID and Product name are required');
      return;
    }
    
    await addNewProductToInventory(newProduct);
  };

  // NEW: Handle settings form submission
  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    saveSettings(tempSettings);
    setScreen('home');
  };

  // NEW: Add new email to saved emails
  const addNewEmailToSettings = () => {
    if (newEmail.trim() && !tempSettings.savedEmails.includes(newEmail.trim())) {
      setTempSettings({
        ...tempSettings,
        savedEmails: [...tempSettings.savedEmails, newEmail.trim()],
        defaultEmail: newEmail.trim()
      });
      setNewEmail('');
      setShowAddEmail(false);
    }
  };

  // NEW: Add new phone to saved phones
  const addNewPhoneToSettings = () => {
    if (newPhone.trim() && !tempSettings.savedPhones.includes(newPhone.trim())) {
      setTempSettings({
        ...tempSettings,
        savedPhones: [...tempSettings.savedPhones, newPhone.trim()],
        defaultPhone: newPhone.trim()
      });
      setNewPhone('');
      setShowAddPhone(false);
    }
  };

  // Cancel and reset to home
  const cancelAndGoHome = () => {
    setScreen('home');
    setScannedBarcode('');
    setSearchTerm('');
    setSearchResults([]);
    setEditingProduct(null);
    setSelectedProduct(null);
    setNewItemId('');
    setOriginalItemId('');
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

  // NEW: SETTINGS SCREEN
  if (screen === 'settings') {
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
              Settings
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
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b',
              fontSize: '14px'
            }}>
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleSettingsSubmit}>
            {/* Default Email */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Default Email Address</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select 
                  value={tempSettings.defaultEmail || settings.defaultEmail}
                  onChange={(e) => setTempSettings({...tempSettings, defaultEmail: e.target.value})}
                  style={{...inputStyle, flex: 1, marginBottom: 0}}
                >
                  <option value="">Select email...</option>
                  {(tempSettings.savedEmails || settings.savedEmails).map(email => (
                    <option key={email} value={email}>{email}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => setShowAddEmail(!showAddEmail)}
                  style={{
                    padding: '12px 16px',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {showAddEmail ? '❌' : '➕'}
                </button>
              </div>
              
              {showAddEmail && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter new email address"
                    style={{...inputStyle, flex: 1, marginBottom: 0}}
                  />
                  <button 
                    type="button"
                    onClick={addNewEmailToSettings}
                    style={{
                      padding: '12px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Default Phone */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Default Phone Number</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select 
                  value={tempSettings.defaultPhone || settings.defaultPhone}
                  onChange={(e) => setTempSettings({...tempSettings, defaultPhone: e.target.value})}
                  style={{...inputStyle, flex: 1, marginBottom: 0}}
                >
                  <option value="">Select phone...</option>
                  {(tempSettings.savedPhones || settings.savedPhones).map(phone => (
                    <option key={phone} value={phone}>{phone}</option>
                  ))}
                </select>
                <button 
                  type="button"
                  onClick={() => setShowAddPhone(!showAddPhone)}
                  style={{
                    padding: '12px 16px',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {showAddPhone ? '❌' : '➕'}
                </button>
              </div>
              
              {showAddPhone && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Enter new phone number"
                    style={{...inputStyle, flex: 1, marginBottom: 0}}
                  />
                  <button 
                    type="button"
                    onClick={addNewPhoneToSettings}
                    style={{
                      padding: '12px 16px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Fiscal Year Preference */}
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Fiscal Year Preference</label>
              <select 
                value={tempSettings.fiscalYearType || settings.fiscalYearType}
                onChange={(e) => setTempSettings({...tempSettings, fiscalYearType: e.target.value})}
                style={inputStyle}
              >
                <option value="calendar">Calendar Year (January - December)</option>
                <option value="custom">Custom Fiscal Year</option>
              </select>
            </div>

            {/* Custom Fiscal Year Start Month */}
            {(tempSettings.fiscalYearType === 'custom' || (settings.fiscalYearType === 'custom' && !tempSettings.fiscalYearType)) && (
              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Fiscal Year Start Month</label>
                <select 
                  value={tempSettings.fiscalStartMonth || settings.fiscalStartMonth}
                  onChange={(e) => setTempSettings({...tempSettings, fiscalStartMonth: parseInt(e.target.value)})}
                  style={inputStyle}
                >
                  {monthNames.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month} (e.g., {month} {new Date().getFullYear()} - {monthNames[(index + 11) % 12]} {index >= 11 ? new Date().getFullYear() + 1 : new Date().getFullYear()})
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                  Purchase logs will be organized by fiscal year instead of calendar year.
                </p>
              </div>
            )}

            {/* Username */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={tempSettings.username !== undefined ? tempSettings.username : settings.username}
                onChange={(e) => setTempSettings({...tempSettings, username: e.target.value})}
                placeholder="Enter username for future login"
                style={inputStyle}
              />
              <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                For future login functionality (not yet active)
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => {
                  setTempSettings({});
                  setScreen('home');
                }}
                style={{
                  ...buttonStyle,
                  background: '#6b7280',
                  margin: 0
                }}
              >
                ❌ Cancel
              </button>

              <button 
                type="submit"
                style={{
                  ...buttonStyle,
                  background: '#059669',
                  margin: 0
                }}
              >
                ✅ Save Settings
              </button>
            </div>
          </form>

          {/* Current Settings Preview */}
          <div style={{ 
            marginTop: '30px', 
            padding: '16px', 
            background: '#f8fafc', 
            borderRadius: '8px',
            fontSize: '12px',
            color: '#64748b'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#374151' }}>Current Settings Preview:</h4>
            <div>Email: {tempSettings.defaultEmail || settings.defaultEmail || 'Not set'}</div>
            <div>Phone: {tempSettings.defaultPhone || settings.defaultPhone || 'Not set'}</div>
            <div>Fiscal Year: {(tempSettings.fiscalYearType || settings.fiscalYearType) === 'calendar' ? 'Calendar Year' : `Custom (starts ${monthNames[(tempSettings.fiscalStartMonth || settings.fiscalStartMonth) - 1]})`}</div>
            <div>Username: {tempSettings.username !== undefined ? tempSettings.username : (settings.username || 'Not set')}</div>
          </div>
        </div>
      </div>
    );
  }

  // HOME SCREEN WITH NEW LAYOUT
  if (screen === 'home') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>
              NEXA
            </h1>
            <p style={{ color: '#6b7280', fontSize: '18px' }}>Salon Inventory Management</p>
            <p style={{ fontSize: '14px', color: '#059669', marginTop: '8px' }}>
              📊 {inventory.length} products • 📈 Purchase tracking enabled
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
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b',
              whiteSpace: 'pre-line',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {statusMessage}
            </div>
          )}

          {/* NEW HOME LAYOUT - 5 BUTTONS IN ORDER */}
          <div style={{ display: 'grid', gap: '16px' }}>
            {/* 1. ADD Inventory */}
            <button 
              onClick={simulateBarcodeScan}
              disabled={processing}
              style={{
                ...buttonStyle, 
                background: processing ? '#9ca3af' : '#3b82f6', 
                fontSize: '20px', 
                padding: '20px',
                cursor: processing ? 'not-allowed' : 'pointer'
              }}
            >
              📱 {processing ? 'Processing...' : 'ADD Inventory'}
            </button>

            {/* 2. USE Inventory */}
            <button 
              onClick={() => {
                window.open('https://nexa-inventory-use.vercel.app/', '_blank');
              }}
              style={{
                ...buttonStyle, 
                background: '#dc2626',
                fontSize: '18px'
              }}
            >
              🧪 USE Inventory
            </button>

            {/* 3. Reports */}
            <button 
              onClick={() => alert('🚧 Reports functionality coming soon!\n\nWill include:\n• Low stock alerts\n• Purchase history\n• Usage analytics\n• Vendor reports')}
              style={{
                ...buttonStyle, 
                background: '#7c3aed',
                fontSize: '18px'
              }}
            >
              📊 Reports
            </button>

            {/* 4. Settings */}
            <button 
              onClick={() => {
                setTempSettings({...settings});
                setScreen('settings');
              }}
              style={{
                ...buttonStyle, 
                background: '#059669',
                fontSize: '18px'
              }}
            >
              ⚙️ Settings
            </button>

            {/* 5. Refresh Inventory */}
            <button 
              onClick={fetchInventory}
              disabled={processing}
              style={{
                ...buttonStyle, 
                background: processing ? '#9ca3af' : '#6b7280', 
                fontSize: '16px', 
                padding: '12px',
                cursor: processing ? 'not-allowed' : 'pointer'
              }}
            >
              🔄 {processing ? 'Loading...' : 'Refresh Inventory'}
            </button>
          </div>

          {/* Quick Add Button */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button 
              onClick={() => {
                setNewProduct({...newProduct, itemId: ''});
                setScreen('newProduct');
              }}
              disabled={processing}
              style={{
                ...buttonStyle, 
                background: processing ? '#9ca3af' : '#f59e0b',
                fontSize: '16px',
                padding: '12px',
                cursor: processing ? 'not-allowed' : 'pointer',
                maxWidth: '300px',
                margin: '0 auto'
              }}
            >
              ➕ Add New Product
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

          {/* Purchase Tracking Notice */}
          <div style={{ 
            marginTop: '30px', 
            padding: '12px', 
            background: '#f0f9ff', 
            border: '1px solid #0ea5e9',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#0c4a6e'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>📊 Automatic Purchase Tracking</div>
            <div>All inventory additions are logged to "Purchases {new Date().getFullYear()}" tab for accounting purposes.</div>
          </div>
        </div>
      </div>
    );
  }

  // BARCODE NOT FOUND SCREEN
  if (screen === 'barcodeNotFound') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button 
              onClick={cancelAndGoHome}
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
              Product Not Found
            </h2>
          </div>

          <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <p style={{ color: '#92400e', marginBottom: '8px' }}>
              <strong>Scanned Barcode: {scannedBarcode}</strong>
            </p>
            <p style={{ color: '#92400e', margin: 0 }}>
              This barcode was not found in your inventory.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Search for existing product by name:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleProductSearch(e.target.value)}
              placeholder="Start typing product name or brand..."
              style={inputStyle}
              autoFocus
            />
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              Type at least 2 characters to search
            </p>
          </div>

          {/* Live Search Results */}
          {searchResults.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#374151', marginBottom: '12px' }}>
                Found {searchResults.length} matching product{searchResults.length !== 1 ? 's' : ''}:
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {searchResults.map(product => (
                  <div 
                    key={product.itemId} 
                    onClick={() => handleProductSelected(product)}
                    style={{ 
                      background: '#f9fafb', 
                      margin: '8px 0', 
                      padding: '16px', 
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.borderColor = '#3b82f6'}
                    onMouseOut={(e) => e.target.style.borderColor = '#e5e7eb'}
                  >
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                      {product.brand} {product.name} {product.bottleSize}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      Current ID: {product.itemId} • Stock: {product.currentStock} • ${product.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results Found */}
          {searchTerm.length >= 2 && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>
                No existing products found matching "{searchTerm}"
              </p>
              <button 
                onClick={() => {
                  setNewProduct({...newProduct, itemId: scannedBarcode});
                  setScreen('newProduct');
                }}
                style={{...buttonStyle, background: '#10b981', margin: '0 auto', maxWidth: '300px'}}
              >
                ➕ Add as New Product
              </button>
            </div>
          )}

          {/* Option to add as new product */}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Can't find the product you're looking for?
            </p>
            <button 
              onClick={() => {
                setNewProduct({...newProduct, itemId: scannedBarcode});
                setScreen('newProduct');
              }}
              style={{...buttonStyle, background: '#10b981'}}
            >
              ➕ Add as New Product
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EDIT PRODUCT SCREEN (WITH QUICK UPDATE BUTTON)
  if (screen === 'editProduct') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button 
              onClick={cancelAndGoHome}
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
              Update Product
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
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b',
              whiteSpace: 'pre-line',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {statusMessage}
            </div>
          )}

          {/* Update Confirmation */}
          <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '2px solid #fbbf24' }}>
            <h3 style={{ color: '#92400e', marginTop: 0, marginBottom: '12px' }}>⚠️ Update Item ID?</h3>
            <p style={{ color: '#92400e', marginBottom: '8px' }}>
              Change barcode from <strong>{originalItemId}</strong> to <strong style={{ color: '#dc2626' }}>{scannedBarcode}</strong>
            </p>
            <p style={{ color: '#92400e', fontSize: '14px', margin: 0 }}>
              Use the quick update button below, or edit details manually.
            </p>
          </div>

          {/* QUICK UPDATE BUTTON - Enhanced with purchase logging info */}
          <div style={{ marginBottom: '24px' }}>
            <button 
              onClick={quickUpdateBarcode}
              disabled={processing}
              style={{
                ...buttonStyle,
                background: processing ? '#9ca3af' : '#10b981',
                cursor: processing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                padding: '20px',
                border: '3px solid #065f46'
              }}
            >
              {processing ? '⏳ Updating...' : `✅ Update Barcode to ${scannedBarcode} & Add 1 to Stock`}
            </button>
            <p style={{ textAlign: 'center', fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
              Quick option: Updates barcode, adds 1 to inventory, logs purchase to "Purchases {new Date().getFullYear()}" tab
            </p>
          </div>

          {/* OR DIVIDER */}
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <div style={{ borderTop: '1px solid #e5e7eb', position: 'relative' }}>
              <span style={{ 
                background: 'white', 
                color: '#6b7280', 
                padding: '0 16px', 
                position: 'relative', 
                top: '-12px' 
              }}>
                OR edit details manually
              </span>
            </div>
          </div>

          <form onSubmit={handleEditProductSubmit}>
            {/* Item ID - highlighted in red */}
            <label style={labelStyle}>Item ID / Barcode *</label>
            <input
              type="text"
              value={editingProduct?.itemId || ''}
              onChange={(e) => setEditingProduct({...editingProduct, itemId: e.target.value})}
              style={{
                ...inputStyle, 
                borderColor: '#dc2626', 
                color: '#dc2626', 
                fontWeight: 'bold',
                backgroundColor: '#fef2f2'
              }}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <input
                  type="text"
                  value={editingProduct?.brand || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Size</label>
                <input
                  type="text"
                  value={editingProduct?.bottleSize || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, bottleSize: e.target.value})}
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>Product Name *</label>
            <input
              type="text"
              value={editingProduct?.name || ''}
              onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
              style={inputStyle}
              required
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingProduct?.price || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Add Quantity</label>
                <input
                  type="number"
                  value={editingProduct?.quantity || 1}
                  onChange={(e) => setEditingProduct({...editingProduct, quantity: parseInt(e.target.value) || 1})}
                  style={inputStyle}
                  min="1"
                />
              </div>
              <div>
                <label style={labelStyle}>Min Stock</label>
                <input
                  type="number"
                  value={editingProduct?.minimum || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, minimum: e.target.value})}
                  style={inputStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>Vendor</label>
            <input
              type="text"
              value={editingProduct?.vendor || ''}
              onChange={(e) => setEditingProduct({...editingProduct, vendor: e.target.value})}
              style={inputStyle}
            />

            <label style={labelStyle}>Vendor Contact</label>
            <input
              type="email"
              value={editingProduct?.vendorContact || ''}
              onChange={(e) => setEditingProduct({...editingProduct, vendorContact: e.target.value})}
              style={inputStyle}
            />

            <label style={labelStyle}>Notes</label>
            <textarea
              value={editingProduct?.notes || ''}
              onChange={(e) => setEditingProduct({...editingProduct, notes: e.target.value})}
              style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
              <button 
                type="button"
                onClick={cancelAndGoHome}
                style={{
                  ...buttonStyle,
                  background: '#6b7280',
                  margin: 0
                }}
              >
                ❌ Cancel
              </button>

              <button 
                type="submit"
                disabled={processing}
                style={{
                  ...buttonStyle,
                  background: processing ? '#9ca3af' : '#dc2626',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  margin: 0
                }}
              >
                {processing ? '⏳ Updating...' : '✅ Update with Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // NEW PRODUCT FORM SCREEN
  if (screen === 'newProduct') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button 
              onClick={cancelAndGoHome}
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
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b',
              whiteSpace: 'pre-line',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {statusMessage}
            </div>
          )}

          {scannedBarcode && (
            <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: '#1e40af', margin: 0 }}>
                📱 <strong>Scanned Barcode:</strong> {scannedBarcode}
              </p>
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
                onClick={cancelAndGoHome}
                style={{
                  ...buttonStyle,
                  background: '#6b7280',
                  margin: 0
                }}
              >
                ❌ Cancel
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

          {/* Purchase Tracking Notice */}
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#f0f9ff', 
            border: '1px solid #0ea5e9',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#0c4a6e'
          }}>
            💡 This purchase will be automatically logged to "Purchases {new Date().getFullYear()}" tab for tax/accounting purposes.
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default NEXAAddInventoryApp;
