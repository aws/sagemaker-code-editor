import React, { useEffect, useState } from 'react';

import { majorVersion, packageName } from '../../constants';
import { getPackageMetadata } from '../../utils/getPackageMetadata';

export interface DataExploreWidgetExport {
  // eslint-disable-next-line
  renderToDom: (config: any) => () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const importWidget = async (stage = 'prod', aliasName = ''): Promise<DataExploreWidgetExport> => {
  const packageNameSuffix = stage === 'prod' ? '' : `-${stage}`;

  const packageMetadataRequestConfig = {
    packageName: `${packageName}${packageNameSuffix}`,
    majorVersion: majorVersion.toString(),
    aliasName: aliasName,
  };
  /* eslint-disable */
  const packageMetadata = await getPackageMetadata(packageMetadataRequestConfig);
  return await import(
    /* @vite-ignore */
    /* webpackIgnore: true */ packageMetadata.basePath + packageMetadata.metadata.module?.path
  );
};

const DataExplorerWidget = (props: any): JSX.Element => {
  const [error, setError] = useState<Error | null>();

  let stage = props.stage;
  let aliasName = '';

  if (props.dataExplorerProps?.enabledFeatures?.has('feature-data-explorer-widget-wave0')) {
    aliasName = 'Wave0';
  }

  useEffect(() => {
    let unmount: () => void;
    importWidget(stage, aliasName)
      .then(widgetExport => {
        unmount = widgetExport.renderToDom({ ...props });
      })
      .catch(error => {
        console.error('Failed to import widget', error);
        setError(error);
      });
    return () => unmount?.();
  }, []);

  if (error) {
    return <div>Unable to load data explorer.</div>;
  }

  return <div id={props.domId} style={{ display: 'contents' }}></div>;
};

export default DataExplorerWidget;
