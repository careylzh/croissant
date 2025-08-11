# 🔒 Security Vulnerability Scanner - Croissant

## Overview
The Security Vulnerability Scanner is a new feature integrated into the Croissant codebase that allows software engineers to visualize security vulnerabilities within their JavaScript codebase using SonarQube integration.

## Features

### 🎯 Core Functionality
- **Repository Selection**: Choose from available Git repositories and branches
- **Automated Scanning**: Run SonarQube security analysis on-demand
- **Real-time Progress**: 30-second scan timeout with progress tracking
- **Comprehensive Results**: Detailed vulnerability table with severity, type, location, and remediation steps
- **Local History**: Scan metadata stored in local text files

### 📊 Vulnerability Data Display
- **Severity Levels**: Critical, High, Medium, Low (color-coded)
- **Vulnerability Types**: SQL Injection, XSS, Hardcoded Secrets, etc.
- **File Location**: Full file path and line numbers
- **Descriptions**: Short and detailed vulnerability descriptions
- **Remediation**: Suggested fixes and best practices
- **Metadata**: Rule IDs, detection dates, and status tracking

## Technical Implementation

### 🏗️ Architecture
- **Frontend**: React component with real-time progress updates
- **Backend**: Express.js endpoints for SonarQube integration
- **Database**: Local file storage for scan history
- **Security Tool**: SonarQube for vulnerability detection

### 🔧 API Endpoints
- `POST /security-scan`: Initiate security scan for repository/branch
- `GET /security-scan-history`: Retrieve scan history
- `GET /sonarqube-status`: Check SonarQube server status

### 📁 File Structure
```
croissant/
├── public/
│   ├── SecurityScanner.js          # Main security scanner component
│   └── ReadyScreen.js              # Updated with security scanner
├── server.js                       # Extended with security endpoints
├── sonar-project.properties        # SonarQube configuration
├── test-security-vulnerabilities.js # Test file with vulnerabilities
└── SECURITY_SCANNER_README.md      # This file
```

## Setup Instructions

### 1. Prerequisites
- Node.js and npm installed
- Docker (for SonarQube)
- SonarQube Scanner CLI (optional, for manual testing)

### 2. SonarQube Setup
```bash
# Start SonarQube using Docker
npm run sonar:setup

# Wait for SonarQube to start (check http://localhost:9000)
# Default credentials: admin/admin

# Test SonarQube connection
npm run sonar:test
```

### 3. Application Setup
```bash
# Install dependencies
npm install

# Build the application
npm run build
npm run build:css

# Start the server
npm start
```

## Usage

### 1. Access the Application
- Open http://localhost:3000 in your browser
- Navigate to the Repository Analysis section

### 2. Select Repository and Branch
- Choose a repository from the dropdown
- Select a branch to analyze
- The Security Scanner section will appear at the bottom

### 3. Run Security Scan
- Click "Start Security Scan" button
- Monitor real-time progress and status updates
- Results will display in a comprehensive table

### 4. Review Vulnerabilities
- Examine vulnerability details and severity levels
- Review suggested fixes and remediation steps
- Check file locations and line numbers

## Testing

### Test File
The `test-security-vulnerabilities.js` file contains intentional security vulnerabilities for testing:
- SQL Injection
- Cross-Site Scripting (XSS)
- Hardcoded Secrets
- Insecure Random Generation
- Command Injection
- Path Traversal
- Insecure Deserialization
- Weak Cryptography
- Insecure Defaults
- Information Disclosure

### Manual Testing
```bash
# Run a manual SonarQube scan
npm run sonar:scan

# Check SonarQube dashboard at http://localhost:9000
```

## Configuration

### SonarQube Properties
The `sonar-project.properties` file configures:
- Project key and name
- Source directories
- Exclusions
- SonarQube server URL

### Customization
- Modify vulnerability detection rules in SonarQube
- Adjust scan timeout (currently 30 seconds)
- Customize vulnerability display fields
- Add new security rule types

## Error Handling

### Common Issues
- **SonarQube not running**: Check Docker container status
- **Scan timeout**: Automatic termination after 30 seconds
- **API errors**: Comprehensive error messages with details
- **File access issues**: Check repository permissions

### Troubleshooting
```bash
# Check SonarQube status
curl http://localhost:9000/api/system/status

# View scan history
cat security-scan-history.txt

# Restart SonarQube
docker restart sonarqube
```

## Security Considerations

### Best Practices
- Run scans in isolated environments
- Review vulnerability results before sharing
- Implement suggested fixes promptly
- Regular security scanning schedule

### Limitations
- Local SonarQube instance (not production-ready)
- Basic vulnerability detection rules
- No authentication or access control
- Limited to JavaScript/Node.js projects

## Future Enhancements

### Planned Features
- Integration with CI/CD pipelines
- Custom security rule configuration
- Vulnerability trend analysis
- Team collaboration features
- Integration with issue tracking systems

### Scalability Improvements
- Cloud-based SonarQube deployment
- Multi-repository batch scanning
- Advanced reporting and analytics
- API rate limiting and optimization

## Support

### Documentation
- SonarQube: https://docs.sonarqube.org/
- React: https://reactjs.org/docs/
- Express.js: https://expressjs.com/

### Issues
- Report bugs via GitHub issues
- Feature requests welcome
- Contributing guidelines available

---

**Note**: This security scanner is designed for development and testing purposes. For production use, ensure proper security measures and consider enterprise SonarQube solutions.
