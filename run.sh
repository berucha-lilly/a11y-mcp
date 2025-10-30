#!/bin/sh
# GitHub Accessibility Reviewer MCP Server startup script
set -e

# Change to script directory
cd "$(dirname "$0")"

# Start the simplified JavaScript server for testing
echo "Starting GitHub Accessibility Reviewer MCP Server (JavaScript version)..." >&2
exec node simple-server.js