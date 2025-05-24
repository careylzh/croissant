import React, { useState, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3';

const ReadyScreen = () => {
  const [repositories, setRepositories] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [commits, setCommits] = useState([]);
  const [selectedCommit, setSelectedCommit] = useState('');
  const [graphData, setGraphData] = useState(null);
  const [error, setError] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [ws, setWs] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const connectWebSocket = useCallback(() => {
    try {
      if (ws) {
        ws.close();
      }

      const websocket = new WebSocket('ws://localhost:3000');
      setWs(websocket);

      websocket.onopen = () => {
        console.log('Connected to WebSocket server');
        setWsConnected(true);
        setWsError(null);
        setReconnectAttempts(0);
      };

      websocket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          // console.log('Received WebSocket message on:', data);
          
          if (data.deviceName.replace(/[^a-zA-Z]/g, '') === "Carey's Apple Watch".replace(/[^a-zA-Z]/g, '')) {
            console.log("Carey's Apple Watch detected, triggering auto-analysis");
            
            try {
              // Fetch device mappings
              const response = await fetch('/deviceMappings.json');
              if (!response.ok) {
                throw new Error('Failed to fetch device mappings');
              }
              const mappings = await response.json();
              console.log('Loaded device mappings:', mappings);
              
              let watchMapping = null;
              if (Array.isArray(mappings.devices)) {
                watchMapping = mappings.devices.find(m => 
                  m.deviceName.replace(/[^a-zA-Z]/g, '') === "Carey's Apple Watch".replace(/[^a-zA-Z]/g, '')
                );
                console.log('Found watch mapping:', watchMapping);
              } else {
                console.error('mappings.devices is not an array:', mappings);
                throw new Error('Invalid device mappings format');
              }
              
              if (watchMapping) {
                // Find the repository object that matches the path
                const repo = repositories.find(r => r.path === watchMapping.repoPath);
                console.log('Found matching repository:', repo);
                
                if (repo) {
                  // Set repository and branch
                  setSelectedRepo(repo);
                  setSelectedBranch(watchMapping.branchName);
                  
                  // Fetch branches for the repository
                  const branchesResponse = await fetch(`http://localhost:3000/branches?repoPath=${encodeURIComponent(repo.path)}`);
                  if (branchesResponse.ok) {
                    const branchesData = await branchesResponse.json();
                    console.log('Fetched branches:', branchesData);
                    setBranches(branchesData);
                    
                    // Fetch commits for the repository and branch
                    const commitsResponse = await fetch(
                      `http://localhost:3000/commits?repoPath=${encodeURIComponent(repo.path)}&branchName=${encodeURIComponent(watchMapping.branchName)}`
                    );
                    
                    if (commitsResponse.ok) {
                      const commitsData = await commitsResponse.json();
                      console.log('Fetched commits:', commitsData);
                      
                      // Find the earliest commit from today
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      
                      const todayCommits = commitsData.filter(commit => {
                        const commitDate = new Date(commit.date);
                        return commitDate >= today;
                      });
                      
                      if (todayCommits.length > 0) {
                        // Sort by date ascending (earliest first)
                        todayCommits.sort((a, b) => new Date(a.date) - new Date(b.date));
                        const earliestCommit = todayCommits[0];
                        console.log('Selected earliest commit from today:', earliestCommit);
                        setSelectedCommit(earliestCommit.hash);
                      } else {
                        console.log('No commits found from today');
                      }
                      
                      setCommits(commitsData);
                    } else {
                      console.error('Failed to fetch commits:', await commitsResponse.text());
                    }
                    
                    // Wait for state updates to complete
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Trigger analysis
                    console.log('Triggering analysis with:', {
                      repo: repo.path,
                      branch: watchMapping.branchName,
                      commit: selectedCommit
                    });
                    
                    try {
                      const analysisResponse = await fetch('http://localhost:3000/analyze-repo', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          repoPath: repo.path,
                          branchName: watchMapping.branchName,
                          startCommit: selectedCommit || undefined,
                          baseBranch: 'main'
                        }),
                      });

                      if (!analysisResponse.ok) {
                        throw new Error('Failed to analyze repository');
                      }

                      const analysisData = await analysisResponse.json();
                      console.log('Analysis completed:', analysisData);
                      setGraphData(analysisData);
                    } catch (error) {
                      console.error('Error during analysis:', error);
                      setError(error.message);
                    }
                  } else {
                    console.error('Repository not found:', watchMapping.repoPath);
                  }
                } else {
                  console.error('Repository not found:', watchMapping.repoPath);
                }
              } else {
                console.error('Watch mapping not found in device mappings');
              }
            } catch (error) {
              console.error('Error in auto-analysis flow:', error);
              setError(error.message);
            }
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
        setWsError('Connection error. Please check if the server is running.');
      };

      websocket.onclose = () => {
        console.log('Disconnected from WebSocket server');
        setWsConnected(false);
        setReconnectAttempts(prev => {
          const newAttempts = prev + 1;
          if (newAttempts >= MAX_RECONNECT_ATTEMPTS) {
            setWsError('Failed to connect after multiple attempts. Click "Reconnect" to try again.');
          } else {
            setWsError(`Connection lost. Attempting to reconnect (${newAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            setTimeout(connectWebSocket, 5000);
          }
          return newAttempts;
        });
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setWsConnected(false);
      setWsError('Failed to create WebSocket connection. Please check if the server is running.');
    }
  }, [repositories]);

  // Set up WebSocket connection
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket]);

  // Fetch repositories on component mount
  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const response = await fetch('http://localhost:3000/repositories');
        if (!response.ok) {
          throw new Error('Failed to fetch repositories');
        }
        const data = await response.json();
        setRepositories(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  // Fetch branches when repository is selected
  useEffect(() => {
    const fetchBranches = async () => {
      if (!selectedRepo) {
        setBranches([]);
        setSelectedBranch('');
        return;
      }

      setIsLoadingBranches(true);
      setError(null);
      
      try {
        const response = await fetch(`http://localhost:3000/branches?repoPath=${encodeURIComponent(selectedRepo.path)}`);
        if (!response.ok) {
          throw new Error('Failed to fetch branches');
        }
        const data = await response.json();
        setBranches(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [selectedRepo?.path]);

  // Fetch commits when branch is selected
  useEffect(() => {
    const fetchCommits = async () => {
      if (!selectedRepo || !selectedBranch) {
        setCommits([]);
        setSelectedCommit('');
        return;
      }

      setIsLoadingCommits(true);
      setError(null);
      
      try {
        const response = await fetch(
          `http://localhost:3000/commits?repoPath=${encodeURIComponent(selectedRepo.path)}&branchName=${encodeURIComponent(selectedBranch)}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch commits');
        }
        const data = await response.json();
        setCommits(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoadingCommits(false);
      }
    };

    fetchCommits();
  }, [selectedRepo?.path, selectedBranch]);

  // Reset graph data when branch changes
  useEffect(() => {
    setGraphData(null);
  }, [selectedBranch]);

  const analyzeRepository = useCallback(async () => {
    if (!selectedRepo || !selectedBranch) return;

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:3000/analyze-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoPath: selectedRepo.path,
          branchName: selectedBranch,
          startCommit: selectedCommit || undefined,
          baseBranch: 'main'
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
  }, [selectedRepo?.path, selectedBranch, selectedCommit]);

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
      
      // graphData.fx = node.x;
      // graphData.fy = node.y;
      // graphData.fz = node.z;
    } catch (err) {
      console.error('Error opening file:', err);
      setError(`Failed to open file: ${err.message}`);
    }
  }, [graphData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl">Loading repositories...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gray-900 text-white p-4">
      <h1 className="text-4xl font-bold mb-6">Repository Analysis</h1>
      
      {/* Connection Status */}
      <div className="w-full max-w-4xl mb-4">
        <div className={`p-2 rounded ${
          wsConnected 
            ? 'bg-green-500' 
            : wsError 
              ? 'bg-red-500' 
              : 'bg-yellow-500'
        }`}>
          <div className="flex justify-between items-center">
            <p>
              {wsConnected 
                ? 'Connected to server' 
                : wsError 
                  ? wsError 
                  : 'Connecting to server...'}
            </p>
            {!wsConnected && (
              <button
                onClick={() => {
                  setReconnectAttempts(0);
                  connectWebSocket();
                }}
                className="px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Repository</label>
            <select
              value={selectedRepo?.path || ''}
              onChange={(e) => {
                const repo = repositories.find(r => r.path === e.target.value);
                setSelectedRepo(repo);
              }}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            >
              <option value="">Choose a repository...</option>
              {repositories.map((repo, index) => (
                <option key={`${repo.path}-${index}`} value={repo.path}>
                  {repo.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Select Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              disabled={isLoadingBranches || !selectedRepo}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            >
              <option value="">Choose a branch...</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
            {isLoadingBranches && (
              <p className="text-sm text-gray-400 mt-1">Loading branches...</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Starting Commit (Optional)</label>
            <select
              value={selectedCommit}
              onChange={(e) => setSelectedCommit(e.target.value)}
              disabled={isLoadingCommits || !selectedBranch}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            >
              <option value="">All changes from main</option>
              {commits.map((commit) => (
                <option key={commit.hash} value={commit.hash}>
                  {commit.message.substring(0, 50)}...
                </option>
              ))}
            </select>
            {isLoadingCommits && (
              <p className="text-sm text-gray-400 mt-1">Loading commits...</p>
            )}
          </div>
        </div>

        <button
          onClick={analyzeRepository}
          disabled={isAnalyzing || !selectedRepo || !selectedBranch}
          className={`w-full p-2 rounded ${
            isAnalyzing || !selectedRepo || !selectedBranch
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

        {graphData && (
          <>
            <div className="flex justify-center items-center space-x-8 p-4 bg-gray-800 rounded">
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

            <div className="h-[600px] border border-gray-700 rounded-lg overflow-hidden">
              <ForceGraph2D
                graphData={graphData.graphData}
                nodeLabel={node => `${node.name}\nClick to open in editor`}
                nodeColor={node => node.isChanged ? '#ff6b6b' : '#4dabf7'}
                linkColor={() => '#64748b'}
                nodeVal={node => node.isChanged ? 2 : 1}
                onNodeClick={handleNodeClick}
                linkDirectionalParticles={2}
                linkDirectionalParticleSpeed={0.004}
                nodeCanvasObject={(node, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  const textWidth = ctx.measureText(label).width;
                  const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                  // Draw node circle
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
                  ctx.fillStyle = node.isChanged ? '#ff6b6b' : '#4dabf7';
                  ctx.fill();

                  // Draw label background with improved visibility
                  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
                  ctx.fillRect(
                    node.x - bckgDimensions[0] / 2,
                    node.y + 8,
                    bckgDimensions[0],
                    bckgDimensions[1]
                  );

                  // Draw label text with improved contrast
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = 'white';
                  ctx.fillText(
                    label,
                    node.x,
                    node.y + 8 + bckgDimensions[1] / 2
                  );
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-xl font-semibold mb-4">Commit History</h3>
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {graphData.commits.map((commit, index) => (
                    <div key={index} className="border-b border-gray-700 pb-4">
                      <p className="font-mono text-sm text-gray-400">{commit.hash}</p>
                      <p className="font-semibold">{commit.message}</p>
                      <p className="text-sm text-gray-400">
                        {commit.author} • {new Date(commit.date).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-xl font-semibold mb-4">Changed Files</h3>
                <div className="max-h-[400px] overflow-y-auto">
                  <ul className="list-disc list-inside">
                    {graphData.changedFiles.map((file, index) => (
                      <li key={index} className="text-gray-300">{file}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReadyScreen;
