#!/usr/bin/env node

/**
 * GitHub App Setup Script
 * Automated setup for GitHub App and webhook configuration
 */

import fs from 'fs';
import path from 'path';

interface SetupConfig {
  appName: string;
  description: string;
  webhookUrl: string;
  homepageUrl: string;
  callbackUrl: string;
  organization: string;
  permissions: string[];
  events: string[];
}

class GitHubAppSetup {
  private config: SetupConfig;

  constructor(config: SetupConfig) {
    this.config = config;
  }

  async setup(): Promise<void> {
    console.log('🚀 Setting up GitHub App for A11y-MCP...\n');

    try {
      // Step 1: Generate App Manifest
      await this.generateAppManifest();
      
      // Step 2: Create webhook configuration
      await this.createWebhookConfig();
      
      // Step 3: Generate deployment scripts
      await this.generateDeploymentScripts();
      
      // Step 4: Create environment configuration
      await this.createEnvironmentConfig();
      
      // Step 5: Generate documentation
      await this.generateDocumentation();
      
      console.log('✅ GitHub App setup complete!\n');
      
      // Next steps
      console.log('📋 Next steps:');
      console.log('1. Review the generated manifest in github/app-config/app-manifest.json');
      console.log('2. Upload the manifest to create your GitHub App');
      console.log('3. Install the app on target repositories');
      console.log('4. Configure the webhook URL in your app settings');
      console.log('5. Deploy the webhook handler using the generated scripts\n');
      
    } catch (error) {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    }
  }

  private async generateAppManifest(): Promise<void> {
    const manifestPath = path.join(process.cwd(), 'github', 'app-config', 'app-manifest.json');
    
    const manifest = {
      name: this.config.appName,
      url: this.config.homepageUrl,
      description: this.config.description,
      public: false,
      webhooks: {
        url: this.config.webhookUrl,
        active: true
      },
      redirect_url: this.config.callbackUrl,
      hook_attributes: {
        active: true,
        url: this.config.webhookUrl
      },
      permissions: this.getPermissionsConfig(),
      events: this.config.events,
      installation: {
        default_permissions: this.getPermissionsConfig(),
        default_events: this.config.events,
        settings: {
          only_single_file_change_prs: false,
          only_deploy_keys: false,
          only_app_owner_deploy_keys: false,
          single_file_changes_limit: 100,
          allow_list_only_for_app_access: false
        }
      }
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ Generated app manifest: ${manifestPath}`);
  }

  private getPermissionsConfig(): any {
    return {
      checks: 'write',
      contents: 'read',
      issues: 'write',
      metadata: 'read',
      pull_requests: 'write',
      repository_administration: 'read',
      workflows: 'write'
    };
  }

  private async createWebhookConfig(): Promise<void> {
    const webhookDir = path.join(process.cwd(), 'github', 'webhooks');
    const webhookScript = path.join(webhookDir, 'server.js');

    const webhookCode = `const express = require('express');
const crypto = require('crypto');
const { GitHubIntegrationManager } = require('../../src/github/index.js');
const { AccessibilityScanner } = require('../../src/scanner.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Security: Verify webhook signature
function verifySignature(req, res, next) {
  const signature = req.get('X-Hub-Signature-256');
  const payload = JSON.stringify(req.body);
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
      
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return res.status(401).send('Invalid signature');
  }
  
  next();
}

// Middleware
app.use(express.json({ verify: verifySignature }));

// Initialize accessibility scanner and GitHub integration
const scanner = new AccessibilityScanner();
const config = {
  appId: process.env.GITHUB_APP_ID,
  installationId: process.env.GITHUB_INSTALLATION_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhookSecret: process.env.WEBHOOK_SECRET
};

const githubManager = new GitHubIntegrationManager(scanner, config);

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const event = req.get('X-GitHub-Event');
    const payload = req.body;
    
    console.log('Received webhook:', event);
    
    // Process the webhook event
    await githubManager.processWebhookEvent(event, payload);
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).send('Internal server error');
  }
});

// Health check
app.get('/health', async (req, res) => {
  try {
    const health = await githubManager.healthCheck();
    res.json(health);
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(\`🚀 GitHub webhook server running on port \${PORT}\`);
});

module.exports = app;`;

    fs.writeFileSync(webhookScript, webhookCode);
    console.log(`✅ Created webhook server: ${webhookScript}`);
  }

  private async generateDeploymentScripts(): Promise<void> {
    const deployDir = path.join(process.cwd(), 'github', 'deploy');
    
    // Docker deployment
    const dockerfile = `FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src/ ./src/
COPY github/ ./github/

# Install dependencies
RUN npm install --production

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

# Start the webhook server
CMD ["node", "github/webhooks/server.js"]`;

    fs.writeFileSync(path.join(deployDir, 'Dockerfile'), dockerfile);

    // Docker Compose
    const dockerCompose = `version: '3.8'

services:
  a11y-mcp-webhook:
    build: .
    ports:
      - "3000:3000"
    environment:
      - GITHUB_APP_ID=\${GITHUB_APP_ID}
      - GITHUB_INSTALLATION_ID=\${GITHUB_INSTALLATION_ID}
      - GITHUB_PRIVATE_KEY=\${GITHUB_PRIVATE_KEY}
      - WEBHOOK_SECRET=\${WEBHOOK_SECRET}
      - PORT=3000
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  default:
    name: a11y-mcp-network`;

    fs.writeFileSync(path.join(deployDir, 'docker-compose.yml'), dockerCompose);

    // Kubernetes deployment
    const k8sDeployment = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: a11y-mcp-webhook
  labels:
    app: a11y-mcp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: a11y-mcp
  template:
    metadata:
      labels:
        app: a11y-mcp
    spec:
      containers:
      - name: webhook
        image: a11y-mcp:latest
        ports:
        - containerPort: 3000
        env:
        - name: GITHUB_APP_ID
          valueFrom:
            secretKeyRef:
              name: github-app-secrets
              key: app-id
        - name: GITHUB_INSTALLATION_ID
          valueFrom:
            secretKeyRef:
              name: github-app-secrets
              key: installation-id
        - name: GITHUB_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: github-app-secrets
              key: private-key
        - name: WEBHOOK_SECRET
          valueFrom:
            secretKeyRef:
              name: github-app-secrets
              key: webhook-secret
        - name: PORT
          value: "3000"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: a11y-mcp-service
spec:
  selector:
    app: a11y-mcp
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP`;

    fs.writeFileSync(path.join(deployDir, 'k8s-deployment.yml'), k8sDeployment);

    // Heroku deployment script
    const herokuDeploy = `#!/bin/bash

echo "🚀 Deploying A11y-MCP to Heroku..."

# Create Heroku app
heroku create $HEROKU_APP_NAME

# Configure environment variables
heroku config:set GITHUB_APP_ID=$GITHUB_APP_ID
heroku config:set GITHUB_INSTALLATION_ID=$GITHUB_INSTALLATION_ID
heroku config:set GITHUB_PRIVATE_KEY="$GITHUB_PRIVATE_KEY"
heroku config:set WEBHOOK_SECRET=$WEBHOOK_SECRET

# Add GitHub App webhook
heroku git:remote -a $HEROKU_APP_NAME

# Deploy
git push heroku main

# Scale to web process
heroku ps:scale web=1

echo "✅ Deployed to https://$HEROKU_APP_NAME.herokuapp.com"
echo "🔗 Update your GitHub App webhook URL to: https://$HEROKU_APP_NAME.herokuapp.com/webhook"`;

    fs.writeFileSync(path.join(deployDir, 'deploy-heroku.sh'), herokuDeploy);
    fs.chmodSync(path.join(deployDir, 'deploy-heroku.sh'), '755');

    console.log(`✅ Generated deployment scripts in ${deployDir}`);
  }

  private async createEnvironmentConfig(): Promise<void> {
    const envExample = `# GitHub App Configuration
GITHUB_APP_ID=123456
GITHUB_INSTALLATION_ID=987654
GITHUB_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
WEBHOOK_SECRET=your_webhook_secret

# Server Configuration
PORT=3000
NODE_ENV=production

# Optional: API Token for direct GitHub API access
GITHUB_TOKEN=ghp_your_personal_access_token

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/a11y-mcp.log`;

    fs.writeFileSync(path.join(process.cwd(), '.env.example'), envExample);
    console.log('✅ Created environment configuration template: .env.example');
  }

  private async generateDocumentation(): Promise<void> {
    const docsDir = path.join(process.cwd(), 'github', 'docs');
    
    // README for GitHub integration
    const readme = `# GitHub Integration Setup Guide

## Overview

This guide walks you through setting up the A11y-MCP GitHub App for automated accessibility code review.

## Prerequisites

- GitHub account with admin access to target repositories
- Node.js 18+ installed
- Public webhook URL (ngrok, Heroku, or deployed server)

## Quick Setup

### 1. Create GitHub App

1. Go to GitHub Settings > Developer settings > GitHub Apps
2. Click "New GitHub App"
3. Upload the manifest file: \`github/app-config/app-manifest.json\`
4. Configure the following settings:

**App name**: \`${this.config.appName}\`
**Description**: \`${this.config.description}\`
**Homepage URL**: \`${this.config.homepageUrl}\`
**Webhook URL**: \`${this.config.webhookUrl}\`
**Webhook secret**: \`[Generate a secure random string]\`

**Permissions**:
- Checks: Write
- Contents: Read
- Issues: Write
- Metadata: Read
- Pull requests: Write
- Repository administration: Read
- Workflows: Write

**Events**:
- Pull request
- Pull request review
- Pull request review comment

### 2. Install the App

1. In your GitHub App settings, click "Install App"
2. Select "All repositories" or choose specific repositories
3. Grant the app the necessary permissions

### 3. Deploy the Webhook

Choose one of the deployment options:

#### Docker
\`\`\`bash
# Copy .env.example to .env and fill in your values
cp .env.example .env

# Deploy with Docker Compose
docker-compose -f github/deploy/docker-compose.yml up -d
\`\`\`

#### Kubernetes
\`\`\`bash
# Apply Kubernetes manifests
kubectl apply -f github/deploy/k8s-deployment.yml
\`\`\`

#### Heroku
\`\`\`bash
# Make the deploy script executable
chmod +x github/deploy/deploy-heroku.sh

# Deploy to Heroku
./github/deploy/deploy-heroku.sh
\`\`\`

### 4. Configure GitHub Actions (Optional)

Add the workflow file to your repositories:

\`\`\`bash
cp github-actions/accessibility-review.yml .github/workflows/
\`\`\`

## Usage

Once configured, the A11y-MCP GitHub App will:

1. **Automatically scan** pull requests for accessibility violations
2. **Post inline annotations** showing exactly where issues are
3. **Fail the PR check** if critical violations are found
4. **Provide actionable fix suggestions** for each issue
5. **Generate comprehensive reports** with WCAG compliance status

## Configuration

### Repository Configuration

Create \`.a11y/config.json\` in your repository root:

\`\`\`json
{
  "wcagLevel": "AA",
  "wcagVersion": "2.2",
  "rules": {
    "aria-required": { "enabled": true, "severity": "error" },
    "keyboard-nav": { "enabled": true, "severity": "error" },
    "semantic-html": { "enabled": true, "severity": "error" },
    "alt-text": { "enabled": true, "severity": "error" }
  },
  "failureThresholds": { "error": 0, "warning": 10 }
}
\`\`\`

### Organization-wide Settings

You can configure organization-wide defaults by creating a \`.github/a11y-config.yml\` file.

## Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check the webhook URL is publicly accessible
   - Verify the webhook secret matches between GitHub and your server
   - Check server logs for error messages

2. **Check runs not appearing**
   - Ensure the app has "Checks: Write" permission
   - Verify the installation was completed successfully

3. **High API usage**
   - Check rate limits in the GitHub API dashboard
   - Consider adjusting analysis frequency or scope

### Health Check

Monitor your webhook server health:

\`\`\`bash
curl https://your-webhook-url.com/health
\`\`\`

## Support

- Check the logs: \`tail -f logs/a11y-mcp.log\`
- Monitor API usage in GitHub developer settings
- Review WCAG 2.2 guidelines: https://www.w3.org/WAI/WCAG22/quickref/

## Security Notes

- Store private keys securely (never in public repositories)
- Use HTTPS for webhook URLs
- Regularly rotate webhook secrets
- Monitor API usage for unusual patterns`;

    fs.writeFileSync(path.join(docsDir, 'SETUP.md'), readme);

    // API documentation
    const apiDocs = `# A11y-MCP GitHub API

## Webhook Endpoint

\`POST /webhook\`

Handles GitHub webhook events.

**Headers:**
- \`X-GitHub-Event\`: Event type
- \`X-Hub-Signature-256\`: Webhook signature

**Events:**
- \`pull_request\`
- \`pull_request_review\`
- \`pull_request_review_comment\`

## Health Check

\`GET /health\`

Returns server health status and metrics.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "checks": {
    "api": { "status": "ok", "remaining": 4500 },
    "scanner": { "status": "ok", "violationsFound": 0 },
    "memory": { "used": 150, "total": 500, "percentage": 30 }
  },
  "metrics": {
    "analysisStartTime": "2025-10-30T12:00:00Z",
    "filesProcessed": 25,
    "filesSkipped": 5,
    "violationsFound": 3,
    "apiCallsMade": 10
  }
}
\`\`\`

## Manual Analysis

To manually trigger analysis for a PR:

\`\`\`javascript
const { GitHubIntegrationManager } = require('a11y-mcp/src/github');

const manager = new GitHubIntegrationManager(scanner, config);
const results = await manager.analyzePR('owner', 'repo', 123, {
  includeComments: true
});
\`\`\``;

    fs.writeFileSync(path.join(docsDir, 'API.md'), apiDocs);

    console.log(`✅ Generated documentation in ${docsDir}`);
  }
}

// Interactive setup
async function runInteractiveSetup() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function question(prompt: string): Promise<string> {
    return new Promise(resolve => rl.question(prompt, resolve));
  }

  console.log('🔧 GitHub App Interactive Setup\n');

  const appName = await question('App name (default: A11y-MCP Accessibility Reviewer): ') || 
                  'A11y-MCP Accessibility Reviewer';
  
  const description = await question('App description (default: Automated accessibility code review): ') || 
                     'Automated accessibility code review';
  
  const webhookUrl = await question('Webhook URL (e.g., https://your-app.herokuapp.com/webhook): ');
  
  if (!webhookUrl) {
    console.error('❌ Webhook URL is required');
    process.exit(1);
  }

  const homepageUrl = await question('Homepage URL (default: https://a11y-mcp.internal): ') || 
                      'https://a11y-mcp.internal';
  
  const callbackUrl = await question('Callback URL (default: https://a11y-mcp.internal/setup): ') || 
                      'https://a11y-mcp.internal/setup';
  
  const organization = await question('Target organization (optional): ') || '';

  rl.close();

  const config: SetupConfig = {
    appName,
    description,
    webhookUrl,
    homepageUrl,
    callbackUrl,
    organization,
    permissions: ['checks', 'contents', 'issues', 'metadata', 'pull_requests'],
    events: ['pull_request', 'pull_request_review']
  };

  const setup = new GitHubAppSetup(config);
  await setup.setup();
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.length === 0) {
    runInteractiveSetup();
  } else {
    console.log('Usage:');
    console.log('  node setup-github-app.js --interactive    # Interactive setup');
    process.exit(1);
  }
}

export { GitHubAppSetup };