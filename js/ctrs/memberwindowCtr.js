/**
 * Created by 马德成 on 2016/2/26.
 * 群组成员页面Controller
 */

app.controller('memberwindowCtr', function ($rootScope, $scope, $timeout, $stateParams, $state, userService) {
    if (!$stateParams.groupid) {
        return;
    }
    var item = $rootScope.activeGroup;
    $scope.list = userService.invoke('GetGroupMembers', {groupid: $stateParams.groupid}).value || [];
    userService.onGroupChange($scope, function (data, error) {
     	if (error) {
            nw.alert({content: error.message});
        }
        if (data.type == 5) { //1:群组名称变更 2:解散 3:被移出群 4:退出群 5:群成员变更
            var item = $rootScope.activeGroup;
		    $timeout(function(){
		    	$scope.list = userService.invoke('GetGroupMembers', {groupid: $stateParams.groupid}).value || [];
		    })
        }

    });
    
    $scope.openChatWindow = function (userInf) {
        var obj = {id: userInf.id, hid: userInf.hid, name: userInf.name, time: new Date().getTime(), top: 0, type: 2, unread: 0};
        $rootScope.ifInSessionList(obj);
        $scope.$parent.selectedIndex = 1;//让菜单选中
        //$state.go('sessionlist');
    };

    //进入聊天界面
    $scope.intoChat = function () {
        var sessionInf = {id: item.groupid, name: item.group, time: new Date().getTime(), top: 0, type: 2, unread: 0};
        $scope.$parent.intoChatWindow(sessionInf);
    };
});
