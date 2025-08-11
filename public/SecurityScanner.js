import React, { useState, useEffect } from 'react';

const SecurityScanner = ({ repoPath, branchName, onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [scanError, setScanError] = useState(null);
  const [scanMetadata, setScanMetadata] = useState(null);

  const startSecurityScan = async () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanStatus('Initializing scan...');
    setScanError(null);
    setVulnerabilities([]);

    try {
      // Simulate progress updates during scan
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 3000); // Update every 3 seconds for 30-second total

      // Update status messages
      const statusUpdates = [
        'Checking SonarQube status...',
        'Preparing repository...',
        'Running security analysis...',
        'Processing results...',
        'Finalizing scan...'
      ];

      let statusIndex = 0;
      const statusInterval = setInterval(() => {
        if (statusIndex < statusUpdates.length) {
          setScanStatus(statusUpdates[statusIndex]);
          statusIndex++;
        }
      }, 6000); // Update every 6 seconds

      // Make API call to start security scan
      const response = await fetch('/security-scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoPath, branchName }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setVulnerabilities(data.vulnerabilities);
        setScanMetadata(data.metadata);
        setScanProgress(100);
        setScanStatus('Scan completed successfully!');
        
        if (onScanComplete) {
          onScanComplete(data);
        }
      } else {
        throw new Error(data.error || 'Scan failed');
      }

      clearInterval(progressInterval);
      clearInterval(statusInterval);

    } catch (error) {
      console.error('Security scan error:', error);
      setScanError(error.message);
      setScanStatus('Scan failed');
      setScanProgress(0);
    } finally {
      setIsScanning(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        🔒 Security Vulnerability Scanner
      </h2>
      
      <div className="mb-6">
        <button
          onClick={startSecurityScan}
          disabled={isScanning}
          className={`px-6 py-3 rounded-lg font-semibold ${
            isScanning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isScanning ? 'Scanning...' : 'Start Security Scan'}
        </button>
      </div>

      {/* Scan Progress */}
      {isScanning && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">{scanStatus}</span>
            <span className="text-sm font-medium text-gray-700">{scanProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${scanProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Scan Error */}
      {scanError && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Scan Error:</strong> {scanError}
        </div>
      )}

      {/* Scan Results */}
      {vulnerabilities.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            Security Vulnerabilities Found: {vulnerabilities.length}
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 border-b text-left">Severity</th>
                  <th className="px-4 py-2 border-b text-left">Type</th>
                  <th className="px-4 py-2 border-b text-left">File / Line</th>
                  <th className="px-4 py-2 border-b text-left">Description</th>
                  <th className="px-4 py-2 border-b text-left">Rule ID</th>
                  <th className="px-4 py-2 border-b text-left">First Detected</th>
                  <th className="px-4 py-2 border-b text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {vulnerabilities.map((vuln, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(vuln.severity)}`}>
                        {vuln.severity}
                      </span>
                    </td>
                    <td className="px-4 py-2 border-b text-sm">{vuln.type}</td>
                    <td className="px-4 py-2 border-b text-sm font-mono">
                      {vuln.filePath}:{vuln.lineNumber}
                    </td>
                    <td className="px-4 py-2 border-b text-sm max-w-xs">
                      <div className="truncate" title={vuln.shortDescription}>
                        {vuln.shortDescription}
                      </div>
                    </td>
                    <td className="px-4 py-2 border-b text-sm font-mono">{vuln.ruleId}</td>
                    <td className="px-4 py-2 border-b text-sm">{formatDate(vuln.firstDetected)}</td>
                    <td className="px-4 py-2 border-b text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                        {vuln.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scan Metadata */}
      {scanMetadata && (
        <div className="text-sm text-gray-600">
          <p><strong>Scan completed:</strong> {formatDate(scanMetadata.timestamp)}</p>
          <p><strong>Repository:</strong> {scanMetadata.repoPath}</p>
          <p><strong>Branch:</strong> {scanMetadata.branchName}</p>
          <p><strong>Duration:</strong> {scanMetadata.scanDuration}</p>
        </div>
      )}
    </div>
  );
};

export default SecurityScanner;
