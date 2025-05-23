import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Onboarding from './Onboarding';
import BluetoothDevices from './BluetoothDevices';
import { Provider } from 'react-redux';
import store from '../redux/store.js'; // Adjusted to match default export
import { useDispatch } from 'react-redux';
import { setUserDevices } from '../redux/devicesSlice';
import ReadyScreen from './ReadyScreen'; // Import the new ReadyScreen component

const root = ReactDOM.createRoot(document.getElementById('root'));

console.log(store.getState());

function App() {
  const [email, setEmail] = useState(null);
  const [firstName, setFirstName] = useState(''); // State for first name
  const [deviceName, setDeviceName] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [ws, setWs] = useState(null);
  const [devices, setDevices] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isReady, setIsReady] = useState(true); // Changed to true to skip BluetoothDevices screen
  const dispatch = useDispatch();

  useEffect(() => {
    if (email) {
      // Connect to WebSocket server
      const websocket = new WebSocket('ws://localhost:3000');
      setWs(websocket);

      websocket.onopen = () => {
        console.log('Connected to WebSocket server');
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);
          
          if (data.type === 'log') {
            setLogs((prevLogs) => [...prevLogs, data.message]);
          } else {
            setDevices((prevDevices) => {
              const now = Date.now();
              const updatedDevices = prevDevices.map(device => {
                if (device.deviceName === data.deviceName) {
                  return { ...device, ...data, timestamp: now };
                }
                return device;
              });

              const isNewDevice = !updatedDevices.some(device => device.deviceName === data.deviceName);
              if (isNewDevice) {
                console.log(`New device found: ${data.deviceName}`);
                updatedDevices.push({ ...data, timestamp: now });
              }

              // Sort devices by distance
              return updatedDevices.sort((a, b) => {
                if (!a.distanceProxyInMetres) return 1;
                if (!b.distanceProxyInMetres) return -1;
                return a.distanceProxyInMetres - b.distanceProxyInMetres;
              });
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error(`WebSocket error: ${error.message}`);
      };

      websocket.onclose = () => {
        console.log('Disconnected from WebSocket server');
      };

      return () => {
        websocket.close();
      };
    }
  }, [email]);

  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const now = Date.now();
        setDevices((prevDevices) => prevDevices.filter(device => now - device.timestamp < 10000)); // 10 seconds timeout
      } catch (error) {
        console.error('Error in interval function:', error);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const handleEmailSubmit = (email, firstName) => {
    setEmail(email);
    setFirstName(firstName); // Store first name in state
  };

  const handleDeviceSelection = (selectedDevices) => {
    console.log('Selected devices:', selectedDevices); // Log selected devices for debugging
    dispatch(setUserDevices({ firstName, email, devices: selectedDevices })); // Store in Redux
    setIsReady(true); // Navigate to the next page
  };

  if (isReady) {
    return <ReadyScreen />; // This will now be rendered immediately
  }

  // if (!email) {
  //   return <Onboarding onEmailSubmit={handleEmailSubmit} />;
  // }

  // Comment out or remove the BluetoothDevices screen
  // return (
  //   <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
  //     <h1 className="text-4xl font-bold mb-6">Bluetooth Connection</h1>
  //     <BluetoothDevices 
  //       devices={devices} 
  //       onFinishSelection={handleDeviceSelection} 
  //     />
  //     <div className="mt-6 w-full max-w-2xl">
  //       <h2 className="text-2xl font-bold mb-4">Logs</h2>
  //       <ul className="list-none">
  //         {logs.map((log, index) => (
  //           <li key={index} className="mb-2 p-2 bg-gray-800 rounded">
  //             {log}
  //           </li>
  //         ))}
  //       </ul>
  //     </div>
  //   </div>
  // );
}

root.render(
  <React.StrictMode>
    <Provider store={store}>
      {/* Wrap your App component with Provider and pass the store */}
      <App />
    </Provider>
  </React.StrictMode>
);