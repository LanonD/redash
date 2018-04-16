import debug from 'debug';

import logoUrl from '@/assets/images/redash_icon_small.png';
import template from './app-header.html';
import './app-header.css';

const logger = debug('redash:appHeader');

function controller($rootScope, $location, $uibModal, Auth, currentUser, clientConfig, Dashboard) {
  this.logoUrl = logoUrl;
  this.basePath = clientConfig.basePath;
  this.currentUser = currentUser;
  this.showQueriesMenu = currentUser.hasPermission('view_query');
  this.showAlertsLink = currentUser.hasPermission('list_alerts');
  this.showNewQueryMenu = currentUser.hasPermission('create_query');
  this.showSettingsMenu = currentUser.hasPermission('list_users');
  this.showDashboardsMenu = currentUser.hasPermission('list_dashboards');

  this.reloadDashboards = () => {
    logger('Reloading dashboards.');
    this.dashboards = Dashboard.recent();
  };

  this.reloadDashboards();

  $rootScope.$on('reloadDashboards', this.reloadDashboards);

  this.newDashboard = () => {
    $uibModal.open({
      component: 'editDashboardDialog',
      resolve: {
        dashboard: () => ({ name: null, layout: null }),
      },
    });
  };

  this.searchQueries = () => {
    $location.path('/queries/search').search({ q: this.term });
  };

  this.logout = () => {
    Auth.logout();
  };
}

export default function init(ngModule) {
  ngModule.component('appHeader', {
    template,
    controller,
  });
}
