import React, { useState, useCallback, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

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
        // Select main branch by default if it exists
        const mainBranch = data.find(b => b === 'main' || b === 'master');
        if (mainBranch) {
          setSelectedBranch(mainBranch);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [selectedRepo]);

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
  }, [selectedRepo, selectedBranch]);

  const analyzeRepository = async () => {
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
              {repositories.map((repo) => (
                <option key={repo.path} value={repo.path}>
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
