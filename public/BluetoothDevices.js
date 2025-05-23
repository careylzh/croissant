import React, { useState, useEffect } from 'react';

const BluetoothDevices = ({ devices, branches, onFinishSelection, existingMappings = [] }) => {
  const [engineers, setEngineers] = useState([]);
  const [currentEngineer, setCurrentEngineer] = useState('');
  const [deviceMappings, setDeviceMappings] = useState({});
  const [selectedDevices, setSelectedDevices] = useState(new Set());
  const [showAddEngineer, setShowAddEngineer] = useState(true);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);

  // Update discovered devices when new devices are found
  useEffect(() => {
    console.log('Devices prop updated:', devices);
    if (devices && devices.length > 0) {
      // Sort devices by distance
      const sortedDevices = [...devices].sort((a, b) => {
        if (!a.distanceProxyInMetres) return 1;
        if (!b.distanceProxyInMetres) return -1;
        return a.distanceProxyInMetres - b.distanceProxyInMetres;
      });
      setDiscoveredDevices(sortedDevices);
    } else {
      setDiscoveredDevices([]);
    }
  }, [devices]);

  // Load existing mappings if provided
  useEffect(() => {
    if (existingMappings.length > 0) {
      const initialEngineers = existingMappings.map(mapping => mapping.engineer);
      setEngineers(initialEngineers);
      setShowAddEngineer(false);

      const initialMappings = {};
      existingMappings.forEach(mapping => {
        initialMappings[mapping.engineer] = mapping.devices;
      });
      setDeviceMappings(initialMappings);
    }
  }, [existingMappings]);

  const addEngineer = () => {
    if (currentEngineer.trim()) {
      setEngineers([...engineers, currentEngineer.trim()]);
      setCurrentEngineer('');
      setShowAddEngineer(false);
    }
  };

  const removeEngineer = (engineer) => {
    setEngineers(engineers.filter(e => e !== engineer));
    const newMappings = { ...deviceMappings };
    delete newMappings[engineer];
    setDeviceMappings(newMappings);
  };

  const updateDeviceMapping = (engineer, deviceName, branch) => {
    setDeviceMappings(prev => ({
      ...prev,
      [engineer]: {
        ...prev[engineer],
        [deviceName]: branch
      }
    }));
  };

  const toggleDeviceSelection = (deviceName) => {
    setSelectedDevices(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(deviceName)) {
        newSelected.delete(deviceName);
      } else {
        newSelected.add(deviceName);
      }
      return newSelected;
    });
  };

  const handleFinish = () => {
    const mappings = engineers.map(engineer => ({
      engineer,
      devices: deviceMappings[engineer] || {}
    }));
    onFinishSelection(mappings);
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Bluetooth Device Mapping</h2>
      
      {/* Discovered Devices Section */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-xl mb-2">Discovered Bluetooth Devices</h3>
        <div className="space-y-2">
          {discoveredDevices.map((device, index) => (
            <div key={index} className="p-2 bg-gray-700 rounded flex justify-between items-center">
              <span>{device.deviceName}</span>
              <span className="text-gray-300">
                {device.distanceProxyInMetres
                  ? `${device.distanceProxyInMetres.toFixed(2)} meters`
                  : 'N/A'}
              </span>
            </div>
          ))}
          {discoveredDevices.length === 0 && (
            <div className="text-gray-400">No devices discovered yet...</div>
          )}
        </div>
      </div>
      
      {/* Add Engineer Section */}
      {showAddEngineer && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Add Engineer</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentEngineer}
              onChange={(e) => setCurrentEngineer(e.target.value)}
              placeholder="Enter engineer name"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={addEngineer}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Engineers List */}
      {engineers.map(engineer => (
        <div key={engineer} className="mb-6 p-4 bg-white rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{engineer}</h3>
            <button
              onClick={() => removeEngineer(engineer)}
              className="text-red-500 hover:text-red-700"
            >
              Remove
            </button>
          </div>
          
          {/* Device List */}
          <div className="space-y-2">
            {devices.map(device => (
              <div key={device.deviceName} className="flex items-center gap-4 p-2 bg-gray-50 rounded">
                <input
                  type="checkbox"
                  checked={selectedDevices.has(device.deviceName)}
                  onChange={() => toggleDeviceSelection(device.deviceName)}
                  className="h-4 w-4"
                />
                <span className="flex-1">{device.deviceName}</span>
                {selectedDevices.has(device.deviceName) && (
                  <select
                    value={deviceMappings[engineer]?.[device.deviceName] || ''}
                    onChange={(e) => updateDeviceMapping(engineer, device.deviceName, e.target.value)}
                    className="p-2 border rounded"
                  >
                    <option value="">Select branch</option>
                    {branches.map(branch => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Finish Button */}
      <div className="mt-6">
        <button
          onClick={handleFinish}
          className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Finish Mapping
        </button>
      </div>
    </div>
  );
};

export default BluetoothDevices;