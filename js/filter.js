var filter = angular.module('ATApp.filters', []);

filter.filter('deletehyphen', function createhyphenfilter() {
    return function deletehyphenfilter(value) {
        return value.replace(/-/g, '');
    }
});

filter.directive("dyCompile", ["$compile", function ($compile) {
    return {
        replace: true,
        restrict: 'EA',
        template: '<pre class="text"></pre>',
        link: function (scope, elm, iAttrs) {
            var DUMMY_SCOPE = {
                    $destroy: angular.noop
                },
                root = elm,
                childScope,
                destroyChildScope = function () {
                    (childScope || DUMMY_SCOPE).$destroy();
                };

            iAttrs.$observe("html", function (html) {
                if (html) {
                    destroyChildScope();
                    childScope = scope.$new(false);
                    var content = $compile(html)(childScope);
                    root.replaceWith(content);
                    root = content;
                }

                scope.$on("$destroy", destroyChildScope);
            });
        }
    };
}]);

filter.filter('convert', ['$sce', '$rootScope', function ($sce, $rootScope) {
    return function (msgHTML) {
        var emotionGroup = $rootScope.emotionPanel.emotionGroup;
        var regx = /\[.+?\]/g;
        var rs = msgHTML.match(regx);
        if (rs) {
            for (i = 0; i < rs.length; i++) {
                for (n = 0; n < emotionGroup.length; n++) {
                    var str = '[' + emotionGroup[n].alt + ']';
                    if (str == rs[i]) {
                        var t = "<img src='image/face/" + emotionGroup[n].src + "' width='26px' height='26px' />";
                        msgHTML = msgHTML.replace(rs[i], t);
                        break;
                    }
                }
            }
        }
        return $sce.trustAsHtml(msgHTML);
    };
}]);



//格式化时间 - 会话列表界面
filter.filter('formattimeSession', function ($filter) {
    return function (time, format) {
        if(!time) return ;

        var dateFilter = $filter('date');
        if (format) {
            return dateFilter(time, format);
        }
        var date = new Date(), year = date.getFullYear(), month = date.getMonth(), day = date.getDate();
        var value = new Date(time - 0);

        if(year != value.getFullYear()) { //不是同一年
            return dateFilter(time, 'yy-MM-dd');
        }

        if(month != value.getMonth()) { //同年不同月
            return dateFilter(time, 'M月dd日');
        }

        if(day != value.getDate()){ //同年同月不同天
            if(day - value.getDate() == 1) {
                return '昨天';
            }
            return dateFilter(time, 'M月dd日');
        }

        return dateFilter(time, 'HH:mm');
    }
});


//格式化时间 - 聊天界面
filter.filter('formattime', function ($filter) {

    return function (time, format) {
        if(!time) return ;

        var dateFilter = $filter('date');
        if (format) {
            return dateFilter(time, format);
        }

        var date = new Date(), year = date.getFullYear(), month = date.getMonth(), day = date.getDate();
        var value = new Date(time - 0);

        if(year != value.getFullYear()) { //不是同一年
            return dateFilter(time, 'yyyy-MM-dd HH:mm');
        }

        if(month != value.getMonth()) { //同年不同月
            return dateFilter(time, 'M月dd日 HH:mm');
        }

        if(day != value.getDate()){ //同年同月不同天
            if(day - value.getDate() == 1) {
                return dateFilter(time, '昨天 HH:mm');
            }
            return dateFilter(time, 'M月dd日 HH:mm');
        }

       return dateFilter(time, 'HH:mm');
    }
});


//文字转换成表情
filter.filter('transformExpression',function(){
	return function (data){
        if(!data) return '';
        var kindPath = KindEditor.basePath + 'plugins/emoticons/imgs/';
       

        // 返回特殊字符 直接转义
        return data.replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>')
            .replace(/\s/g, '&nbsp;')
            .replace(/\[(emoji_0(([0-6][0-9])|(7[0-2])))\]/gi, '<img src="' + kindPath + '$1.png" border="0" class="view-emoji"/>')
            //.replace(/http:\/\/[A-Za-z0-9]+\.[A-Za-z0-9]+[\/=\?%\-&_~`@[\]\':+!]*([^<>\"\"])*$/g,'<a href="$1" target="_blank">$1</a>');
           // .replace(/\bhttp\:\/\/&not;¤&cedil;(\.[\w+\.\:\/\_]+)/gi, "<a href=\"http\:\/\/www$1\">http\:\/\/www$1</a>");
            .replace(/\b(((http|https)\:\/\/\w+\.[\w+\.\:\/\_]+)|(www\.[\w+\.\:\/\_]+))/gi,"<a href=\"javascript:\" onclick='nw.openUrl(\"$1\" )'>$1<\/a>") ;
            //.replace(/\b(https\:\/\/\w+\.[\w+\.\:\/\_]+)/gi,"<a href=\"$1\">$1<\/a>")
        	//.replace(/\b(www\.[\w+\.\:\/\_]+)/gi, "<a href=\"$1\">$1</a>");
        	//.replace(/\bhttp\:\/\/&not;¤&cedil;(\.[\w+\.\:\/\_]+)/gi, "<a href=\"http\:\/\/www$1\">http\:\/\/www$1</a>");

	};
});


/**
 * 把输入的内容作为html输出
 */
filter.filter('trustHtml', function ($sce) {
    return function (input) {
        return $sce.trustAsHtml(input);
    }
});


/**
 * 把字节转换为合适的计量单位
 */
filter.filter('byteConvert', function ($sce) {
    return function (bytes) {
    	bytes = parseInt(bytes);
        if (!bytes) return '0 B';

        var k = 1024,
            sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toPrecision(3)) + ' ' + sizes[i];
    }
});

/**
 * 把url解码
 */
filter.filter('decodeURI', function ($sce) {
    return function (encodeURL) {
        return decodeURIComponent(encodeURL||'');
    }
});

