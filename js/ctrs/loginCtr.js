/**
 * Created by 马德成 on 2016/2/26.
 * 登录Controller
 */

//登录Controller
app.controller("loginCtr",['$rootScope', '$scope', '$state', '$stateParams', 'userService', 'lang', function($rootScope, $scope, $state, $stateParams, userService, lang){
    $rootScope.lang = lang;
    $rootScope.activeWXSession = null;

    //gui.App.crashBrowser();
    var gui = require('nw.gui');
    var win = gui.Window.get();

    win.removeAllListeners('minimize');
    win.removeAllListeners('close');
    win.removeAllListeners('restore');
    win.removeAllListeners('maximize');
    win.removeAllListeners('unmaximize');

    $rootScope.closeOperator = 10;//关闭窗口操作标识, 在登录界面直接关闭

    var w = 900, h = 640;
    win.resizeTo(w, h);
    win.show(); // 白屏问题解决
    win.setMinimumSize(w, h);
    win.setMaximumSize(w, h);
    win.setResizable(false);
    win.setPosition('center');
    win.moveTo((screen.width - w)/2, (screen.height - h)/2);
    
    if($rootScope.tray){
    	$rootScope.tray.icon = path + '/img/tray-logo.png';
    }

    $rootScope.sessionList = null;
    $rootScope.activeSession = null;
    $rootScope.activeWorkmate = null;
    $rootScope.activeGroup = null;
    $rootScope.activeContact = null;
    $rootScope.xulietime = null;


    //状态码
    var stateMap = {'1':'您的帐号已在另一台设备登录'};
    $scope.errorMessage = stateMap[$stateParams.state] || '';


    //获取登录配置信息
    var config = JSON.parse(taxIM.GetLoginConfig()).value;
    $scope.verLogin = {
        account: config.username,
        pwd:config.pw,
        remember:!!config.mem,
        autoLogin:!!config.auto
    };
    $scope.$watch('verLogin.account',function(newV,oldV){
		if(newV!=oldV){
			$scope.verLogin.pwd="";
		}
	})
    //处理更新通讯录消息
    userService.onUpdateContact($scope, function(data, error) {
        if(error) {
            $scope.verLogin.process = false;
            $scope.errorMessage = error.message || '获取通讯录发生错误,请重试';
            return $scope.$apply();
        }

        $scope.state = data.state; //获取通讯录状态 1-正在获取 2-完成
        if($scope.state==2){
            $scope.hash="img/update-success.png";
        }else{
            $scope.hash="img/loading_blue2.gif";
        }
        $scope.processMessage = data.msg;
        return $scope.$apply();
    });

    userService.onLogin($scope, function(data, error){

        if(error) {
            $scope.verLogin.process = false;
            $scope.errorMessage = error.message || '登录失败,请重试';
            return $scope.$apply();
        }
        if(data.isCustomer==1){
			$rootScope.customer = true
		}else{
			$rootScope.customer = false
		}

        var userinf = JSON.parse(taxIM.GetUserInfo(data.userid)).value;

        //保存当前用户登录信息
        $rootScope.currentUser = {
            dept:userinf.dept, //部门
            name:userinf.name,//姓名
            tele:userinf.tele,//电话
            id:data.userid,//用户id
            hid:userinf.hid,//头像的hid, 头像地址:lang.fileSvr + hid
            chatImg:userinf.hid?lang.fileSvr + userinf.hid : rootPath + '/img/session-img.png',
            self:1
        };
        $state.go('main');
    });

    $scope.passwordType = "password";

    $scope.$watch("showPassword", function(){
        if($scope.showPassword) {
            $scope.eyesImgSrc = "./image/eye2.png";
            $scope.passwordType = "text";
        }  else {
            $scope.eyesImgSrc = "./image/eye1.png";
            $scope.passwordType = "password";
        }
    });

    $scope.verLogin.process = false;
    $scope.login = function(isValid){
        $scope.errorMessage = null;//恢复默认值
        $scope.processMessage = null;//恢复默认值

        if(isValid) //验证通过
        {
            taxIM.Login($scope.verLogin.account, $scope.verLogin.pwd, $scope.verLogin.remember, $scope.verLogin.autoLogin);
            $scope.processMessage = "正在登录请稍候……";
            $scope.verLogin.process = true;
        }
    }; //登录流程

    //退出程序, 帐号冲突时不自动登录
    if($scope.verLogin.autoLogin && !$stateParams.state) {
        $scope.login(true);
    }



    //退出应用程序
    $rootScope.quitWindow = function(){
        win.hide();
        gui.App.quit();
    };

    //最大化窗口
    $rootScope.maxWindow = function(){
        maxWindow(win);
    };

    //恢复窗口
    $rootScope.restoreWindow = function(){
        win.restore();
    };

    //最小化窗口
    $rootScope.minWindow = function(){
        win.setShowInTaskbar(true);   // 任务栏显示
        win.minimize();


    };

    //关闭窗口
    $rootScope.closeWindow = function(){
        // gui.App.quit();
        win.minimize();
        win.close();
    };

}]);