/**
 * Created by 马德成 on 2016/2/26.
 * 联系人列表Controller
 */

app.controller('contactslistCtr', ['$rootScope', '$scope', '$state', '$timeout', 'userService', '$window', 'lang', function ($rootScope, $scope, $state,$timeout, userService,$window,lang) {
    //点击发送按钮发送消息
    $scope.openChatWindow = function (activeWorkmate) {
        var obj = {
            id: activeWorkmate.id,
            hid: activeWorkmate.hid,
            name: activeWorkmate.name,
            time: new Date().getTime(),
            top: 0,
            type: 1,
            unread: 0
        };
        $rootScope.activeSession = obj;
        $rootScope.ifInSessionList(obj);
        $scope.$parent.selectedIndex = 1;//让菜单选中
    };


	$scope.getChar = function (current, index){
		if(index == 0 ){
			return true;
		}

		if($scope.contacts [index - 1]  && $scope.contacts [index - 1].szm != current.szm) {
			return true;
		}

		return false;
	};

    //获取好友列表
    var memberList = null;
	$timeout(function(){
		memberList = JSON.parse(taxIM.GetFriends()).value || [];
		if (memberList.length > 0) {
			memberList[0].firstLetter = true;

			for (var i = 1; i < memberList.length; i++) {
				var people = memberList[i].szm;
				var peopleNext = memberList[i - 1].szm;
				if (people == peopleNext) {
					memberList[i].firstLetter = false;
				} else {
					memberList[i].firstLetter = true;
				}
			}
		}

		$scope.contacts = memberList;
	}, 70);

    //获取选中的同事是否在好友列表
    function ifInMemberList(memberid){
        for (var i = 0; i < memberList.length; i++) {
            var flag = 0;//非好友
            if (memberid == memberList[i].id) {
                flag = 1;//好友
            };
            return flag;
        };
    }
    
	//获取好友列表索引
    function indexOfMemberList(id) {
        var index = -1;
        for (var i = 0; i < memberList.length; i++) {
            if (id == memberList[i].id) {
                return i;
            }
        }

        return index;
    }

	var deleteFriends = function(member){
        deleteDialog = nw.confirm({
            content: '将从对方的列表消失，不再接收此人的消息',
            ok: function (dialog) {
                var delFriend = userService.invoke('DeleteFriend',{userid:member.id});
            }
        });
    };
    
    
	//点击删除好友
    $scope.deleteMember = deleteFriends;
    
     //右键菜单删除好友
    var deleteMember = [['删除好友',function($itemScope){
    	deleteFriends($itemScope.member);
    }]];
    
    //通知删除好友是否成功
	userService.onDeleteFriend($scope, function (data, error) {
	        if (error) {
	        	nw.confirm({
		            content: '错误信息:'+error,
		            ok: function (dialog) {
		                dialog.close(true);
		                return;
		            }
		        });
		        
	        }else {
	        	 $timeout(function(){
                	var idx = indexOfMemberList(data.userid);
                	memberList.splice(idx, 1);
                	if ($rootScope.activeContact && data.userid == $rootScope.activeContact.id) {
		                delete $rootScope.activeContact;
		            }
                });
	        	var showid = $rootScope.indexOfSessionList(data.userid);
		        if(showid != -1) {
						 taxIM.DeleteChat(data.userid);
				            $rootScope.sessionList.splice($rootScope.indexOfSessionList(data.userid), 1); 
				            if ($rootScope.activeSession && data.userid == $rootScope.activeSession.id) {
				                delete $rootScope.activeSession;
				            }
					}
		        taxIM.ClearMessage(data.userid);
		        
		         if($rootScope.activeWorkmate && $rootScope.activeWorkmate.id ==data.userid){
		        	$rootScope.activeWorkmate.isfriend = 0;
		        }
	        }
	        deleteDialog.close(true);
	});
    //右键发送消息
    var friendSendMessage = [['发送消息', function($itemScope){
        var obj = {
            id: $itemScope.member.id,
            hid: $itemScope.member.hid,
            name: $itemScope.member.name,
            time: new Date().getTime(),
            top: 0,
            type: 1,
            unread: 0
        };
        $rootScope.ifInSessionList(obj);

        $scope.$parent.selectedIndex = 1;//让菜单选中 activeContact.active
        $state.go('sessionlist');
    }]];

    //右键菜单
    $scope.getMenuOptions = function (member) {
    	var userisfriend = JSON.parse(taxIM.GetUserInfo(member.id)).value.isfriend;
        if(userisfriend) {
        	if (member.active != 1) {
        		return deleteMember;
        		
        	}else {
        		return [].concat(friendSendMessage,deleteMember);
        	}
        }
        return [];
    };

    //获取选中的好友
    /*if(!$rootScope.activeContact) {
     $rootScope.activeContact = memberList[0];
     }*/

    if ($rootScope.activeContact) {
        openProfileWindow($rootScope.activeContact.memberid);
    }
    
    $scope.contactsdblclick = function(obj){
    	console.log(obj);
    	if(obj.active != 1){
    		return nw.alert({content: '当前用户未使用' + lang.appName + '，无法发起聊天'});
    	}
    	$scope.openChatWindow(obj);
    }


    $scope.clickContactItem = function (obj) {
        $rootScope.activeContact = obj;
        openProfileWindow(obj.memberid);
    };

    //打开好友个人信息界面
    function openProfileWindow(memberid) {
        $state.go('profilewindow', {memberid: memberid});
    }
	var workmateList = JSON.parse(taxIM.GetContact()).value;
	$scope.loadworkmate = function(){
		 //获取同事列表
	    $scope.list = workmateList;
	    if ($scope.list && $scope.list.length) {
	        $scope.list[0].isok = true;
	    }
	    $scope.loadMembers = function(item){
	    	var workmateDeptMember = userService.invoke('GetUsersByDeptID', {deptid:item.id}).value;
	    	for ( var i = 0; i < workmateDeptMember.length; i++) {
	    		item.dept = workmateDeptMember[i].dept;
	    		item.users = workmateDeptMember[i].users;
			}
	    }

		$scope.clickWorkmateItem = function ($event, obj, dept) {
			$event.stopPropagation();
	        $rootScope.activeWorkmate = obj;
	        $rootScope.activeWorkmate.isfriend = JSON.parse(taxIM.GetUserInfo(obj.id)).value.isfriend;
	        openWorkmateWindow(obj, dept);
	    };
	
	    //打开同事个人信息界面
	    function openWorkmateWindow(obj, dept) {
	        $state.go('workmateWindow', {obj: obj, dept: dept});
	    }
	};
   
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
    			$timeout(function(){
                	var idx = indexOfMemberList(data.userid);
                	if(idx!= -1){
                		memberList.splice(idx, 1);
	                	if ($rootScope.activeContact && data.userid == $rootScope.activeContact.id) {
			                delete $rootScope.activeContact;
			            }
	                	if($rootScope.activeWorkmate && $rootScope.activeWorkmate.id ==data.userid){
				        	$rootScope.activeWorkmate.isfriend = 0;
				        }
                	}
                });
	        	var showid = $rootScope.indexOfSessionList(data.userid);
		        if(showid != -1) {
					 taxIM.DeleteChat(data.userid);
			            $rootScope.sessionList.splice($rootScope.indexOfSessionList(data.userid), 1); 
			            if ($rootScope.activeSession && data.userid == $rootScope.activeSession.id) {
			                delete $rootScope.activeSession;
			            }
				}
		        taxIM.ClearMessage(data.userid);
	        }else if (data.msgType==2){
        		var userInf = JSON.parse(taxIM.GetUserInfo(data.userid)).value;
        		if(userInf.isfriend){
        			$timeout(function(){
	        			if($rootScope.activeWorkmate && $rootScope.activeWorkmate.id ==data.userid){
					        	$rootScope.activeWorkmate.isfriend = 1;
					    }
	        			$scope.contacts = JSON.parse(taxIM.GetFriends()).value || [];
	        		});
        		}
        	}
	    }
    });

}]);

//同事信息页面的处理
app.controller('workmateCtr', function ($scope, $timeout, $stateParams) {
    $scope.dept = $stateParams.dept;
    var dept = $stateParams.dept;
});
