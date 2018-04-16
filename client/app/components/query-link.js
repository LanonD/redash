
function QueryLinkController() {
  let hash = null;
  if (this.visualization) {
    if (this.visualization.type === 'TABLE') {
      // link to hard-coded table tab instead of the (hidden) visualization tab
      hash = 'table';
    } else {
      hash = this.visualization.id;
    }
  }

  this.link = this.query.getUrl(false, hash);
}

export default function init(ngModule) {
  ngModule.component('queryLink', {
    bindings: {
      query: '<',
      visualization: '<',
    },
    template: '<a ng-href="{{$ctrl.link}}" class="query-link">{{$ctrl.query.name}}</a>',
    controller: QueryLinkController,
  });
}
