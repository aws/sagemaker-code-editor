# Code Editor Open Notebook Extension

The Open Notebook extension enables users to download, transform, and display sample notebooks from a public Amazon S3 bucket owned by the SageMaker team. This extension streamlines the process of accessing and working with SageMaker sample notebooks directly within Code Editor.

## Features

- Download sample notebooks from a specified S3 bucket
- Transform notebooks for compatibility with VSCode
- Display notebooks within the Code Editor environment
- Utilize URL parameters to open specific notebooks

## Usage

The extension uses parameters from the URL to open the desired notebook. The required parameters are:
- Notebook key: The identifier for the specific notebook in the S3 bucket
- Cluster ID: The ID of the SageMaker cluster
- Region: The AWS region where the S3 bucket is located

