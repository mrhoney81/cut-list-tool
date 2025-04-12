import React, { useState, useEffect } from 'react';
import _ from 'lodash';

const CutListOptimizer = () => {
  const [cutParts, setCutParts] = useState([]);
  const [stock, setStock] = useState([]);
  const [newPartLength, setNewPartLength] = useState('');
  const [newPartQuantity, setNewPartQuantity] = useState(1);
  const [newStockLength, setNewStockLength] = useState('');
  const [defaultStockLength, setDefaultStockLength] = useState(3600);
  const [kerfWidth, setKerfWidth] = useState(3);
  const [solution, setSolution] = useState(null);
  const [error, setError] = useState('');
  const [editingPartId, setEditingPartId] = useState(null);
  const [editingPartName, setEditingPartName] = useState('');

  useEffect(() => {
    if (cutParts.length > 0 && stock.length > 0) {
      calculateOptimalCutting();
    } else {
      setSolution(null);
    }
  }, [cutParts, stock, kerfWidth]);

  const handlePartKeyPress = (e) => {
    if (e.key === 'Enter') {
      addPart();
    }
  };

  // Generate a name based on index (A, B, C... Z, AA, AB, etc.)
  const generateName = (index) => {
    const baseCharCode = 'A'.charCodeAt(0);
    let name = '';
    
    if (index < 26) {
      // A-Z
      name = String.fromCharCode(baseCharCode + index);
    } else {
      // AA, AB, AC...
      const firstChar = String.fromCharCode(baseCharCode + Math.floor((index) / 26) - 1);
      const secondChar = String.fromCharCode(baseCharCode + (index % 26));
      name = firstChar + secondChar;
    }
    
    return name;
  };
  
  const addPart = () => {
    if (!newPartLength || isNaN(parseFloat(newPartLength)) || parseFloat(newPartLength) <= 0) {
      setError('Please enter a valid length for the new part');
      return;
    }
    
    if (!newPartQuantity || isNaN(parseInt(newPartQuantity)) || parseInt(newPartQuantity) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    
    setError('');
    
    // Check if input contains comma-separated values
    const lengthValues = newPartLength.split(',').map(l => l.trim()).filter(l => l);
    
    if (lengthValues.length > 1) {
      // Handle CSV input
      const newParts = [];
      
      lengthValues.forEach(lengthStr => {
        const length = parseFloat(lengthStr);
        if (!isNaN(length) && length > 0) {
          for (let i = 0; i < newPartQuantity; i++) {
            // Generate the next name based on total parts
            const nextIndex = cutParts.length + newParts.length;
            const name = generateName(nextIndex);
            
            newParts.push({
              id: Date.now() + newParts.length,
              length: length,
              added: Date.now(),
              name: name
            });
          }
        }
      });
      
      if (newParts.length === 0) {
        setError('No valid measurements found in CSV input');
        return;
      }
      
      setCutParts([...cutParts, ...newParts]);
    } else {
      // Handle single value input
      const length = parseFloat(newPartLength);
      const quantity = parseInt(newPartQuantity);
      
      const newParts = [];
      for (let i = 0; i < quantity; i++) {
        // Generate the next name based on current total
        const nextIndex = cutParts.length + i;
        const name = generateName(nextIndex);
        
        newParts.push({
          id: Date.now() + i,
          length: length,
          added: Date.now(),
          name: name
        });
      }
      
      setCutParts([...cutParts, ...newParts]);
    }
    
    setNewPartLength('');
    setNewPartQuantity(1);
  };
  
  const startEditPartName = (part) => {
    setEditingPartId(part.id);
    setEditingPartName(part.name);
  };
  
  const savePartName = () => {
    if (editingPartId) {
      setCutParts(cutParts.map(part => 
        part.id === editingPartId 
          ? { ...part, name: editingPartName || part.name } 
          : part
      ));
      setEditingPartId(null);
      setEditingPartName('');
    }
  };
  
  const handleEditNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      savePartName();
    }
  };

  const removePart = (id) => {
    setCutParts(cutParts.filter(part => part.id !== id));
  };

  const addStock = () => {
    if (!newStockLength || isNaN(parseFloat(newStockLength)) || parseFloat(newStockLength) <= 0) {
      setError('Please enter a valid length for the stock');
      return;
    }
    
    setError('');
    
    // Check if input contains comma-separated values
    const lengthValues = newStockLength.split(',').map(l => l.trim()).filter(l => l);
    
    if (lengthValues.length > 1) {
      // Handle CSV input
      const newStockItems = [];
      
      lengthValues.forEach(lengthStr => {
        const length = parseFloat(lengthStr);
        if (!isNaN(length) && length > 0) {
          newStockItems.push({
            id: Date.now() + newStockItems.length,
            length: length,
            added: Date.now()
          });
        }
      });
      
      if (newStockItems.length === 0) {
        setError('No valid measurements found in CSV input');
        return;
      }
      
      setStock([...stock, ...newStockItems]);
    } else {
      // Handle single value input
      setStock([...stock, {
        id: Date.now(),
        length: parseFloat(newStockLength),
        added: Date.now()
      }]);
    }
    
    setNewStockLength('');
  };
  
  const handleStockKeyPress = (e) => {
    if (e.key === 'Enter') {
      addStock();
    }
  };
  
  const handleDefaultStockKeyPress = (e) => {
    if (e.key === 'Enter') {
      addDefaultStock();
    }
  };

  const addDefaultStock = () => {
    if (!defaultStockLength || isNaN(parseFloat(defaultStockLength)) || parseFloat(defaultStockLength) <= 0) {
      setError('Please enter a valid default stock length');
      return;
    }
    
    setError('');
    setStock([...stock, {
      id: Date.now(),
      length: parseFloat(defaultStockLength),
      added: Date.now(),
      isDefault: true
    }]);
  };

  const removeStock = (id) => {
    setStock(stock.filter(item => item.id !== id));
  };

  const calculateOptimalCutting = () => {
    // Make copies to avoid modifying original arrays
    const parts = [...cutParts].sort((a, b) => b.length - a.length); // Sort by descending length
    const availableStock = [...stock];
    const kerf = parseFloat(kerfWidth);
    
    // We'll track the waste pieces across all stock
    let wasteTracker = [];
    
    // First pass: Assign parts to stock using First-Fit Decreasing algorithm
    // but track potential waste pieces for redistribution later
    const result = [];
    const remainingParts = [...parts];
    
    // Try to fit all parts into available stock
    while (remainingParts.length > 0 && availableStock.length > 0) {
      const currentStock = availableStock.shift();
      const stockUsage = {
        stockId: currentStock.id,
        stockLength: currentStock.length,
        isDefault: currentStock.isDefault,
        cuts: [],
        remainingLength: currentStock.length,
        stockIndex: result.length // Keep track of this stock's index
      };
      
      // Try to fit parts into current stock
      let i = 0;
      while (i < remainingParts.length) {
        const part = remainingParts[i];
        const cutLength = part.length;
        
        // Check if this part fits (considering kerf)
        if (stockUsage.remainingLength >= cutLength + (stockUsage.cuts.length > 0 ? kerf : 0)) {
          // Add kerf if it's not the first cut
          if (stockUsage.cuts.length > 0) {
            stockUsage.remainingLength -= kerf;
          }
          
          stockUsage.cuts.push({
            partId: part.id,
            length: cutLength,
            position: currentStock.length - stockUsage.remainingLength,
            name: part.name
          });
          
          stockUsage.remainingLength -= cutLength;
          remainingParts.splice(i, 1); // Remove the part from remaining parts
        } else {
          i++; // Move to next part
        }
      }
      
      // Track waste piece
      if (stockUsage.remainingLength > 0) {
        wasteTracker.push({
          stockId: stockUsage.stockId,
          stockIndex: result.length,
          wasteLength: stockUsage.remainingLength
        });
      }
      
      result.push(stockUsage);
    }
    
    // If we still have parts but ran out of stock, we need to add more default stock
    let additionalStockNeeded = 0;
    while (remainingParts.length > 0) {
      additionalStockNeeded++;
      const stockUsage = {
        stockId: `additional-${additionalStockNeeded}`,
        stockLength: defaultStockLength,
        isAdditional: true,
        cuts: [],
        remainingLength: defaultStockLength,
        stockIndex: result.length
      };
      
      // Try to fit parts into this new stock
      let i = 0;
      while (i < remainingParts.length) {
        const part = remainingParts[i];
        const cutLength = part.length;
        
        // Check if this part fits (considering kerf)
        if (stockUsage.remainingLength >= cutLength + (stockUsage.cuts.length > 0 ? kerf : 0)) {
          // Add kerf if it's not the first cut
          if (stockUsage.cuts.length > 0) {
            stockUsage.remainingLength -= kerf;
          }
          
          stockUsage.cuts.push({
            partId: part.id,
            length: cutLength,
            position: defaultStockLength - stockUsage.remainingLength,
            name: part.name
          });
          
          stockUsage.remainingLength -= cutLength;
          remainingParts.splice(i, 1); // Remove the part from remaining parts
        } else {
          i++; // Move to next part
        }
      }
      
      // Track waste piece from additional stock
      if (stockUsage.remainingLength > 0) {
        wasteTracker.push({
          stockId: stockUsage.stockId,
          stockIndex: result.length,
          wasteLength: stockUsage.remainingLength
        });
      }
      
      result.push(stockUsage);
    }
    
    // Second pass: Optimize for longest waste piece
    // Sort waste tracker by waste length (smallest first)
    wasteTracker.sort((a, b) => a.wasteLength - b.wasteLength);
    
    // Try to redistribute small cuts to consolidate waste
    if (wasteTracker.length > 1) {
      let optimized = false;
      let iterations = 0;
      const maxIterations = 10; // Prevent infinite loops
      
      while (!optimized && iterations < maxIterations) {
        optimized = true;
        iterations++;
        
        // Get the smallest and largest waste pieces
        const smallestWaste = wasteTracker[0];
        const largestWaste = wasteTracker[wasteTracker.length - 1];
        
        // Only proceed if there's a meaningful difference
        if (largestWaste.wasteLength - smallestWaste.wasteLength > kerf * 2) {
          // Look for small parts in the stock with the largest waste
          const stockWithLargestWaste = result[largestWaste.stockIndex];
          
          // Sort cuts by size (smallest first)
          const sortedCuts = [...stockWithLargestWaste.cuts].sort((a, b) => a.length - b.length);
          
          // Find a cut that could fit in the stock with the smallest waste
          for (let i = 0; i < sortedCuts.length; i++) {
            const cut = sortedCuts[i];
            const stockWithSmallestWaste = result[smallestWaste.stockIndex];
            
            // Check if this cut can fit in the stock with the smallest waste
            // We need to account for kerf if it's not the first cut
            const kerfNeeded = stockWithSmallestWaste.cuts.length > 0 ? kerf : 0;
            
            if (smallestWaste.wasteLength >= cut.length + kerfNeeded) {
              // This cut can be moved to the stock with the smallest waste
              
              // Remove the cut from its current stock
              stockWithLargestWaste.cuts = stockWithLargestWaste.cuts.filter(c => c.partId !== cut.partId);
              
              // Recalculate positions and remaining length for the stock with largest waste
              let runningPosition = 0;
              stockWithLargestWaste.remainingLength = stockWithLargestWaste.stockLength;
              
              for (let j = 0; j < stockWithLargestWaste.cuts.length; j++) {
                if (j > 0) {
                  runningPosition += kerf;
                  stockWithLargestWaste.remainingLength -= kerf;
                }
                
                stockWithLargestWaste.cuts[j].position = runningPosition;
                runningPosition += stockWithLargestWaste.cuts[j].length;
                stockWithLargestWaste.remainingLength -= stockWithLargestWaste.cuts[j].length;
              }
              
              // Add the cut to the stock with smallest waste
              if (stockWithSmallestWaste.cuts.length > 0) {
                stockWithSmallestWaste.remainingLength -= kerf;
              }
              
              stockWithSmallestWaste.cuts.push({
                ...cut,
                position: stockWithSmallestWaste.stockLength - stockWithSmallestWaste.remainingLength
              });
              
              stockWithSmallestWaste.remainingLength -= cut.length;
              
              // Update waste tracker
              largestWaste.wasteLength = stockWithLargestWaste.remainingLength;
              smallestWaste.wasteLength = stockWithSmallestWaste.remainingLength;
              
              // Re-sort waste tracker
              wasteTracker.sort((a, b) => a.wasteLength - b.wasteLength);
              
              // We made a change, so we're not optimized yet
              optimized = false;
              break;
            }
          }
        }
      }
      
      // Final pass: Make sure all positions are updated correctly
      for (let i = 0; i < result.length; i++) {
        const stock = result[i];
        
        // Sort cuts by position
        stock.cuts.sort((a, b) => a.position - b.position);
        
        // Recalculate positions to ensure they're accurate
        let runningPosition = 0;
        stock.remainingLength = stock.stockLength;
        
        for (let j = 0; j < stock.cuts.length; j++) {
          if (j > 0) {
            runningPosition += kerf;
            stock.remainingLength -= kerf;
          }
          
          stock.cuts[j].position = runningPosition;
          runningPosition += stock.cuts[j].length;
          stock.remainingLength -= stock.cuts[j].length;
        }
      }
    }
    
    setSolution(result);
  };

  const getTotalWaste = () => {
    if (!solution) return 0;
    return solution.reduce((sum, stock) => sum + stock.remainingLength, 0);
  };

  return (
    <div className="p-4 max-w-screen-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Cut List Optimizer</h1>
      
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Parts Needed</h2>
          
          <div className="flex flex-wrap gap-2 mb-4">
            <input
              type="text"
              value={newPartLength}
              onChange={(e) => setNewPartLength(e.target.value)}
              onKeyPress={handlePartKeyPress}
              placeholder="Length (mm) or CSV"
              className="flex-1 p-2 border rounded"
            />
            <input
              type="number"
              value={newPartQuantity}
              onChange={(e) => setNewPartQuantity(e.target.value)}
              onKeyPress={handlePartKeyPress}
              placeholder="Qty"
              min="1"
              className="w-20 p-2 border rounded"
            />
            <button 
              onClick={addPart}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">Tip: You can enter multiple lengths separated by commas (e.g., "100, 200, 300")</p>
          
          <div className="max-h-60 overflow-y-auto">
            {cutParts.length === 0 ? (
              <p className="text-gray-500 italic">No parts added yet.</p>
            ) : (
              <div className="space-y-2">
                {
                  // Group parts by length
                  Object.entries(
                    _.groupBy(cutParts, 'length')
                  ).sort((a, b) => parseFloat(a[0]) - parseFloat(b[0])).map(([length, parts]) => {
                    const maxPartLength = Math.max(...cutParts.map(p => p.length));
                    const widthPercentage = (parseFloat(length) / maxPartLength) * 100;
                    const quantity = parts.length;
                    
                    return (
                      <div key={length} className="flex flex-col p-1 rounded mb-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center w-full mr-2">
                            <div 
                              className="bg-blue-500 h-8 rounded flex items-center px-2 text-white text-sm"
                              style={{ width: `${widthPercentage}%`, minWidth: '40px' }}
                            >
                              {length} mm
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className="flex items-center border rounded mr-2">
                              <button 
                                onClick={() => {
                                  // Remove one part with this length
                                  if (quantity > 0) {
                                    const partToRemove = parts[0];
                                    setCutParts(cutParts.filter(p => p.id !== partToRemove.id));
                                  }
                                }}
                                className="px-2 py-1 text-red-500 hover:bg-red-100"
                                disabled={quantity === 0}
                              >
                                −
                              </button>
                              <span className="px-2">{quantity}</span>
                              <button 
                                onClick={() => {
                                  // Generate the next name based on current total
                                  const nextIndex = cutParts.length;
                                  const name = generateName(nextIndex);
                                  
                                  const newPart = {
                                    id: Date.now(),
                                    length: parseFloat(length),
                                    added: Date.now(),
                                    name: name
                                  };
                                  setCutParts([...cutParts, newPart]);
                                }}
                                className="px-2 py-1 text-green-500 hover:bg-green-100"
                              >
                                +
                              </button>
                            </div>
                            <button 
                              onClick={() => {
                                // Remove all parts with this length
                                setCutParts(cutParts.filter(p => p.length !== parseFloat(length)));
                              }}
                              className="text-red-500 hover:text-red-700 text-sm border border-red-300 px-2 py-1 rounded hover:bg-red-50"
                              title="Remove all of this length"
                            >
                              Delete All
                            </button>
                          </div>
                        </div>
                        
                        {/* Parts list with editable names */}
                        <div className="ml-2 mt-1">
                          <div className="text-xs text-gray-500 mb-1">Part Names (click to edit):</div>
                          <div className="flex flex-wrap gap-1">
                            {parts.map(part => (
                              <div key={part.id} className="flex items-center bg-gray-100 rounded px-2 py-1">
                                {editingPartId === part.id ? (
                                  <div className="flex items-center">
                                    <input
                                      type="text"
                                      value={editingPartName}
                                      onChange={(e) => setEditingPartName(e.target.value)}
                                      onKeyPress={handleEditNameKeyPress}
                                      className="w-16 px-1 py-0 text-sm border rounded"
                                      autoFocus
                                    />
                                    <button 
                                      onClick={savePartName}
                                      className="ml-1 text-xs text-green-600 hover:text-green-800"
                                    >
                                      Save
                                    </button>
                                  </div>
                                ) : (
                                  <span 
                                    onClick={() => startEditPartName(part)}
                                    className="cursor-pointer hover:text-blue-500 text-sm"
                                    title="Click to edit"
                                  >
                                    {part.name}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <h3 className="font-bold">Summary:</h3>
            <p>Total parts: {cutParts.length}</p>
            <p>Total length needed: {cutParts.reduce((sum, part) => sum + part.length, 0)} mm</p>
          </div>
          
          <div className="mt-4">
            <h3 className="font-bold">Parts List:</h3>
            <div className="max-h-40 overflow-y-auto mt-2 bg-gray-50 p-2 rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left pr-4">Name</th>
                    <th className="text-right">Length</th>
                  </tr>
                </thead>
                <tbody>
                  {_.sortBy(cutParts, ['name']).map(part => (
                    <tr key={part.id} className="border-b border-gray-200">
                      <td className="pr-4">{part.name}</td>
                      <td className="text-right">{part.length} mm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Available Stock</h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              value={defaultStockLength}
              onChange={(e) => setDefaultStockLength(parseFloat(e.target.value))}
              onKeyPress={handleDefaultStockKeyPress}
              placeholder="Default Stock Length (mm)"
              className="flex-1 p-2 border rounded"
            />
            <button 
              onClick={addDefaultStock}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Add Default
            </button>
          </div>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newStockLength}
              onChange={(e) => setNewStockLength(e.target.value)}
              onKeyPress={handleStockKeyPress}
              placeholder="Custom Length (mm) or CSV"
              className="flex-1 p-2 border rounded"
            />
            <button 
              onClick={addStock}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">Tip: You can enter multiple lengths separated by commas (e.g., "3600, 2400, 1800")</p>
          
          <div className="mb-4">
            <label className="block mb-2">Kerf Width (mm):</label>
            <input
              type="number"
              value={kerfWidth}
              onChange={(e) => setKerfWidth(parseFloat(e.target.value))}
              placeholder="Saw Kerf Width (mm)"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto">
            {stock.length === 0 ? (
              <p className="text-gray-500 italic">No stock added yet.</p>
            ) : (
              <div className="space-y-2">
                {
                  // Group stock by length and isDefault property
                  Object.entries(
                    _.groupBy(stock, item => `${item.length}-${item.isDefault ? 'default' : 'custom'}`)
                  ).sort((a, b) => {
                    const lengthA = parseFloat(a[0].split('-')[0]);
                    const lengthB = parseFloat(b[0].split('-')[0]);
                    return lengthA - lengthB;
                  }).map(([key, items]) => {
                    const length = parseFloat(key.split('-')[0]);
                    const isDefault = key.split('-')[1] === 'default';
                    const maxStockLength = Math.max(...stock.map(s => s.length), defaultStockLength);
                    const widthPercentage = (length / maxStockLength) * 100;
                    const quantity = items.length;
                    
                    return (
                      <div key={key} className="flex justify-between items-center p-1 rounded">
                        <div className="flex items-center w-full mr-2">
                          <div 
                            className={`h-8 rounded flex items-center px-2 text-white text-sm ${isDefault ? 'bg-green-500' : 'bg-gray-500'}`}
                            style={{ width: `${widthPercentage}%`, minWidth: '60px' }}
                          >
                            {length} mm
                            {isDefault && ' (Default)'}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <div className="flex items-center border rounded mr-2">
                            <button 
                              onClick={() => {
                                // Remove one stock with this length and type
                                if (quantity > 0) {
                                  const stockToRemove = items[0];
                                  setStock(stock.filter(s => s.id !== stockToRemove.id));
                                }
                              }}
                              className="px-2 py-1 text-red-500 hover:bg-red-100"
                              disabled={quantity === 0}
                            >
                              −
                            </button>
                            <span className="px-2">{quantity}</span>
                            <button 
                              onClick={() => {
                                const newStock = {
                                  id: Date.now(),
                                  length: length,
                                  added: Date.now(),
                                  isDefault: isDefault
                                };
                                setStock([...stock, newStock]);
                              }}
                              className="px-2 py-1 text-green-500 hover:bg-green-100"
                            >
                              +
                            </button>
                          </div>
                          <button 
                            onClick={() => {
                              // Remove all stock with this length and type
                              setStock(stock.filter(s => 
                                !(s.length === length && s.isDefault === isDefault)
                              ));
                            }}
                            className="text-red-500 hover:text-red-700 text-sm border border-red-300 px-2 py-1 rounded hover:bg-red-50"
                            title="Remove all of this length"
                          >
                            Delete All
                          </button>
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <h3 className="font-bold">Summary:</h3>
            <p>Stock pieces: {stock.length}</p>
            <p>Total stock length: {stock.reduce((sum, item) => sum + item.length, 0)} mm</p>
          </div>
        </div>
      </div>
      
      {solution && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          <h2 className="text-xl font-bold mb-4">Cutting Plan</h2>
          <p className="mb-4">
            Total waste: {getTotalWaste()} mm ({(getTotalWaste() / solution.reduce((sum, s) => sum + s.stockLength, 0) * 100).toFixed(1)}% of total stock)
          </p>
          
          <div className="space-y-6">
            {solution.map((stockItem, stockIndex) => (
              <div 
                key={stockItem.stockId} 
                className={`p-3 rounded ${stockItem.isAdditional ? 'bg-red-50 border border-red-300' : 'bg-gray-50'}`}
              >
                <h3 className="font-bold mb-2">
                  Stock #{stockIndex + 1}: 
                  {stockItem.isAdditional ? ' ADDITIONAL' : ''} 
                  {stockItem.isDefault ? ' (Default)' : ''} 
                  - {stockItem.stockLength} mm
                </h3>
                
                <div className="relative h-12 bg-gray-200 mb-2 rounded overflow-hidden">
                  {stockItem.cuts.map((cut, cutIndex) => {
                    const prevCutsLength = stockItem.cuts
                      .slice(0, cutIndex)
                      .reduce((sum, c) => sum + c.length + kerfWidth, 0);
                    
                    const startPos = (prevCutsLength / stockItem.stockLength) * 100;
                    const width = (cut.length / stockItem.stockLength) * 100;
                    
                    // Find the part to get its name
                    const part = cutParts.find(p => p.id === cut.partId);
                    const partName = part ? part.name : '?';
                    
                    return (
                      <div 
                        key={cutIndex}
                        className="absolute top-0 h-full bg-blue-500 border-r-2 border-white flex items-center justify-center text-white text-xs"
                        style={{
                          left: `${startPos}%`,
                          width: `${width}%`
                        }}
                        title={`${partName}: ${cut.length} mm at position ${cut.position.toFixed(0)} mm`}
                      >
                        {partName}
                      </div>
                    );
                  })}
                  
                  {stockItem.remainingLength > 0 && (
                    <div 
                      className="absolute top-0 h-full bg-gray-400 flex items-center justify-center text-white text-xs"
                      style={{
                        left: `${((stockItem.stockLength - stockItem.remainingLength) / stockItem.stockLength) * 100}%`,
                        width: `${(stockItem.remainingLength / stockItem.stockLength) * 100}%`
                      }}
                    >
                      Waste: {stockItem.remainingLength.toFixed(0)} mm
                    </div>
                  )}
                </div>
                
                <div className="text-sm">
                  <div className="grid grid-cols-4 gap-2">
                    <div><strong>Cut #</strong></div>
                    <div><strong>Name</strong></div>
                    <div><strong>Length</strong></div>
                    <div><strong>Position</strong></div>
                  </div>
                  
                  {stockItem.cuts.map((cut, cutIndex) => {
                    // Find the part to get its name
                    const part = cutParts.find(p => p.id === cut.partId);
                    const partName = part ? part.name : '?';
                    
                    return (
                      <div key={cutIndex} className="grid grid-cols-4 gap-2">
                        <div>{cutIndex + 1}</div>
                        <div>{partName}</div>
                        <div>{cut.length} mm</div>
                        <div>{cut.position.toFixed(0)} mm</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CutListOptimizer;