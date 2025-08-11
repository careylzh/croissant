// Test file with intentional security vulnerabilities for SonarQube testing

// VULNERABILITY 1: SQL Injection
function getUserData(userId) {
  const query = `SELECT * FROM users WHERE id = ${userId}`; // SQL injection vulnerability
  return executeQuery(query);
}

// VULNERABILITY 2: XSS (Cross-Site Scripting)
function renderUserInput(userInput) {
  return `<div>${userInput}</div>`; // XSS vulnerability - unescaped HTML
}

// VULNERABILITY 3: Hardcoded Secret
const API_KEY = "sk-1234567890abcdef"; // Hardcoded secret vulnerability
const DATABASE_PASSWORD = "password123"; // Another hardcoded secret

// VULNERABILITY 4: Insecure Random
function generateToken() {
  return Math.random().toString(36); // Insecure random number generation
}

// VULNERABILITY 5: Command Injection
function executeCommand(userCommand) {
  const command = `ls -la ${userCommand}`; // Command injection vulnerability
  return require('child_process').execSync(command);
}

// VULNERABILITY 6: Path Traversal
function readFile(filePath) {
  return require('fs').readFileSync(filePath, 'utf8'); // Path traversal vulnerability
}

// VULNERABILITY 7: Insecure Deserialization
function parseUserData(data) {
  return eval(data); // Insecure deserialization - eval is dangerous
}

// VULNERABILITY 8: Weak Cryptography
function hashPassword(password) {
  return require('crypto').createHash('md5').update(password).digest('hex'); // Weak hash algorithm
}

// VULNERABILITY 9: Insecure Defaults
const config = {
  allowUnsafeOperations: true, // Insecure default
  requireAuthentication: false, // Insecure default
  maxLoginAttempts: 0 // Insecure default
};

// VULNERABILITY 10: Information Disclosure
function getSystemInfo() {
  return {
    version: process.version,
    platform: process.platform,
    arch: process.arch,
    env: process.env // Information disclosure - exposing environment variables
  };
}

module.exports = {
  getUserData,
  renderUserInput,
  generateToken,
  executeCommand,
  readFile,
  parseUserData,
  hashPassword,
  getSystemInfo
};
