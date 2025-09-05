import React, { useState, useEffect } from 'react';

const NEXAAddInventoryApp = () => {
  const [screen, setScreen] = useState('home');
  const [processing, setProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Existing ADD inventory states
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newItemId, setNewItemId] = useState('');
  const [originalItemId, setOriginalItemId] = useState('');
  
  const [newProduct, setNewProduct] = useState({
    itemId: '', brand: '', name: '', bottleSize: '', price: '', quantity: 1,
    minimum: '', notes: '', vendor: '', vendorContact: ''
  });

  // NEW FORMULATION STATES
  const [currentWeight, setCurrentWeight] = useState(0.0);
  const [previousWeight, setPreviousWeight] = useState(0.0);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [formulationItems, setFormulationItems] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [editingFormulationItem, setEditingFormulationItem] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  
  // NEW FORMULATION NOTES STATES
  const [completedFormulation, setCompletedFormulation] = useState([]);
  const [clientName, setClientName] = useState('');
  const [formulaNotes, setFormulaNotes] = useState('');
  const [notesStartTime, setNotesStartTime] = useState(0);

  const GOOGLE_SHEETS_CONFIG = {
    SHEET_ID: '1U1SmQThzUECR_0uFDmTIa4M_lyKgKyTqnhbsQl-zhK8',
    API_KEY: 'AIzaSyBH70BfRf8m3qs2K4WqnUKzLD8E1YY6blo',
    RANGE: 'A:K',
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxcS_5-Uosvp0gE6fF1kAas2D65usXughRxfNma31be6beWGJrIwUIfVLP1e8ck9DjFYg/exec'
  };

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // BLUETOOTH SCALE SIMULATION
  useEffect(() => {
    if (screen === 'newFormulation' && !processing) {
      const interval = setInterval(() => {
        const baseWeight = previousWeight + (currentProduct ? Math.random() * 2 : 0);
        const fluctuation = (Math.random() - 0.5) * 0.1;
        setCurrentWeight(Math.max(0, baseWeight + fluctuation));
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [screen, previousWeight, currentProduct, processing]);

  // 5-MINUTE TIMEOUT SYSTEM (FORMULATION)
  useEffect(() => {
    if (screen === 'newFormulation') {
      const checkTimeout = setInterval(() => {
        const now = Date.now();
        const timeElapsed = (now - lastActivityTime) / 1000;
        
        if (timeElapsed > 240 && !timeoutWarning) {
          setTimeoutWarning(true);
          setStatusMessage('⚠️ Auto-complete in 1 minute due to inactivity...');
        }
        
        if (timeElapsed > 300) {
          console.log('Auto-completing formulation due to timeout...');
          autoCompleteFormulation();
        }
      }, 10000);
      
      return () => clearInterval(checkTimeout);
    }
  }, [screen, lastActivityTime, timeoutWarning, formulationItems, currentProduct]);

  // 5-MINUTE TIMEOUT SYSTEM (NOTES)
  useEffect(() => {
    if (screen === 'formulationNotes') {
      const checkNotesTimeout = setInterval(() => {
        const now = Date.now();
        const timeElapsed = (now - notesStartTime) / 1000;
        
        if (timeElapsed > 240 && !timeoutWarning) {
          setTimeoutWarning(true);
          setStatusMessage('⚠️ Auto-saving in 1 minute...');
        }
        
        if (timeElapsed > 300) {
          console.log('Auto-saving notes due to timeout...');
          saveFormulationWithNotes();
        }
      }, 10000);
      
      return () => clearInterval(checkNotesTimeout);
    }
  }, [screen, notesStartTime, timeoutWarning]);

  // Reset activity timer on user interaction
  const resetActivityTimer = () => {
    setLastActivityTime(Date.now());
    setTimeoutWarning(false);
  };

  const resetNotesTimer = () => {
    setNotesStartTime(Date.now());
    setTimeoutWarning(false);
  };

  // FORMULATION FUNCTIONS
  const startNewFormulation = () => {
    setScreen('newFormulation');
    setCurrentWeight(0.0);
    setPreviousWeight(0.0);
    setCurrentProduct(null);
    setFormulationItems([]);
    setIsScanning(true);
    setStatusMessage('Ready to scan first product...');
    setLastActivityTime(Date.now());
    setTimeoutWarning(false);
    setClientName('');
    setFormulaNotes('');
    setCompletedFormulation([]);
  };

  const simulateFormulationBarcodeScan = () => {
    resetActivityTimer();
    const barcode = prompt('Enter barcode to scan for formulation:');
    if (barcode === null) return;
    
    if (barcode === '') {
      handleFormulationBarcodeScanned('TEST_NOT_FOUND_123');
    } else {
      handleFormulationBarcodeScanned(barcode);
    }
  };

  const handleFormulationBarcodeScanned = (barcode) => {
    resetActivityTimer();
    
    if (currentProduct) {
      const netWeight = Math.max(0, currentWeight - previousWeight);
      finalizeCurrentProduct(netWeight);
    }

    const foundProduct = inventory.find(item => item.itemId === barcode);
    
    if (foundProduct) {
      setCurrentProduct({
        ...foundProduct,
        usedAmount: 0
      });
      setPreviousWeight(currentWeight);
      setStatusMessage(`Scanning: ${foundProduct.brand} ${foundProduct.name}`);
    } else {
      const now = new Date();
      const timestamp = now.getFullYear().toString() + 
                       (now.getMonth() + 1).toString().padStart(2, '0') + 
                       now.getDate().toString().padStart(2, '0') + 
                       now.getHours().toString().padStart(2, '0') + 
                       now.getMinutes().toString().padStart(2, '0') + 
                       now.getSeconds().toString().padStart(2, '0');

      const unknownProduct = {
        itemId: barcode,
        brand: 'Unknown',
        name: `Unknown Product ${timestamp}`,
        bottleSize: '',
        price: 0,
        currentStock: 0,
        minimum: 0,
        notes: 'Auto-generated from formulation',
        vendor: '',
        vendorContact: '',
        usedAmount: 0,
        isUnknown: true
      };

      setCurrentProduct(unknownProduct);
      setPreviousWeight(currentWeight);
      setStatusMessage(`Scanning: ${unknownProduct.name} (Unknown Product)`);
    }
    
    setIsScanning(true);
  };

  const finalizeCurrentProduct = (amount) => {
    if (!currentProduct) return;

    const finalizedItem = {
      ...currentProduct,
      usedAmount: parseFloat(amount.toFixed(2))
    };

    setFormulationItems(prev => [...prev, finalizedItem]);
    setCurrentProduct(null);
    setIsScanning(false);
    resetActivityTimer();
  };

  // UPDATED: Complete formulation goes to notes screen
  const completeFormulation = async () => {
    resetActivityTimer();
    
    let finalItems = [...formulationItems];
    
    if (currentProduct) {
      const netWeight = Math.max(0, currentWeight - previousWeight);
      if (netWeight > 0) {
        const finalizedItem = {
          ...currentProduct,
          usedAmount: parseFloat(netWeight.toFixed(2))
        };
        finalItems = [...finalItems, finalizedItem];
      }
    }

    if (finalItems.length === 0) {
      alert('No products to process');
      return;
    }

    setCompletedFormulation(finalItems);
    setScreen('formulationNotes');
    setNotesStartTime(Date.now());
    setTimeoutWarning(false);
    setStatusMessage('Add client details and notes (optional)');
  };

  const autoCompleteFormulation = async () => {
    console.log('Auto-completing formulation...');
    
    let finalItems = [...formulationItems];
    
    if (currentProduct) {
      const netWeight = Math.max(0, currentWeight - previousWeight);
      if (netWeight > 0) {
        const finalizedItem = {
          ...currentProduct,
          usedAmount: parseFloat(netWeight.toFixed(2))
        };
        finalItems = [...finalItems, finalizedItem];
      }
    }

    if (finalItems.length > 0) {
      setStatusMessage('🕒 Auto-completing formulation due to inactivity...');
      setCompletedFormulation(finalItems);
      setScreen('formulationNotes');
      setNotesStartTime(Date.now());
      setTimeoutWarning(false);
    } else {
      setScreen('home');
      setFormulationItems([]);
      setCurrentProduct(null);
      setCurrentWeight(0);
      setPreviousWeight(0);
    }
  };

  // FIXED: Save formulation with notes and then deduct inventory
  const saveFormulationWithNotes = async () => {
    if (completedFormulation.length === 0) return;

    setProcessing(true);
    setStatusMessage('Saving formulation and updating inventory...');

    try {
      // Generate timestamp in requested format: 2024-12-15 14:30
      const now = new Date();
      const sessionDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const sessionTime = now.toLocaleTimeString('en-GB', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      }); // HH:MM format
      const sessionDateTime = `${sessionDate} ${sessionTime}`;

      // Create formulation summary
      const formulationSummary = completedFormulation.map(item => 
        `${item.brand} ${item.name}: ${item.usedAmount} fl oz`
      ).join(', ');

      // Save to Formula Notes with client name and notes
      console.log('Saving formula notes...');
      const notesUrl = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=addFormulaNote&date=${encodeURIComponent(sessionDateTime)}&summary=${encodeURIComponent(formulationSummary)}&clientName=${encodeURIComponent(clientName)}&formulaNotes=${encodeURIComponent(formulaNotes)}`;
      
      console.log(`Formula notes URL: ${notesUrl}`);
      
      const notesResponse = await fetch(notesUrl);
      const notesResponseText = await notesResponse.text();
      
      console.log(`Formula notes response: ${notesResponseText}`);

      // Now process inventory - ONLY deduct existing products, DON'T add unknown products
      let successCount = 0;
      let errorCount = 0;
      let unknownCount = 0;

      console.log('Processing inventory deductions...');
      for (const item of completedFormulation) {
        try {
          if (item.isUnknown) {
            // FIXED: Don't add unknown products to inventory, just count them
            unknownCount++;
            console.log(`Skipping unknown product: ${item.name}`);
          } else {
            // FIXED: Deduct from existing inventory with proper decimal handling
            const deductUrl = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=updateStock&itemId=${encodeURIComponent(item.itemId)}&quantity=${-Math.abs(item.usedAmount)}`;
            
            console.log(`Deducting ${item.usedAmount} from ${item.itemId} (${item.name})`);
            console.log(`Deduct URL: ${deductUrl}`);
            
            const deductResponse = await fetch(deductUrl);
            const deductResponseText = await deductResponse.text();
            
            console.log(`Deduct response for ${item.itemId}: ${deductResponseText}`);
            
            if (deductResponseText.includes('SUCCESS')) {
              successCount++;
            } else {
              console.error(`Failed to deduct inventory for ${item.itemId}: ${deductResponseText}`);
              errorCount++;
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error('Error processing item:', error);
          errorCount++;
        }
      }

      // Generate success message
      let resultMessage = `✅ Formulation Complete!\n`;
      resultMessage += `${successCount} products deducted from inventory\n`;
      if (unknownCount > 0) resultMessage += `${unknownCount} unknown products logged\n`;
      if (errorCount > 0) resultMessage += `${errorCount} errors occurred\n`;
      resultMessage += `Saved with timestamp: ${sessionDateTime}`;

      if (notesResponseText.includes('SUCCESS')) {
        setStatusMessage(resultMessage);
      } else {
        setStatusMessage(`⚠️ Inventory updated but notes save failed\nNotes error: ${notesResponseText}\n${resultMessage}`);
      }

      // Go home after delay
      setTimeout(() => {
        setScreen('home');
        setFormulationItems([]);
        setCurrentProduct(null);
        setCompletedFormulation([]);
        setCurrentWeight(0);
        setPreviousWeight(0);
        setClientName('');
        setFormulaNotes('');
        fetchInventory();
      }, 4000);

    } catch (error) {
      console.error('Formulation processing error:', error);
      setStatusMessage(`❌ Formulation failed: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const editFormulationAmount = (index) => {
    resetActivityTimer();
    const item = formulationItems[index];
    setEditingFormulationItem(index);
    setEditAmount(item.usedAmount.toString());
  };

  const updateFormulationAmount = () => {
    resetActivityTimer();
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      alert('Please enter a valid amount');
      return;
    }

    const updatedItems = [...formulationItems];
    updatedItems[editingFormulationItem] = {
      ...updatedItems[editingFormulationItem],
      usedAmount: newAmount
    };
    
    setFormulationItems(updatedItems);
    setEditingFormulationItem(null);
    setEditAmount('');
  };

  const removeFormulationItem = (index) => {
    resetActivityTimer();
    const updatedItems = formulationItems.filter((_, i) => i !== index);
    setFormulationItems(updatedItems);
  };

  // EXISTING ADD INVENTORY FUNCTIONS
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
        itemId: row[0] || '', brand: row[1] || '', name: row[2] || '', bottleSize: row[3] || '',
        price: parseFloat(row[4]) || 0, currentStock: parseInt(row[5]) || 0, minimum: parseInt(row[6]) || 0,
        notes: row[7] || '', vendor: row[9] || '', vendorContact: row[10] || ''
      }));
      
      setInventory(inventoryData);
      setLoading(false);
      
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const simulateBarcodeScan = () => {
    const barcode = prompt('Enter barcode to scan (or leave empty to test "not found"):');
    if (barcode === null) return;
    
    if (barcode === '') {
      handleBarcodeScanned('TEST_NOT_FOUND_123');
    } else {
      handleBarcodeScanned(barcode);
    }
  };

  const handleBarcodeScanned = (barcode) => {
    setScannedBarcode(barcode);
    const foundProduct = inventory.find(item => item.itemId === barcode);
    
    if (foundProduct) {
      addStockToProduct(foundProduct, 1);
    } else {
      setScreen('barcodeNotFound');
    }
  };

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

  const handleProductSelected = (product) => {
    setEditingProduct({
      itemId: product.itemId, brand: product.brand, name: product.name, bottleSize: product.bottleSize,
      price: product.price, quantity: 1, minimum: product.minimum, notes: product.notes,
      vendor: product.vendor, vendorContact: product.vendorContact
    });
    setOriginalItemId(product.itemId);
    setNewItemId(scannedBarcode);
    setScreen('editProduct');
  };

  const quickUpdateBarcode = async () => {
    if (!editingProduct || !scannedBarcode) return;
    const updatedProduct = { ...editingProduct, itemId: scannedBarcode };
    await updateProductInfo(updatedProduct);
  };

  const updateProductInfo = async (productData) => {
    setProcessing(true);
    setStatusMessage('Updating product information...');
    
    try {
      const url = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=updateItemId&oldItemId=${encodeURIComponent(originalItemId)}&newItemId=${encodeURIComponent(productData.itemId)}&brand=${encodeURIComponent(productData.brand)}&name=${encodeURIComponent(productData.name)}&bottleSize=${encodeURIComponent(productData.bottleSize)}&price=${encodeURIComponent(productData.price)}&minimum=${encodeURIComponent(productData.minimum)}&notes=${encodeURIComponent(productData.notes)}&vendor=${encodeURIComponent(productData.vendor)}&vendorContact=${encodeURIComponent(productData.vendorContact)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const responseText = await response.text();

      if (responseText.includes('SUCCESS')) {
        setStatusMessage(`✅ Updated ${productData.name}`);
        setTimeout(async () => {
          await addStockToProduct({...productData, itemId: productData.itemId}, productData.quantity);
          setScreen('home');
          setScannedBarcode(''); setSearchTerm(''); setSearchResults([]);
          setEditingProduct(null); setSelectedProduct(null); setNewItemId(''); setOriginalItemId('');
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

  const addNewProductToInventory = async (productData) => {
    setProcessing(true);
    setStatusMessage('Adding new product to inventory...');
    
    try {
      const url = `${GOOGLE_SHEETS_CONFIG.SCRIPT_URL}?action=addNewProduct&itemId=${encodeURIComponent(productData.itemId)}&brand=${encodeURIComponent(productData.brand)}&name=${encodeURIComponent(productData.name)}&bottleSize=${encodeURIComponent(productData.bottleSize)}&price=${encodeURIComponent(productData.price)}&quantity=${encodeURIComponent(productData.quantity)}&minimum=${encodeURIComponent(productData.minimum)}&notes=${encodeURIComponent(productData.notes)}&vendor=${encodeURIComponent(productData.vendor)}&vendorContact=${encodeURIComponent(productData.vendorContact)}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const responseText = await response.text();

      if (responseText.includes('SUCCESS')) {
        setStatusMessage(`✅ Successfully added: ${productData.brand} ${productData.name}`);
        setTimeout(() => {
          setScreen('home'); setScannedBarcode('');
          setNewProduct({
            itemId: '', brand: '', name: '', bottleSize: '', price: '', quantity: 1,
            minimum: '', notes: '', vendor: '', vendorContact: ''
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

  const handleEditProductSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct.itemId.trim() || !editingProduct.name.trim()) {
      alert('❌ Item ID and Product name are required');
      return;
    }
    await updateProductInfo(editingProduct);
  };

  const handleNewProductSubmit = async (e) => {
    e.preventDefault();
    if (!newProduct.itemId.trim() || !newProduct.name.trim()) {
      alert('❌ Item ID and Product name are required');
      return;
    }
    await addNewProductToInventory(newProduct);
  };

  const cancelAndGoHome = () => {
    setScreen('home'); setScannedBarcode(''); setSearchTerm(''); setSearchResults([]);
    setEditingProduct(null); setSelectedProduct(null); setNewItemId(''); setOriginalItemId('');
    setStatusMessage(''); setFormulationItems([]); setCurrentProduct(null);
    setCurrentWeight(0); setPreviousWeight(0); setClientName(''); setFormulaNotes(''); setCompletedFormulation([]);
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // STYLES
  const containerStyle = {
    minHeight: '100vh', background: 'linear-gradient(135deg, #e0e7ff 0%, #fce7f3 100%)', padding: '20px'
  };

  const cardStyle = {
    maxWidth: '600px', margin: '0 auto', background: 'white', borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', padding: '30px'
  };

  const buttonStyle = {
    width: '100%', padding: '16px', margin: '8px 0', fontSize: '18px', fontWeight: 'bold',
    border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', transition: 'all 0.2s'
  };

  const inputStyle = {
    width: '100%', padding: '12px', border: '2px solid #e5e7eb', borderRadius: '6px',
    fontSize: '16px', marginBottom: '12px', boxSizing: 'border-box'
  };

  const labelStyle = {
    display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151'
  };

  const pulsingStyle = {
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <h1 style={{ textAlign: 'center', color: '#6b7280' }}>Loading NEXA...</h1>
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ 
              width: '40px', height: '40px', border: '4px solid #f3f4f6',
              borderTop: '4px solid #8b5cf6', borderRadius: '50%',
              animation: 'spin 1s linear infinite', margin: '0 auto'
            }}></div>
          </div>
        </div>
        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
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

  // NEW: FORMULATION NOTES SCREEN
  if (screen === 'formulationNotes') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={cancelAndGoHome} style={{ 
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', marginRight: '12px' 
            }}>⬅️</button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              📝 Add Notes
            </h2>
          </div>

          {timeoutWarning && (
            <div style={{
              background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px',
              padding: '12px', marginBottom: '16px', textAlign: 'center'
            }}>
              <div style={{ color: '#92400e', fontWeight: 'bold' }}>
                ⏰ Auto-saving in 1 minute...
              </div>
            </div>
          )}

          <div style={{
            background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '8px',
            padding: '20px', marginBottom: '24px'
          }}>
            <h3 style={{ color: '#065f46', marginTop: 0, marginBottom: '16px' }}>
              🧪 Formulation Complete ({completedFormulation.length} items)
            </h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {completedFormulation.map((item, index) => (
                <div key={index} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: index < completedFormulation.length - 1 ? '1px solid #bbf7d0' : 'none'
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: '600', color: '#065f46' }}>
                      {item.brand} {item.name}
                      {item.isUnknown && <span style={{ color: '#dc2626', fontSize: '12px' }}> (Unknown)</span>}
                    </span>
                  </div>
                  <div style={{ fontWeight: 'bold', color: '#059669' }}>
                    {item.usedAmount} fl oz
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Client Name (Optional)</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                resetNotesTimer();
              }}
              style={inputStyle}
              placeholder="Enter client name..."
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Formula Notes (Optional)</label>
            <textarea
              value={formulaNotes}
              onChange={(e) => {
                setFormulaNotes(e.target.value);
                resetNotesTimer();
              }}
              style={{...inputStyle, minHeight: '100px', resize: 'vertical'}}
              placeholder="Add any notes about this formulation..."
            />
          </div>

          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : 
                          statusMessage.includes('⚠️') ? '#fef3c7' : '#fef2f2', 
              padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center',
              whiteSpace: 'pre-line', fontSize: '14px'
            }}>
              {statusMessage}
            </div>
          )}

          <button 
            onClick={saveFormulationWithNotes} 
            disabled={processing}
            style={{
              ...buttonStyle, 
              background: processing ? '#9ca3af' : '#059669',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontSize: '20px', 
              padding: '20px'
            }}
          >
            {processing ? '⏳ Saving...' : '📝 Add Notes & Complete'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginTop: '16px' }}>
            Notes will auto-save in 5 minutes if no action is taken
          </p>
        </div>

        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  // NEW FORMULATION SCREEN
  if (screen === 'newFormulation') {
    const netWeight = Math.max(0, currentWeight - previousWeight);

    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={cancelAndGoHome} style={{ 
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', marginRight: '12px' 
            }}>⬅️</button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
              🧪 New Formulation
            </h2>
          </div>

          {timeoutWarning && (
            <div style={{
              background: '#fef3c7', border: '2px solid #f59e0b', borderRadius: '8px',
              padding: '12px', marginBottom: '16px', textAlign: 'center'
            }}>
              <div style={{ color: '#92400e', fontWeight: 'bold' }}>
                ⏰ Auto-completing in 1 minute due to inactivity
              </div>
            </div>
          )}

          <div style={{ 
            background: isScanning ? '#dbeafe' : '#f3f4f6', 
            border: isScanning ? '3px solid #3b82f6' : '2px solid #e5e7eb',
            borderRadius: '12px', padding: '24px', marginBottom: '24px', textAlign: 'center',
            ...(isScanning ? pulsingStyle : {})
          }}>
            {currentProduct ? (
              <>
                <h3 style={{ color: '#1f2937', marginBottom: '12px', fontSize: '20px' }}>
                  {currentProduct.brand} {currentProduct.name}
                  {currentProduct.isUnknown && <span style={{ color: '#dc2626' }}> (Unknown)</span>}
                </h3>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#059669', marginBottom: '8px' }}>
                  {netWeight.toFixed(1)} fl oz
                </div>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  Scale: {currentWeight.toFixed(1)} fl oz - Previous: {previousWeight.toFixed(1)} fl oz
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📱</div>
                <h3 style={{ color: '#6b7280', marginBottom: '12px' }}>Ready to Scan</h3>
                <p style={{ color: '#9ca3af' }}>Scan a barcode to begin</p>
              </>
            )}
          </div>

          <div style={{ 
            background: '#f0fdf4', border: '2px solid #bbf7d0', borderRadius: '8px',
            padding: '16px', marginBottom: '24px', textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#065f46', marginBottom: '4px' }}>📏 Bluetooth Scale</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669' }}>
              {currentWeight.toFixed(1)} fl oz
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
            <button onClick={simulateFormulationBarcodeScan} style={{
              ...buttonStyle, background: '#3b82f6', margin: '0'
            }}>
              📱 Scan Barcode
            </button>
            
            {currentProduct && (
              <button onClick={() => finalizeCurrentProduct(netWeight)} style={{
                ...buttonStyle, background: '#059669', margin: '0'
              }}>
                ✅ Next Product
              </button>
            )}
          </div>

          {formulationItems.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#374151', marginBottom: '16px' }}>
                📋 Products Used ({formulationItems.length})
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {formulationItems.map((item, index) => (
                  <div key={index} style={{
                    background: item.isUnknown ? '#fef3c7' : '#f0fdf4',
                    border: item.isUnknown ? '1px solid #fbbf24' : '1px solid #bbf7d0',
                    padding: '16px', margin: '8px 0', borderRadius: '8px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                        {item.brand} {item.name}
                        {item.isUnknown && <span style={{ color: '#dc2626', fontSize: '12px' }}> (Unknown)</span>}
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                        {item.usedAmount} fl oz
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => editFormulationAmount(index)} style={{
                        background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px',
                        padding: '8px 12px', fontSize: '12px', cursor: 'pointer'
                      }}>
                        Edit
                      </button>
                      <button onClick={() => removeFormulationItem(index)} style={{
                        background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px',
                        padding: '8px 12px', fontSize: '12px', cursor: 'pointer'
                      }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : 
                          statusMessage.includes('⚠️') ? '#fef3c7' : 
                          statusMessage.includes('🕒') ? '#dbeafe' : '#fef2f2', 
              padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center',
              whiteSpace: 'pre-line', fontSize: '14px'
            }}>
              {statusMessage}
            </div>
          )}

          {(formulationItems.length > 0 || currentProduct) && (
            <button onClick={completeFormulation} disabled={processing} style={{
              ...buttonStyle, 
              background: processing ? '#9ca3af' : '#dc2626',
              cursor: processing ? 'not-allowed' : 'pointer',
              fontSize: '20px', padding: '20px'
            }}>
              {processing ? '⏳ Processing...' : 
               currentProduct && formulationItems.length === 0 ? 
                 '🧪 Complete Formulation (1 item)' :
               currentProduct ? 
                 `🧪 Complete Formulation (${formulationItems.length + 1} items)` :
                 `🧪 Complete Formulation (${formulationItems.length} items)`}
            </button>
          )}
        </div>

        {editingFormulationItem !== null && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white', borderRadius: '12px', padding: '30px', maxWidth: '400px', width: '90%'
            }}>
              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>Edit Amount</h3>
              
              <div style={{ marginBottom: '20px' }}>
                <input
                  type="text" value={editAmount} readOnly
                  style={{
                    width: '100%', padding: '16px', fontSize: '24px', textAlign: 'center',
                    border: '2px solid #e5e7eb', borderRadius: '8px', marginBottom: '16px'
                  }}
                />
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {['1','2','3','4','5','6','7','8','9','.','0','⌫'].map(key => (
                    <button key={key} onClick={() => {
                        resetActivityTimer();
                        if (key === '⌫') {
                          setEditAmount(prev => prev.slice(0, -1));
                        } else if (key === '.' && editAmount.includes('.')) {
                          return;
                        } else {
                          setEditAmount(prev => prev + key);
                        }
                      }}
                      style={{
                        padding: '16px', fontSize: '20px', fontWeight: 'bold',
                        border: '2px solid #e5e7eb', borderRadius: '8px',
                        background: key === '⌫' ? '#ef4444' : '#f9fafb',
                        color: key === '⌫' ? 'white' : '#1f2937', cursor: 'pointer'
                      }}
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <button onClick={() => {
                  setEditingFormulationItem(null); setEditAmount(''); resetActivityTimer();
                }} style={{ ...buttonStyle, background: '#6b7280', margin: '0' }}>
                  Back
                </button>
                <button onClick={updateFormulationAmount} style={{ ...buttonStyle, background: '#059669', margin: '0' }}>
                  Update
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        `}</style>
      </div>
    );
  }

  // HOME SCREEN
  if (screen === 'home') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ fontSize: '42px', fontWeight: 'bold', color: '#1f2937', marginBottom: '8px' }}>NEXA</h1>
            <p style={{ color: '#6b7280', fontSize: '18px' }}>Inventory Management System</p>
            <p style={{ fontSize: '14px', color: '#059669', marginTop: '8px' }}>📊 {inventory.length} products in database</p>
          </div>

          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
              border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center',
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b', whiteSpace: 'pre-line'
            }}>
              {statusMessage}
            </div>
          )}

          <div style={{ display: 'grid', gap: '16px' }}>
            <button onClick={startNewFormulation} style={{ ...buttonStyle, background: '#dc2626', fontSize: '20px', padding: '20px' }}>
              🧪 New Formulation
            </button>
            <button onClick={simulateBarcodeScan} style={{ ...buttonStyle, background: '#3b82f6', fontSize: '20px', padding: '20px' }}>
              📱 Add Inventory
            </button>
            <button onClick={() => { setNewProduct({...newProduct, itemId: ''}); setScreen('newProduct'); }} 
              style={{...buttonStyle, background: '#8b5cf6'}}>➕ Add New Product</button>
            <button onClick={fetchInventory} style={{ ...buttonStyle, background: '#6b7280', fontSize: '16px', padding: '12px' }}>
              🔄 Refresh Inventory
            </button>
          </div>

          <div style={{ marginTop: '30px' }}>
            <h3 style={{ color: '#374151', marginBottom: '16px' }}>📋 Recent Products:</h3>
            {inventory.slice(0, 5).map(product => (
              <div key={product.itemId} style={{ 
                background: '#f9fafb', margin: '8px 0', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>{product.brand} {product.name}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>ID: {product.itemId} • Stock: {product.currentStock} • ${product.price}</div>
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    );
  }

  // ALL OTHER EXISTING SCREENS (keeping all the same - shortened for space)
  if (screen === 'barcodeNotFound') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={cancelAndGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', marginRight: '12px' }}>⬅️</button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Product Not Found</h2>
          </div>
          <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <p style={{ color: '#92400e', marginBottom: '8px' }}><strong>Scanned Barcode: {scannedBarcode}</strong></p>
            <p style={{ color: '#92400e', margin: 0 }}>This barcode was not found in your inventory.</p>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Search for existing product by name:</label>
            <input type="text" value={searchTerm} onChange={(e) => handleProductSearch(e.target.value)}
              placeholder="Start typing product name or brand..." style={inputStyle} autoFocus />
            <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Type at least 2 characters to search</p>
          </div>
          {searchResults.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ color: '#374151', marginBottom: '12px' }}>
                Found {searchResults.length} matching product{searchResults.length !== 1 ? 's' : ''}:
              </h3>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {searchResults.map(product => (
                  <div key={product.itemId} onClick={() => handleProductSelected(product)}
                    style={{ background: '#f9fafb', margin: '8px 0', padding: '16px', borderRadius: '8px',
                      border: '2px solid #e5e7eb', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={(e) => e.target.style.borderColor = '#3b82f6'}
                    onMouseOut={(e) => e.target.style.borderColor = '#e5e7eb'}>
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
          {searchTerm.length >= 2 && searchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: '#6b7280', marginBottom: '16px' }}>No existing products found matching "{searchTerm}"</p>
              <button onClick={() => { setNewProduct({...newProduct, itemId: scannedBarcode}); setScreen('newProduct'); }}
                style={{...buttonStyle, background: '#10b981', margin: '0 auto', maxWidth: '300px'}}>➕ Add as New Product</button>
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>Can't find the product you're looking for?</p>
            <button onClick={() => { setNewProduct({...newProduct, itemId: scannedBarcode}); setScreen('newProduct'); }}
              style={{...buttonStyle, background: '#10b981'}}>➕ Add as New Product</button>
          </div>
        </div>
      </div>
    );
  }

  // (Other screens follow same pattern - editProduct and newProduct screens remain unchanged)
  if (screen === 'editProduct') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={cancelAndGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', marginRight: '12px' }}>⬅️</button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Update Product</h2>
          </div>
          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
              border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center',
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b'
            }}>
              {statusMessage}
            </div>
          )}
          <div style={{ background: '#fef3c7', padding: '16px', borderRadius: '8px', marginBottom: '24px', border: '2px solid #fbbf24' }}>
            <h3 style={{ color: '#92400e', marginTop: 0, marginBottom: '12px' }}>⚠️ Update Item ID?</h3>
            <p style={{ color: '#92400e', marginBottom: '8px' }}>
              Change barcode from <strong>{originalItemId}</strong> to <strong style={{ color: '#dc2626' }}>{scannedBarcode}</strong>
            </p>
            <p style={{ color: '#92400e', fontSize: '14px', margin: 0 }}>Use the quick update button below, or edit details manually.</p>
          </div>
          <div style={{ marginBottom: '24px' }}>
            <button onClick={quickUpdateBarcode} disabled={processing}
              style={{ ...buttonStyle, background: processing ? '#9ca3af' : '#10b981',
                cursor: processing ? 'not-allowed' : 'pointer', fontSize: '20px', padding: '20px', border: '3px solid #065f46' }}>
              {processing ? '⏳ Updating...' : `✅ Update Barcode to ${scannedBarcode} & Add 1 to Stock`}
            </button>
            <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
              Quick option: Updates barcode and adds 1 to inventory immediately
            </p>
          </div>
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <div style={{ borderTop: '1px solid #e5e7eb', position: 'relative' }}>
              <span style={{ background: 'white', color: '#6b7280', padding: '0 16px', position: 'relative', top: '-12px' }}>
                OR edit details manually
              </span>
            </div>
          </div>
          <form onSubmit={handleEditProductSubmit}>
            <label style={labelStyle}>Item ID / Barcode *</label>
            <input type="text" value={editingProduct?.itemId || ''} onChange={(e) => setEditingProduct({...editingProduct, itemId: e.target.value})}
              style={{ ...inputStyle, borderColor: '#dc2626', color: '#dc2626', fontWeight: 'bold', backgroundColor: '#fef2f2' }} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <input type="text" value={editingProduct?.brand || ''} onChange={(e) => setEditingProduct({...editingProduct, brand: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Size</label>
                <input type="text" value={editingProduct?.bottleSize || ''} onChange={(e) => setEditingProduct({...editingProduct, bottleSize: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <label style={labelStyle}>Product Name *</label>
            <input type="text" value={editingProduct?.name || ''} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} style={inputStyle} required />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input type="number" step="0.01" value={editingProduct?.price || ''} onChange={(e) => setEditingProduct({...editingProduct, price: e.target.value})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Add Quantity</label>
                <input type="number" value={editingProduct?.quantity || 1} min="1" onChange={(e) => setEditingProduct({...editingProduct, quantity: parseInt(e.target.value) || 1})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Min Stock</label>
                <input type="number" value={editingProduct?.minimum || ''} onChange={(e) => setEditingProduct({...editingProduct, minimum: e.target.value})} style={inputStyle} />
              </div>
            </div>
            <label style={labelStyle}>Vendor</label>
            <input type="text" value={editingProduct?.vendor || ''} onChange={(e) => setEditingProduct({...editingProduct, vendor: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Vendor Contact</label>
            <input type="email" value={editingProduct?.vendorContact || ''} onChange={(e) => setEditingProduct({...editingProduct, vendorContact: e.target.value})} style={inputStyle} />
            <label style={labelStyle}>Notes</label>
            <textarea value={editingProduct?.notes || ''} onChange={(e) => setEditingProduct({...editingProduct, notes: e.target.value})}
              style={{...inputStyle, minHeight: '80px', resize: 'vertical'}} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
              <button type="button" onClick={cancelAndGoHome} style={{ ...buttonStyle, background: '#6b7280', margin: 0 }}>❌ Cancel</button>
              <button type="submit" disabled={processing} style={{ ...buttonStyle, background: processing ? '#9ca3af' : '#dc2626', cursor: processing ? 'not-allowed' : 'pointer', margin: 0 }}>
                {processing ? '⏳ Updating...' : '✅ Update with Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (screen === 'newProduct') {
    return (
      <div style={containerStyle}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={cancelAndGoHome} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '24px', marginRight: '12px' }}>⬅️</button>
            <h2 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Add New Product</h2>
          </div>
          {statusMessage && (
            <div style={{ 
              background: statusMessage.includes('✅') ? '#d1fae5' : '#fef2f2', 
              border: statusMessage.includes('✅') ? '1px solid #a7f3d0' : '1px solid #fecaca',
              padding: '16px', borderRadius: '8px', marginBottom: '24px', textAlign: 'center',
              color: statusMessage.includes('✅') ? '#065f46' : '#991b1b'
            }}>
              {statusMessage}
            </div>
          )}
          {scannedBarcode && (
            <div style={{ background: '#dbeafe', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <p style={{ color: '#1e40af', margin: 0 }}>📱 <strong>Scanned Barcode:</strong> {scannedBarcode}</p>
            </div>
          )}
          <form onSubmit={handleNewProductSubmit}>
            <div style={{ marginBottom: '24px', padding: '16px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
              <h3 style={{ color: '#92400e', marginTop: 0, marginBottom: '16px' }}>Required Information</h3>
              <label style={labelStyle}>Item ID / Barcode *</label>
              <input type="text" value={newProduct.itemId} onChange={(e) => setNewProduct({...newProduct, itemId: e.target.value})}
                style={{...inputStyle, borderColor: !newProduct.itemId.trim() ? '#ef4444' : '#e5e7eb'}} placeholder="Enter barcode or product ID" required />
              <label style={labelStyle}>Product Name *</label>
              <input type="text" value={newProduct.name} onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                style={{...inputStyle, borderColor: !newProduct.name.trim() ? '#ef4444' : '#e5e7eb'}} placeholder="Enter product name" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Brand</label>
                <input type="text" value={newProduct.brand} onChange={(e) => setNewProduct({...newProduct, brand: e.target.value})} style={inputStyle} placeholder="e.g. CALURA" />
              </div>
              <div>
                <label style={labelStyle}>Size</label>
                <input type="text" value={newProduct.bottleSize} onChange={(e) => setNewProduct({...newProduct, bottleSize: e.target.value})} style={inputStyle} placeholder="e.g. 2oz" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Price ($)</label>
                <input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({...newProduct, price: e.target.value})} style={inputStyle} placeholder="8.75" />
              </div>
              <div>
                <label style={labelStyle}>Quantity</label>
                <input type="number" value={newProduct.quantity} min="1" onChange={(e) => setNewProduct({...newProduct, quantity: parseInt(e.target.value) || 1})} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Min Stock</label>
                <input type="number" value={newProduct.minimum} onChange={(e) => setNewProduct({...newProduct, minimum: e.target.value})} style={inputStyle} placeholder="2" />
              </div>
            </div>
            <label style={labelStyle}>Vendor</label>
            <input type="text" value={newProduct.vendor} onChange={(e) => setNewProduct({...newProduct, vendor: e.target.value})} style={inputStyle} placeholder="Vendor name" />
            <label style={labelStyle}>Vendor Contact</label>
            <input type="email" value={newProduct.vendorContact} onChange={(e) => setNewProduct({...newProduct, vendorContact: e.target.value})} style={inputStyle} placeholder="vendor@example.com" />
            <label style={labelStyle}>Notes</label>
            <textarea value={newProduct.notes} onChange={(e) => setNewProduct({...newProduct, notes: e.target.value})}
              style={{...inputStyle, minHeight: '80px', resize: 'vertical'}} placeholder="Additional notes about this product" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '24px' }}>
              <button type="button" onClick={cancelAndGoHome} style={{ ...buttonStyle, background: '#6b7280', margin: 0 }}>❌ Cancel</button>
              <button type="submit" disabled={processing} style={{ ...buttonStyle, background: processing ? '#9ca3af' : '#059669', cursor: processing ? 'not-allowed' : 'pointer', margin: 0 }}>
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
