import * as React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import * as _ from 'lodash-es';
import * as semver from 'semver';
import * as classNames from 'classnames';
import { sortable } from '@patternfly/react-table';
import { AlertVariant, Button, Popover } from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';

import { K8sResourceKind, K8sResourceKindReference } from '../module/k8s';
import { ImageStreamModel } from '../models';
import { DetailsPage, ListPage, Table, TableRow, TableData, RowFunction } from './factory';
import { CopyToClipboard } from './utils/copy-to-clipboard';
import { ExpandableAlert } from './utils/alerts';
import { ExternalLink } from './utils/link';
import { Kebab, ResourceKebab } from './utils/kebab';
import { SectionHeading } from './utils/headings';
import { LabelList } from './utils/label-list';
import { navFactory } from './utils/horizontal-nav';
import { ResourceLink } from './utils/resource-link';
import { ResourceSummary } from './utils/details-page';
import { Timestamp } from './utils/timestamp';
import { ImageStreamTimeline } from './image-stream-timeline';
import { YellowExclamationTriangleIcon } from '@console/shared';

const ImageStreamsReference: K8sResourceKindReference = 'ImageStream';
const ImageStreamTagsReference: K8sResourceKindReference = 'ImageStreamTag';

export const getImageStreamTagName = (imageStreamName: string, tag: string): string =>
  `${imageStreamName}:${tag}`;

export const getAnnotationTags = (specTag: any) =>
  _.get(specTag, 'annotations.tags', '').split(/\s*,\s*/);

const isBuilderTag = (specTag: any) => {
  // A spec tag has annotations tags, which is a comma-delimited string (e.g., 'builder,httpd').
  const annotationTags = getAnnotationTags(specTag);
  return _.includes(annotationTags, 'builder') && !_.includes(annotationTags, 'hidden');
};

const getStatusTags = (imageStream: K8sResourceKind): any => {
  const statusTags = _.get(imageStream, 'status.tags');
  return _.keyBy(statusTags, 'tag');
};

export const getBuilderTags = (imageStream: K8sResourceKind): any[] => {
  const statusTags = getStatusTags(imageStream);
  return _.filter(imageStream.spec.tags, (tag) => isBuilderTag(tag) && statusTags[tag.name]);
};

// Sort tags in reverse order by semver, falling back to a string comparison if not a valid version.
export const getBuilderTagsSortedByVersion = (imageStream: K8sResourceKind): any[] => {
  return getBuilderTags(imageStream).sort(({ name: a }, { name: b }) => {
    const v1 = semver.coerce(a);
    const v2 = semver.coerce(b);
    if (!v1 && !v2) {
      return a.localeCompare(b);
    }
    if (!v1) {
      return 1;
    }
    if (!v2) {
      return -1;
    }
    return semver.rcompare(v1, v2);
  });
};

export const getMostRecentBuilderTag = (imageStream: K8sResourceKind) => {
  const tags = getBuilderTagsSortedByVersion(imageStream);
  return _.head(tags);
};

// An image stream is a builder image if
// - It has a spec tag annotated with `builder` and not `hidden`
// - It has a corresponding status tag
export const isBuilder = (imageStream: K8sResourceKind) => !_.isEmpty(getBuilderTags(imageStream));

const { common } = Kebab.factory;
const menuActions = [...Kebab.getExtensionsActionsForKind(ImageStreamModel), ...common];

const ImageStreamTagsRow: React.SFC<ImageStreamTagsRowProps> = ({
  imageStream,
  specTag,
  statusTag,
}) => {
  const imageStreamStatus = _.get(imageStream, 'status');
  const latest = _.get(statusTag, ['items', 0]);
  const from = _.get(specTag, 'from');
  const referencesTag = _.get(specTag, 'from.kind') === 'ImageStreamTag';
  const image = _.get(latest, 'image');
  const created = _.get(latest, 'created');
  const dockerRepositoryCheck = _.has(imageStream, [
    'metadata',
    'annotations',
    'openshift.io/image.dockerRepositoryCheck',
  ]);
  const { t } = useTranslation();
  return (
    <div className="row">
      <div className="col-md-2 col-sm-4 col-xs-4 co-break-word">
        <ResourceLink
          kind={ImageStreamTagsReference}
          name={getImageStreamTagName(imageStream.metadata.name, statusTag.tag)}
          namespace={imageStream.metadata.namespace}
          title={statusTag.tag}
          linkTo={!!image}
        />
      </div>
      <span className="col-md-3 col-sm-4 col-xs-8 co-break-all">
        {from && referencesTag && (
          <ResourceLink
            kind={ImageStreamTagsReference}
            name={getImageStreamTagName(imageStream.metadata.name, from.name)}
            namespace={imageStream.metadata.namespace}
            title={from.name}
          />
        )}
        {from && !referencesTag && <>{from.name}</>}
        {!from && <span className="text-muted">{t('public~pushed image')}</span>}
      </span>
      <span className="col-md-4 col-sm-4 hidden-xs co-break-all">
        {!imageStreamStatus && dockerRepositoryCheck && (
          <>
            <YellowExclamationTriangleIcon />
            &nbsp;{t('public~Unable to resolve')}
          </>
        )}
        {!imageStreamStatus && !dockerRepositoryCheck && !from && <>{t('public~Not synced yet')}</>}
        {/* We have no idea why in this case  */}
        {!imageStreamStatus && !dockerRepositoryCheck && from && <>{t('public~Unresolved')}</>}
        {imageStreamStatus && image && <>{image}</>}
        {imageStreamStatus && !image && (
          <>
            <YellowExclamationTriangleIcon />
            &nbsp;{t('public~There is no image associated with this tag')}
          </>
        )}
      </span>
      <div className="col-md-3 hidden-sm hidden-xs">
        {created && <Timestamp timestamp={created} />}
        {!created && '-'}
      </div>
    </div>
  );
};

export const ExampleDockerCommandPopover: React.FC<ImageStreamManipulationHelpProps> = ({
  imageStream,
  tag,
}) => {
  const publicImageRepository = _.get(imageStream, 'status.publicDockerImageRepository');
  const { t } = useTranslation();
  if (!publicImageRepository) {
    return null;
  }
  const loginCommand = 'oc registry login';
  const pushCommand = `docker push ${publicImageRepository}:${tag || '<tag>'}`;
  const pullCommand = `docker pull ${publicImageRepository}:${tag || '<tag>'}`;

  return (
    <Popover
      headerContent={<>{t('public~Image registry commands')}</>}
      className="co-example-docker-command__popover"
      minWidth="600px"
      bodyContent={
        <div>
          <p>
            {t(
              'public~Create a new ImageStreamTag by pushing an image to this ImageStream with the desired tag.',
            )}
          </p>
          <br />
          <p>{t('public~Authenticate to the internal registry')}</p>
          <CopyToClipboard value={loginCommand} />
          <br />
          <p>{t('public~Push an image to this ImageStream')}</p>
          <CopyToClipboard value={pushCommand} />
          <br />
          <p>{t('public~Pull an image from this ImageStream')}</p>
          <CopyToClipboard value={pullCommand} />
          <br />
          <p>
            <Trans i18nKey="public~use the equivalent podman commands">
              Red Hat Enterprise Linux users may use the equivalent <strong>podman</strong>{' '}
              commands.{' '}
            </Trans>
            <ExternalLink href="https://podman.io/" text={t('public~Learn more.')} />
          </p>
        </div>
      }
    >
      <Button className="hidden-sm hidden-xs" type="button" variant="link">
        <QuestionCircleIcon className="co-icon-space-r" />
        {t('public~Do you need to work with this ImageStream outside of the web console?')}
      </Button>
    </Popover>
  );
};

export const ImageStreamsDetails: React.SFC<ImageStreamsDetailsProps> = ({ obj: imageStream }) => {
  const { t } = useTranslation();

  const getImportErrors = (): string[] => {
    return _.transform(imageStream.status.tags, (acc, tag: any) => {
      const importErrorCondition = _.find(
        tag.conditions,
        (condition) => condition.type === 'ImportSuccess' && condition.status === 'False',
      );
      importErrorCondition &&
        acc.push(
          t('public~Unable to sync image for tag {{tag}}. {{message}}', {
            tag: `${imageStream.metadata.name}:${tag.tag}`,
            message: importErrorCondition.message,
          }),
        );
    });
  };

  const imageRepository = _.get(imageStream, 'status.dockerImageRepository');
  const publicImageRepository = _.get(imageStream, 'status.publicDockerImageRepository');
  const imageCount = _.get(imageStream, 'status.tags.length');
  const specTagByName = _.keyBy(imageStream.spec.tags, 'name');
  const importErrors = getImportErrors();

  return (
    <div>
      <div className="co-m-pane__body">
        {!_.isEmpty(importErrors) && (
          <ExpandableAlert
            variant={AlertVariant.warning}
            alerts={_.map(importErrors, (error, i) => (
              <React.Fragment key={i}>{error}</React.Fragment>
            ))}
          />
        )}
        <SectionHeading text={t('public~ImageStream details')} />
        <div className="row">
          <div className="col-md-6">
            <ResourceSummary resource={imageStream}>
              {imageRepository && <dt>{t('public~Image repository')}</dt>}
              {imageRepository && <dd>{imageRepository}</dd>}
              {publicImageRepository && <dt>{t('public~Public image repository')}</dt>}
              {publicImageRepository && <dd>{publicImageRepository}</dd>}
              <dt>{t('public~Image count')}</dt>
              <dd>{imageCount ? imageCount : 0}</dd>
            </ResourceSummary>
            <ExampleDockerCommandPopover imageStream={imageStream} />
          </div>
        </div>
      </div>
      <div className="co-m-pane__body">
        <SectionHeading text={t('public~Tags')} />
        {_.isEmpty(imageStream.status.tags) ? (
          <span className="text-muted">{t('public~No tags')}</span>
        ) : (
          <div className="row">
            <div className="co-m-table-grid co-m-table-grid--bordered">
              <div className="row co-m-table-grid__head">
                <div className="col-md-2 col-sm-4 col-xs-4">{t('public~Name')}</div>
                <div className="col-md-3 col-sm-4 col-xs-8">{t('public~From')}</div>
                <div className="col-md-4 col-sm-4 hidden-xs">{t('public~Identifier')}</div>
                <div className="col-md-3 hidden-sm hidden-xs">{t('public~Last updated')}</div>
              </div>
              <div className="co-m-table-grid__body">
                {_.map(imageStream.status.tags, (statusTag) => (
                  <ImageStreamTagsRow
                    key={statusTag.tag}
                    imageStream={imageStream}
                    specTag={specTagByName[statusTag.tag]}
                    statusTag={statusTag}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ImageStreamHistory: React.FC<ImageStreamHistoryProps> = ({ obj: imageStream }) => {
  const imageStreamStatusTags = _.get(imageStream, 'status.tags');
  return (
    <ImageStreamTimeline
      imageStreamTags={imageStreamStatusTags}
      imageStreamName={imageStream.metadata.name}
      imageStreamNamespace={imageStream.metadata.namespace}
    />
  );
};
ImageStreamHistory.displayName = 'ImageStreamHistory';

const pages = [
  navFactory.details(ImageStreamsDetails),
  navFactory.editYaml(),
  navFactory.history(ImageStreamHistory),
];
export const ImageStreamsDetailsPage: React.SFC<ImageStreamsDetailsPageProps> = (props) => (
  <DetailsPage {...props} kind={ImageStreamsReference} menuActions={menuActions} pages={pages} />
);
ImageStreamsDetailsPage.displayName = 'ImageStreamsDetailsPage';

const tableColumnClasses = [
  '',
  '',
  'pf-m-hidden pf-m-visible-on-md',
  'pf-m-hidden pf-m-visible-on-lg',
  Kebab.columnClass,
];

const ImageStreamsTableRow: RowFunction<K8sResourceKind> = ({ obj, index, key, style }) => {
  return (
    <TableRow id={obj.metadata.uid} index={index} trKey={key} style={style}>
      <TableData className={tableColumnClasses[0]}>
        <ResourceLink
          kind={ImageStreamsReference}
          name={obj.metadata.name}
          namespace={obj.metadata.namespace}
        />
      </TableData>
      <TableData
        className={classNames(tableColumnClasses[1], 'co-break-word')}
        columnID="namespace"
      >
        <ResourceLink kind="Namespace" name={obj.metadata.namespace} />
      </TableData>
      <TableData className={tableColumnClasses[2]}>
        <LabelList kind={ImageStreamsReference} labels={obj.metadata.labels} />
      </TableData>
      <TableData className={tableColumnClasses[3]}>
        <Timestamp timestamp={obj.metadata.creationTimestamp} />
      </TableData>
      <TableData className={tableColumnClasses[4]}>
        <ResourceKebab actions={menuActions} kind={ImageStreamsReference} resource={obj} />
      </TableData>
    </TableRow>
  );
};

export const ImageStreamsList: React.SFC = (props) => {
  const { t } = useTranslation();
  const ImageStreamsTableHeader = () => {
    return [
      {
        title: t('public~Name'),
        sortField: 'metadata.name',
        transforms: [sortable],
        props: { className: tableColumnClasses[0] },
      },
      {
        title: t('public~Namespace'),
        sortField: 'metadata.namespace',
        transforms: [sortable],
        props: { className: tableColumnClasses[1] },
        id: 'namespace',
      },
      {
        title: t('public~Labels'),
        sortField: 'metadata.labels',
        transforms: [sortable],
        props: { className: tableColumnClasses[2] },
      },
      {
        title: t('public~Created'),
        sortField: 'metadata.creationTimestamp',
        transforms: [sortable],
        props: { className: tableColumnClasses[3] },
      },
      {
        title: '',
        props: { className: tableColumnClasses[4] },
      },
    ];
  };
  ImageStreamsTableHeader.displayName = 'ImageStreamsTableHeader';

  return (
    <Table
      {...props}
      aria-label={t('public~ImageStreams')}
      Header={ImageStreamsTableHeader}
      Row={ImageStreamsTableRow}
      virtualize
    />
  );
};

ImageStreamsList.displayName = 'ImageStreamsList';

export const buildPhase = (build) => build.status.phase;

export const ImageStreamsPage: React.SFC<ImageStreamsPageProps> = (props) => {
  const { t } = useTranslation();
  return (
    <ListPage
      {...props}
      title={t('public~ImageStreams')}
      kind={ImageStreamsReference}
      ListComponent={ImageStreamsList}
      canCreate={true}
    />
  );
};

ImageStreamsPage.displayName = 'ImageStreamsListPage';

type ImageStreamTagsRowProps = {
  imageStream: K8sResourceKind;
  specTag: any;
  statusTag: any;
};

type ImageStreamHistoryProps = {
  obj: K8sResourceKind;
};

export type ImageStreamManipulationHelpProps = {
  imageStream: K8sResourceKind;
  tag?: string;
};

export type ImageStreamsDetailsProps = {
  obj: K8sResourceKind;
};

export type ImageStreamsPageProps = {
  filterLabel: string;
};

export type ImageStreamsDetailsPageProps = {
  match: any;
};
