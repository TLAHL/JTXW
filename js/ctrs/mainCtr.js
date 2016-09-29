//登录后的主界面Controller
app.controller('mainCtr', ['$rootScope', '$scope', '$state', '$timeout','$filter', 'userService', 'lang', function ($rootScope, $scope, $state, $timeout,$filter, userService, lang) {
    $rootScope.lang = lang;
    $rootScope.tab = {};


    // 关闭主窗口操作标识, 0-系统默认关闭 1-退出到登录界面
    $rootScope.closeOperator = 0;

    if($rootScope.activeWXSession && $rootScope.activeWXSession.state == 1){
    	$rootScope.tab.sessionActive = false;
    	$rootScope.tab.sessionDisplay = true;
    }
    else
    {
    	$rootScope.tab.sessionActive = true;
    	$rootScope.tab.sessionDisplay = false;
    	
    }

    var isfriendCallback;

    var gui = require('nw.gui');
    var win = gui.Window.get();
    win.setResizable(true);
    win.setMaximumSize(screen.width, screen.height);

	win.on('maximize', function(evt){
		$timeout(function(){
			$scope.isMax = 1;
		});
	});
	
	userService.onGrabServiceMessageResult($scope, function(data, error){
		
		if(error){
	        return  nw.alert({content: error.message || '抢单失败！', closeAble:false , ok:function(dialog){
				userService.invoke('ResetIdleFlag',{});
				clearTimeout(closeGrabWindowTimer);
				dialog.close();
			}});
		}
		clearTimeout(closeGrabWindowTimer);
		win.show();
		userService.invoke('ResetIdleFlag',{});
		$rootScope.getCustomerSessionList(data.sessionid);
		$scope.selectedIndex = 4;
		$rootScope.activeWXSession.unread = 0;
		$rootScope.closeOperator = 1;//修改关闭对话框操作标识
                closeAllWindow();
		$state.go('customerChatWindow',{id:data.sessionid});
		$rootScope.tab.sessionActive = true;
		$rootScope.tab.sessionDisplay = false;
    })
	
	userService.onServiceMessageCancel($scope, function(data, error){
		if($rootScope.grabWindow)
		{
			clearTimeout(closeGrabWindowTimer);
			userService.invoke('ResetIdleFlag',{});
			$rootScope.grabWindow.close();
			$rootScope.grabWindow = null;
		}
	})

	win.on('unmaximize', function(evt){
		$timeout(function(){
			$scope.isMax = 0;
		});
	});

    var w = 900, h = 640;
    win.resizeTo(w, h);
    win.setPosition('center');
    win.setMinimumSize(w, h);

    var isHiden = false;
    $rootScope.isTray = true;
    $rootScope.intervalFlag;
    $rootScope.msgList = [];
    $rootScope.recallId = null;

    {
        //0-包含代办, 1-不包含代办
        var list = JSON.parse(taxIM.GetSessionList(0)).value || [];

        var todoList = [], chatList = []; //筛选待办和会话
        for (var i = 0; i < list.length; i++) {
            if (list[i].type == 3) {
                todoList.push(list[i]);
            } else {
                chatList.push(list[i]);
            }
        }

        $rootScope.todoList = todoList;
        $rootScope.sessionList = chatList;
    }

    /**
     * 客服模块
     */
    $rootScope.wxMsglist = [];
    
    //获取客服会话列表
    $rootScope.getCustomerSessionList = function(id){
		var wxSessionList = userService.invoke('GetWXChat',{});
	    if (wxSessionList.errcode) {
	        return nw.alert({content: wxSessionList.errmsg || '获取会话列表失败！'});
	
	    }
	    
	    $rootScope.wxSessionList = wxSessionList.value;
	    if(id){
	    	angular.forEach($rootScope.wxSessionList, function(item){
	    		if(item.sessionid == id){
	    			$rootScope.activeWXSession = item;
	    		}
	    	})
	    }
    }

    /**
     * 点击其他位置搜索内容消失
     */
    window.bodyClick=$scope.bodyClick = function () {
    	$timeout(function(){
    		$scope.mainSearch = "";
    	});
    }
   $rootScope.bodyclick = $scope.bodyClick;
    $scope.mainSearchClick = function () {
        event.stopPropagation();
    }
    
    //创建托盘
    tray = new gui.Tray({
        title: lang.appName,
        icon: process.mainModule.filename.substring(0, process.mainModule.filename.lastIndexOf('/')) + '/img/tray-logo.png'
    });
    tray.tooltip = '点击打开';
    $rootScope.tray = tray;

    tray.on('click', function () {
        win.setShowInTaskbar(true);   // 任务栏显示
        win.restore();
        win.focus();
    });

    var chlidwindow = null;
    var callback = function () {
    };
    var screenWidth = window.screen.availWidth;
    var screenHeight = window.screen.availHeight;
    var isparentShow = false;
    tray.on('mouseover',
        function (e) {
            if ($rootScope.intervalFlag) {

                if (chlidwindow) {
                    return;
                }
                //  消息盒子状态栏
                chlidwindow = openWindow({
                    url: 'dialogs/msg.html',
                    width: 286,
                    max_height: 582,
                    'modal-window':false,
                    show_in_taskbar: false,
                    frame: false,
                    resizable: false,
                    toolbar: false,
                    focus: true,
                    alwaysOnTop: true,
                    show: false,
                    
                    
                    
                    
                    args: {
                        oninit: function (fn) {
                            callback = fn;
                            callback(count);
                        },
                        onUpdate: function (fn) {
                            callback = fn;
                            callback($rootScope.msgList);
                        },
                        onclean: function () {
                            tray.icon = path + '/img/tray-logo.png';
                            $rootScope.msgList = [];
                            if ($rootScope.intervalFlag) {
                                clearInterval($rootScope.intervalFlag);
                                $rootScope.intervalFlag = null;
                            }
                        },
                        onparentShow: function (cov) {
                            win.focus();
                            $timeout(function () {
                                $scope.selectedIndex = 1;
                            })

                            if (cov.type == 3) {
                                //清除代办数量
                                userService.invoke('ClearTodoCount', {chatid: cov.id});
                                cov.unread = 0;
                                return nw.openUrl(cov.url);

                            }else if (cov.name == "新好友") {
                                for (var i = 0; i < $rootScope.sessionList.length; i++) {
                                    var sessionItem = $rootScope.sessionList[i];
                                    if (sessionItem.name == "新好友") {
                                        sessionItem.unread = 0;
                                        $rootScope.activeSession = sessionItem;
                                        $rootScope.activeSession.unread = 0;
                                        $state.go('newFriends');
                                    }
                                }
                            }else if (cov.name == "群通知") {
                                for (var i = 0; i < $rootScope.sessionList.length; i++) {
                                    var sessionItem = $rootScope.sessionList[i];
                                    if (sessionItem.name == "群通知") {
                                        sessionItem.unread = 0;
                                        $rootScope.activeSession = sessionItem;
                                        $rootScope.activeSession.unread = 0;
                                        $state.go('groupNotice');
                                    }
                                }
                            }else {
                                for (var i = 0; i < $rootScope.sessionList.length; i++) {
                                    var sessionItem = $rootScope.sessionList[i];
                                    if (sessionItem.id == cov.id) {
                                        sessionItem.unread = 0;	
                                        $rootScope.activeSession = sessionItem;
                                        $rootScope.activeSession.unread = 0;
                                        $state.go('chatwindow', {id: sessionItem.id});
                                    }

                                }

                            }

                            isparentShow = true;
                            win.restore();      // 恢复窗口
                            win.setShowInTaskbar(true);   // 任务栏显示

                            var index = indexOfMsgList(cov.id);

                            $rootScope.msgList.splice(index, 1);

                            if ($rootScope.msgList.length == 0) {
                                $rootScope.isTray = false;
                                tray.icon = path + '/img/tray-logo.png';

                                if ($rootScope.intervalFlag) {
                                    clearInterval($rootScope.intervalFlag);
                                    $rootScope.intervalFlag = null;
                                }
                            }
                        }
                    }
                });

                chlidwindow.on('loaded', function () {
                    chlidwindow.x = screenWidth - 286 - 20;
                    var h = chlidwindow.window.document.body.clientHeight;

                    chlidwindow.height = h;
                    chlidwindow.y = screenHeight - h;
                    chlidwindow.show();
                });

                chlidwindow.on('closed', function () {
                    chlidwindow = null;
                });

            }
        }
    );

    //创建菜单
    var menu = new gui.Menu();
    //创建菜单项
    var menuItem = new gui.MenuItem({
        label: lang.exit, click: function () {
            gui.App.quit();
            console("退出程序");
            tray.remove();
            tray = null;

        }
    });

    //追加菜单项
    menu.append(menuItem);
    tray.menu = menu;


    win.on('close', function () {
        console.log('$rootScope.closeOperator==' + $rootScope.closeOperator)
        $rootScope.isClosed = true;
        $rootScope.isTray = true;

        if($rootScope.closeOperator == 10) { //在登录界面时
            win.hide();
            gui.App.quit();  // 退出程序
            return false;
        }

        if($rootScope.closeOperator) { //其他
            $rootScope.closeOperator = 0;
            return false;
        }

        $scope.closeIndexow && $scope.closeIndexow();
    });

    win.on('minimize', function () {
        $rootScope.isClosed = true;
        $rootScope.isTray = true;
    });

    win.on('restore', function () {
        if (!isparentShow) {
            var cov = $rootScope.activeSession;
            if(cov && cov.id){
            	 var index = indexOfMsgList(cov.id);
	            if (index >= 0) {
	                $rootScope.msgList.splice(index, 1);
	            }
            }

            if (!$rootScope.msgList || !$rootScope.msgList.length) {
                $rootScope.isTray = false;
                tray.icon = path + '/img/tray-logo.png';

                if ($rootScope.intervalFlag) {
                    clearInterval($rootScope.intervalFlag);
                    $rootScope.intervalFlag = null;
                }
            }
        }
        isparentShow = false;
        $rootScope.isClosed = false;
    });

    /**
     * 托盘接收消息闪烁
     *
     */
    function flashTray(data, error, isgroup, msg) {
        //获取信息
        win.requestAttention(5);
        if ($rootScope.isTray) {
            if (msg == 'todo') {
                var msgs = $rootScope.msgList;
                for (var i = 0; i < msgs.length; i++) {
                    if (msgs[i].id == data.id) {
                        msgs[i].unread += 1;
                        msgs[i].lastmsg = msg || data.msg;
                        return;
                    }
                }
                msgs.push({id: data.id, name: data.name, url: data.url, unread: 1, lastmsg: data.msg, time: data.time});

            } else {
                var index = indexOfMsgList(data.id);
                if (index == -1) { //不存在列表中
                    //获取用户和群组消息信息
                    var userinf = JSON.parse(isgroup ? taxIM.GetGroupInfo(data.id) : taxIM.GetUserInfo(data.id)).value;
                    var type = isgroup ? 2 : 1;
                    if(data.type){
                    	type = data.type;
                    }
                    $rootScope.msgList.push({
                        id: data.id || data.groupid,
                        lastmsg: msg || data.msg,
                        name: userinf.group || userinf.name || data.name,
                        hid: userinf.hid,
                        time: data.time,
                        type: type,
                        unread: (data.count || 1),
                        sendname: data.sendname
                    });
                } else {
                    if (data.count) {
                        $rootScope.msgList[index].unread = data.count
                    } else {
                        $rootScope.msgList[index].unread += 1;
                    }
                    $rootScope.msgList[index].lastmsg = msg || data.msg;
                }
            }

            //播放声音
            var soundsetat = JSON.parse(taxIM.LoadSystemSetting()).value.sound;  // 获取设置声音的状态参数，1 收到消息播放声音，0：收到消息无声音

            if (soundsetat) {
                var media = nodefile.playSong();
                media.play(path + "/resource/beep.wav");
            } else {
            }


        }
        if ($rootScope.intervalFlag) {
            return;
        }
        if ($rootScope.isTray) {

            $rootScope.intervalFlag = setInterval(function () {
                if (tray.icon == path + '/img/tray-logo.png') {
                    tray.icon = path + '/img/tray-logo-msg.png';
                } else {
                    tray.icon = path + '/img/tray-logo.png';
                }
            }, 500);
        } else {
            tray.icon = path + '/img/tray-logo.png';
            if ($rootScope.intervalFlag) {
                clearInterval($rootScope.intervalFlag);
            }
        }
    }

    /**
     * 获取会话id在sessionList中的索引值 -1表示未找到
     * @param id 会话id
     * @returns -1表示未找到, 非-1的值表示所在的索引
     */
    function indexOfSessionList(id) {
        $rootScope.sessionList = $rootScope.sessionList || [];
        var index = -1;
        for (var i = 0; i < $rootScope.sessionList.length; i++) {
            if (id == $rootScope.sessionList[i].id ) {
                return i;
            }
        }

        return index;
    }
    
        /**
     * 获取会话id在sessionList中的索引值 -1表示未找到
     * @param id 会话id
     * @returns -1表示未找到, 非-1的值表示所在的索引
     */
    function indexOfWXSessionList(id) {
        $rootScope.wxSessionList = $rootScope.wxSessionList || [];
        var index = -1;
        for (var i = 0; i < $rootScope.wxSessionList.length; i++) {
            if (id == $rootScope.wxSessionList[i].sessionid ) {
                return i;
            }
        }

        return index;
    }

    /**
     * 获取会话id在sessionList中的索引值 -1表示未找到
     * @param id 会话id
     * @returns -1表示未找到, 非-1的值表示所在的索引
     */
    function indexOfMsgList(id) {
        var index = -1;
        for (var i = 0; i < $rootScope.msgList.length; i++) {
            if (id == $rootScope.msgList[i].id) {
                return i;
            }
        }
        return index;
    }

    /**
     * 检查并设置当前选中会话,如果不存在会话列表中就添加
     * @param obj 会话对象
     */
    function ifInSessionList(obj) {
        var index = indexOfSessionList(obj.id);
        var objInfor = userService.invoke('GetLastMessage', {chatId: obj.id}).value;
        var lastTime = objInfor.time;
        var lastmsg = objInfor.msg;
        $timeout(function () {
            if (index == -1) {
                obj.unread = 0;
                obj.top = 0;
                obj.time = lastTime;
                obj.lastmsg = lastmsg;
                $rootScope.activeSession = obj;
                $rootScope.sessionList.push(obj);
                if(obj.id=='2001'){
                    return $state.go('newFriends',{id: obj.id});
                }
                $state.go('chatwindow', {id: obj.id});
                return;
            }

            $rootScope.sessionList[index].unread = 0;
            /*$rootScope.sessionList[index].lastmsg = obj.lastmsg;*/
            $rootScope.activeSession = $rootScope.sessionList[index]; //设置当前选中的会话
            $scope.selectedIndex = 1;//让菜单选中
            if(obj.id=='2001'){
                return $state.go('newFriends',{id: obj.id});
            }
            $state.go('chatwindow', {id: obj.id});
        });
    }

    $rootScope.indexOfSessionList = indexOfSessionList;
    $rootScope.indexOfWXSessionList = indexOfWXSessionList;
    $rootScope.ifInSessionList = ifInSessionList;
    $rootScope.receiveMsg =  receiveMsg;

    //顶部搜索
    $scope.mainSearch = "";
    $scope.search = false;

    $scope.openChatWindow = function (activeSession, isgroup) {
        activeSession.id = activeSession.id || activeSession.groupid;
        activeSession.name = activeSession.name || activeSession.group;
        var userinfIs = JSON.parse(taxIM.GetUserInfo(activeSession.id)).value;
        if (activeSession.active == 2) {
            nw.alert({content: '当前用户未使用' + lang.appName + '，无法发起聊天'});
            $scope.mainSearch = "";
        }else if(userinfIs.isfriend==0 && !isgroup){
        	$scope.mainSearch = "";
        	$rootScope.showUserInfo(activeSession.id,isgroup);
            //nw.alert({content:'当前用户和你不是好友，无法发起聊天'});
        } else {
            var obj = {
                id: activeSession.id,
                hid: activeSession.hid,
                name: activeSession.name,
                time: new Date().getTime(),
                top: 0,
                type: isgroup ? 2 : 1,
                unread: 0
            };
            $rootScope.ifInSessionList(obj);
            $scope.selectedIndex = 1;
            $scope.mainSearch = "";
        }

    };
    $scope.searchShow = function () {
        $scope.mainSearch = "";
    }

    $scope.$watch('mainSearch', function(newV, oldV){
		/*event.stopPropagation();*/
        if(newV) {
            $scope.search = true;
            //搜索到的联系人
            var searchContentUser = JSON.parse(taxIM.Search($scope.mainSearch)).value.user;
            $scope.searchContentUser = searchContentUser;

            $scope.keydown = function($event){
                $scope.resultMainActive = 0;
                  if ($event.keycode == 38) {//向上
                      $scope.resultMainActive = $scope.resultMainActive-1;

                  };
                  if($event.keycode == 13){
                	  //alert(111);
                      //openChatWindow(item, false);
                  };
                  if ($event.keycode == 40) {//向下
                      $scope.resultMainActive = $scope.resultMainActive+1;
                  };
              }

            //搜索到的群组
            var searchContentGroup = JSON.parse(taxIM.Search($scope.mainSearch)).value.group;
            $scope.searchContentGroup = searchContentGroup;
        }
	});

    $scope.popMenuState = false;
    $rootScope.rootPath = window.rootPath;//获取根目录


    /**
     * 接收消息统一处理
     * @param data 收到的数据
     * @param error 错误
     * @param isgroup 是否是群组会话
     * @param msg最后一条消息内容
     */
    function receiveMsg(data, error, isgroup, msg) {
        console.log('main590===', data)
        if (error) return;
        data.id = data.id || data.chatId;//处理离线消息

        if ($rootScope.isClosed) {
            $rootScope.isTray = true;
        } else {
            if ($scope.selectedIndex == 1 && $rootScope.activeSession && $rootScope.activeSession.id == data.id) { //如果是当前正在聊天的用户,则不处理
                $rootScope.isTray = false;
            } else {
                $rootScope.isTray = true;
            }
        }
        flashTray(data, error, isgroup, msg);

        //判断当前消息是否在当前会话列表
        if ($rootScope.activeSession && $rootScope.activeSession.id == data.id) {//如果是当前正在聊天的用户,则不处理

        	tray.icon = path + '/img/tray-logo.png';//如果当前会话id和接收消息id一致关闭闪烁
             var msgList = $rootScope.msgList;
             for(var i=0; i<msgList.length; i++){
                if(msgList[i].id == $rootScope.activeSession.id){
                    msgList.splice(i,1);
                    if(!msgList.length){
                         if ($rootScope.intervalFlag) {
                            clearInterval($rootScope.intervalFlag);
                            $rootScope.intervalFlag = null;
                         }
                    }
                }
             }
        	
        	if(data.id == 2002 || data.id == 2001){
        		var index = indexOfSessionList(data.id);
        		var item = $rootScope.sessionList[index];
                item.unread = 0;
                if (data.time) {
                    item.time = data.time;
                    // $rootScope.activeSession && ($rootScope.activeSession.time = data.time);   // 将时间赋值给‘会话列表’ 时间 刷新数据
                }
                item.lastmsg = data.lastmsg;
        	}

            console.log('633', $rootScope.sessionList.length);
            return;
        }

        $timeout(function () {
            var index = indexOfSessionList(data.id);
            if (index == -1 ) { //不存在列表中

                if(data.type == 4 || data.type == 5){ //新好友 和群通知则直接添加
                    $rootScope.sessionList.push(data);
                    return ;
                };

                //获取用户信息
                var userinf = JSON.parse(isgroup ? taxIM.GetGroupInfo(data.id) : taxIM.GetUserInfo(data.id)).value;
                var item = {
                    id: data.id || data.groupid,
                    lastmsg:msg || data.msg,
                    name: userinf.group || userinf.name || data.name,
                    hid: userinf.hid || data.hid,
                    top: 0,
                    time: data.time,
                    type: isgroup ? 2 : 1,
                    unread: (data.count || 1),
                    sendname:data.sendname || []
                };

                $rootScope.sessionList.push(item);

                console.log('664', $rootScope.sessionList.length);
            } else {
                var item = $rootScope.sessionList[index];
            	if(data.time <= item.time)return;
                if (data.count) {
                    item.unread = data.count;
                } else {
                    item.unread += 1;
                }
                if(data.state&&data.state == 1){
                	item.sendfailed = 1;
                }else {
                	item.sendfailed = 0;
                }
                if (data.time) {
                    item.time = data.time;
                }
                item.lastmsg = data.lastmsg || msg;

            }

            console.log('685', $rootScope.sessionList.length);
        });
    }
    
     /**
     * 接收客服消息统一处理
     * @param data 收到的数据
     * @param error 错误
     * @param msg最后一条消息内容
     */
    function receiveWXMsg(data, error, msg) {
    	if (error || !$rootScope.activeWXSession) return;
        data.id = data.sessionid || data.id;//处理离线消息

        //判断当前消息是否在当前会话列表
        if ($rootScope.activeWXSession && $rootScope.activeWXSession.sessionid == data.id) { //如果是当前正在聊天的用户,则不处理
            return;
        }
        
        $rootScope.getCustomerSessionList();
        $scope.$apply();
    }
    

    //接收单人 - 文本消息
    userService.onReceiveTextMessage($scope, function (data, error) {
        receiveMsg(data, error, false, data.flashsms ? '[文本]' : data.msg);
    });

    //接收单人 - 图片消息
    userService.onReceivePicMessage($scope, function (data, error) {
        receiveMsg(data, error, false, '[图片]');
    });

    //接收单人 - 语音消息
    userService.onReceiveSoundMessage($scope, function (data, error) {
        receiveMsg(data, error, false, '[语音]');
    });

    //接收单人 - 文件消息
    userService.onReceiveFileMessage($scope, function (data, error) {
        receiveMsg(data, error, false, '[文件]');
    });

    //接收单人 - 视频消息
    userService.onReceiveVideoMessage($scope, function (data, error) {
        receiveMsg(data, error, false, '[视频]');
    });

    //接收单人 - 链接消息
    userService.onReceiveUrlFile($scope, function (data, error) {
        receiveMsg(data, error, false, '[链接]');
    });


    //接收群组 - 文本消息
    userService.onReceiveGroupText($scope, function (data, error) {
        receiveMsg(data, error, true,data.sendname+":"+data.msg);
    });

    //接收群组 - 图片消息
    userService.onReceiveGroupPic($scope, function (data, error) {
        receiveMsg(data, error, true, '[图片]');
    });

    //接收群组 - 语音消息
    userService.onReceiveGroupSound($scope, function (data, error) {
        receiveMsg(data, error, true, '[语音]');
    });

    //接收群组 - 文件消息
    userService.onReceiveGroupFile($scope, function (data, error) {
        receiveMsg(data, error, true, '[文件]');
    });

    //接收群组 - 视频消息
    userService.onReceiveGroupVideo($scope, function (data, error) {
        receiveMsg(data, error, true, '[视频]');
    });

    //接收群组 - 链接消息
    userService.onReceiveGroupURL($scope, function (data, error) {
        receiveMsg(data, error, true, '[链接]');
    });
    
    
    //接收客服消息 -文本
    userService.onReceiveWXTextMessage($scope, function (data, error) {
        receiveWXMsg(data, error, data.msg);
    });
    
    //接收客服消息 -图片
    userService.onReceiveWXPicMessage($scope, function (data, error) {
        receiveWXMsg(data, error, '[图片]');
    });
    
    //接收客服消息 -语音
    userService.onReceiveWXSoundMessage($scope, function (data, error) {
        receiveWXMsg(data, error, '[语音]');
    });
    
    //接收客服消息 -视频
    userService.onReceiveWXVideoMessage($scope, function (data, error) {
        receiveWXMsg(data, error, '[视频]');
    });
    
    //接收客服消息 -链接
    userService.onReceiveWXUrlFile($scope, function (data, error) {
        receiveWXMsg(data, error, '[链接]');
    });
    
    //注册客服离线消息通知 - 单人
    userService.onOfflineWXMessage($scope, function (data, error) {
        if (error) return;
        for (var i = 0; i < data.length; i++) {
            if(data[i].chatType==5){
		
		        //判断当前消息是否在当前会话列表
		        if ($rootScope.activeWXSession && $rootScope.activeWXSession.sessionid == data[i].sendid) { //如果是当前正在聊天的用户,则不处理
		            return;
		        }
            }
        }
        $rootScope.getCustomerSessionList();
        $scope.$apply();
    });
    

    //接收关于客服的邀请/解除通知
    userService.onServiceBindNotify($scope, function (data, error) {
        //receiveMsg(data, error, true, '[链接]');11customerStatus
        
        if(data.flag == 1){
        	$scope.customerService(data);
        	//$rootScope.customer = true;
        }
        if(data.flag == 0){
        	nw.alert({okVal:'知道了', content: '<p><img align="middle" src="../img/kfzj.png" style="margin-right: 20px">' + data.desc + '</p>'});
        	$rootScope.customer = false;
        	$scope.$apply();
        	if($scope.selectedIndex == 4){
        		$scope.selectedIndex = 1;
        		$state.go('sessionlist');
        	}
        }
    });
    
    //同意或拒绝成为客服的通知
    userService.onAgreeServiceResult($scope, function (data, error) {
    	if (error) {//失败弹出错误信息
            nw.alert({
                content: error.message
            });
        }
        if(data.flag==1){
            $rootScope.customer = true;
        }
        if(data.flag==0){
            $rootScope.customer = false;
        }
        $scope.$apply();
    	
    })
    
   //接单通知
    userService.onReceiveServiceMessageResult($scope, function (data, error) {
        if (error) {//接单失败弹出错误信息
            nw.alert({
                content: error.message || '接单失败！'
            });
        	$rootScope.loadingBoardList();
        } else {//接单成功跳转到聊天
            $rootScope.getCustomerSessionList(data.sessionid);
            $scope.selectedIndex = 4;
            $rootScope.activeWXSession.unread = 0;
            $state.go('customerChatWindow', {id: data.sessionid});
            $rootScope.tab.sessionActive = true;
            $rootScope.tab.sessionDisplay = false;
        }
    })
    
    //群组消息变更通知
    userService.onGroupNotify($scope,function(data,error){
        receiveMsg(data, error, true, data.msg);
    });

    //接收好友通知消息
    userService.onFriendMessage($scope, function (data, error) {

    	if(data.msgType == 1|| data.msgType == 2){

            if(data.msgType==1){
        		var lastmsg = data.userName + '请求加我为好友';
        	}

        	if(data.msgType == 2){

        		lastmsg = data.userName + data.msg;
        		var userInf = JSON.parse(taxIM.GetUserInfo(data.userid)).value;
        		isfriendCallback && isfriendCallback(userInf.isfriend);

                if(data.result == 'yes') {
					var index = indexOfSessionList(data.userid);
					if(index == -1){
							var obj = {
							id: data.userid,
			                hid: data.hid,
			                name: data.userName,
			                lastmsg:data.chatmsg,
			                time: data.time,
			                top: 0,
			                type: 1,
			                unread:1
						}
						$rootScope.sessionList.push(obj);
					}
					else{
						$rootScope.sessionList[index].time = data.time;
						$rootScope.sessionList[index].lastmsg = data.chatmsg;
					}
				}
        	}

            var dataItem = {
                    id: 2001,
                    lastmsg: lastmsg,
                    name: '新好友',
                   // hid: data.hid,
                    top: 0,
                    time: data.time,
                    type: 4,
                    count: 1
            };

            receiveMsg(dataItem, error, false, lastmsg);
    	}

    })

    //注册离线消息通知 - 单人、群组
    userService.onOfflineMessage($scope, function (data, error) {
    	
        for (var i = 0; i < data.length; i++) {
            if(data[i].chatType==1){
            	receiveMsg(data[i], error, false, data[i].flashsms ? '[文本]' : data[i].msg);
            }else{
            	receiveMsg(data[i], error, true, data[i].flashsms ? '[文本]' : data[i].msg);
            }
        }
    });
    
        //注册客服离线消息通知 - 单人
    userService.onOfflineWXMessage($scope, function (data, error) {
        for (var i = 0; i < data.length; i++) {
            receiveWXMsg(data[i], error, data[i].msg);
        }
    });

    //接收消息-代办消息
    userService.onReceiveTodoMessage($scope, function (data, error) {
        if (error) return;
        $rootScope.isTray = true;
        flashTray(data, error, false, 'todo');

        $timeout(function () {
            var list = $rootScope.todoList;
            for (var i = 0; i < list.length; i++) {
                if (list[i].id == data.id) {
                    list[i].unread += 1;
                    return;
                }
            }
            list.push({id: data.id, name: data.name, url: data.url, type: 3, unread: 1, lastmsg: data.msg, time: data.time});
        });


    });

    //接收消息-退出通知
    userService.onCancel($scope, function (data, error) {
        $rootScope.closeOperator = 1;//修改关闭对话框操作标识
        closeAllWindow();
        $state.go('login', {state: 1});
    });

    //接收群消息
    userService.onGroupChange($scope, function (data, error) {
        if (error) {
            nw.alert({content: error.message});
        }

        //修改群名称
        if (data.type == 1) {
            var index = $rootScope.indexOfSessionList(data.id);
            if (index != -1) {
                $timeout(function () {
                    $rootScope.sessionList[index].name = data.name;
                });
            }
            return;
        }

        //退出群组, 踢出群
        if (data.type == 4 || data.type == 3 || data.type == 2) {
            var index = $rootScope.indexOfSessionList(data.id);
            if (index == -1) {
                return;
            }

            $timeout(function () {
                $rootScope.sessionList.splice(index, 1);
                if ($rootScope.activeSession && $rootScope.activeSession.id == data.id) {
                    $rootScope.activeSession = null;
                    $state.go('chatwindow');
                }
            });
        }
    });
    
    //撤销消息通知(可以撤销所有消息,单人和群组)
    userService.onRevocation($scope, function (data, error) {
    	
        if ($rootScope.activeSession && $rootScope.activeSession.id == data.id) { //如果是当前正在聊天的用户,则不处理
        	return;
        }
        if (!data.islast) return;

        var index = indexOfSessionList(data.id);
        $timeout(function () {
        	
        	if(data.islast){
	         	if ($rootScope.msgList) {
		            for (var i = 0; i < $rootScope.msgList.length; i++) {
		                if ($rootScope.msgList[i].id == data.id) {
		                    $rootScope.msgList[i].lastmsg = data.text;
		                }
		            }
		        }
	         }
            if (index != -1) {
                var item = $rootScope.sessionList[index];
                data.time && (item.time = data.time);
                item.lastmsg = data.text;
            }
        });
    });
    
    userService.onSendMessageState($scope, function (data, error) {
    	if ($rootScope.activeSession && $rootScope.activeSession.id == data.id) { //如果是当前正在聊天的用户,则不处理
        	return;
        }
        
		 var showid = $rootScope.indexOfSessionList(data.id);
	     $timeout(function(){
	        if(showid == -1) {//不在最近回话中时，不做任何处理
	             return;
	        }else {
	            var item = $rootScope.sessionList[showid];
	            item.sendfailed = data.state == 1? 1 : 0;
	        }
	   });
    });
    
    //获取好友列表
    var memberList = JSON.parse(taxIM.GetFriends()).value || [];
    
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

    

    var appWin;
    $scope.openApp = function () {
        if (!appWin) {
            appWin = openWindow({
                width: 590,
                height: 490,
                max_width: 590,
                max_height: 490,
                url: 'dialogs/appdetail.html',
                args: [
                    {name: '综合办公', url: '../img/zhbg.png'},
                    {name: '风险监控', url: '../img/fxjk.png'},
                    {name: '网站', url: '../img/wangzhan.png'},
                    {name: '邮件', url: '../img/email.png'}
                ]
            });

            appWin.on('closed', function () {
                appWin = null;
            });
        } else {
            appWin.focus();
        }
    };

    // 设置快捷键
    var setWin;
    $scope.openSetting = function () {
        var loadSystemSetting = JSON.parse(taxIM.LoadSystemSetting()).value;
         var start = 'file:///';
         var path = $rootScope.rootPath.substring(start.length);
        if (!setWin) {
            setWin = openWindow({
                width: 590,
                title: '设置',
               icon: path + '/img/chat_set.png',
                height: 490,
                max_width: 590,
                max_height: 490,
                url: 'dialogs/setting.html',

                args: {
                    win: gui.Window.get(),
                    loadSystemSetting: loadSystemSetting,
                    sound: loadSystemSetting.sound,
                    update: loadSystemSetting.update,
                    auto: loadSystemSetting.autorun,
                    close: loadSystemSetting.close,
                    sendkey: loadSystemSetting.send,
                    openkey: loadSystemSetting.open,
                    // sound:新消息提醒声音开启, update:自动更新，auto：开机自启动，close：关闭时退出(0)或最小化到托盘(1)，send：0（enter）1（ctrl+enter），open："A"-"Z"（打开税信的快捷键ctrl+alt+key）
                    // 使用方法：taxIM.SetAutoStartRun(true);    //开机自启动，参数传true，
                    // taxIM.SetAutoStartRun(false);  //开机不自启动，参数传false，

                    onSave: function (sound, update, auto, close, send, open) {

                        // var sett = JSON.parse(taxIM.SaveSystemSetting(sound, update, auto, close, send, open));
                        var sett = userService.invoke('SaveSystemSetting', {
                            sound: sound,
                            update: update,
                            autorun: auto,
                            close: close,
                            send: send,
                            open: open
                        });

                        var SetAuto = JSON.parse(taxIM.SetAutoStartRun(auto));   // 开机启动参数
                        if (sett.errcode) {
                            return nw.alert({content: sett.errmsg || '修改失败！'});
                        }
                    },
                    onfegg: function (key) {


                        var option = {
                            // key : "Ctrl+Shift+A",
                            //  $scope.$apply();
                            key: key,
                            active: function () {
                                win.restore();
                                win.focus();
                            },
                            failed: function (msg) {
                            }
                        };
                        // Create a shortcut with |option|.
                        var shortcut = new gui.Shortcut(option);

                        // Register global desktop shortcut, which can work without focus.

                        /*if(key = openkey){  // 注销快捷键
                         // Unregister the global desktop shortcut.注销快捷键
                         gui.App.unregisterGlobalHotKey(shortcut);
                         }*/
                        gui.App.registerGlobalHotKey(shortcut);


                    }
                }

            });

            setWin.on('closed', function () {
                setWin = null;
            });
        } else {
            setWin.focus();
        }
    };

    //  打开税信快捷键
    /*var gui = require('nw.gui');
     var win = gui.Window.get();*/

    var loadSystemSetting2 = JSON.parse(taxIM.LoadSystemSetting()).value;
    var openkey2 = loadSystemSetting2.open;

    var option = {
        // key : "Ctrl+Shift+A",
        //  $scope.$apply();
        key: openkey2,
        active: function () {
            win.restore();
            win.focus();
        },
        failed: function (msg) {
        }
    };
    // Create a shortcut with |option|.
    var shortcut = new gui.Shortcut(option);

    // Register global desktop shortcut, which can work without focus.
    gui.App.registerGlobalHotKey(shortcut);


    //  关闭主窗口事件
    $scope.closeIndexow = function () {
        var loadSystemSetting = JSON.parse(taxIM.LoadSystemSetting()).value;
        var close = loadSystemSetting.close;
        if (!close) {

            var dialogClosenw = nw.confirm({
                content: '确定退出' + lang.appName + '?',
                ok: function (dialog) { //确定按钮
                    dialog.hide();
                    dialog.close();
                    win.hide();
                    gui.App.quit();  // 退出程序

                }
            });

        } else {
            win.minimize();
            win.setShowInTaskbar(false);   // 关闭后任务栏不显示
        }
    };

    //注销登录
    $scope.confirmLogout = function (parentWin,args) {
        userService.openLogoutDialog(parentWin, function (indexUrl) {
            taxIM.LogOff();

            $rootScope.closeOperator = 2;//修改关闭对话框操作标识
            $state.go('login', {state: 2});
            if ($rootScope.msgList.length) {
                $rootScope.isTray = false;
                if ($rootScope.intervalFlag) {
                    clearInterval($rootScope.intervalFlag);
                    $rootScope.intervalFlag = null;
                }
            }
            return true;
        });
    };

    //修改密码
    $scope.updatePwd = function (parentWin,args) {
        userService.openUpdatePwdDialog(parentWin,function (args) {
            taxIM.LogOff();
            $state.go('login', {state: 2});
        });
    };
    
    //添加好友
    $scope.addFriendDialog = function (args,parentWin) {
        if(args.active == 2){
        	nw.alert({content: '当前用户未使用' + lang.appName + '，无法发添加好友'});
        	return;
        }
        var args = {
        		id: args.id,
            	name: args.name,
	            self: args.id == $rootScope.currentUser.id,
	            selfName:"我是"+$rootScope.currentUser.name,
	            dept: args.dept,
	            tele: args.tele,
	            hid: args.hid,
	            isfriend: args.isfriend,
        }
        userService.openAddFriendsDialog(args,parentWin);
    };
    
    //客服邀请通知

    
    $scope.customerService = function (data) {
        userService.openCustomerServiceDialog(data);
    };
    
    /*//客服解绑通知
    $scope.cancelCustomerService = function (data,customerStatus) {
    	userService.openCancelCustomerServiceDialog(data,customerStatus);
    };*/
    
    //点击删除好友
    $scope.deleteMember = function(member,parentWin){
        deleteDialog = parentWin.nw.confirm({
            content: '将从对方的列表消失，不再接收此人的消息',
            ok: function (dialog) {
                var delFriend = userService.invoke('DeleteFriend',{userid:member.id});
            }
        });
    };
    
     //通知删除好友是否成功
	userService.onDeleteFriend($scope, function (data, error) {
	        if (error) {
	        	nw.alert({
		            content: error.message
		        });
		        
	        }else {
	        	$timeout(function(){
	        		var showid = $rootScope.indexOfSessionList(data.userid);
			        if(showid != -1) {
							 taxIM.DeleteChat(data.userid);
					            $rootScope.sessionList.splice($rootScope.indexOfSessionList(data.userid), 1); 
					            if ($rootScope.activeSession && data.userid == $rootScope.activeSession.id) {
					                delete $rootScope.activeSession;
					            }
						}
			        taxIM.ClearMessage(data.userid);
			        
			         if($rootScope.currentUser && $rootScope.currentUser.id ==data.userid){
			        	$rootScope.currentUser.isfriend = 0;
			        }
			         var userInf = JSON.parse(taxIM.GetUserInfo(data.userid)).value;
        			
        			isfriendCallback && isfriendCallback(userInf.isfriend);
	        	});
	        }
	        deleteDialog.close(true);
	});
    
    //弹出用户详情
    var detailWin;
    $rootScope.showUserInfo = function (userid, isgroup) {
        var userInf = JSON.parse(taxIM.GetUserInfo(userid)).value;
        $rootScope.currentUser.isfriend = userInf.isfriend;
        
        if (!detailWin) {
            detailWin = openWindow({
                width: 328,
                height: 432,
                max_width: 328,
                max_height: 432,
                url: 'dialogs/contactDetail.html',
                args: {
                	id: userInf.id,
                	name: userInf.name,
		            self: userid == $rootScope.currentUser.id,
		            selfName:"我是"+$rootScope.currentUser.name,
		            dept: userInf.dept,
		            tele: userInf.tele,
		            hid: userInf.hid,
		            active:userInf.active,
		            isfriend: userInf.isfriend,
		            openUpdatePwdDialog: $scope.updatePwd,
		            openChatWindow: function () {
		                $scope.openChatWindow(userInf, false);
		                if (detailWin) detailWin.close();
		            },
		            confirmLogout: $scope.confirmLogout,
		            addFriendDialog: $scope.addFriendDialog,
		            deleteMember: $scope.deleteMember,
                	isfriendCallback: function (fn) { 
	                    isfriendCallback = fn;
	                }
                }
            });

            detailWin.on('closed', function () {
                detailWin = null;
                isfriendCallback = null;
            });
        } else {
            detailWin.focus();
        }
    };



    var addGroup;
    $scope.addGroup = function () {

        if (!addGroup) {
            addGroup = openWindow({
                width: 620,
                height: 487,
                max_width: 620,
                max_height: 487,
                url: 'dialogs/addGroup.html',
                args: {
                    list: JSON.parse(taxIM.GetFriends()).value,
                    isSave: true,
                    onSave: function (values, groupname, parent) {
                        var ret = JSON.parse(taxIM.CreateGroup(groupname, values.join(',')));
                        if (ret.errcode) {
                            return nw.alert({parent:parent, content: ret.errmsg || '创建' + lang.group + '失败,请重试'});
                        }
                    },
                    oplist:function (searchText) {
                        var oplist = JSON.parse(taxIM.SearchContact(searchText)).value;
                        return oplist;

                    }
                }
            });

            addGroup.on('closed', function () {
                addGroup = null;
            });

        } else {
            addGroup.focus();
        }
    };

    userService.onCreateGroup($scope, function (data, error) {
        if (!addGroup) { //对话框已经关闭则不处理
            if ($scope.selectedIndex == 3) {
                $state.reload('groups');
            }

            return;
        }

        if (error) {
            return nw.alert({content: error.message || '创建群组失败,请重试'});
        }

        addGroup.close(true);
        addGroup = null;

        var obj = {id: data.id, time: data.time, name: data.name, type: 2, unread: 0, top: 0};
        $scope.selectedIndex = 1;
        $rootScope.activeSession = obj;
        $rootScope.sessionList.push(obj);

        //打开聊天界面
        $state.go('chatwindow', {id: obj.id});
    });
 	$scope.searchMember = function(obj){
        	var list = JSON.parse(taxIM.SearchContact(obj)).value;
        	return list;
        }
    //添加好友弹出
    var addFriends;
    $scope.addFriends = function () {

        if (!addFriends) {
            addFriends = openWindow({
                width: 300,
                height: 490,
                max_width: 300,
                max_height: 490,
                resize:false,
                fullscreen:false,
                url: 'dialogs/addFriends.html',
                args: {
                    list: JSON.parse(taxIM.GetFriends()).value,
                    searchMember: $scope.searchMember,
                    isSave: true,
                    currentUser:$rootScope.currentUser,
                    getUserInfo:function(userid) {
                    	return JSON.parse(taxIM.GetUserInfo(userid)).value;
                    },
                    onSave: function (userid, parentWin) {
                    	
                            var userInf = JSON.parse(taxIM.GetUserInfo(userid)).value;
                            $rootScope.currentUser.isfriend = userInf.isfriend;
                            
                            setTimeout(function(){
                            	
                            
                            if (!detailWin) {
                                detailWin = openWindow({
                                    width: 328,
                                    height: 432,
                                    max_width: 328,
                                    max_height: 432,
                                    parent:parentWin,
                                    url: 'contactDetail.html',
                                    args: {
                                        id:userInf.id,
                                        name: userInf.name,
                                        self: userid == $rootScope.currentUser.id,
                    		            selfName: "我是"+$rootScope.currentUser.name,
                                        dept: userInf.dept,
                                        tele: userInf.tele,
                                        hid: userInf.hid,
                                        active:userInf.active,
                                        isfriend:userInf.isfriend,
                                        openUpdatePwdDialog: $scope.updatePwd,
                                        addFriendDialog: $scope.addFriendDialog,
                                        deleteMember: $scope.deleteMember,
                                        openChatWindow: function () {
                                            $scope.openChatWindow(userInf, false);
                                            addFriends.close();
                                            if (detailWin) detailWin.close();
        
                                        },
                                        
                                        confirmLogout: $scope.confirmLogout,
                                        isfriendCallback: function (fn) { 
                                            isfriendCallback = fn;
                                        }
                                    }
                                        
                                });

                                detailWin.on('closed', function () {
                                    detailWin = null;
                                    isfriendCallback = null;
                                });
                            } else {
                                detailWin.focus();
                            }
                            
                            });
                        },
                       
                    oplist:function (searchText) {
                        var oplist = JSON.parse(taxIM.SearchContact(searchText)).value;
                        return oplist;

                    }

                }
            });

            addFriends.on('closed', function () {
                addFriends = null;
            });

        } else {
            addFriends.focus();
        }

    };

    //检查更新

    var checkUpdate;
    $scope.checkUpdate = function () {
        if (!checkUpdate) {

            checkUpdate = openWindow({
                width: 520,
                height: 400,
                max_width: 520,
                max_height: 400,
                url: 'dialogs/checkUpdate.html',
                args: {
                    getVersion: function () {
                        return JSON.parse(taxIM.GetVersion()).value;
                    },

                    checkVersion: function () {
                        return JSON.parse(taxIM.CheckVersion());
                    },
                    updateVersion: function () {
                        return taxIM.UpdateVersion();
                    }
                }

            });

            checkUpdate.on('closed', function () {
                checkUpdate = null;
            });
        } else {
            checkUpdate.focus();
        }
    };

    //关于

    var about;
    $scope.about = function () {

        if (!about) {

            about = openWindow({
                width: 520,
                height: 400,
                max_width: 520,
                max_height: 400,
                url: 'dialogs/about.html',
                args: JSON.parse(taxIM.GetVersion()).value

            });

            about.on('closed', function () {
                about = null;
            });
        } else {
            about.focus();
        }
    };

    //帮助中心
    var help;
    $scope.help = function () {
        if (!help) {
            help = openWindow({
                width: 520,
                height: 400,
                max_width: 520,
                max_height: 400,
                url: 'dialogs/help.html'

            });

            help.on('closed', function () {
                help = null;
            });
        } else {
            help.focus();
        }
    };

    //常见问题
    var question;
    $scope.question = function () {
        if (!question) {
            question = openWindow({
                width: 520,
                height: 400,
                max_width: 520,
                max_height: 400,
                url: 'dialogs/question.html'

            });

            question.on('closed', function () {
                question = null;
            });
        } else {
            question.focus();
        }
    };


    //默认选中第一个菜单
    $scope.selectedIndex = 1;

    //显示会话列表
    $scope.showSessionList = function () {
        if ($scope.selectedIndex == 1) return;
        if($rootScope.activeSession){
            tray.icon = path + '/img/tray-logo.png';
             var msgList = $rootScope.msgList;
             for(var i=0; i<msgList.length; i++){
                if(msgList[i].id == $rootScope.activeSession.id){
                    msgList.splice(i,1);
                    if(!msgList.length){
                         if ($rootScope.intervalFlag) {
                            clearInterval($rootScope.intervalFlag);
                            $rootScope.intervalFlag = null;
                         }
                    }
                }
             }
           
        }
        $state.go('sessionlist');
    };

    //显示联系人
    $scope.showContactsList = function () {
        if ($scope.selectedIndex == 2) return;
        setTimeout(function () {
            $state.go('contactslist');
        });

    };

    //显示群组
    $scope.showGroups = function () {
        if ($scope.selectedIndex == 3) return;
        $state.go('groups');
    };
    
    //显示客服
    $scope.showCustomers = function(){
    	if($rootScope.activeWXSession && $rootScope.activeWXSession.sessionid == '100001'){
    		$state.go('board');
    	}
    	else{
	    	if($scope.selectedIndex == 4) return;
	    	$rootScope.getCustomerSessionList();
	    	$state.go('customers');
    	}
    };

    $state.go('sessionlist');

    //为消息列表添加群通知
    userService.onGroupMessage($scope,function(data,error){
        var lastmsg;
        if (data.msgType == 1) {
            lastmsg = data.msg+data.name;
        }
        if (data.msgType == 2) {
            lastmsg = data.name + data.msg;
        };        
        var sessionGroupList = {
            id:2002,
            lastmsg:lastmsg,
            name:'群通知',
            time:data.time,
            top:0,
            type:5,
            count:1,
            hid:''
        }
        receiveMsg(sessionGroupList, error, false,lastmsg);
    })
    
     //通知删除好友是否成功
    userService.onFriendMessage($scope, function (data, error) {
            if (error) {
                nw.alert({
                    content: error.message
                });
                
            }else {
                if(data.msgType == 3){
                    var userInf = JSON.parse(taxIM.GetUserInfo(data.userid)).value;
                    $timeout(function(){
                    	var showid = $rootScope.indexOfSessionList(data.userid);
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
                    	 if ($rootScope.msgList) {
				            for (var i = 0; i < $rootScope.msgList.length; i++) {
				                if ($rootScope.msgList[i].id == data.userid) {
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
                    },1000);
                    isfriendCallback && isfriendCallback(userInf.isfriend);
                }
            }
        });
	
	//抢单消息通知
	userService.onGrabMessageNotify($scope, function(data, error) {
		if (error) {
			nw.alert({
				content: error.errmsg
			});
		}
		userService.openGrapOrderDialog(data);
	});
	userService.onServiceMessageCancel($scope, function(data, error) {
		if(error) {
			nw.alert({
				content: error.errmsg
			});
		}
	});

     //监听转单通知 
     var tyorjj;
    userService.onTransmitMessageNotify($scope, function (data, error) {
    	tyorjj = data;
        if (error) {
            return nw.alert({
                content: error.message
            });
            
        }
        var op = function (flag) {
        	sendDetailD.close();
        	userService.invoke('ResetIdleFlag',{});
        	var reqData = {
            	wxuserid:data.wxuserid,
            	sessionid:data.sessionId,
            	flag:flag,
            	fromid:data.fromid
           };
           
			 var sendTo = userService.invoke('AgreeTransmit', reqData);
		};
			
       var  sendDetailD = openWindow({
            width: 330,
            height: 313,
            max_width: 365,
            max_height: 370,
            url: 'dialogs/sendDetail.html',
            args:{
            	msg: data,
            	op: op
            }
        });
        sendDetailD.setAlwaysOnTop(true);  
    });
    
    
    //接受或者拒绝转来单子的结果
    userService.onAgreeTransmitResult($scope, function (data, error) {
        if (error) {
            return nw.alert({
                content: error.message,
                ok: function (dialog) {
                    dialog.close(true);
                    userService.invoke('ResetIdleFlag',{});
                    return;
                }
            });
            
        }
        win.show();
    	$rootScope.getCustomerSessionList(data.sessionid);
		$scope.selectedIndex = 4;
		$rootScope.activeWXSession.unread = 0;
		$rootScope.closeOperator = 1;//修改关闭对话框操作标识
                closeAllWindow();
		$state.go('customerChatWindow',{id:data.sessionid});
		$rootScope.tab.sessionActive = true;
		$rootScope.tab.sessionDisplay = false;
    });
        
}]);

