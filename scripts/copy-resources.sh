#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -ex

# Set current project root
PROJ_ROOT=$(pwd)

# Define the source directory for the resources
SOURCE_DIR="${PROJ_ROOT}/resources"

# Define the destination base directory
DEST_DIR="${PROJ_ROOT}/vscode"

# Define paths for each file relative to the base directories
# Format: "source_file_path:destination_file_path"
FILES_TO_COPY=(
    "favicon.ico:resources/server/favicon.ico"
    "code-icon.svg:src/vs/workbench/browser/media/code-icon.svg"
    "letterpress-dark.svg:src/vs/workbench/browser/parts/editor/media/letterpress-dark.svg"
    "letterpress-hcDark.svg:src/vs/workbench/browser/parts/editor/media/letterpress-hcDark.svg"
    "letterpress-hcLight.svg:src/vs/workbench/browser/parts/editor/media/letterpress-hcLight.svg"
    "letterpress-light.svg:src/vs/workbench/browser/parts/editor/media/letterpress-light.svg"
)

# Loop through the file paths, check if file exists, and copy each one to its new location
for FILE_PATH in "${FILES_TO_COPY[@]}"; do
    IFS=":" read -r SRC_FILE DEST_FILE <<< "$FILE_PATH"
    
    # Construct full source and destination paths
    FULL_SRC_PATH="$SOURCE_DIR/$SRC_FILE"
    FULL_DEST_PATH="$DEST_DIR/$DEST_FILE"
    
    # Check if the source file exists
    if [ ! -f "$FULL_SRC_PATH" ]; then
        echo "Error: Source file $FULL_SRC_PATH does not exist." >&2
        exit 1
    fi

    # Check if the destination file exists. If so, delete it before copying.
    if [ -f "$FULL_DEST_PATH" ]; then
        rm "$FULL_DEST_PATH"
        echo "Existing file $FULL_DEST_PATH deleted."
    fi
    
    # Copy file from source to destination
    cp -v "$FULL_SRC_PATH" "$FULL_DEST_PATH"
done
