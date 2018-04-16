import _ from 'underscore';

function prepareWidgetsForDashboard(widgets) {
  // Default height for auto-height widgets.
  // Compute biggest widget size and choose between it and some magic number.
  // This value should be big enough so auto-height widgets will not overlap other ones.
  const defaultWidgetSizeY = Math.max(
    _.chain(widgets)
      .map(w => w.options.position.sizeY)
      .max()
      .value(),
    20,
  ) + 5;

  // Fix layout:
  // 1. sort and group widgets by row
  // 2. update position of widgets in each row - place it right below
  //    biggest widget from previous row
  _.chain(widgets)
    .sortBy(widget => widget.options.position.row)
    .groupBy(widget => widget.options.position.row)
    .reduce((row, widgetsAtRow) => {
      let height = 1;
      _.each(widgetsAtRow, (widget) => {
        height = Math.max(
          height,
          widget.options.position.autoHeight
            ? defaultWidgetSizeY
            : widget.options.position.sizeY,
        );
        widget.options.position.row = row;
        if (widget.options.position.sizeY < 1) {
          widget.options.position.sizeY = defaultWidgetSizeY;
        }
      });
      return row + height;
    }, 0)
    .value();

  // Sort widgets by updated column and row value
  widgets = _.sortBy(widgets, widget => widget.options.position.col);
  widgets = _.sortBy(widgets, widget => widget.options.position.row);

  return widgets;
}

function Dashboard($resource, $http, currentUser, Widget, dashboardGridOptions) {
  function prepareDashboardWidgets(widgets) {
    return prepareWidgetsForDashboard(_.map(widgets, widget => new Widget(widget)));
  }

  function transformSingle(dashboard) {
    if (dashboard.widgets) {
      dashboard.widgets = prepareDashboardWidgets(dashboard.widgets);
    }
    dashboard.publicAccessEnabled = dashboard.public_url !== undefined;
  }

  const transform = $http.defaults.transformResponse.concat((data) => {
    if (_.isArray(data)) {
      data.forEach(transformSingle);
    } else {
      transformSingle(data);
    }
    return data;
  });

  const resource = $resource('api/dashboards/:slug', { slug: '@slug' }, {
    get: { method: 'GET', transformResponse: transform },
    save: { method: 'POST', transformResponse: transform },
    query: { method: 'GET', isArray: true, transformResponse: transform },
    recent: {
      method: 'get',
      isArray: true,
      url: 'api/dashboards/recent',
      transformResponse: transform,
    },
  });

  resource.prototype.canEdit = function canEdit() {
    return currentUser.canEdit(this) || this.can_edit;
  };

  resource.prototype.calculateNewWidgetPosition = function calculateNewWidgetPosition(widget) {
    const width = (_.extend(
      { sizeX: dashboardGridOptions.defaultSizeX },
      _.extend({}, widget.options).position,
    )).sizeX;

    // Find first free row for each column
    const bottomLine = _.chain(this.widgets)
      .map((w) => {
        const options = _.extend({}, w.options);
        const position = _.extend({ row: 0, sizeY: 0 }, options.position);
        return {
          left: position.col,
          top: position.row,
          right: position.col + position.sizeX,
          bottom: position.row + position.sizeY,
          width: position.sizeX,
          height: position.sizeY,
        };
      })
      .reduce((result, item) => {
        const from = Math.max(item.left, 0);
        const to = Math.min(item.right, result.length + 1);
        for (let i = from; i < to; i += 1) {
          result[i] = Math.max(result[i], item.bottom);
        }
        return result;
      }, _.map(new Array(dashboardGridOptions.columns), _.constant(0)))
      .value();

    // Go through columns, pick them by count necessary to hold new block,
    // and calculate bottom-most free row per group.
    // Choose group with the top-most free row (comparing to other groups)
    return _.chain(_.range(0, dashboardGridOptions.columns - width + 1))
      .map(col => ({
        col,
        row: _.chain(bottomLine)
          .slice(col, col + width)
          .max()
          .value(),
      }))
      .sortBy('row')
      .first()
      .value();
  };

  resource.prepareDashboardWidgets = prepareDashboardWidgets;
  resource.prepareWidgetsForDashboard = prepareWidgetsForDashboard;

  return resource;
}

export default function init(ngModule) {
  ngModule.factory('Dashboard', Dashboard);
}
