import { useEffect, useState } from 'react';

import DataExplorerWidget from './components/DataExplorerWidget';
import type { EnvResponse } from './types';
import { getCredentials } from './utils/getCredentials';
import { JSX } from 'react/jsx-runtime';

export const DataSourceExplorerWidget = (): JSX.Element => {
  // TODO: Add error handling logic in the MaxDomeDataExplorerWidget when the meta data is not valid or initialized properly: https://code.amazon.com/packages/MaxDomeDataExplorerWidget/trees/mainline
  const [metadata, setMetadata] = useState({
    projectId: '',
    domainId: '',
    region: '',
    envId: '',
    userId: '',
    dzEndpoint: '',
    dzRegion: '',
    dzStage: 'prod',
    enabledFeatures: [] as string[],
  });

  // // Mock data for local testing
  // const mockEnvResponse = {
  //   "projectId": "borahstlmpr9tt",
  //   "domainId": "dzd_639gmudu6alsjl",
  //   "userId": "41a3fdea-7091-7017-d43d-9b80cd481c64",
  //   "dzEndpoint": "https://iceland-gamma.ap-south-1.api.aws",
  //   "dzStage": "gamma",
  //   "dzRegion": "ap-south-1",
  //   "region": "us-east-1",
  //   "enabledFeatures": [
  //     "feature-data-explorer-widget",
  //     "feature-data-management-add-data-source",
  //     "feature-data-explorer-ga"
  //   ]
  // };

  // const [metadata, setMetadata] = useState(mockEnvResponse);

  const fetchEnv = async () => {
    try {
      const response = await fetch(`/codeeditor/default/api/env`); // TODO: update this URL once the endpint is ready
      const formattedResponse: EnvResponse = await response.json();
      
      const newMetadata = {
        domainId: formattedResponse.domain_id,
        projectId: formattedResponse.project_id,
        region: formattedResponse.aws_region,
        envId: formattedResponse.environment_id,
        userId: formattedResponse.user_id,
        dzEndpoint: formattedResponse.dz_endpoint || `https://datazone.${formattedResponse.dz_region}.api.aws`,
        dzStage: formattedResponse.dz_stage,
        dzRegion: formattedResponse.dz_region,
        enabledFeatures: formattedResponse.enabled_features || [],
      };

      if (Object.values(newMetadata).some(item => !item)) {
        throw new Error('Missing required metadata from the response');
      }

      setMetadata(newMetadata);
    } catch (error) {
      console.error(`[DataSourceExplorerWidget] an error occurred: `, error);
    }
  };

  useEffect(() => {
    fetchEnv();
  }, []);

  return (
    <DataExplorerWidget
      domId='data-explorer-widget-in-vscode'
      consumerType='vscode' // TODO: Add cusumer type for VScode in https://code.amazon.com/packages/MaxDomeDataExplorerWidgetAPI/trees/mainline/--/
      credentialProvider={getCredentials()}
      envMetaData={metadata}
      stage={metadata.dzStage}
      themeConfig = {{ defaultMode: "dark"}}
    />
  );
};
