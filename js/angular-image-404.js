angular.module('angular-image-404', [])
    .directive('image404', function () {
        return {
            restrict: 'A',
            link: function (scope, element, attributes) {
                element.on('error', changeSCR);

                function changeSCR() {
                    if (element.attr('src') != attributes.image404) {
                        attributes.image404 && element.attr('src', attributes.image404);
                        return ;
                    }
                }
            }
        }
    });