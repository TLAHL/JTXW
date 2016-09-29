
app.controller('newFriendsCtr', ['$rootScope', '$scope', '$state', '$timeout', 'userService', function ($rootScope, $scope, $state, $timeout, userService) {
	var chatUser = $rootScope.activeSession; //当前聊天用户
	if (!chatUser) return;

	var newFriendsList = userService.invoke('GetFriendNotifyMsg').value ||[];
	$scope.FriendsList = newFriendsList;
	
	
	//同意好友申请
	$scope.agreeApply = function(member,$index){
		userService.invoke('ApplyAddFriend',{msgid:member.msgid, flag:1,userid:member.userid});
		userService.onApplyAddFriend($scope, function (data, error) {
			$timeout(function(){
				if(data.flag==1){
					newFriendsList[$index].state = 1;
					var index = $rootScope.indexOfSessionList(data.chatid);
					if(index == -1){
						var obj = {
							id: data.chatid,
			                hid: data.hid,
			                name: data.name,
			                time: data.time,
			                lastmsg: data.chatmsg,
			                top: 0,
			                type: 1,
			                unread: 1
						}
						$rootScope.sessionList.push(obj);
					}
					else{
						$rootScope.sessionList[index].time = data.time;
						$rootScope.sessionList[index].lastmsg = data.chatmsg;
					}
				}
			})
			
		})
		
	}
		    
	//拒绝好友申请
	$scope.refuseApply = function(member,$index){
		userService.invoke('ApplyAddFriend',{ msgid:member.msgid, flag:0,userid:member.userid});
		userService.onApplyAddFriend($scope, function (data, error) {
			$timeout(function(){
				if(data.flag==0){
					newFriendsList[$index].state = 2;
				}
			})
		})
	}
		
	//接收好友添加消息
	userService.onFriendMessage($scope, function (data, error) {

        if(data.msgType == 1|| data.msgType == 2){
        	if(data.msgType==1){
        		var state = 0;
        		var lastmsg = data.userName + '请求加我为好友';
        	}else{
        		state = null;
        		lastmsg = data.userName + data.msg;
        	}
        	var messageList = {
            		msgid:data.msgid,
            		msg:data.msg,
            		userid:data.userid,
            		userName:data.userName,
            		hid:data.hid,
            		ismine:0,
            		time:data.time,
            		state:state
            }
        	for(var i=0;i<newFriendsList.length;i++){
            	if(data.userid==newFriendsList[i].userid&&newFriendsList[i].state==0){
            		newFriendsList.splice(i,1);
            		break;
            	}
            }

            $timeout(function(){
            	newFriendsList.unshift(messageList);
            })

        /*****更新lastmessage******/
            var obj = {
                	id: 2001,
                    lastmsg: lastmsg,
                    name: '新好友',
                    //hid: data.hid,
                    top: 0,
                    time: data.time,
                    type: 4,
                    unread: 1
                };


			$timeout(function () {
				var index = $rootScope.indexOfSessionList(obj.id);
				if(index == -1) {
					$rootScope.sessionList.push(obj);
				} else {
					var item = $rootScope.sessionList[index];
					item.time = data.time;
					item.lastmsg = lastmsg;
				}
			});

        }
	});
		
	//清空好友通知消息
	$scope.clearFriendMessage = function(){
		if(newFriendsList.length==0){
			return nw.alert({
				 content:"没有要清空的通知"
			})
		}
		nw.confirm({
			title:"清空好友通知",
			content:"确定清空好友通知？",
			ok:function(dialog){
				$timeout(function(){
					userService.invoke('CleanFriendNotifyMsg');
					newFriendsList.splice(0,newFriendsList.length);
					var item = $rootScope.activeSession;
					item.lastmsg = null;
                    item.unread = 0;
					dialog.close();
				})
			}
		})
		;
	}
}]);