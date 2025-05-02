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
    const device = JSON.parse(message);

    // Ensure deviceMappings.devices is an array
    if (Array.isArray(deviceMappings.devices)) {
      const mapping = deviceMappings.devices.find(d => d.deviceName.replace(/[^a-zA-Z]/g, '') == device.deviceName.replace(/[^a-zA-Z]/g, ''));
      if (mapping) {
        const commands = `cd "/Users/carey/PersonalProjs/sleepisoverato"`;

        exec(commands, (error, stdout, stderr) => {
          if (error) {
            console.error(`Error executing commands: ${error}`);
            ws.send(JSON.stringify({ type: 'error', message: `Error: ${error.message}` }));
            return;
          }
          console.log(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          ws.send(JSON.stringify({ type: 'success', message: `Command executed successfully: ${stdout}` }));
        });
      } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Device not recognized' }));
      }
    } else {
      console.error('Device mappings are not in the expected format');
      ws.send(JSON.stringify({ type: 'error', message: 'Device mappings are not in the expected format' }));
    }

    // Broadcast the device to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(device));
      }
    });

    // Save device to the database
  //   await prisma.device.create({
  //     data: {
  //       name: device.deviceName,
  //       rssi: device.rssi,
  //       distance: device.distanceProxyInMetres,
  //       user: {
  //         connectOrCreate: {
  //           where: { email: 'default@example.com' }, // Replace with actual user identification logic
  //           create: { email: 'default@example.com', name: 'Default User' }
  //         }
  //       }
  //     },
  //   });
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

    // Stash any local changes before switching branches
    try {
      await execAsync('git stash');
    } catch (stashError) {
      console.log('No changes to stash or stash failed:', stashError.message);
    }

    // Switch to the specified branch
    try {
      await execAsync(`git checkout ${branchName}`);
    } catch (checkoutError) {
      console.error('Failed to checkout branch:', checkoutError.message);
      return res.status(500).json({ 
        error: 'Failed to switch branches',
        details: checkoutError.message
      });
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