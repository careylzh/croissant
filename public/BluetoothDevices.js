import React, { useState, useEffect } from 'react';

const BluetoothDevices = ({ 
  devices, 
  branches = [], 
  onFinishSelection = () => console.warn('onFinishSelection is not provided'),
  existingMappings = []
}) => {
  const [engineers, setEngineers] = useState([]);
  const [currentEngineer, setCurrentEngineer] = useState('');
  const [deviceMappings, setDeviceMappings] = useState({});
  const [selectedDevices, setSelectedDevices] = useState([]);
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

  // Initialize with existing mappings if provided
  useEffect(() => {
    if (existingMappings.length > 0) {
      setEngineers(existingMappings.map(m => m.engineer));
      setDeviceMappings(
        existingMappings.reduce((acc, mapping) => ({
          ...acc,
          [mapping.engineer]: mapping.devices
        }), {})
      );
      setShowAddEngineer(false);
    }
  }, [existingMappings]);

  const addEngineer = () => {
    if (currentEngineer.trim() && !engineers.includes(currentEngineer.trim())) {
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

  const updateDeviceMapping = (engineer, deviceName, branchName) => {
    setDeviceMappings(prev => ({
      ...prev,
      [engineer]: {
        ...prev[engineer],
        [deviceName]: branchName
      }
    }));
  };

  const toggleDeviceSelection = (deviceName) => {
    setSelectedDevices(prev =>
      prev.includes(deviceName)
        ? prev.filter(name => name !== deviceName)
        : [...prev, deviceName]
    );
  };

  const finishSelection = () => {
    const mappings = engineers.map(engineer => ({
      engineer,
      devices: deviceMappings[engineer] || {}
    }));
    onFinishSelection(mappings);
  };

  return (
    <div className="p-4 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">Device to Branch Mapping</h2>
      
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
        <div className="mb-6 p-4 bg-gray-800 rounded">
          <h3 className="text-xl mb-2">Add Engineer</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={currentEngineer}
              onChange={(e) => setCurrentEngineer(e.target.value)}
              placeholder="Enter engineer name"
              className="flex-1 p-2 rounded bg-gray-700 text-white"
            />
            <button
              onClick={addEngineer}
              className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Engineers List */}
      {engineers.map((engineer) => (
        <div key={engineer} className="mb-6 p-4 bg-gray-800 rounded">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl">{engineer}</h3>
            <button
              onClick={() => removeEngineer(engineer)}
              className="px-3 py-1 bg-red-500 rounded hover:bg-red-600"
            >
              Remove
            </button>
          </div>
          
          <div className="space-y-4">
            {discoveredDevices.map((device) => (
              <div key={device.deviceName} className="flex items-center gap-4">
                <button
                  onClick={() => toggleDeviceSelection(device.deviceName)}
                  className={`p-2 rounded flex-1 ${
                    selectedDevices.includes(device.deviceName)
                      ? 'bg-blue-500 border-2 border-white'
                      : 'bg-gray-700'
                  }`}
                >
                  {device.deviceName} -{' '}
                  {device.distanceProxyInMetres
                    ? device.distanceProxyInMetres.toFixed(2)
                    : 'N/A'}{' '}
                  meters
                </button>
                
                {selectedDevices.includes(device.deviceName) && (
                  <select
                    value={deviceMappings[engineer]?.[device.deviceName] || ''}
                    onChange={(e) => updateDeviceMapping(engineer, device.deviceName, e.target.value)}
                    className="p-2 rounded bg-gray-700 text-white"
                  >
                    <option value="">Select branch...</option>
                    {branches.map((branch) => (
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

      {/* Add Another Engineer Button */}
      {!showAddEngineer && (
        <button
          onClick={() => setShowAddEngineer(true)}
          className="mb-6 px-4 py-2 bg-green-500 rounded hover:bg-green-600"
        >
          Add Another Engineer
        </button>
      )}

      {/* Finish Button */}
      <button
        onClick={finishSelection}
        disabled={engineers.length === 0}
        className={`mt-4 p-2 rounded text-white ${
          engineers.length === 0
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-green-500 hover:bg-green-600'
        }`}
      >
        Finish Mapping
      </button>
    </div>
  );
};

export default BluetoothDevices;