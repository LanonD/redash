import { contains } from 'underscore';
import template from './data-sources.html';

function GroupDataSourcesCtrl($scope, $routeParams, $http, Events, Group, DataSource) {
  Events.record('view', 'group_data_sources', $scope.groupId);
  $scope.group = Group.get({ id: $routeParams.groupId });
  $scope.dataSources = Group.dataSources({ id: $routeParams.groupId });
  $scope.newDataSource = {};

  $scope.findDataSource = () => {
    if ($scope.foundDataSources === undefined) {
      DataSource.query((dataSources) => {
        const existingIds = $scope.dataSources.map(m => m.id);
        $scope.foundDataSources = dataSources.filter(ds => !contains(existingIds, ds.id));
      });
    }
  };

  $scope.addDataSource = (dataSource) => {
    // Clear selection, to clear up the input control.
    $scope.newDataSource.selected = undefined;

    $http.post(`api/groups/${$routeParams.groupId}/data_sources`, { data_source_id: dataSource.id }).success(() => {
      dataSource.view_only = false;
      $scope.dataSources.unshift(dataSource);

      if ($scope.foundDataSources) {
        $scope.foundDataSources = $scope.foundDataSources.filter(ds => ds !== dataSource);
      }
    });
  };

  $scope.changePermission = (dataSource, viewOnly) => {
    $http.post(`api/groups/${$routeParams.groupId}/data_sources/${dataSource.id}`, { view_only: viewOnly }).success(() => {
      dataSource.view_only = viewOnly;
    });
  };

  $scope.removeDataSource = (dataSource) => {
    $http.delete(`api/groups/${$routeParams.groupId}/data_sources/${dataSource.id}`).success(() => {
      $scope.dataSources = $scope.dataSources.filter(ds => dataSource !== ds);
    });
  };
}

export default function init(ngModule) {
  ngModule.controller('GroupDataSourcesCtrl', GroupDataSourcesCtrl);

  return {
    '/groups/:groupId/data_sources': {
      template,
      controller: 'GroupDataSourcesCtrl',
    },
  };
}
