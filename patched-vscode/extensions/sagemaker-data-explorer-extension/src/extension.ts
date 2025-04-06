import { ExtensionContext, window } from "vscode";
import { SidebarProvider } from "./panels/sidebarProvider";

export function activate(context: ExtensionContext) {
  // Register the Sidebar Panel
  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    window.registerWebviewViewProvider("data-explorer-sidebar", sidebarProvider)
  );
}
