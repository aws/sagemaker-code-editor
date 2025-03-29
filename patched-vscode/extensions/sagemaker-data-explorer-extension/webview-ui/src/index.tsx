import React from "react";
import { createRoot } from "react-dom/client";  // Updated import
import { DataSourceExplorerWidget } from "./widget";

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

root.render(
  <React.StrictMode>
    <DataSourceExplorerWidget />
  </React.StrictMode>
);
