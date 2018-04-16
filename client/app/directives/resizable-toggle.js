import { find } from 'underscore';

function sameNumber(a, b) {
  return (isNaN(a) && isNaN(b)) || (a === b);
}

const flexBasis = find(
  ['flexBasis', 'webkitFlexBasis', 'msFlexPreferredSize'],
  prop => prop in document.documentElement.style,
) || 'flexBasis';

const threshold = 5;

function resizableToggle() {
  return {
    link($scope, $element, $attrs) {
      if ($attrs.resizable === 'false') return;

      let ignoreResizeEvents = false;

      let resizeStartInfo = null;
      let allowHClick = true;
      let allowVClick = true;
      let lastWidth = $element.width();
      let lastHeight = $element.height();

      const isFlex = $scope.$eval($attrs.rFlex);

      $scope.$on('angular-resizable.resizeStart', ($event, info) => {
        if (!ignoreResizeEvents) {
          resizeStartInfo = Object.assign({}, info);
        }
      });

      $scope.$on('angular-resizable.resizeEnd', ($event, info) => {
        if (!ignoreResizeEvents) {
          allowHClick = true;
          if (info.width !== false) {
            allowHClick = sameNumber(info.width, resizeStartInfo.width);
          }
          allowVClick = true;
          if (info.height !== false) {
            allowVClick = sameNumber(info.height, resizeStartInfo.height);
          }
        }
      });

      function emulateAngularResizableEvents(width, height) {
        ignoreResizeEvents = true;
        const info = {
          width,
          height,
          id: $element.attr('id'),
          evt: null,
        };
        $scope.$emit('angular-resizable.resizeStart', info);
        $scope.$emit('angular-resizable.resizing', info);
        $scope.$emit('angular-resizable.resizeEnd', info);
        ignoreResizeEvents = false;
      }

      $element.on('click', '.rg-left, .rg-right', () => {
        if (allowHClick) {
          const minSize = parseFloat($element.css('min-width')) + threshold;
          const currentSize = $element.width();
          const isCollapsed = currentSize <= minSize;
          const animateProp = isFlex ? flexBasis : 'width';
          if (isCollapsed) {
            $element.animate({ [animateProp]: lastWidth + 'px' }, 300, () => {
              emulateAngularResizableEvents(lastWidth, false);
            });
          } else {
            lastWidth = currentSize;
            $element
              .css({ [animateProp]: currentSize + 'px' })
              .animate({ [animateProp]: 0 }, 300, () => {
                emulateAngularResizableEvents(0, false);
              });
          }
        }
      });

      $element.on('click', '.rg-top, .rg-bottom', () => {
        if (allowVClick) {
          const minSize = parseFloat($element.css('min-height')) + threshold;
          const currentSize = $element.height();
          const isCollapsed = currentSize <= minSize;
          const animateProp = isFlex ? flexBasis : 'height';
          if (isCollapsed) {
            $element.animate({ [animateProp]: lastHeight + 'px' }, 300, () => {
              emulateAngularResizableEvents(false, lastHeight);
            });
          } else {
            lastHeight = currentSize;
            $element
              .css({ [animateProp]: currentSize + 'px' })
              .animate({ [animateProp]: 0 }, 300, () => {
                emulateAngularResizableEvents(false, 0);
              });
          }
        }
      });
    },
  };
}

export default function init(ngModule) {
  ngModule.directive('resizableToggle', resizableToggle);
}
