import 'brace/mode/snippets';
import template from './edit.html';

function SnippetCtrl($routeParams, $http, $location, toastr, currentUser, Events, QuerySnippet) {
  this.snippetId = $routeParams.snippetId;
  Events.record('view', 'query_snippet', this.snippetId);

  this.editorOptions = {
    mode: 'snippets',
    advanced: {
      behavioursEnabled: true,
      enableSnippets: false,
      autoScrollEditorIntoView: true,
    },
    onLoad(editor) {
      editor.$blockScrolling = Infinity;
      editor.getSession().setUseWrapMode(true);
      editor.setShowPrintMargin(false);
    },
  };

  this.saveChanges = () => {
    this.snippet.$save((snippet) => {
      toastr.success('Saved.');
      if (this.snippetId === 'new') {
        $location.path(`/query_snippets/${snippet.id}`).replace();
      }
    }, () => {
      toastr.error('Failed saving snippet.');
    });
  };

  this.delete = () => {
    this.snippet.$delete(() => {
      $location.path('/query_snippets');
      toastr.sucess('Query snippet deleted.');
    }, () => {
      toastr.error('Failed deleting query snippet.');
    });
  };

  if (this.snippetId === 'new') {
    this.snippet = new QuerySnippet({ description: '' });
    this.canEdit = true;
  } else {
    this.snippet = QuerySnippet.get({ id: this.snippetId }, (snippet) => {
      this.canEdit = currentUser.canEdit(snippet);
    });
  }
}

export default function init(ngModule) {
  ngModule.component('snippetPage', {
    template,
    controller: SnippetCtrl,
  });

  return {
    '/query_snippets/:snippetId': {
      template: '<snippet-page></snippet-page>',
      title: 'Query Snippets',
    },
  };
}
