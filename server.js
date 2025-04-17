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

// New endpoint for repository analysis
app.post('/analyze-repo', async (req, res) => {
  const { repoPath, branchName } = req.body;

  if (!repoPath || !branchName) {
    return res.status(400).json({ error: 'Repository path and branch name are required' });
  }

  try {
    // Change to the repository directory
    await execAsync(`cd "${repoPath}"`);

    // Get the latest commit hash
    const { stdout: commitHash } = await execAsync('git rev-parse HEAD');
    
    // Get the list of changed files in the latest commit
    const { stdout: changedFiles } = await execAsync('git diff-tree --no-commit-id --name-only -r HEAD');
    const changedFilesList = changedFiles.split('\n').filter(Boolean);

    // Build the call graph for changed files
    const callGraph = await madge(repoPath, {
      baseDir: repoPath,
      fileExtensions: ['js', 'jsx', 'ts', 'tsx'],
      excludeRegExp: [/node_modules/],
    });

    // Process the call graph into a format suitable for visualization
    const graphData = {
      nodes: [],
      links: []
    };

    // Add nodes for all files in the call graph
    const allFiles = callGraph.obj();
    const fileIds = new Map();
    let nodeId = 0;

    // First, add all changed files as nodes
    changedFilesList.forEach(file => {
      if (allFiles[file]) {
        fileIds.set(file, nodeId);
        graphData.nodes.push({
          id: nodeId,
          name: path.basename(file),
          path: file,
          isChanged: true
        });
        nodeId++;
      }
    });

    // Then add their dependencies
    changedFilesList.forEach(file => {
      if (allFiles[file]) {
        const sourceId = fileIds.get(file);
        allFiles[file].forEach(dep => {
          if (!fileIds.has(dep)) {
            fileIds.set(dep, nodeId);
            graphData.nodes.push({
              id: nodeId,
              name: path.basename(dep),
              path: dep,
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

    res.json({
      commitHash: commitHash.trim(),
      changedFiles: changedFilesList,
      graphData
    });
  } catch (error) {
    console.error('Error analyzing repository:', error);
    res.status(500).json({ error: 'Failed to analyze repository' });
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