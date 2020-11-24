import * as React from 'react';
import { Checkbox, Form, TextArea, TextInput } from '@patternfly/react-core';
import { connect } from 'react-redux';
import { iGet, iGetIn } from '../../../../utils/immutable';
import { FormFieldMemoRow } from '../../form/form-field-row';
import { FormField, FormFieldType } from '../../form/form-field';
import { vmWizardActions } from '../../redux/actions';
import {
  VMSettingsField,
  VMSettingsRenderableField,
  VMWizardProps,
  VMWizardStorage,
  VMWizardTab,
  VMWizardTabsMetadata,
} from '../../types';
import { iGetVmSettings } from '../../selectors/immutable/vm-settings';
import { ActionType } from '../../redux/types';
import { getInitialData, iGetCommonData } from '../../selectors/immutable/selectors';
import { getStepsMetadata } from '../../selectors/immutable/wizard-selectors';
import { iGetProvisionSourceStorage } from '../../selectors/immutable/storage';
import { WorkloadSelect } from './workload-profile';
import { OS } from './os';
import { FlavorSelect } from './flavor';
import { MemoryCPU } from './memory-cpu';
import { ContainerSource } from './container-source';
import { ProvisionSourceComponent } from './provision-source';
import { URLSource } from './url-source';

import '../../create-vm-wizard-footer.scss';
import './vm-settings-tab.scss';
import { getFieldId } from '../../utils/renderable-field-utils';

export const VMSettingsTabComponent: React.FC<VMSettingsTabComponentProps> = ({
  iUserTemplate,
  commonTemplates,
  commonTemplateName,
  cnvBaseImages,
  provisionSourceStorage,
  updateStorage,
  openshiftFlag,
  steps,
  goToStep,
  vmSettings,
  onFieldChange,
}) => {
  const getField = React.useCallback((key: VMSettingsField) => iGet(vmSettings, key), [vmSettings]);
  const getFieldValue = React.useCallback(
    (key: VMSettingsField) => iGetIn(vmSettings, [key, 'value']),
    [vmSettings],
  );
  const onChange = React.useCallback(
    (key: VMSettingsRenderableField) => (value) => onFieldChange(key, value),
    [onFieldChange],
  );

  const goToStorageStep = React.useCallback(() => goToStep(VMWizardTab.STORAGE), [goToStep]);
  const goToNetworkingStep = React.useCallback(() => goToStep(VMWizardTab.NETWORKING), [goToStep]);

  return (
    <Form className="co-m-pane__body co-m-pane__form kubevirt-create-vm-modal__form">
      <FormFieldMemoRow field={getField(VMSettingsField.NAME)} fieldType={FormFieldType.TEXT}>
        <FormField>
          <TextInput onChange={onChange(VMSettingsField.NAME)} />
        </FormField>
      </FormFieldMemoRow>
      <FormFieldMemoRow
        field={getField(VMSettingsField.TEMPLATE_PROVIDER)}
        fieldType={FormFieldType.TEXT}
      >
        <FormField>
          <TextInput onChange={onChange(VMSettingsField.TEMPLATE_PROVIDER)} />
        </FormField>
        <div className="pf-c-form__helper-text" aria-live="polite">
          example: your company name
        </div>
      </FormFieldMemoRow>
      <FormFieldMemoRow
        className="kv-create-vm__input-checkbox"
        field={getField(VMSettingsField.TEMPLATE_SUPPORTED)}
        fieldType={FormFieldType.INLINE_CHECKBOX}
      >
        <FormField>
          <Checkbox
            id={getFieldId(VMSettingsField.TEMPLATE_SUPPORTED)}
            onChange={onChange(VMSettingsField.TEMPLATE_SUPPORTED)}
          />
        </FormField>
      </FormFieldMemoRow>
      <FormFieldMemoRow
        field={getField(VMSettingsField.DESCRIPTION)}
        fieldType={FormFieldType.TEXT_AREA}
      >
        <FormField>
          <TextArea
            onChange={onChange(VMSettingsField.DESCRIPTION)}
            className="kubevirt-create-vm-modal__description"
          />
        </FormField>
      </FormFieldMemoRow>
      <OS
        iUserTemplate={iUserTemplate}
        commonTemplates={commonTemplates}
        commonTemplateName={commonTemplateName}
        operatinSystemField={getField(VMSettingsField.OPERATING_SYSTEM)}
        flavor={getFieldValue(VMSettingsField.FLAVOR)}
        cloneBaseDiskImageField={getField(VMSettingsField.CLONE_COMMON_BASE_DISK_IMAGE)}
        mountWindowsGuestToolsField={getField(VMSettingsField.MOUNT_WINDOWS_GUEST_TOOLS)}
        workloadProfile={getFieldValue(VMSettingsField.WORKLOAD_PROFILE)}
        cnvBaseImages={cnvBaseImages}
        onChange={onFieldChange}
        openshiftFlag={openshiftFlag}
        goToStorageStep={
          steps[VMWizardTab.STORAGE]?.canJumpTo ? () => goToStep(VMWizardTab.STORAGE) : null
        }
      />
      <ProvisionSourceComponent
        provisionSourceField={getField(VMSettingsField.PROVISION_SOURCE_TYPE)}
        onChange={onFieldChange}
        goToStorageStep={steps[VMWizardTab.STORAGE]?.canJumpTo ? goToStorageStep : null}
        goToNetworkingStep={steps[VMWizardTab.NETWORKING]?.canJumpTo ? goToNetworkingStep : null}
      />
      <ContainerSource
        field={getField(VMSettingsField.CONTAINER_IMAGE)}
        onProvisionSourceStorageChange={updateStorage}
        provisionSourceStorage={provisionSourceStorage}
      />
      <URLSource
        field={getField(VMSettingsField.IMAGE_URL)}
        onProvisionSourceStorageChange={updateStorage}
        provisionSourceStorage={provisionSourceStorage}
      />
      <FlavorSelect
        iUserTemplate={iUserTemplate}
        commonTemplates={commonTemplates}
        os={getFieldValue(VMSettingsField.OPERATING_SYSTEM)}
        flavorField={getField(VMSettingsField.FLAVOR)}
        workloadProfile={getFieldValue(VMSettingsField.WORKLOAD_PROFILE)}
        onChange={onFieldChange}
        cnvBaseImages={cnvBaseImages}
        openshiftFlag={openshiftFlag}
      />
      <MemoryCPU
        memoryField={getField(VMSettingsField.MEMORY)}
        cpuField={getField(VMSettingsField.CPU)}
        onChange={onFieldChange}
      />
      <WorkloadSelect
        iUserTemplate={iUserTemplate}
        commonTemplates={commonTemplates}
        os={getFieldValue(VMSettingsField.OPERATING_SYSTEM)}
        workloadProfileField={getField(VMSettingsField.WORKLOAD_PROFILE)}
        operatingSystem={getFieldValue(VMSettingsField.OPERATING_SYSTEM)}
        flavor={getFieldValue(VMSettingsField.FLAVOR)}
        cnvBaseImages={cnvBaseImages}
        onChange={onFieldChange}
      />
    </Form>
  );
};

const stateToProps = (state, { wizardReduxID }) => ({
  vmSettings: iGetVmSettings(state, wizardReduxID),
  commonTemplates: iGetCommonData(state, wizardReduxID, VMWizardProps.commonTemplates),
  iUserTemplate: iGetCommonData(state, wizardReduxID, VMWizardProps.userTemplate),
  commonTemplateName: getInitialData(state, wizardReduxID).commonTemplateName,
  cnvBaseImages: iGetCommonData(state, wizardReduxID, VMWizardProps.openshiftCNVBaseImages),
  openshiftFlag: iGetCommonData(state, wizardReduxID, VMWizardProps.openshiftFlag),
  provisionSourceStorage: iGetProvisionSourceStorage(state, wizardReduxID),
  steps: getStepsMetadata(state, wizardReduxID),
});

type VMSettingsTabComponentProps = {
  onFieldChange: (key: VMSettingsRenderableField, value: string) => void;
  updateStorage: (storage: VMWizardStorage) => void;
  vmSettings: any;
  provisionSourceStorage: VMWizardStorage;
  commonTemplates: any;
  iUserTemplate: any;
  commonTemplateName: string;
  cnvBaseImages: any;
  openshiftFlag: boolean;
  goToStep: (stepID: VMWizardTab) => void;
  steps: VMWizardTabsMetadata;
  wizardReduxID: string;
};

const dispatchToProps = (dispatch, props) => ({
  onFieldChange: (key, value) =>
    dispatch(vmWizardActions[ActionType.SetVmSettingsFieldValue](props.wizardReduxID, key, value)),
  updateStorage: (storage: VMWizardStorage) => {
    dispatch(vmWizardActions[ActionType.UpdateStorage](props.wizardReduxID, storage));
  },
  goToStep: (stepID: VMWizardTab) => {
    dispatch(vmWizardActions[ActionType.SetGoToStep](props.wizardReduxID, stepID));
  },
});

export const VMSettingsTab = connect(stateToProps, dispatchToProps)(VMSettingsTabComponent);
