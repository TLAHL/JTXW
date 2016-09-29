var directive = angular.module('ATApp.directive', []);

directive.directive('message', ['$timeout', function ($timeout) {
    return {
        restrict: 'E',
        scope: true,
        templateUrl: 'templates/message.html',
        link: function (scope, elem, attrs) {
        }
    };
}]);

directive.directive('wxmessage', ['$timeout', function ($timeout) {
    return {
        restrict: 'E',
        scope: true,
        templateUrl: 'templates/wxmessage.html',
        link: function (scope, elem, attrs) {
        }
    };
}]);

directive.directive('historymessage', ['$timeout', function($timeout) {
	return {
		restrict: 'E',
		scope: true,
		templateUrl: 'templates/historymessage.html',
		link: function(scope, elem, attrs) {}
	};
}]);

directive.directive('user', ['$timeout', function ($timeout) {
    return {
        restrict: 'E',
        templateUrl: 'user.html',
        scope: {
            msg: "=",
            iscurrentreceiver: "=",
            setreceiver: "&"
        },
        link: function (scope, elem, attrs, chatCtrl) {
            $timeout(function () {
                elem.find('.avatar').css('background', scope.info.color);
            });
        }
    };
}]);

/**
 * 当循环完成后进行发布ngRepeatFinished事件
 */
directive.directive('onFinishRender', function ($timeout) {
    return {
        restrict: 'A', link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit('ngRepeatFinished', scope.$index);
                });
            }

            if (attr.pagesize && scope.$index + 1 == attr.pagesize) {
                $timeout(function () {
                    scope.$emit('onLoaded', scope.$index);
                });
            }
        }
    };
});

/**
 * 当滚动到顶部的时候,自动加载更多,加载完成时发布onLoaded事件
 */
directive.directive('scroll', function ($timeout) {
    return {
        restrict: 'A', link: function (scope, element, attr) {
            var raw = element[0];

            angular.element(element).bind("scroll", function() {
                if (raw.scrollTop < (attr.distance || 20)) {
                    scope.$apply(attr.scroll);
                }
            });
        }
    };
});

/**
 * 当滚动到底部的时候,自动加载更多,加载完成时发布onLoaded事件
 */
directive.directive('scroll1', function ($timeout) {
	
    return {
        restrict: 'A', link: function (scope, element, attr) {
            var raw = element[0];
            angular.element(element).bind("scroll", function() {
            	//raw.scrollTop = raw.scrollHeight - raw.clientHeight;
                if (raw.scrollTop < 20) {
                    scope.$apply(attr.scroll1);
                }
            });
        }
    };
});


/**
 * 右键菜单
 */
directive.directive('contextMenu', ["$parse", function ($parse) {
    var renderContextMenu = function ($scope, event, options, model) {
        if (!$) {
            var $ = angular.element;
        }
        // $(event.currentTarget).addClass('context');
        var $contextMenu = $('<div>');
        $contextMenu.addClass('dropdown clearfix');
        var $ul = $('<ul>');
        // var $li = $('<li>');
        $ul.addClass('dropdown-menu dropdown-menutx');
        $ul.attr({'role': 'menu'});

        //  获取页面的最大高度
        var height = Math.max(
            document.body.scrollHeight, document.documentElement.scrollHeight,
            document.body.offsetHeight, document.documentElement.offsetHeight,
            document.body.clientHeight, document.documentElement.clientHeight
        );
        //  获取页面的最大宽度
        var width = Math.max(
            document.body.scrollWidth, document.documentElement.scrollWidth,
            document.body.offsetWidth, document.documentElement.offsetWidth,
            document.body.clientWidth, document.documentElement.clientWidth
        );


        angular.forEach(options, function (item, i) {
            var $li = $('<li>');

            if (item === null) {
                $li.addClass('divider');
            } else {
                var $a = $('<a>');
                $a.attr({tabindex: '-1', href: '#'});
                var text = typeof item[0] == 'string' ? item[0] : item[0].call($scope, $scope, event, model);
                $a.text(text);
                $li.append($a);
                var enabled = angular.isDefined(item[2]) ? item[2].call($scope, $scope, event, text, model) : true;
                if (enabled) {

                    $li.on('click', function ($event) {
                        $event.preventDefault();
                        $scope.$apply(function () {
                            $(event.currentTarget).removeClass('context');
                            $contextMenu.remove();
                            item[1].call($scope, $scope, event, model);
                        });
                    });
                } else {
                    $li.on('click', function ($event) {
                        $event.preventDefault();
                    });
                    $li.addClass('disabled');
                }
            }
            $ul.append($li);

        });
        $contextMenu.append($ul);


        // 判断是否是最后一个 防止右键遮蔽
        var mousepageY = parseInt(height - (event.pageY));
        var mousepageX = parseInt(width - (event.pageX));
        var ulboxheight = 32*(options.length);

        if (mousepageY <=ulboxheight) {
           $ul.css({
                display: 'block',
                position: 'absolute',
                left: event.pageX + 'px',
                top: (event.pageY-ulboxheight-3) + 'px',
                overflow:'hidden',
                height:'auto'
            });
        }else{
             $ul.css({
                display: 'block',
                position: 'absolute',
                left: event.pageX + 'px',
                top: event.pageY + 'px'
            });
        }
        /*if( mousepageX <=170 ){
            $ul.css({
                display: 'block',
                position: 'absolute',
                left: event.pageX + 'px',
                top: event.pageY + 'px',
                overflow:'hidden',
                'min-width':'70px'
            });
        }*/



        $contextMenu.css({
            width: '100%',
            height: height + 'px',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 9999
        });

        $(document).find('body').append($contextMenu);
        $contextMenu.on("mousedown", function (e) {
            if ($(e.target).hasClass('dropdown')) {
                $(event.currentTarget).removeClass('context');
                $contextMenu.remove();
            }
        }).on('contextmenu', function (event) {

            $(event.currentTarget).removeClass('context');
            event.preventDefault();
            $contextMenu.remove();
        });
        $scope.$on("$destroy", function () {
            $contextMenu.remove();
        });
    };
    return function ($scope, element, attrs) {
        element.on('contextmenu', function (event) {
			$scope.$root.bodyclick && $scope.$root.bodyclick();
			
            event.stopPropagation();
            $scope.$apply(function () {
                event.preventDefault();
                
                var options = $scope.$eval(attrs.contextMenu);
                var model = $scope.$eval(attrs.model);
                if (options instanceof Array) {
                    if (options.length === 0) {
                        return;
                    }
                    renderContextMenu($scope, event, options, model);

                } else {
                    throw '"' + attrs.contextMenu + '" not an array';
                }
            });
        });
    };
}]);


/**
 * 封装kindeditor
 */
directive.directive('uiKindeditor', function ($rootScope, $parse) {
    return {
        restrict: 'EA',
        require: '?ngModel',
        link: function (scope, element, attrs, ctrl) {

            var onEnter = $parse(attrs.onEnter);
            var onCtrlEnter = $parse(attrs.onCtrlEnter);

            var _initContent, editor;
            var fexUE = {
                initEditor: function () {
                    editor = KindEditor.create(element[0], {
                        width: '100%',
                        height: 60,
                        minHeight: 60,
                        themeType: 'qq',
                        resizeType: 0,
                        newlineTag: 'p',
                        allowImageUpload: false,
                        allowMediaUpload: false,
                        allowFileUpload: false,
                        allowImageRemote: false,
                        useContextmenu: false,
                        pasteType: 1,
                        filterMode: true,
                        htmlTags: {
                            img: ['src', 'width', 'height', 'border', 'alt', 'title', 'align'],
                            br: []
                        },
                        items: [
                            'emoticons'
                        ],
                        afterChange: function () {
                            scope.editorAfterChange && scope.editorAfterChange(this);
                            ctrl.$setViewValue(this.text());
                            if(!this.count()){
                                this.focus();
                            }
                        },
                        afterCreate: function () {
                        	var self=this;
                        	this.focus();
                        	 KindEditor(self.edit.doc).bind('mousedown', function(event){
                        		 $rootScope.bodyClick();
                        		  $rootScope.bodyclick();
                        	 });
                        	 
                            //enter
                            KindEditor(self.edit.doc).bind('keydown', function(event){
                                if(event.ctrlKey && event.keyCode == 13) {
                                    return scope.onCtrlEnter(self);
                                }
                            	 if (event.keyCode == 13 && !event.ctrlKey
                            		     && !event.shiftKey && !event.altKey) {
                            		return scope.onEnter(self);
                            	}
                            });

                            KindEditor(self.edit.doc).bind('dragover', function (e){
                                e.preventDefault();
                                //e.dataTransfer.dropEffect = 'none';
                            });

                            KindEditor(self.edit.doc).bind('drop', function (e){
                                e.preventDefault();
                            });
                        }
                    });

                },
                setContent: function (content) {
                    if (editor) {
                        editor.html(content);
                    }
                }
            };


            if (!ctrl) return;

            _initContent = ctrl.$viewValue;
            ctrl.$render = function () {
                _initContent = ctrl.$isEmpty(ctrl.$viewValue) ? '' : ctrl.$viewValue;
                fexUE.setContent(_initContent);
            };

            fexUE.initEditor(); //初始化
        }
    }
});


/**
 * 封装input file ,支持onchange事件
 * <input type="file" input-file />
 */
directive.directive('inputFile', ['$parse', function ($parse) {
    return {
        restrict: "A",
        link: function (scope, element, attrs) {
            var modelGet = $parse(attrs.inputFile);
            var modelSet = modelGet.assign;
            var onChange = $parse(attrs.onChange);

            var updateModel = function () {
                scope.$apply(function () {
                    modelSet(scope, element[0].files);
                    onChange(scope);
                });
            };

            element.bind('change', updateModel);
        }
    };
}]);