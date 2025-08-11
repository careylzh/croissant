const express = require('express');
const WebSocket = require('ws');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { promisify } = require('util');
const execAsync = promisify(exec);
const madge = require('madge');

const prisma = new PrismaClient();
const app = express();

// Add middleware to parse JSON request bodies
app.use(express.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

const server = app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});

// Load device mappings
const deviceMappingsPath = path.join(__dirname, 'deviceMappings.json');
let deviceMappings = {};

fs.readFile(deviceMappingsPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading device mappings:', err);
    return;
  }
  deviceMappings = JSON.parse(data);
});

// Set up WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    try {
      const device = JSON.parse(message);
      console.log('Received device:', device);

      // Broadcast the device to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(device));
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Serve static files (React app)
app.use(express.static('public'));

// Serve the dist directory
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// CRUD functions for Devices table
app.get('/devices', async (req, res) => {
  try {
    const devices = await prisma.device.findMany();
    res.json(devices);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/devices', async (req, res) => {
  try {
    const { name, rssi, distance, userEmail } = req.body;
    if (!name || !rssi || !distance || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const device = await prisma.device.create({
      data: {
        name,
        rssi,
        distance,
        user: {
          connectOrCreate: {
            where: { email: userEmail },
            create: { email: userEmail, name: 'Default User' }
          }
        }
      },
    });
    res.json(device);
  } catch (error) {
    console.error('Error creating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, rssi, distance } = req.body;
    if (!name || !rssi || !distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const device = await prisma.device.update({
      where: { id: parseInt(id) },
      data: { name, rssi, distance },
    });
    res.json(device);
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/devices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.device.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Device deleted' });
  } catch (error) {
    console.error('Error deleting device:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// New endpoint to get commits for a repository
app.get('/commits', async (req, res) => {
  const { repoPath, branchName } = req.query;

  if (!repoPath || !branchName) {
    return res.status(400).json({ error: 'Repository path and branch name are required' });
  }

  try {
    // Get commit history for the branch
    const { stdout } = await execAsync(
      `cd "${repoPath}" && git log --pretty=format:"%H|%an|%ad|%s" ${branchName}`
    );

    const commits = stdout
      .split('\n')
      .filter(Boolean)
      .map(commit => {
        const [hash, author, date, message] = commit.split('|');
        return {
          hash,
          author,
          date,
          message: message.trim()
        };
      });

    res.json(commits);
  } catch (error) {
    console.error('Error getting commits:', error);
    res.status(500).json({ 
      error: 'Failed to get commits',
      details: error.message 
    });
  }
});

// New endpoint to get repositories
app.get('/repositories', async (req, res) => {
  try {
    // Get user's home directory
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    
    // Add the current repository to the list
    const currentRepo = {
      path: __dirname,
      name: 'Current Repository (croissant)'
    };
    
    // Use a more reliable command to find git repositories
    const { stdout } = await execAsync(
      `cd "${homeDir}" && find . -type d -name ".git" -maxdepth 3 -exec sh -c 'echo "$(dirname "{}")"' \\; 2>/dev/null || true`
    );

    // Process and filter the repositories
    const repositories = stdout
      .split('\n')
      .filter(Boolean)
      .map(repoPath => {
        // Convert relative path to absolute path
        const absolutePath = path.resolve(homeDir, repoPath);
        return {
          path: absolutePath,
          name: path.basename(absolutePath)
        };
      })
      .filter(repo => {
        // Verify it's actually a git repository
        try {
          return fs.existsSync(path.join(repo.path, '.git'));
        } catch (e) {
          return false;
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    // Add current repository at the beginning of the list
    repositories.unshift(currentRepo);

    // Log for debugging
    console.log('Found repositories:', repositories);

    res.json(repositories);
  } catch (error) {
    console.error('Error getting repositories:', error);
    res.status(500).json({ 
      error: 'Failed to get repositories',
      details: error.message 
    });
  }
});

// New endpoint to get branches for a repository
app.get('/branches', async (req, res) => {
  const { repoPath } = req.query;

  if (!repoPath) {
    return res.status(400).json({ error: 'Repository path is required' });
  }

  try {
    // Change to the repository directory and get all branches
    const { stdout } = await execAsync(
      `cd "${repoPath}" && git branch -a | sed 's/^[ *]//' | sed 's/remotes\\/origin\\///' | sort -u`
    );

    const branches = stdout
      .split('\n')
      .filter(Boolean)
      .map(branch => branch.trim())
      .filter(branch => !branch.startsWith('HEAD'));

    res.json(branches);
  } catch (error) {
    console.error('Error getting branches:', error);
    res.status(500).json({ 
      error: 'Failed to get branches',
      details: error.message 
    });
  }
});

// Modified analyze-repo endpoint to handle commit-based analysis
app.post('/analyze-repo', async (req, res) => {
  const { repoPath, branchName, startCommit } = req.body;

  if (!repoPath || !branchName) {
    return res.status(400).json({ error: 'Repository path and branch name are required' });
  }

  try {
    // Change to the repository directory
    await execAsync(`cd "${repoPath}"`);

    // Always reset and checkout main branch before analysis
    try {
      await execAsync('git reset --hard HEAD');
      await execAsync('git checkout main');
      // Optionally: await execAsync('git pull');
    } catch (resetError) {
      console.error('Failed to reset or checkout main:', resetError.message);
      return res.status(500).json({ 
        error: 'Failed to reset or checkout main',
        details: resetError.message
      });
    }

    // If a different branch is requested, switch to it
    if (branchName !== 'main') {
      try {
        await execAsync(`git checkout ${branchName}`);
      } catch (checkoutError) {
        console.error('Failed to checkout branch:', checkoutError.message);
        return res.status(500).json({ 
          error: 'Failed to switch branches',
          details: checkoutError.message
        });
      }
    }

    // If a start commit is provided, verify it exists
    if (startCommit) {
      try {
        await execAsync(`git cat-file -e ${startCommit}`);
      } catch (commitError) {
        return res.status(400).json({
          error: 'Invalid commit hash',
          details: 'The specified commit does not exist in this repository'
        });
      }
    }

    // Get the list of changed files
    let changedFilesList = [];
    try {
      if (startCommit) {
        // If we have a start commit, get changes between that commit and HEAD
        const { stdout: changedFiles } = await execAsync(`git diff --name-only ${startCommit} HEAD`);
        changedFilesList = changedFiles.split('\n').filter(Boolean);
      } else {
        // If no start commit, get changes between main and current branch
        const { stdout: changedFiles } = await execAsync(`git diff --name-only main HEAD`);
        changedFilesList = changedFiles.split('\n').filter(Boolean);
      }
    } catch (diffError) {
      console.error('Error getting changed files:', diffError);
      return res.status(500).json({
        error: 'Failed to get changed files',
        details: diffError.message
      });
    }

    // Get the commit history
    let commitHistory = '';
    try {
      if (startCommit) {
        const { stdout } = await execAsync(`git log --pretty=format:"%H|%an|%ad|%s" ${startCommit}..HEAD`);
        commitHistory = stdout;
      } else {
        const { stdout } = await execAsync(`git log --pretty=format:"%H|%an|%ad|%s" main..HEAD`);
        commitHistory = stdout;
      }
    } catch (logError) {
      console.error('Error getting commit history:', logError);
      return res.status(500).json({
        error: 'Failed to get commit history',
        details: logError.message
      });
    }

    // Build the call graph for changed files
    let callGraph;
    try {
      // First, let's log what files madge can find
      const { stdout: findFiles } = await execAsync(
        `cd "${repoPath}" && find . -type f -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" | grep -v "node_modules"`
      );
      console.log('Available files for madge:', findFiles.split('\n').filter(Boolean));

      callGraph = await madge(repoPath, {
        baseDir: repoPath,
        fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
        excludeRegExp: [/node_modules/],
        detectiveOptions: {
          ts: {
            skipTypeImports: true
          }
        }
      });
    } catch (madgeError) {
      console.error('Error generating call graph:', madgeError);
      return res.status(500).json({ 
        error: 'Failed to generate call graph',
        details: madgeError.message
      });
    }

    // Process the call graph into a format suitable for visualization
    const graphData = {
      nodes: [],
      links: []
    };

    // Add nodes for all files in the call graph
    const allFiles = callGraph.obj();
    console.log('Call graph files:', Object.keys(allFiles));
    console.log('Changed files:', changedFilesList);

    const fileIds = new Map();
    let nodeId = 0;

    // First, add all changed files as nodes
    changedFilesList.forEach(file => {
      // Normalize the file path to match madge's format
      const normalizedFile = file.startsWith('./') ? file : `./${file}`;
      console.log('Processing changed file:', normalizedFile);
      
      // Try different path formats to match madge's output
      const possiblePaths = [
        normalizedFile,
        file,
        path.relative(repoPath, path.join(repoPath, file)),
        path.join(repoPath, file)
      ];
      
      const matchingPath = possiblePaths.find(p => allFiles[p]);
      
      if (matchingPath) {
        fileIds.set(matchingPath, nodeId);
        graphData.nodes.push({
          id: nodeId,
          name: path.basename(file),
          path: path.join(repoPath, file),
          isChanged: true
        });
        nodeId++;
        console.log('Found matching path:', matchingPath);
      } else {
        console.log('File not found in call graph. Tried paths:', possiblePaths);
      }
    });

    // Then add their dependencies
    changedFilesList.forEach(file => {
      const normalizedFile = file.startsWith('./') ? file : `./${file}`;
      const possiblePaths = [
        normalizedFile,
        file,
        path.relative(repoPath, path.join(repoPath, file)),
        path.join(repoPath, file)
      ];
      
      const matchingPath = possiblePaths.find(p => allFiles[p]);
      
      if (matchingPath) {
        const sourceId = fileIds.get(matchingPath);
        allFiles[matchingPath].forEach(dep => {
          if (!fileIds.has(dep)) {
            fileIds.set(dep, nodeId);
            graphData.nodes.push({
              id: nodeId,
              name: path.basename(dep),
              path: path.join(repoPath, dep.replace('./', '')),
              isChanged: false
            });
            nodeId++;
          }
          graphData.links.push({
            source: sourceId,
            target: fileIds.get(dep)
          });
        });
      }
    });

    // Process commit history
    const commits = commitHistory.split('\n').map(commit => {
      const [hash, author, date, message] = commit.split('|');
      return { hash, author, date, message };
    });

    // Pop the stash to restore local changes
    try {
      await execAsync('git stash pop');
    } catch (stashPopError) {
      console.log('No stash to pop or pop failed:', stashPopError.message);
    }

    res.json({
      commits,
      changedFiles: changedFilesList,
      graphData
    });
  } catch (error) {
    console.error('Error analyzing repository:', error);
    res.status(500).json({ 
      error: 'Failed to analyze repository',
      details: error.message
    });
  }
});

// New endpoint for opening files
app.post('/open-file', async (req, res) => {
  const { filePath } = req.body;

  if (!filePath) {
    return res.status(400).json({ error: 'File path is required' });
  }

  try {
    await execAsync(`open "${filePath}"`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error opening file:', error);
    res.status(500).json({ error: 'Failed to open file' });
  }
});

// Security scanning endpoints
app.post('/security-scan', async (req, res) => {
  const { repoPath, branchName } = req.body;
  
  console.log('Security scan request received:', { repoPath, branchName });
  console.log('Full request body:', req.body);

  if (!repoPath || !branchName) {
    return res.status(400).json({ error: 'Repository path and branch name are required' });
  }

  try {
    console.log('Starting security scan for repo:', repoPath, 'branch:', branchName);
    
    // Change to the repository directory
    console.log('Changing to repository directory:', repoPath);
    await execAsync(`cd "${repoPath}"`);
    console.log('Successfully changed to repository directory');
    
    // Checkout the specified branch
    console.log('Checking out branch:', branchName);
    await execAsync(`git checkout ${branchName}`);
    console.log('Successfully checked out branch:', branchName);
    
    // Check if SonarQube is running
    try {
      await execAsync('curl -s http://localhost:9000/api/system/status');
    } catch (error) {
      // Start SonarQube if not running
      console.log('Starting SonarQube...');
      await execAsync('sonar-scanner -Dsonar.projectKey=croissant-security -Dsonar.sources=. -Dsonar.host.url=http://localhost:9000 -Dsonar.login=admin -Dsonar.password=admin');
    }

    // Run SonarQube analysis
    console.log('Running SonarQube analysis...');
    const { stdout: scanOutput } = await execAsync(
      `sonar-scanner -Dsonar.projectKey=croissant-security-${Date.now()} -Dsonar.sources=. -Dsonar.host.url=http://localhost:9000 -Dsonar.login=admin -Dsonar.password=admin`
    );

    // Wait for analysis to complete and get results
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Generate the project key that was used in the scan
    const projectKey = `croissant-security-${Date.now()}`;
    
    // Fetch vulnerabilities from SonarQube API
    console.log('Fetching vulnerabilities for project:', projectKey);
    const { stdout: vulnerabilitiesResponse } = await execAsync(
      `curl -s "http://localhost:9000/api/issues/search?componentKeys=${projectKey}&types=VULNERABILITY&ps=500"`
    );

    console.log('Raw API response:', vulnerabilitiesResponse);
    
    // Validate response before parsing
    let vulnerabilities;
    if (!vulnerabilitiesResponse || vulnerabilitiesResponse.trim() === '') {
      console.log('Empty response from SonarQube API, creating empty vulnerability list');
      vulnerabilities = { issues: [] };
    } else {
      try {
        vulnerabilities = JSON.parse(vulnerabilitiesResponse);
      } catch (parseError) {
        console.error('Failed to parse SonarQube API response:', parseError);
        console.error('Response content:', vulnerabilitiesResponse);
        // Create empty vulnerabilities object if parsing fails
        vulnerabilities = { issues: [] };
      }
    }
    
    // Process and format vulnerability data
    if (!vulnerabilities.issues || !Array.isArray(vulnerabilities.issues)) {
      console.log('No issues array found in vulnerabilities response, using empty array');
      vulnerabilities.issues = [];
    }
    
    const formattedVulnerabilities = vulnerabilities.issues.map(issue => ({
      severity: issue.severity,
      type: issue.type,
      filePath: issue.component.replace('croissant-security:', ''),
      lineNumber: issue.line,
      shortDescription: issue.message,
      detailedDescription: issue.message,
      suggestedFix: getSuggestedFix(issue.rule),
      ruleId: issue.rule,
      firstDetected: issue.creationDate,
      lastSeen: issue.updateDate,
      status: issue.status
    }));

    // Save scan metadata to local file
    const scanMetadata = {
      timestamp: new Date().toISOString(),
      repoPath,
      branchName,
      scanDuration: '30s',
      vulnerabilitiesFound: formattedVulnerabilities.length,
      scanOutput: scanOutput
    };

    fs.appendFileSync('security-scan-history.txt', JSON.stringify(scanMetadata) + '\n');

    res.json({
      success: true,
      vulnerabilities: formattedVulnerabilities,
      metadata: scanMetadata
    });

  } catch (error) {
    console.error('Error during security scan:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ 
      error: 'Security scan failed',
      details: error.message,
      stack: error.stack,
      requestBody: req.body
    });
  }
});

// Helper function to get suggested fixes based on rule type
function getSuggestedFix(ruleId) {
  const fixSuggestions = {
    'sql-injection': 'Use parameterized queries or prepared statements',
    'xss': 'Escape HTML output or use React\'s built-in XSS protection',
    'hardcoded-secret': 'Move secrets to environment variables or secure configuration',
    'default': 'Review the code and implement appropriate security measures'
  };
  
  return fixSuggestions[ruleId] || fixSuggestions.default;
}

// Endpoint to get scan history
app.get('/security-scan-history', async (req, res) => {
  try {
    if (fs.existsSync('security-scan-history.txt')) {
      const history = fs.readFileSync('security-scan-history.txt', 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line))
        .reverse(); // Most recent first
      
      res.json(history);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading scan history:', error);
    res.status(500).json({ error: 'Failed to read scan history' });
  }
});

// Endpoint to check SonarQube status
app.get('/sonarqube-status', async (req, res) => {
  try {
    const { stdout } = await execAsync('curl -s http://localhost:9000/api/system/status');
    const status = JSON.parse(stdout);
    res.json({ 
      status: status.status,
      version: status.version,
      running: true
    });
  } catch (error) {
    res.json({ 
      status: 'stopped',
      running: false,
      error: error.message
    });
  }
});