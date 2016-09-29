/**
 * Created by 马德成 on 2016/2/26.
 * 群通知Controller
 */

app.controller('groupNoticeCtr', ['$scope', '$rootScope','$timeout', 'userService','$state', function ($scope, $rootScope, $timeout, userService, $state) {
	
	//获取群通知消息
	$scope.groupMsgList = userService.invoke('GetGroupNotifyMsg').value || [];
	//显示群组当前的状态
    $scope.stateMap =  {
    	1:"已同意",
    	2:"已拒绝",
    	3:"已失效"
    }
	//获取群组邀请的id在群组通知消息中的索引
	function indexOfGroupMsgList(id) {
		var index = -1;
		for(var i=0; i< $scope.groupMsgList.length; i++) {
			if(id == $scope.groupMsgList[i].id) {
				return i;
			}
		}
		return index;
	}
	
	// 同意或拒绝群邀请（1--同意，0--拒绝）
	$scope.agreeJoin = function(agreeFlag,item,$index){
		var applyAddGroup = userService.invoke('ApplyAddGroup', {msgid: item.msgid, flag: agreeFlag, groupid: item.groupid, groupName:item.name,userid:item.userid});
		
		//点击同意或拒绝后的返回结果
		userService.onApplyAddGroup($scope,function(data,error){
			//选择的消息在群通知中的位置
			var msgid = data.msgid;
			var flag = data.flag;
			
			$timeout(function(){
				//同意
				if (flag == 1) {
					$scope.groupMsgList[$index].state = 1;
				}

				//拒绝
				if(flag == 0){
					$scope.groupMsgList[$index].state = 2;
				}

				//群已经不存在
				if (error) {
					nw.alert({content:"该群已经被解散"});
					var index = indexOfGroupMsgList(msgid);
		            $timeout(function(){
		            	$scope.groupMsgList.splice(index, 1);
		            })
				}
			})
		})
	}

	//没有群通知显示
	/*var i = $scope.groupMsgList.length;
	$rootScope.msglist = false;
	if (i > 0) {
		$rootScope.msglist = true;
	}*/

	//为消息列表添加群通知
	userService.onGroupMessage($scope,function(data,error){
		//定义群通知列表
		var msgIsmine;
		/*var msg;*/
		var msgState;
		//邀请我入群
		if (data.msgType == 1) {
			msgIsmine = 0;
			msgState = 0;
		};
		//同意或拒绝入群
		if (data.msgType == 2) {
			msgIsmine = 1;
			msgState = 1;
		};
		var msgObjList = {
			msgid : data.id,
			msg : data.msg,
			groupid : data.groupId,
			name : data.name,
			hid : data.hid,
			ismine : msgIsmine,
			state : msgState,
			userid : data.userid
		}
		//将消息通知添加到群通知列表中
		$timeout(function(){
			for(var i=0;i<$scope.groupMsgList.length;i++){
            	if(data.groupId==$scope.groupMsgList[i].groupid && $scope.groupMsgList[i].state==0){
            		$scope.groupMsgList.splice(i,1);
            		break;
            	}
            }
			$scope.groupMsgList.unshift(msgObjList);
		})
	})

	// 清空群消息列表
	$scope.cleanMessage = function(){
		if ($scope.groupMsgList.length == 0) {
			return;
		}else{
			var confirmDialog = nw.confirm({
				title:"清空群通知",
				content:"确定清空全部群通知？",
				ok:function(dialog){
					$timeout(function(){
						userService.invoke('CleanGroupNotifyMsg');
						$scope.groupMsgList.splice(0, $scope.groupMsgList.length);
						var item = $rootScope.activeSession;
						item.lastmsg = null;
                        item.unread = 0;
						dialog.close();
					})
				}
			})
		}
	}
}]);