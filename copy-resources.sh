#!/bin/bash

# Define the source directory for the resources
SOURCE_DIR="resources"

# Define the destination base directory
DEST_DIR="vscode"

# Define paths for each file relative to the base directories
# Format: "source_file_path:destination_file_path"
FILES_TO_COPY=(
    "favicon.ico:src/sagemaker-code-editor/vscode/resources/server/favicon.ico"
    "code-icon.svg:src/sagemaker-code-editor/vscode/src/vs/workbench/browser/media/code-icon.svg"
    "letterpress-dark.svg:src/sagemaker-code-editor/vscode/src/vs/workbench/browser/parts/editor/media/letterpress-dark.svg"
    "letterpress-hcDark.svg:src/sagemaker-code-editor/vscode/src/vs/workbench/browser/parts/editor/media/letterpress-hcDark.svg"
    "letterpress-hcLight.svg:src/sagemaker-code-editor/vscode/src/vs/workbench/browser/parts/editor/media/letterpress-hcLight.svg"
    "letterpress-light.svg:src/sagemaker-code-editor/vscode/src/vs/workbench/browser/parts/editor/media/letterpress-light.svg"
)

# Loop through the file paths and copy each one to its new location
for FILE_PATH in "${FILES_TO_COPY[@]}"; do
    IFS=":" read -r SRC_FILE DEST_FILE <<< "$FILE_PATH"
    
    # Construct full source and destination paths
    FULL_SRC_PATH="$SOURCE_DIR/$SRC_FILE"
    FULL_DEST_PATH="$DEST_DIR/$DEST_FILE"
    
    # Copy file from source to destination
    cp "$FULL_SRC_PATH" "$FULL_DEST_PATH"
    echo "Copied $FULL_SRC_PATH to $FULL_DEST_PATH"
done
