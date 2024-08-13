# Code Editor Idle Extension

The Code Editor Idle Extension tracks user activity and logs the last active timestamp (in UTC) to a local file. User activities monitored include file changes, text editor selection changes, and terminal interactions. Additionally, it provides an API endpoint `/api/idle` that returns the lastActiveTimestamp.