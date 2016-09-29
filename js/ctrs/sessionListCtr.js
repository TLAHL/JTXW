/**
 * Created by 马德成 on 2016/2/26.
 * 会话列表Controller
 */

app.controller('sessionlistCtr', ['$rootScope', '$scope', '$state', '$timeout', 'userService', function ($rootScope, $scope, $state, $timeout, userService) {

    //普通会话列表
    // 1-单人会话,2-群组会话,3-代办公文
    if ($rootScope.sessionList) {
        if ($rootScope.activeSession) {
            $rootScope.activeSession.unread = 0;
            if ($rootScope.activeSession.id == 2002) {
                $state.go('groupNotice');
            }else if ($rootScope.activeSession.id == 2001) {
                $state.go('newFriends');
            }else{
                openChatWindow($rootScope.activeSession.id);
            }
        }
    }

    //点击会话操作
    $scope.clickSessionItem = function (obj) {
        if (obj.type == 3) {
            //清除代办数量
            userService.invoke('ClearTodoCount', {chatid: obj.id});
            obj.unread = 0;
            return nw.openUrl(obj.url);
        }

        if ($rootScope.msgList) {
            for (var i = 0; i < $rootScope.msgList.length; i++) {
                if ($rootScope.msgList[i].id == obj.id) {
                    $rootScope.msgList.splice(i, 1);
                    break;
                }
            }

            if (!$rootScope.msgList.length) {
                tray.icon = path + '/img/tray-logo.png';

                $rootScope.isTray = false;
                if ($rootScope.intervalFlag) {
                    clearInterval($rootScope.intervalFlag);
                    $rootScope.intervalFlag = null;
                }
            }
        }
        $rootScope.activeSession = obj;
        $rootScope.activeSession.unread = 0;
        
        if(obj.id==2001){
        	return $state.go('newFriends');
        }
        
        if(obj.id == 2002){
        	return $state.go('groupNotice');
        }

        openChatWindow(obj.id); //打开会话窗口 传入会话id
    };


    var clearChatDialog;
    //菜单列表
    var chatContextMenu = [
        // ['转发', function($itemScope){

        // }],
        ['清空聊天记录', function ($itemScope) {
            if (!clearChatDialog) {
                clearChatDialog = nw.confirm({
                    content: '确认清空聊天记录?',
                    ok: function (dialog) {
                        var item = $itemScope.conv;
                        item.draftmsg = null;
                        item.lastmsg = null;
                        item.unread = 0;
                        item.drafttime = 0;

                        if (item.type == 2) {
                            taxIM.ClearGroupMessage(item.id);
                        } else if (item.type == 1) {
                            taxIM.ClearMessage(item.id);
                        } else if(item.id == 2001) {
                            userService.invoke('CleanFriendNotifyMsg');
                        } else if(item.id == 2002) {
                            userService.invoke('CleanGroupNotifyMsg');
                        }

                        if (item.id == $rootScope.activeSession.id) {
                            if(item.id == 2001){
                                $state.reload('newFriends');
                            } else if(item.id == 2002) {
                                $state.reload('groupNotice');
                            } else {
                                $state.reload('chatwindow');
                            }
                        }

                        dialog.close(true);
                    }
                });

                clearChatDialog.on('closed', function () {
                    clearChatDialog = null;
                });

                clearChatDialog.on('blur', function () {
                    clearChatDialog.focus();
                });
            } else {
                clearChatDialog.focus();
            }

        }],
        ['删除会话', function ($itemScope) {
            var item = $itemScope.conv;
            if (item.type == 2) {
                taxIM.DeleteGroupChat(item.id);
            } else if (item.type == 1) {
                taxIM.DeleteChat(item.id);
            } else if (item.type == 4 || item.type == 5) {
                userService.invoke('DeleteNotifyChat', {chatid: item.id});
            } else{
                return;
            }

            $rootScope.sessionList.splice($rootScope.indexOfSessionList(item.id), 1); //删除session列表中的会话
            if ($rootScope.activeSession && item.id == $rootScope.activeSession.id) {
                delete $rootScope.activeSession;
            }

            if ($rootScope.msgList) {
                for (var i = 0; i < $rootScope.msgList.length; i++) {
                    if ($rootScope.msgList[i].id == item.id) {
                        $rootScope.msgList.splice(i, 1);
                        break;
                    }
                }

                if (!$rootScope.msgList.length) {
                    tray.icon = path + '/img/tray-logo.png';

                    $rootScope.isTray = false;
                    if ($rootScope.intervalFlag) {
                        clearInterval($rootScope.intervalFlag);
                        $rootScope.intervalFlag = null;
                    }
                }
            }
        }]
    ];

    /**
     * 获取会话列表右键菜单
     * @param conv
     * @returns {*[]}
     */
    $scope.getListContextMenu = function (conv) {
        if (conv.top) {

            var item = [['取消置顶', function ($itemScope) {
                var item = $itemScope.conv;
                taxIM.CancelChat(item.id);
                item.top = 0;
            }]];
            return [].concat(item, chatContextMenu);
        }

        var item = [['置顶会话', function ($itemScope) {
            var item = $itemScope.conv;
            taxIM.TopChat(item.id);
            item.top = 1;     // TOP 为1 置顶

        }]];

        return [].concat(item, chatContextMenu);
    };

    //菜单 - 删除待办
    $scope.todoMenu = [['删除', function ($itemScope) {
        userService.invoke('DeleteTodoChat', {chatid: $itemScope.conv.id});
        var list = $rootScope.todoList;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id == $itemScope.conv.id) {
                return list.splice(i, 1);
            }
        }

    }]];

    //打开聊天界面
    function openChatWindow(id) {
        $timeout(function () {
            $state.go('chatwindow', {id: id});
        });
    }
    
     //通知删除好友是否成功
	userService.onFriendMessage($scope, function (data, error) {
	        if (error) {
	        	nw.confirm({
		            content: '错误信息:'+error,
		            ok: function (dialog) {
		                dialog.close(true);
		                return;
		            }
		        });
		        
	        }else {
	        	if(data.msgType == 3){
	        		var showid = $rootScope.indexOfSessionList(data.userid);
        			 $timeout(function(){
        			 	$scope.clickSessionItem(0);
				        if(showid != -1) {
								 taxIM.DeleteChat(data.userid);
						            $rootScope.sessionList.splice($rootScope.indexOfSessionList(data.userid), 1); 
						            if ($rootScope.activeSession && data.userid == $rootScope.activeSession.id) {
						                delete $rootScope.activeSession;
						            }
							}
				        if ($rootScope.activeContact && data.userid == $rootScope.activeContact.id) {
			                delete $rootScope.activeContact;
			            }
				        if($rootScope.activeWorkmate && $rootScope.activeWorkmate.id ==data.userid){
				        	$rootScope.activeWorkmate.isfriend = 0;
				        }
				        taxIM.ClearMessage(data.userid);
				    });
	        	}
	        	
	        }
	});
}]);