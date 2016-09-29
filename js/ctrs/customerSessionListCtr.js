/**
 * Created by 吕雷建 on 2016/4/2.
 * 客服会话列表Controller
 */

app.controller('customersessionlistCtr', ['$rootScope', '$scope', '$state', '$timeout', 'userService', function ($rootScope, $scope, $state, $timeout, userService) {
 
	//普通会话列表
    // 1-单人会话
    if ($rootScope.wxSessionList) {
	    if ($rootScope.wxSessionList) {
	    	if($rootScope.activeWXSession && $rootScope.activeWXSession.sessionid != '100001'){
	    		$rootScope.activeWXSession.unread = 0;
	    		openChatWindow($rootScope.activeWXSession.sessionid);
	    	}
	    }
    }
    
        
    $scope.changeSessionTab = function(tabIndex){
    	if(tabIndex){
        	$rootScope.tab.sessionDisplay = true;
    		$rootScope.tab.sessionActive = false;
    	}
    	else{
    		$rootScope.tab.sessionDisplay = false;
    		$rootScope.tab.sessionActive = true;
    	}
    }
    
        //会话失效通知
    userService.onServiceChatClose($scope, function (data, error) {
        if(error || ($rootScope.activeWXSession && $rootScope.activeWXSession.sessionid == data.sessionid))return;
        $rootScope.getCustomerSessionList();
		$scope.$apply();
    });
    
    //会话失效通知
    userService.onServiceChatError($scope, function (data, error) {
        if(error || ($rootScope.activeWXSession && $rootScope.activeWXSession.sessionid == data.sessionid))return;
        $rootScope.getCustomerSessionList();
        $scope.$apply();
        
    });    
    

    //点击会话操作
    $scope.clickSessionItem = function (obj) {

        if ($rootScope.wxMsglist) {
            for (var i = 0; i < $rootScope.wxMsglist.length; i++) {
                if ($rootScope.wxMsglist[i].sessionid == obj.sessionid) {
                    $rootScope.wxMsglist.splice(i, 1);
                    break;
                }
            }

        }
        
        $rootScope.activeWXSession = obj;
        $rootScope.activeWXSession.unread = 0;

        openChatWindow(obj.sessionid); //打开会话窗口 传入会话id
    };


    var clearChatDialog;

    /**
     * 获取会话列表右键菜单
     * @param conv
     * @returns {*[]}
     */
    $scope.getListContextMenu = function (conv) {
        var chatContextMenu = [
	        ['删除咨询', function ($itemScope) {
	            var item = $itemScope.conv;
	            var data = userService.invoke('DeleteServiceChat', {sessionid: item.sessionid});
	            if (data.errcode) {
			        return nw.alert({content: data.errmsg || '删除咨询失败！'});
			
			    }
	            $rootScope.wxSessionList.splice($rootScope.indexOfWXSessionList(item.sessionid), 1); //删除session列表中的会话
	            if ($rootScope.activeWXSession && item.sessionid == $rootScope.activeWXSession.sessionid) {
	                delete $rootScope.activeWXSession;
	            }
	            if ($rootScope.wxMsglist) {
		            for (var i = 0; i < $rootScope.wxMsglist.length; i++) {
		                if ($rootScope.wxMsglist[i].sessionid == item.sessionid) {
		                    $rootScope.wxMsglist.splice(i, 1);
		                    break;
		                }
		            }
	        	}
	            $rootScope.getCustomerSessionList();
	            $state.go('customers');
	        }]
    	];
            
        return chatContextMenu;
    };

    //打开聊天界面
    function openChatWindow(id) {
        $timeout(function () {
            $state.go('customerChatWindow', {id: id});
        });
    }
    $scope.openBoard = function(id){
    	if(!$rootScope.activeWXSession)$rootScope.activeWXSession = {};

    	var defaultSession = {'sessionid': id};
    	$rootScope.activeWXSession = defaultSession;
    	$state.go('board');
    }
}]);