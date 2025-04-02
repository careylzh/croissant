import React, { useState } from 'react';

const BluetoothDevices = ({ devices, onFinishSelection = () => console.warn('onFinishSelection is not provided') }) => {
  const [selectedDevices, setSelectedDevices] = useState([]);

  const toggleDeviceSelection = (deviceName) => {
    setSelectedDevices((prevSelected) =>
      prevSelected.includes(deviceName)
        ? prevSelected.filter((name) => name !== deviceName)
        : [...prevSelected, deviceName]
    );
  };

  const finishSelection = () => {
    if (typeof onFinishSelection === 'function') {
      onFinishSelection(selectedDevices); // Safely invoke the callback
    } else {
      console.error('onFinishSelection is not a function');
    }
  };

  return (
    <div className="p-4 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">Select all Bluetooth devices associated with you: </h2>
      <ul className="list-none">
        {devices.map((device, index) => (
          <li key={index} className="mb-2">
            <button
              onClick={() => toggleDeviceSelection(device.deviceName)}
              className={`p-2 rounded ${
                selectedDevices.includes(device.deviceName)
                  ? 'bg-blue-500 border-2 border-white'
                  : 'bg-gray-800'
              }`}
            >
              {device.deviceName} -{' '}
              {device.distanceProxyInMetres
                ? device.distanceProxyInMetres.toFixed(2)
                : 'N/A'}{' '}
              meters
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={finishSelection}
        className="mt-4 p-2 bg-green-500 rounded text-white"
      >
        Finish Selection
      </button>
    </div>
  );
};

export default BluetoothDevices;