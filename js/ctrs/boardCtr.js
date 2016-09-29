app.controller('messageBoardCtr', ['$rootScope', '$scope', '$state', '$timeout', 'requestServer', 'userService', function ($rootScope, $scope, $state, $timeout, requestServer, userService) {

    /**
     * http加载留言板数据
     */
    $scope.isRefresh = false;
    $rootScope.loadingBoardList = function () {
    	$scope.isRefresh = true;
        requestServer.post('queryMessageBoard', {personId: $rootScope.currentUser.id})
            .then(function (result, status) {
                if (result.resultStatus == 1) {
                    $scope.boardList = result.info;
                } else {
                    nw.alert("获取数据失败!");
                }
                
               setTimeout(function(){
               		$scope.isRefresh = false;
               		$scope.$apply();
               }, 500)
            }, function(){
                $scope.isRefresh = false;
            });
    };

    $rootScope.loadingBoardList();

    //接单操作
    $scope.ReceiveServiceMessage = function (member) {
        userService.invoke('ReceiveServiceMessage', {
            wxuserid: member.wxUser,
            sessionid: member.sessionId,
            desc: member.content,
            type: member.contentType,
            time: member.createTime
        });

        userService.onReceiveServiceMessageResult($scope, function (data, error) {

            if (error) return;
            for (var i = 0; i < $scope.boardList.length; i++) {
                if (data.sessionid == $scope.boardList[i].sessionId) {
                    $scope.boardList.splice(i, 1);
                }
            }
        })
    }
}]);