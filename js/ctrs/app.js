/**
 * Created by 马德成 on 2016/2/26.
 * 应用初始化配置
 */

var app = angular.module("ATApp", ['ui.router', 'ATApp.filters', 'ATApp.factory', 'ATApp.directive', 'app.lang', 'ui.bootstrap','angular-image-404']);
var gui = require('nw.gui');
var win = gui.Window.get();

var tray;

var filename = process.mainModule.filename;
var path = filename.substring(0, filename.lastIndexOf('/'));

//页面加载配置
app.config(function ($locationProvider, $urlRouterProvider, $stateProvider) {
    $stateProvider.state('login', {
            url: '/login{state}',
            templateUrl: './login.html',
            controller: "loginCtr"
        })
        .state('main', {
            url: '/main',
            templateUrl: './main.html',
            controller: "mainCtr"
        })
        .state('sessionlist', {
            parent: 'main',
            url: '/sessionlist',
            templateUrl: './sessionlist.html',
            controller: "sessionlistCtr"
        })
        .state('chatwindow', {
            parent: 'sessionlist',
            url: '/chat/{id}',
            templateUrl: './chat.html',
            controller: "chatCtr"
        })
        .state('groupNotice',{
            parent:'sessionlist',
            url:'/groupNotice',
            templateUrl:'./groupNotice.html',
            controller:"groupNoticeCtr"
        })
        .state('contactslist', {
            parent: 'main',
            url: '/contactslist',
            templateUrl: './contactslist.html',
            controller: "contactslistCtr"
        })
        .state('profilewindow', {
            parent: 'contactslist',
            url: '/prfile/{memberid}',
            templateUrl: './profilewindow.html'
            //controller: "profileCtr"
        })
        .state('workmateWindow', {
            parent: 'contactslist',
            url: '/prfile/{dept}',
            templateUrl: './workmateWindow.html',
            controller: "workmateCtr"
        })
        .state('groups', {
            parent: 'main',
            url: '/groups',
            templateUrl: './groups.html',
            controller: "groupsCtr"
        })
        .state('memberwindow', {
            parent: 'groups',
            url: '/member/{groupid}',
            templateUrl: './memberwindow.html',
            controller: "memberwindowCtr"
        })
        .state('newFriends', {
            parent: 'sessionlist',
            url: '/chat/newFriends',
            templateUrl: './newFriends.html',
            controller: "newFriendsCtr"
        })
        
        .state('customers', {
            parent: 'main',
            url: '/customersessionlist',
            templateUrl: './customersessionlist.html',
            controller: "customersessionlistCtr"
        })
        .state('customerChatWindow', {
            parent: 'customers',
            url: '/customerChat/{id}',
            templateUrl: './customerChat.html',
            controller: "customerChatCtr"
        })
        .state('board', {
                parent: 'customers',
                url: '/customerChat/board',
                templateUrl: './messageBoard.html',
                controller: "messageBoardCtr"
        });


    $urlRouterProvider.otherwise('/login');
});


//处理键盘事件 禁止后退键（Backspace）密码或单行、多行文本框除外
function forbidBackSpace(e) {
    var ev = e || window.event; //获取event对象
    var obj = ev.target || ev.srcElement; //获取事件源
    var t = obj.type || obj.getAttribute('type'); //获取事件源类型
    //获取作为判断条件的事件类型
    var vReadOnly = obj.readOnly;
    var vDisabled = obj.disabled;
    //处理undefined值情况
    vReadOnly = (vReadOnly == undefined) ? false : vReadOnly;
    vDisabled = (vDisabled == undefined) ? true : vDisabled;
    //当敲Backspace键时，事件源类型为密码或单行、多行文本的，
    //并且readOnly属性为true或disabled属性为true的，则退格键失效
    var flag1 = ev.keyCode == 8 && (t == "password" || t == "text" || t == "textarea") && (vReadOnly == true || vDisabled == true);
    //当敲Backspace键时，事件源类型非密码或单行、多行文本的，则退格键失效
    var flag2 = ev.keyCode == 8 && t != "password" && t != "text" && t != "textarea";
    //判断
    if (flag2 || flag1) return false;
}

//禁止后退键 作用于Firefox、Opera
document.onkeypress = forbidBackSpace;
//禁止后退键  作用于IE、Chrome
document.onkeydown = forbidBackSpace;
