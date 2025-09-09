#!/bin/bash
set -e

echo "🚀 Testing sagemaker-code-editor locally..."

# Check if in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Run this from sagemaker-code-editor root directory"
    exit 1
fi

# Create cache directory
CACHE_DIR=".local-cache"
mkdir -p "$CACHE_DIR"

# Check if we need to install root dependencies
ROOT_CACHE="$CACHE_DIR/root-node_modules.tar.gz"
if [ ! -f "$ROOT_CACHE" ] || [ "package.json" -nt "$ROOT_CACHE" ]; then
    echo "📦 Installing root dependencies..."
    npm install
    if [ -d "node_modules" ]; then
        echo "💾 Caching root node_modules..."
        tar czf "$ROOT_CACHE" node_modules/
    fi
else
    echo "📦 Restoring cached root dependencies..."
    tar xzf "$ROOT_CACHE"
fi

# Apply patches
if [ -d patches ] && [ "$(ls -A patches)" ]; then
    echo "🔧 Applying patches..."
    quilt push -a || echo "Patches already applied or no patches to apply"
fi

# Build VS Code with caching
echo "🏗️ Building VS Code..."
cd vscode

# Check vscode revision for cache key
VSCODE_REV=$(git rev-parse HEAD)
PATCHES_HASH=$(find ../patches -name "*.diff" -exec md5sum {} \; 2>/dev/null | md5sum | cut -d' ' -f1 || echo "no-patches")
VSCODE_CACHE="$CACHE_DIR/vscode-${VSCODE_REV}-${PATCHES_HASH}.tar.gz"

# Check if we have cached vscode build
if [ -f "$VSCODE_CACHE" ] && [ -f "../vscode-reh-web-linux-x64/bin/code-server" ]; then
    echo "💾 Using cached VS Code build..."
    cd ..
else
    # Check if we need to install vscode dependencies
    VSCODE_DEPS_CACHE="$CACHE_DIR/vscode-node_modules-${VSCODE_REV}.tar.gz"
    if [ ! -f "$VSCODE_DEPS_CACHE" ] || [ "package.json" -nt "$VSCODE_DEPS_CACHE" ]; then
        echo "📦 Installing vscode dependencies..."
        npm install
        if [ -d "node_modules" ]; then
            echo "💾 Caching vscode node_modules..."
            tar czf "../$VSCODE_DEPS_CACHE" node_modules/
        fi
    else
        echo "📦 Restoring cached vscode dependencies..."
        tar xzf "../$VSCODE_DEPS_CACHE"
    fi

    # Get ripgrep version and handle it
    VSCODE_RIPGREP_VERSION=$(jq -r '.dependencies."@vscode/ripgrep"' package.json)
    mv package.json package.json.orig
    jq 'del(.dependencies."@vscode/ripgrep")' package.json.orig > package.json
    npm install
    npm install --ignore-scripts "@vscode/ripgrep@${VSCODE_RIPGREP_VERSION}"

    # Build with memory optimization
    echo "🏗️ Building with increased memory..."
    NODE_OPTIONS="--max-old-space-size=6144" npx gulp vscode-reh-web-linux-x64-min

    cd ..

    # Cache the built vscode
    if [ -d "vscode-reh-web-linux-x64" ]; then
        echo "💾 Caching VS Code build..."
        tar czf "$VSCODE_CACHE" vscode-reh-web-linux-x64/
    fi
fi

echo "✅ Build complete!"
echo "🌐 Starting server on http://localhost:8080"
echo "Press Ctrl+C to stop"

# Find the correct executable path
if [ -f "./vscode-reh-web-linux-x64/bin/code-server" ]; then
    EXEC_PATH="./vscode-reh-web-linux-x64/bin/code-server"
elif [ -f "./vscode-reh-web-linux-x64/bin/remote-cli/code-server" ]; then
    EXEC_PATH="./vscode-reh-web-linux-x64/bin/remote-cli/code-server"
elif [ -f "./vscode-reh-web-linux-x64/out/server-main.js" ]; then
    echo "Starting with Node.js..."
    node ./vscode-reh-web-linux-x64/out/server-main.js --host 0.0.0.0 --port 8080 --without-connection-token
    exit 0
else
    echo "❌ Could not find executable. Checking build output..."
    find ./vscode-reh-web-linux-x64 -name "*server*" -type f
    exit 1
fi

# Start server
$EXEC_PATH --host 0.0.0.0 --port 8080 --without-connection-token