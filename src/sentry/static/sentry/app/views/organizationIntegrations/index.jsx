import {Box, Flex} from 'grid-emotion';
import {keyBy} from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import styled from 'react-emotion';

import {Panel, PanelBody, PanelHeader, PanelItem} from 'app/components/panels';
import {
  addErrorMessage,
  addLoadingMessage,
  addSuccessMessage,
} from 'app/actionCreators/indicator';
import {openIntegrationDetails} from 'app/actionCreators/modal';
import {sortArray} from 'app/utils';
import {t} from 'app/locale';
import AsyncComponent from 'app/components/asyncComponent';
import Button from 'app/components/buttons/button';
import InstalledIntegration from 'app/views/organizationIntegrations/installedIntegration';
import Link from 'app/components/link';
import LoadingIndicator from 'app/components/loadingIndicator';
import PanelItemGroup from 'app/components/panels/panelItemGroup';
import PluginIcon from 'app/plugins/components/pluginIcon';
import SettingsPageHeader from 'app/views/settings/components/settingsPageHeader';

export default class OrganizationIntegrations extends AsyncComponent {
  static contextTypes = {
    organization: PropTypes.object.isRequired,
  };

  // Some integrations require visiting a different website to add them. When
  // we come back to the tab we want to show our integrations as soon as we can.
  reloadOnVisible = true;

  getEndpoints() {
    let {orgId} = this.props.params;
    return [
      ['config', `/organizations/${orgId}/config/integrations/`],
      ['integrations', `/organizations/${orgId}/integrations/`],
    ];
  }

  mergeIntegration = integration => {
    // Merge the new integration into the list. If we're updating an
    // integration overwrite the old integration.
    const keyedItems = keyBy(this.state.integrations, i => i.id);
    const integrations = sortArray(
      Object.values({...keyedItems, [integration.id]: integration}),
      i => i.name
    );
    this.setState({integrations});
  };

  handleDeleteIntegration = integration => {
    const {orgId} = this.props.params;
    addLoadingMessage();

    const options = {
      method: 'DELETE',
      success: () => {
        const integrations = this.state.integrations.filter(i => i.id !== integration.id);
        this.setState({integrations});
        addSuccessMessage(t('Integration removed'));
      },
      error: () => addErrorMessage(t('Failed to remove Integration')),
    };

    this.api.request(`/organizations/${orgId}/integrations/${integration.id}/`, options);
  };

  handleDisableIntegration = () => {
    window.open('https://github.com/settings/installations', '_blank');
  };

  renderBody() {
    const orgId = this.context.organization.slug;
    const features = this.context.organization.features;
    const internalIntegrations = ['jira'];

    const enabledProviders = this.state.config.providers.filter(
      p => features.includes('internal-catchall') || !internalIntegrations.includes(p.key)
    );

    const integrations = enabledProviders.map(provider => {
      const installed = this.state.integrations
        .filter(i => i.provider.key === provider.key)
        .map(integration => (
          <InstalledIntegration
            key={integration.id}
            orgId={orgId}
            provider={provider}
            integration={integration}
            onRemove={() => this.handleDeleteIntegration(integration)}
            onDisable={() => this.handleDisableIntegration()}
          />
        ));

      return (
        <React.Fragment key={provider.key}>
          <PanelItem align="center">
            <PluginIcon size={36} pluginId={provider.key} />
            <Box px={2} flex={1}>
              <ProviderName>{provider.name}</ProviderName>
              <ProviderDetails>
                <Status enabled={installed.length > 0} />
                <Link onClick={() => openIntegrationDetails({provider})}>Learn More</Link>
              </ProviderDetails>
            </Box>
            <Box>
              <Button
                icon="icon-circle-add"
                size="small"
                onClick={() =>
                  openIntegrationDetails({
                    provider,
                    onAddIntegration: this.mergeIntegration,
                  })}
              >
                {t('Install')}
              </Button>
            </Box>
          </PanelItem>
          {installed.length > 0 && <PanelItemGroup>{installed}</PanelItemGroup>}
        </React.Fragment>
      );
    });

    return (
      <React.Fragment>
        {!this.props.hideHeader && <SettingsPageHeader title={t('Integrations')} />}
        <Panel>
          <PanelHeader disablePadding>
            <Box px={2} flex="1">
              {t('Integrations')}
            </Box>
            {this.state.reloading && <StyledLoadingIndicator mini />}
          </PanelHeader>
          <PanelBody>{integrations}</PanelBody>
        </Panel>
      </React.Fragment>
    );
  }
}

const StyledLoadingIndicator = styled(LoadingIndicator)`
  position: absolute;
  right: 7px;
  top: 50%;
  transform: translateY(-16px);
`;

const ProviderName = styled.div`
  font-weight: bold;
`;

const ProviderDetails = styled(Flex)`
  align-items: center;
  margin-top: 6px;
  font-size: 0.8em;
`;

const StatusCircle = styled.span`
  border-radius: 50%;
  height: 6px;
  width: 6px;
  display: inline-block;
  background: ${p => (p.enabled ? p.theme.success : p.theme.gray2)};
`;

const Status = styled(props => {
  const {enabled, ...p} = props;
  return (
    <React.Fragment>
      <StatusCircle enabled={enabled} />
      <div {...p}>{enabled ? 'Installed' : 'Not Installed'}</div>
    </React.Fragment>
  );
})`
  color: ${p => (p.enabled ? p.theme.success : p.theme.gray2)};
  margin-left: 5px;
  margin-right: 10px;
`;
