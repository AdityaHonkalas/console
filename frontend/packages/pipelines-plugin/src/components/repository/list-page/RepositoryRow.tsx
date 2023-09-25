import * as React from 'react';
import { Link } from 'react-router-dom';
import { TableData, RowFunctionArgs } from '@console/internal/components/factory';
import {
  Kebab,
  LoadingInline,
  ResourceIcon,
  ResourceKebab,
  ResourceLink,
  resourcePath,
  Timestamp,
} from '@console/internal/components/utils';
import { referenceFor, referenceForModel } from '@console/internal/module/k8s';
import { getLatestRun } from '@console/pipelines-plugin/src/utils/pipeline-augment';
import { PipelineRunModel, RepositoryModel } from '../../../models';
import {
  pipelineRunFilterReducer,
  pipelineRunTitleFilterReducer,
} from '../../../utils/pipeline-filter-reducer';
import { pipelineRunDuration } from '../../../utils/pipeline-utils';
import { useGetPipelineRuns } from '../../pipelineruns/hooks/useTektonResults';
import LinkedPipelineRunTaskStatus from '../../pipelineruns/status/LinkedPipelineRunTaskStatus';
import PipelineRunStatus from '../../pipelineruns/status/PipelineRunStatus';
import { getTaskRunsOfPipelineRun } from '../../taskruns/useTaskRuns';
import { RepositoryFields, RepositoryLabels } from '../consts';
import { RepositoryKind } from '../types';
import { repositoriesTableColumnClasses } from './RepositoryHeader';

const RepositoryRow: React.FC<RowFunctionArgs<RepositoryKind>> = ({ obj, customData }) => {
  const {
    metadata: { name, namespace },
  } = obj;
  const { taskRuns } = customData;

  const [pipelineRuns, loaded] = useGetPipelineRuns(namespace, { name, kind: obj.kind });

  const latestRun = loaded && getLatestRun(pipelineRuns, 'creationTimestamp');

  const latestPLREventType =
    latestRun && latestRun?.metadata?.labels[RepositoryLabels[RepositoryFields.EVENT_TYPE]];

  const PLRTaskRuns = getTaskRunsOfPipelineRun(taskRuns, latestRun?.metadata?.name);
  return (
    <>
      <TableData className={repositoriesTableColumnClasses[0]}>
        <ResourceIcon kind={referenceForModel(RepositoryModel)} />
        <Link
          to={`${resourcePath(referenceForModel(RepositoryModel), name, namespace)}/Runs`}
          className="co-resource-item__resource-name"
          data-test-id={name}
        >
          {name}
        </Link>
      </TableData>
      <TableData className={repositoriesTableColumnClasses[1]} columnID="namespace">
        <ResourceLink kind="Namespace" name={obj.metadata.namespace} />
      </TableData>
      <TableData className={repositoriesTableColumnClasses[2]}>
        {latestPLREventType || '-'}
      </TableData>
      <TableData className={repositoriesTableColumnClasses[3]}>
        {loaded ? (
          latestRun ? (
            <ResourceLink
              kind={referenceForModel(PipelineRunModel)}
              name={latestRun?.metadata.name}
              namespace={namespace}
            />
          ) : (
            '-'
          )
        ) : (
          <LoadingInline />
        )}
      </TableData>
      <TableData className={repositoriesTableColumnClasses[4]}>
        {}
        {loaded ? (
          latestRun ? (
            <LinkedPipelineRunTaskStatus pipelineRun={latestRun} taskRuns={PLRTaskRuns} />
          ) : (
            '-'
          )
        ) : (
          <LoadingInline />
        )}
      </TableData>
      <TableData className={repositoriesTableColumnClasses[5]}>
        {loaded ? (
          <PipelineRunStatus
            status={pipelineRunFilterReducer(latestRun)}
            title={pipelineRunTitleFilterReducer(latestRun)}
            pipelineRun={latestRun}
            taskRuns={PLRTaskRuns}
          />
        ) : (
          <LoadingInline />
        )}
      </TableData>
      <TableData className={repositoriesTableColumnClasses[6]}>
        {loaded ? <Timestamp timestamp={latestRun?.status.startTime} /> : <LoadingInline />}
      </TableData>
      <TableData className={repositoriesTableColumnClasses[7]}>
        {loaded ? pipelineRunDuration(latestRun) : <LoadingInline />}
      </TableData>
      <TableData className={repositoriesTableColumnClasses[8]}>
        <ResourceKebab actions={Kebab.factory.common} kind={referenceFor(obj)} resource={obj} />
      </TableData>
    </>
  );
};

export default RepositoryRow;
