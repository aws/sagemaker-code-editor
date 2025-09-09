#!/bin/bash

echo "🧹 Cleaning local build cache..."

# Remove cache directory
if [ -d ".local-cache" ]; then
    rm -rf .local-cache
    echo "✅ Cache directory removed"
fi

# Remove node_modules
if [ -d "node_modules" ]; then
    rm -rf node_modules
    echo "✅ Root node_modules removed"
fi

# Remove vscode node_modules
if [ -d "vscode/node_modules" ]; then
    rm -rf vscode/node_modules
    echo "✅ VS Code node_modules removed"
fi

# Remove build output
if [ -d "vscode-reh-web-linux-x64" ]; then
    rm -rf vscode-reh-web-linux-x64
    echo "✅ Build output removed"
fi

echo "🎉 All caches cleaned!"