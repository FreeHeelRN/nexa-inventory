// NEXA ADD Inventory - Invoice OCR Feature Branch
// Features: Barcode scan + Invoice OCR + Product search + Add new products + Google Sheets integration
import React, { useState, useEffect, useRef } from 'react';

const NEXAAddInventoryApp = () => {
  const [screen, setScreen] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);
  
  // Barcode scanning states
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Invoice OCR states
  const [invoiceText, setInvoiceText] = useState('');
  const [detectedItems, setDetectedItems] = useState([]);
  const [invoiceData, setInvoiceData] = useState({ number: '', total: '', date: '' });
  
  // Edit product states
  const [editingProduct, setEditingProduct] = useState(null);
  const [newItemId, setNewItemId] = useState('');
  const [originalItemId, setOriginalItemId] = useState('');
  
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
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxMzB3Xcv0NAMrBBSfSaNtBFdUOce2logB3BpnjFoD4-VRdBtKM735o64YvTkML3Ui9dw/exec'
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

  // Simulate invoice OCR (for testing without real OCR)
  const simulateInvoiceOCR = () => {
    setProcessing(true);
    setStatusMessage('Processing invoice image...');
    setScreen('invoiceProcessing');
    
    // Simulate processing delay
    setTimeout(() => {
      const mockInvoiceText = `
BASSETT SALON SOLUTIONS
Invoice #: INV-2024-001234
Date: 12/15/2024

Item Description                Qty    Price
BLACKLIGHT POWERSHADE PS-C     2      $17.90
CALURA 1 NEUTRAL 2OZ           1      $8.75  
CALURA 2 NEUTRAL 2OZ           3      $26.25
SAMPLE BLONDE BHD-2            1      $10.00
UNKNOWN PRODUCT XYZ            2      $15.00

SUBTOTAL: $77.90
TAX: $6.23
TOTAL: $84.13
      `;
      
      setInvoiceText(mockInvoiceText);
      parseInvoiceText(mockInvoiceText);
      setProcessing(false);
    }, 3000);
  };

  // Parse invoice text and extract products
  const parseInvoiceText = (text) => {
    setStatusMessage('Analyzing invoice text...');
    
    // Extract invoice info
    const invoiceNumberMatch = text.match(/Invoice #:?\s*([A-Z0-9-]+)/i);
    const totalMatch = text.match(/TOTAL:?\s*\$?([\d,]+\.?\d*)/i);
    const dateMatch = text.match(/Date:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/);

    setInvoiceData({
      number: invoiceNumberMatch ? invoiceNumberMatch[1] : '',
      total: totalMatch ? totalMatch[1] : '',
      date: dateMatch ? dateMatch[1] : new Date().toLocaleDateString()
    });

    // Parse product lines
    const lines = text.split('\n');
    const detected = [];

    lines.forEach(line => {
      // Look for lines with quantity and price patterns
      const qtyPriceMatch = line.match(/(\d+)\s+\$?([\d.]+)/);
      if (qtyPriceMatch) {
        const quantity = parseInt(qtyPriceMatch[1]);
        const linePrice = parseFloat(qtyPriceMatch[2]);
        
        // Extract product name (everything before the quantity)
        const productNameMatch = line.match(/^(.+?)\s+\d+\s+/);
        if (productNameMatch) {
          const productName = productNameMatch[1].trim();
          
          // Try to match with existing inventory
          const matchedProduct = findProductMatch(productName);
          
          if (matchedProduct) {
            // Found existing product
            detected.push({
              ...matchedProduct,
              detectedName: productName,
              quantity: quantity,
              detectedPrice: linePrice,
              unitPrice: linePrice / quantity,
              matched: true,
              confidence: 'high',
              originalLine: line.trim()
            });
          } else {
            // Unknown product
            detected.push({
              detectedName: productName,
              quantity: quantity,
              detectedPrice: linePrice,
              unitPrice: linePrice / quantity,
              matched: false,
              confidence: 'unknown',
              originalLine: line.trim(),
              // Placeholder values for unknown products
              itemId: '',
              brand: '',
              name: productName,
              bottleSize: '',
              price: linePrice / quantity,
              currentStock: 0,
              minimum: 0,
              notes: 'From invoice - needs review',
              vendor: '',
              vendorContact: ''
            });
          }
        }
      }
    });

    setDetectedItems(detected);
    setStatusMessage(`Found ${detected.length} products in invoice`);
    setScreen('invoiceReview');
  };

  // Find matching product in inventory
  const findProductMatch = (detectedName) => {
    const cleanName = detectedName.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    
    return inventory.find(product => {
      const variations = [
        product.name.toLowerCase(),
        `${product.brand.toLowerCase()} ${product.name.toLowerCase()}`,
        product.name.replace(/\s+/g, '').toLowerCase(),
        `${product.brand} ${product.name}`.toLowerCase()
      ];
      
      return variations.some(variation => {
        const cleanVariation = variation.replace(/[^a-z0-9\s]/g, '');
        return cleanVariation.includes(cleanName) || cleanName.includes(cleanVariation);
      });
    });
  };

  // Process all invoice items and add to inventory
  const processInvoiceItems = async () => {
    setProcessing(true);
    setStatusMessage('Adding all items to inventory...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of detectedItems) {
      try {
        if (item.matched) {
          // Add stock to existing product
          const success = await addStockToProduct(item, item.quantity);
          if (success) successCount++;
          else errorCount++;
        } else {
          // Add as new product (if user provided details)
          if (item.itemId && item.name) {
            const success = await addNewProductToInventory(item);
            if (success) successCount++;
            else errorCount++;
          } else {
            errorCount++;
          }
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error('Error processing item:', error);
        errorCount++;
      }
    }
    
    setStatusMessage(`✅ Processed ${successCount} items successfully. ${errorCount} errors.`);
    setProcessing(false);
    
    // Go back home and refresh inventory
    setTimeout(() => {
      setScreen('home');
      fetchInventory();
      setDetectedItems([]);
      setInvoiceText('');
      setInvoiceData({ number: '', total: '', date: '' });
    }, 3000);
  };

  // Remove item from detected list
  const removeDetectedItem = (index) => {
    const updatedItems = detectedItems.filter((_, i) => i !== index);
    setDetectedItems(updatedItems);
  };

  // Update detected item details
  const updateDetectedItem = (index, updatedItem) => {
    const updatedItems = [...detectedItems];
    updatedItems[index] = updatedItem;
    setDetectedItems(updatedItems);
  };

  // Simulate barcode scanning (for testing)
  const simulateBarcodeScan = () => {
    const barcode = prompt('Enter barcode to scan (or leave empty to test "not found"):');
    if (barcode === null) return; // User cancelled
    
    if (barcode === '') {
      handleBarcodeScanned('TEST_NOT_FOUND_123');
    } else {
      handleBarcodeScanned(barcode);
    }
  };

  // Handle barcode scanning result
  const handleBarcodeScanned = (barcode) => {
    setScannedBarcode(barcode);
    const foundProduct = inventory.find(item => item.itemId === barcode);
    
    if (foundProduct) {
      addStockToProduct(foundProduct, 1);
    } else {
      setScreen('barcodeNotFound');
    }
  };

  // Add stock to existing product
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
        setStatusMessage(`✅ Added ${quantity} to ${product.name}`);
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
    
    setSearchResults(results.slice(0, 10));
  };

  // Handle product selection for editing
  const handleProductSelected = (product) => {
    setEditingProduct({
      itemId: product.itemId,
      brand: product.brand,
      name: product.name,
      bottleSize: product.bottleSize,
      price: product.price,
      quantity: 1,
      minimum: product.minimum,
      notes: product.notes,
      vendor: product.vendor,
      vendorContact: product.vendorContact
    });
    setOriginalItemId(product.itemId);
    setNewItemId(scannedBarcode);
    setScreen('editProduct');
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
        setStatusMessage(`✅ Updated ${productData.name}`);
        
        setTimeout(async () => {
          await addStockToProduct({...productData, itemId: productData.itemId}, productData.quantity);
          
          setScreen('home');
          setScannedBarcode('');
          setSearchTerm('');
          setSearchResults([]);
          setEditingProduct(null);
          setSelectedProduct(null);
          setNewItemId('');
          setOriginalItemId('');
        }, 1000);
        
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

  // Add completely new product
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
          fetchInventory();
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
    setDetectedItems([]);
    setInvoiceText('');
    setInvoiceData({ number: '', total: '', date: '' });
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
            <p style={{ fontSize: '12px', color: '#f59e0b', marginTop: '4px' }}>
              🚧 Feature Branch: Invoice OCR Testing
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
              onClick={simulateBarcodeScan}
              style={{...buttonStyle, background: '#3b82f6', fontSize: '20px', padding: '20px'}}
            >
              📱 Scan Barcode
            </button>

            <button 
              onClick={simulateInvoiceOCR}
              style={{...buttonStyle, background: '#10b981', fontSize: '20px', padding: '20px'}}
            >
              📄 Scan Invoice (NEW!)
            </button>

            <button 
              onClick={() => {
                setNewProduct({...newProduct, itemId: ''});
                setScreen('newProduct');
              }}
              style={{...buttonStyle, background: '#8b5cf6'}}
            >
              ➕ Add New Product
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

  // INVOICE PROCESSING SCREEN
  if (screen === 'invoiceProcessing') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '30px' }}>
              Processing Invoice
            </h2>
            
            <div style={{ 
              width: '80px', 
              height: '80px', 
              border: '6px solid #f3f4f6',
              borderTop: '6px solid #10b981',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 30px'
            }}></div>
            
            <p style={{ color: '#6b7280', fontSize: '18px', marginBottom: '16px' }}>
              📄 Extracting text from invoice...
            </p>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              This may take a few seconds
            </p>
          </div>
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // INVOICE REVIEW SCREEN (NEW!)
  if (screen === 'invoiceReview') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
              📄 Invoice Review
            </h2>
            
            <div style={{ background: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Invoice #</div>
                  <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{invoiceData.number || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Date</div>
                  <div style={{ fontWeight: 'bold', color: '#1f2937' }}>{invoiceData.date || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total</div>
                  <div style={{ fontWeight: 'bold', color: '#1f2937' }}>${invoiceData.total || 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              Found {detectedItems.length} products. Review and confirm below:
            </p>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
            {detectedItems.map((item, index) => (
              <div key={index} style={{
                background: item.matched ? '#f0fdf4' : '#fef3c7',
                border: item.matched ? '2px solid #bbf7d0' : '2px solid #fde68a',
                padding: '16px',
                margin: '12px 0',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: '#1f2937', marginBottom: '4px' }}>
                      {item.matched ? `${item.brand} ${item.name}` : item.detectedName}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      {item.matched ? `✅ Matched in inventory` : '⚠️ Unknown product - needs details'}
                    </div>
                    <div style={{ fontSize: '14px', color: '#374151' }}>
                      Qty: {item.quantity} • Price: ${item.detectedPrice} • Unit: ${item.unitPrice?.toFixed(2)}
                    </div>
                    {item.matched && (
                      <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                        Current Stock: {item.currentStock} → {item.currentStock + item.quantity}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => removeDetectedItem(index)}
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginLeft: '12px'
                    }}
                  >
                    Remove
                  </button>
                </div>

                {!item.matched && (
                  <div style={{ borderTop: '1px solid #d1d5db', paddingTop: '12px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                      <div>
                        <label style={labelStyle}>Item ID (Barcode)</label>
                        <input
                          type="text"
                          value={item.itemId}
                          onChange={(e) => updateDetectedItem(index, {...item, itemId: e.target.value})}
                          style={{...inputStyle, marginBottom: '0'}}
                          placeholder="Required"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Brand</label>
                        <input
                          type="text"
                          value={item.brand}
                          onChange={(e) => updateDetectedItem(index, {...item, brand: e.target.value})}
                          style={{...inputStyle, marginBottom: '0'}}
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Product Name</label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateDetectedItem(index, {...item, name: e.target.value})}
                        style={{...inputStyle, marginBottom: '0'}}
                        placeholder="Required"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
              border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              padding: '12px', 
              borderRadius: '6px', 
              marginBottom: '20px', 
              textAlign: 'center',
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b',
              fontSize: '14px'
            }}>
              {statusMessage}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={cancelAndGoHome}
              style={{...buttonStyle, background: '#6b7280', margin: '0'}}
            >
              ❌ Cancel
            </button>
            <button
              onClick={processInvoiceItems}
              disabled={processing || detectedItems.length === 0}
              style={{
                ...buttonStyle,
                background: processing ? '#9ca3af' : '#10b981',
                cursor: processing ? 'not-allowed' : 'pointer',
                margin: '0'
              }}
            >
              {processing ? '⏳ Processing...' : `✅ Add All (${detectedItems.length})`}
            </button>
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
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#dc2626', marginBottom: '16px' }}>
              🔍 Barcode Not Found
            </h2>
            <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca' }}>
              <p style={{ fontSize: '18px', color: '#991b1b', marginBottom: '8px' }}>
                Barcode: <strong>{scannedBarcode}</strong>
              </p>
              <p style={{ fontSize: '14px', color: '#6b7280' }}>
                This barcode is not in your inventory database
              </p>
            </div>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#374151', marginBottom: '16px' }}>What would you like to do?</h3>
            
            <button
              onClick={() => {
                setNewProduct({...newProduct, itemId: scannedBarcode});
                setScreen('newProduct');
              }}
              style={{...buttonStyle, background: '#10b981', marginBottom: '12px'}}
            >
              ➕ Add as New Product
            </button>

            <div style={{ margin: '20px 0' }}>
              <label style={labelStyle}>Search for existing product to update:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleProductSearch(e.target.value)}
                placeholder="Type brand or product name..."
                style={inputStyle}
              />
            </div>

            {searchResults.length > 0 && (
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px' }}>
                <h4 style={{ color: '#374151', marginBottom: '12px' }}>Search Results:</h4>
                {searchResults.map(product => (
                  <button
                    key={product.itemId}
                    onClick={() => handleProductSelected(product)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      margin: '4px 0',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <div style={{ fontWeight: '600', color: '#1f2937' }}>
                      {product.brand} {product.name}
                    </div>
                    <div style={{ color: '#6b7280', fontSize: '12px' }}>
                      Current ID: {product.itemId} • Stock: {product.currentStock}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={cancelAndGoHome}
              style={{...buttonStyle, background: '#6b7280', margin: '0'}}
            >
              ❌ Cancel
            </button>
            <button
              onClick={() => setScreen('home')}
              style={{...buttonStyle, background: '#3b82f6', margin: '0'}}
            >
              🏠 Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EDIT PRODUCT SCREEN
  if (screen === 'editProduct') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
              ✏️ Edit Product
            </h2>
            <div style={{ background: '#dbeafe', padding: '12px', borderRadius: '6px', border: '1px solid #93c5fd' }}>
              <p style={{ fontSize: '14px', color: '#1e40af' }}>
                Updating barcode: <strong>{scannedBarcode}</strong> → <strong>{editingProduct?.itemId}</strong>
              </p>
            </div>
          </div>

          <form onSubmit={handleEditProductSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Item ID (Barcode) *</label>
                <input
                  type="text"
                  value={editingProduct?.itemId || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, itemId: e.target.value})}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Brand</label>
                <input
                  type="text"
                  value={editingProduct?.brand || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Product Name *</label>
              <input
                type="text"
                value={editingProduct?.name || ''}
                onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                style={inputStyle}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Bottle Size</label>
                <input
                  type="text"
                  value={editingProduct?.bottleSize || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, bottleSize: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g., 32oz"
                />
              </div>
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
                  min="1"
                  value={editingProduct?.quantity || 1}
                  onChange={(e) => setEditingProduct({...editingProduct, quantity: parseInt(e.target.value) || 1})}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Minimum Stock</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct?.minimum || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, minimum: e.target.value})}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input
                  type="text"
                  value={editingProduct?.notes || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, notes: e.target.value})}
                  style={inputStyle}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Vendor</label>
                <input
                  type="text"
                  value={editingProduct?.vendor || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, vendor: e.target.value})}
                  style={inputStyle}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label style={labelStyle}>Vendor Contact</label>
                <input
                  type="text"
                  value={editingProduct?.vendorContact || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, vendorContact: e.target.value})}
                  style={inputStyle}
                  placeholder="Phone/email"
                />
              </div>
            </div>

            {statusMessage && (
              <div style={{ 
                background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
                border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '20px', 
                textAlign: 'center',
                color: statusMessage.includes('✅') ? '#065f46' : '#991b1b'
              }}>
                {statusMessage}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={cancelAndGoHome}
                style={{...buttonStyle, background: '#6b7280', margin: '0'}}
              >
                ❌ Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                style={{
                  ...buttonStyle,
                  background: processing ? '#9ca3af' : '#10b981',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  margin: '0'
                }}
              >
                {processing ? '⏳ Updating...' : '✅ Update & Add Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // NEW PRODUCT SCREEN
  if (screen === 'newProduct') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', marginBottom: '16px' }}>
              ➕ Add New Product
            </h2>
            <p style={{ color: '#6b7280', fontSize: '16px' }}>
              Enter details for the new product
            </p>
          </div>

          <form onSubmit={handleNewProductSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Item ID (Barcode) *</label>
                <input
                  type="text"
                  value={newProduct.itemId}
                  onChange={(e) => setNewProduct({...newProduct, itemId: e.target.value})}
                  style={inputStyle}
                  required
                  placeholder={scannedBarcode || 'Enter barcode'}
                />
              </div>
              <div>
                <label style={labelStyle}>Brand</label>
                <input
                  type="text"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g., Olaplex"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Product Name *</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                style={inputStyle}
                required
                placeholder="e.g., Bond Multiplier No.1"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Bottle Size</label>
                <input
                  type="text"
                  value={newProduct.bottleSize}
                  onChange={(e) => setNewProduct({...newProduct, bottleSize: e.target.value})}
                  style={inputStyle}
                  placeholder="e.g., 32oz"
                />
              </div>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
                  style={inputStyle}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label style={labelStyle}>Initial Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={newProduct.quantity}
                  onChange={(e) => setNewProduct({...newProduct, quantity: parseInt(e.target.value) || 1})}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Minimum Stock</label>
                <input
                  type="number"
                  min="0"
                  value={newProduct.minimum}
                  onChange={(e) => setNewProduct({...newProduct, minimum: e.target.value})}
                  style={inputStyle}
                  placeholder="0"
                />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input
                  type="text"
                  value={newProduct.notes}
                  onChange={(e) => setNewProduct({...newProduct, notes: e.target.value})}
                  style={inputStyle}
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Vendor</label>
                <input
                  type="text"
                  value={newProduct.vendor}
                  onChange={(e) => setNewProduct({...newProduct, vendor: e.target.value})}
                  style={inputStyle}
                  placeholder="Supplier name"
                />
              </div>
              <div>
                <label style={labelStyle}>Vendor Contact</label>
                <input
                  type="text"
                  value={newProduct.vendorContact}
                  onChange={(e) => setNewProduct({...newProduct, vendorContact: e.target.value})}
                  style={inputStyle}
                  placeholder="Phone/email"
                />
              </div>
            </div>

            {statusMessage && (
              <div style={{ 
                background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
                border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
                padding: '12px', 
                borderRadius: '6px', 
                marginBottom: '20px', 
                textAlign: 'center',
                color: statusMessage.includes('✅') ? '#065f46' : '#991b1b'
              }}>
                {statusMessage}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button
                type="button"
                onClick={cancelAndGoHome}
                style={{...buttonStyle, background: '#6b7280', margin: '0'}}
              >
                ❌ Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                style={{
                  ...buttonStyle,
                  background: processing ? '#9ca3af' : '#10b981',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  margin: '0'
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
