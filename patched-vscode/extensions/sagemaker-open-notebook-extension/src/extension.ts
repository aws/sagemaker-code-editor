
import * as vscode from 'vscode';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as console from 'console';

export function activate() {
    const config = vscode.workspace.getConfiguration('extensions.openNotebookData');
    const notebookKey = config.get('notebookKey') as string;
    const clusterId = config.get('clusterId') as string;
    const region = config.get('region') as string;
    if(notebookKey){
        loadAndDisplayNotebook(notebookKey, clusterId, region);
    }

}

function isValidRegion(region: string): boolean {
    // This regex allows for characters, numbers, and hyphens
    const regionRegex = /^[a-zA-Z0-9-]+$/;
    return regionRegex.test(region);
}

async function loadAndDisplayNotebook(fileKey: string, clusterId: string, region: string) {
    if (!isValidRegion(region)) {
        vscode.window.showErrorMessage('Invalid region format. Region should only contain characters, numbers, and hyphens.');
        return;
    }
    
    const bucketName = `jumpstart-cache-prod-${region}`;
    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${fileKey}`;
    try {
        let content = await downloadFile(url);
        content = processNotebookContent(content, clusterId, region);
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, 'downloaded-notebook.ipynb');
        fs.writeFileSync(tempFilePath, content);
        const uri = vscode.Uri.file(tempFilePath);
        await openNotebookDocument(uri);
    } catch (error) {
        vscode.window.showErrorMessage('Error downloading or opening notebook: ' + error.message);
    }
}

function processNotebookContent(content: string, clusterId: string, region: string): string {
    const notebook = JSON.parse(content);
    notebook.cells = notebook.cells.map((cell: any) => {
        if (cell.metadata && 
            cell.metadata.jumpStartAlterations && 
            cell.metadata.jumpStartAlterations.includes('clusterId')) {
            cell.source = [
                "%%bash\n",
                `aws ssm start-session --target sagemaker-cluster:${clusterId} --region ${region}`
            ];
            cell.cell_type = "code";
        }

        if (cell.metadata && 
            cell.metadata.jumpStartAlterations && 
            cell.metadata.jumpStartAlterations.includes('clusterName')) {
            cell.source = [
                `!hyperpod connect-cluster --cluster-name ${clusterId}`
            ]
            cell.cell_type = "code";
        }
        return cell;
    });
    return JSON.stringify(notebook, null, 2);
}

async function openNotebookDocument(uri: vscode.Uri) {
    try {
        // Open the notebook document
        const document = await vscode.workspace.openNotebookDocument(uri);
        // Show the notebook document in a notebook editor
        await vscode.window.showNotebookDocument(document);
    } catch (error) {
        console.error('Failed to open notebook:', error);
        vscode.window.showErrorMessage('Failed to open notebook: ' + error.message);
    }
}

function downloadFile(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
