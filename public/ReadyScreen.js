import React, { useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const ReadyScreen = () => {
  const [repoPath, setRepoPath] = useState('');
  const [branchName, setBranchName] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [error, setError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeRepository = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3000/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoPath,
          branchName,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze repository');
      }

      const data = await response.json();
      setGraphData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNodeClick = useCallback(async (node) => {
    try {
      const response = await fetch('http://localhost:3000/open-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: node.path
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to open file');
      }

      // Center/zoom on node after opening file
      const distance = 40;
      const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
      
      graphData.fx = node.x;
      graphData.fy = node.y;
      graphData.fz = node.z;
    } catch (err) {
      console.error('Error opening file:', err);
      setError(`Failed to open file: ${err.message}`);
    }
  }, [graphData]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-6">Repository Analysis</h1>
      
      <div className="w-full max-w-md space-y-4 mb-8">
        <div>
          <label className="block text-sm font-medium mb-2">Repository Path</label>
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Enter full path to repository"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Branch Name</label>
          <input
            type="text"
            value={branchName}
            onChange={(e) => setBranchName(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            placeholder="Enter branch name"
          />
        </div>

        <button
          onClick={analyzeRepository}
          disabled={isAnalyzing || !repoPath || !branchName}
          className={`w-full p-2 rounded ${
            isAnalyzing || !repoPath || !branchName
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Repository'}
        </button>

        {error && (
          <div className="p-4 bg-red-900 rounded text-white">
            Error: {error}
          </div>
        )}
      </div>

      {graphData && (
        <>
          <div className="w-full mb-4 flex justify-center items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-[#ff6b6b]"></div>
              <span>Changed Files</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-[#4dabf7]"></div>
              <span>Dependencies</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4">
                <svg viewBox="0 0 10 10" className="w-full h-full">
                  <line x1="0" y1="5" x2="10" y2="5" stroke="#64748b" strokeWidth="2" />
                  <circle cx="5" cy="5" r="2" fill="#64748b" />
                </svg>
              </div>
              <span>Dependency Flow</span>
            </div>
          </div>

          <div className="w-full h-[600px] border border-gray-700 rounded-lg overflow-hidden">
            <ForceGraph2D
              graphData={graphData.graphData}
              nodeLabel={node => `${node.name}\nClick to open in editor`}
              nodeColor={node => node.isChanged ? '#ff6b6b' : '#4dabf7'}
              linkColor={() => '#64748b'}
              nodeVal={node => node.isChanged ? 2 : 1}
              onNodeClick={handleNodeClick}
              linkDirectionalParticles={2}
              linkDirectionalParticleSpeed={0.004}
            />
          </div>

          <div className="mt-8 w-full max-w-4xl">
            <h2 className="text-2xl font-bold mb-4">Commit Details</h2>
            <div className="bg-gray-800 p-4 rounded">
              <p className="mb-2"><span className="font-semibold">Commit Hash:</span> {graphData.commitHash}</p>
              <p className="font-semibold mb-2">Changed Files:</p>
              <ul className="list-disc list-inside">
                {graphData.changedFiles.map((file, index) => (
                  <li key={index} className="text-gray-300">{file}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReadyScreen;
