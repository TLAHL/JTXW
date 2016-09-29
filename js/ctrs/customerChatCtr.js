/**
 * Created by 吕雷建 on 2016/4/2.
 * 客服聊天界面Controller
 */

app.controller('customerChatCtr', ['$rootScope', '$scope', '$state', '$stateParams', '$timeout', 'requestServer', '$sce', '$filter', 'userService', 'lang',  function ($rootScope, $scope, $state, $stateParams, $timeout, requestServer, $sce, $filter, userService, lang) {
    var chatUser = $rootScope.activeWXSession; //当前聊天用户
    //if (!chatUser) return;
    $scope.isgroup = false;
    
    var id = $stateParams.id;
    
    registerReceiveSingleChat();
    
    /**
     * 接收消息处理
     * @param data 收到的数据
     * @param message 组装后的数据
     * @param chatType 会话类型 5-客服单人会话
     */
    function receiveMessage(data, message, chatType) {
        setLastMsg(message);
        $timeout(function () {
            $scope.messages.push(message);
            $scope.$apply();
        });

        if (message.type == 1) { //文本设置已阅读
            userService.invoke('SetMessageState', {chatid: data.sessionid, chattype: chatType, msgid: data.msgid, state: 6});
        }
    }

    var nowSong/*目前正在播放的音频*/, isUpdateState;

    //播放音频
    var media = nodefile.playSong({
        onplay: function (evt) {
            $timeout(function () {
                nowSong.playing = true;
            });
        },
        onerror:function(){
        	 $timeout(function () {
        	 	if(nowSong){
                	nowSong.playing = false;
               }
            });
        },
        onended: function (evt) {
            $timeout(function () {
                nowSong.playing = false;
            });
            if (isUpdateState) {
                isUpdateState = false;

                //回复已阅读
                userService.invoke('SetMessageState', {
                    chatid: id,
                    chattype: 5,
                    msgid: nowSong.msgid,
                    state: 6
                });
            }
        }
    });

    /**
     * 根据amr文件路径转换为wav文件
     * @param amrPath amr文件
     * @returns {string}
     */
    function getWavPath(amrPath) {
        var path = decodeURIComponent(amrPath); //解码文件url
        var amrIdx = path.toLowerCase().lastIndexOf('.amr');
        return amrIdx == -1 ? path : (path.substring(0, amrIdx) + '.wav');
    }

    //下载音频
    $scope.downloadAudioMediahistory = function (item) {
        if (nowSong && nowSong.playing) {
            nowSong.playing = false;
        }
        
        if(item.fileSign) {
	        nowSong = item;
	        return media.play(lang.apiUrl.substring(0, lang.apiUrl.length -1) + item.fileSign);
        }
    };
    
    
    $scope.downloadAudioMedia = function (item) {
        if (nowSong && nowSong.playing) {
            isUpdateState = false;
            nowSong.playing = false;
        }
        if (item.file) {
            var path = getWavPath(item.file);
            if (nodefile.isExists(path)) {
                nowSong = item;
                return media.play(path);
            }
        }

        //下载文件
        downloadFileHandler(item.msgid, null, true);
    };
    var fileAndVideoState = 0;
    //下载视频
    $scope.downloadFileAndVideo = function (item) {
        fileAndVideoState = 0;
        var path = decodeURIComponent(item.file); //解码文件url

        if(item.self &&　!nodefile.isExists(path)) {
            return nw.alert('文件不存在,不能打开');
        }

        if (item.file) {
            if (nodefile.isExists(path)) {
                if(item.type == 5){
                	return nodefile.playVideo(path);
                }
                else {
                	return nw.openFileByExternal(path);
                }
            }
        }

        //下载文件
        downloadFileHandler(item.msgid, null, true);
    };

 	//播放远程视频
    $scope.playRemoteVideo = function (item) {
        if (item.fileSign) {
        	var path = lang.apiUrl + (item.fileSign || '').replace(/^\//, '');
            return nodefile.playVideo(path);
        }
    };


    /**
     * 设置最后一条消息
     * @param lastmsg 消息的内容
     * @param time 时间
     */
    function setLastMsg(item) {
        if ($rootScope.activeWXSession) {
            var lastmsg = item.msg || item.lastmsg;
            if (!$scope.isgroup && item.flashsms && item.type == 1) {
                lastmsg = '[文本]';
            } else if (item.type && item.type != 1) {
                lastmsg = {
                    2: '[图片]',
                    3: '[语音]',
                    4: '[文件]',
                    5: '[视频]',
                    6: '[链接]'
                }[item.type];
            }
            
			if(item.state == 1){
            	item.sendfailed = 1;
            }else {
            	item.sendfailed = 0;
            }
            $timeout(function () {
                // 重置选中的会话信息
                $rootScope.activeWXSession.lastmsg = lastmsg;
                $rootScope.activeWXSession.time = item.time;
                $rootScope.activeWXSession.sendfailed = item.sendfailed;
            });
        }
    }

    /**
     * 是否需要接收消息
     * @param error 错误
     * @param chatId 会话Id
     * @returns {boolean}
     */
    function isReceive(error, chatId) {
        if (error || id != chatId) return false; //非选中人员的会话
        return true;
    }

    //监听到渲染完页面时滚动到最后一条数据
    $scope.$on('ngRepeatFinished', function (evt, index) {
        if ($scope.messages.length) {
            userService.scrollToBottom($scope.messages[index].msgid);
        }
    });

    /*预览图片的回调函数*/
    var isPreImage = false /*是否是预览图片*/, currentMessage, preImageCallback;
    
    //图片点击是事件
    $scope.imgClick = function (message) {
        var width = screen.availWidth, height = screen.availHeight;
        //获取图片信息,包含上一个,和当前的,下一个
        function getImage(item) {
            var method = 'GetWXImage';
            var imgObj = userService.invoke(method, {sessionid: id, msgid: item.msgid}).value;
            currentMessage = imgObj.current;
            return imgObj;
        }

        isPreImage = true;
        var dialog = openWindow({
            toolbar: false,
            width: width,
            height: height,
            min_width: width,
            min_height: height,

            url: 'dialogs/chatImgDialog.html',
            args: {
                message: getImage(message),
                preImageCallback: function (fn) { //获取图片的路径
                    preImageCallback = fn;
                },

                download: downloadFileHandler,

                //获取图片信息,包含上一个,和当前的,下一个
                getImage: getImage
            }
        });

        dialog.on('closed', function () {
            currentMessage = null;
            isPreImage = false;
            currentMessage = null;
            preImageCallback = null;
        });
    };
    
    //会话记录图片点击是事件
    $scope.imgHistoryClick = function (message) {
    	var width = screen.availWidth, height = screen.availHeight;
        var dialog = openWindow({
            toolbar: false,
            width: width,
            height: height,
            min_width: width,
            min_height: height,

            url: 'dialogs/chatImgHistoryDialog.html',
            args: {
                file:message
            }
        });

        dialog.on('closed', function () {
            currentMessage = null;
            isPreImage = false;
            currentMessage = null;
            preImageCallback = null;
        });
    };
    /**
     * 显示用户的详细信息
     * @param message
     */
    $scope.viewInf = function (message) {
        var userid;
        var selfid = $rootScope.currentUser.id;

        if ($scope.isgroup) {
            userid = message.self ? selfid : message.sendid;
        } else {
            userid = message.self ? selfid : $rootScope.activeWXSession.sessionid;
        }
        $rootScope.showUserInfo(userid, $scope.isgroup);
    };

    /**
     * 加载更多
     */
    $scope.loadMore = function () {
        //加载完成
        if ($scope.isLoadFinish) return;

        var list = $scope.messages || [];

        var time = (list[0] || {}).time || 0;
        var size = time ? 21 : 11;
		var userid = $rootScope.activeWXSession.wxuserid;
        var msgLIst = userService.invoke('GetWXChatMessage', {'sessionid':id, 'ts':time, 'count':size, 'userid':userid});
         msgLIst = msgLIst.value || [];
		//var msgLIst = [];

        if (!msgLIst.length) {
            $scope.messages = list;
            return $scope.isLoadFinish = true;
        }

        if (msgLIst.length != size) {
            $scope.isLoadFinish = true;
        } else {
            msgLIst.splice(0, 1);
            $scope.isLoadFinish = false;
        }
        $scope.messages = [].concat(msgLIst, list);
    };

    $scope.loadMore();

	/**
	 * 加载更多历史纪录
	 */
	
	$scope.isLoadFinishHistory = false;
	$scope.page = 1;
	$scope.loadMorehistory = function() {
		//加载完成
		if ($scope.isLoadFinishHistory) return;
        //存储已经存在的数据
        //请求新数据
		$scope.page += 1;
        if($scope.page < $scope.totalPage){ 
        	$scope.oldHistoryList = $scope.historyList || [];
		}
		
		if($scope.page < $scope.totalPage){ 
			ajaxForData(onLoadMoreHistorySucess);
			var raw = document.getElementById("historyArea");
			raw.scrollTop = 2*raw.clientHeight;
		} 
	};
	
	function onLoadMoreHistorySucess(){
		if($scope.isLoadFinishHistory) return;

        $timeout(function(){
            //存取获得数据新
            var msgLIst = $scope.historyList;
            msgLIst = msgLIst || [];
            //var msgLIst = [];

            if (msgLIst.length < 10) {
                alert($scope.page);
                //$scope.historyList = msgLIst;
                return $scope.isLoadFinishHistory = true;
            }
            $scope.historyList = [].concat(msgLIst, $scope.oldHistoryList);
        });
	}

	$scope.loadMorehistory();
	
	 /*
     * ajax 请求数据
     */
    function ajaxForData(onSucess, status){
    	var xhr = new XMLHttpRequest();
		var personId = $rootScope.activeWXSession.wxuserid;
		
		var rows = 10;
		xhr.onreadystatechange = callback;
		xhr.open("post", lang.apiUrl + "jxms/mobile/http/api.do", true);
		xhr.send('{"jsonrpc":"2.0","method":"queryHistoryChat","params":{"personId" : "' + personId + '","page" : "' + $scope.page + '","rows" : "' + rows + '","endTime" : "' + $scope.dataTimeHistory + '"}}');

	

		function callback() {
			//接收响应数据  
			//判断对象状态是否交互完成，如果为4则交互完成  
			if (xhr.readyState == 4) {
				//判断对象状态是否交互成功,如果成功则为200  
				if (xhr.status == 200) {
					//接收数据,得到服务器输出的纯文本数据  

					var response = xhr.responseText;

					var json = JSON.parse(response.toString());
					var flag = json.result.resultStatus;
					if (flag == 1) {
						$scope.totalPage = json.result.info.pageCount;
						var groups = json.result.info.data.reverse();
						$scope.historyList = groups;
						$scope.newHistoryList = groups;
						if(onSucess){
							onSucess();
						}
						$scope.$apply();
						if(status == 'init')
						{        
					        var raw = document.getElementById("historyArea");
					        raw.scrollTop = raw.scrollHeight - raw.clientHeight;
						}
					} else {
						nw.alert("获取数据失败!");
					}
				}
			}
		}
    }
    
    
    
    //获取会话聊天记录
    $scope.showRecordList = function () {
        $scope.record = true;
        $scope.isLoadFinishHistory = false;
    	$rootScope.bodyclick();
        $scope.down = false;
        event.stopPropagation();
           
        var myDate = new Date();
        $scope.dataTimeHistory = myDate.getTime();
        $scope.page = 1;
        ajaxForData(null, 'init');
    };

    //监听到渲染完页面时滚动到最后一条数据
    $scope.$on('onLoaded', function (evt, index) {
        if ($scope.messages.length) {
            userService.scrollToBottom($scope.messages[index].msgid);
        }
    });
    
    //结束会话结果
    userService.onCloseServiceChatResult($scope, function(data, error){
		if(error && error.code){
		    return nw.alert({content: error.message || '结束咨询失败！'});
		}
		if (!isReceive(error, data.sessionid)) return;

        $timeout(function(){
            var item = {
                msgid: data.msgid,
                msg: data.msg,
                time: data.time,
                state:0,
                self: 1,
                sendfailed:0,
                type: 99
            };
            $scope.messages.push(item);
            $rootScope.getCustomerSessionList(data.sessionid);
            $rootScope.tab.sessionActive = false;
            $rootScope.tab.sessionDisplay = true;
        });
	})
    
    //会话失效通知
    userService.onServiceChatClose($scope, function (data, error) {
        if(error)return;

        $timeout(function() {
            var length = data.length;
            for (var i = 0; i < length; i++) {
                var sessionid = $rootScope.activeWXSession.sessionid;
                if (sessionid == data[i].sessionid) {
                    var item = {
                        msgid: data[i].msgid,
                        msg: data[i].msg,
                        time: data[i].time,
                        state: 0,
                        self: 1,
                        sendfailed: 0,
                        type: 99
                    };
                    $scope.messages.push(item);
                    $rootScope.getCustomerSessionList(sessionid);
                    $rootScope.tab.sessionActive = false;
                    $rootScope.tab.sessionDisplay = true;
                    break;
                }
            }
        });

    });
    
    //会话失效通知
    userService.onServiceChatError($scope, function (data, error) {
        if (!isReceive(error, data.sessionid)) return;

        $timeout(function() {
            var item = {
                msgid: data.msgid,
                msg: data.msg,
                time: data.time,
                state: 0,
                self: 1,
                sendfailed: 0,
                type: 99
            };

            $scope.messages.push(item);
            $rootScope.getCustomerSessionList(data.sessionid);
            if($rootScope.activeWXSession.state == 1){
	            $rootScope.tab.sessionActive = false;
	            $rootScope.tab.sessionDisplay = true;
            }
        });
        
    });
    
     //注册客服离线消息通知 - 单人
    userService.onOfflineWXMessage($scope, function (data, error) {
    	if (error) return;
        for (var i = 0; i < data.length; i++) {
            if(data[i].chatType==5){
		
		        //判断当前消息是否在当前会话列表
		        if ($rootScope.activeWXSession && $rootScope.activeWXSession.sessionid == data[i].sendid) { //如果是当前正在聊天的用户,则不处理
			    	$rootScope.getCustomerSessionList(data[i].sendid);
			    	$rootScope.activeWXSession.unread = 0;
			    	var userid = $rootScope.activeWXSession.wxuserid;
			        var msgLIst = userService.invoke('GetWXChatMessage',{'sessionid':data[i].sendid, 'ts':0, 'count':11, 'userid':userid});
		            return;
		        }
            }
        }
    });
    
     var refreshOffline = false; //是否刷新离线消息
    //注册离线消息获取完成通知 - 单人、群组
    userService.onOfflineWXMessageIDOK($scope, function (data, error) {
        if (!isReceive(error, data.sessionid)) return;
        refreshOffline = true;

        $timeout(function () {
            $scope.messages = $scope.messages || [];
            $scope.messages.splice(0, $scope.messages.length);//清空所有记录

            var size = 11; //取未读10条消息
			var userid = $rootScope.activeWXSession.wxuserid;
            var msgLIst = userService.invoke('GetWXChatMessage',{'sessionid':id, 'ts':0, 'count':size, 'userid':userid});
            var msgLIst = msgLIst.value;

            if (msgLIst.length != size) {
                $scope.isLoadFinish = true;
            } else {
                msgLIst.splice(0, 1);
                $scope.isLoadFinish = false;
            }

            $scope.messages = [].concat(msgLIst);

        });
    });

    function processOfflineMessage(data, error) {
        if (!isReceive(error, data.sessionid) || !data.info || !data.info.length) return;
        var list = data.info;
        refreshOffline = false;

        $timeout(function () {
            var msgs = $scope.messages, item;

            for (var i = 0; i < list.length; i++) {
                for (var j = 0; j < msgs.length; j++) {
                    if (list[i].msgid == msgs[j].msgid) {
                        item = msgs[j] = list[i];

                        if (!item.flashsms && item.type == 1) { //文本设置已阅读
                            userService.invoke('SetMessageState', {
                                chatid: id,
                                chattype: 5,
                                msgid: item.msgid,
                                state: 6
                            });
                        }

                        break;
                    }
                }
            }
        });
    }
    
    //注册离线消息内容获取完成通知 - 单人
    userService.onOfflineWXMessageOK($scope, processOfflineMessage);

    /**
     * 注册单人消息事件
     */
    function registerReceiveSingleChat() {
        //处理单人会话-文本消息
        userService.onReceiveWXTextMessage($scope, function (data, error) {
            if (!isReceive(error, data.sessionid)) return;
            var message = {
                msgid: data.msgid,
                msg: data.msg,
                flashsms: data.flashsms,
                time: data.time,
                self: 0,
                type: 1
            };
            
            receiveMessage(data, message, 5);
        });

        //处理单人会话-接收图片消息
        userService.onReceiveWXPicMessage($scope, function (data, error) {
            if (!isReceive(error, data.sessionid)) return;
            var message = {
                msgid: data.msgid,
                minimap: data.minimap,
                flashsms: data.flashsms,
                filename: data.filename,
                time: data.time,
                self: 0,
                type: 2
            };

            receiveMessage(data, message, 5);
        });

		//音频展示长度
		$scope.getVoiceLength = function(vtime){
			return  (vtime*2 + 60) + 'px';
		};
		
        //接收语音消息
        userService.onReceiveWXSoundMessage($scope, function (data, error) {
            if (!isReceive(error, data.sessionid)) return;
            var message = {
                msgid: data.msgid,
                file: data.file, //文件路径
                flashsms: data.flashsms,
                time: data.time,
                vtime: data.vtime,
                state: 0,
                self: 0,
                type: 3
            };
            
            receiveMessage(data, message, 5);
        });

        //接收视频消息
        userService.onReceiveWXVideoMessage($scope, function (data, error) {
            if (!isReceive(error, data.sessionid)) return;
            var message = {
                msgid: data.msgid,
                minimap: data.minimap, //缩略图
                filename: data.filename, //文件名称
                file: data.file, //文件路径
                size: data.size, //文件大小
                flashsms: 0,
                vtime: data.vtime,
                time: data.time,
                self: 0,
                type: 5
            };

            receiveMessage(data, message, 5);
        });

        //接收链接消息
        userService.onReceiveWXUrlFile($scope, function (data, error) {
            if (!isReceive(error, data.sessionid)) return;

            var message = {
                msgid: data.msgid,
                title: data.title, //标题
                minimap: data.minimap, //缩略图
                intro: data.intro, //摘要
                flashsms: 0,
                url: data.url,
                time: data.time,
                self: 0,
                type: 6
            };

            receiveMessage(data, message, 5);
        });
    }

    //消息的状状态更新
    userService.onSendMessageState($scope, function (data, error) {
        if (!isReceive(error, data.id)) return;
        var idx = userService.getMsgInf(data.msgid).index;
        
        if (isPreImage && currentMessage.msgid == data.msgid && !currentMessage.self) { //预览图片
            if (isNaN(idx = parseInt(idx))) { //不在会话记录中
                if (currentMessage.state != 4) {

                    //回复已阅读
                    userService.invoke('SetMessageState', {
                        chatid: id,
                        chattype: 5,
                        msgid: data.msgid,
                        state: 6
                    });
                }
            }
            preImageCallback(data.state, data.file, id == $rootScope.currentUser.id);
        }

        if (!isNaN(idx = parseInt(idx))) {
            var item = $scope.messages[idx];
            var oldState = item.state;
            $timeout(function () {
                if (!(item.self && oldState == 4)) {
                    item.state = data.state;
                }
                if(data.state == 1){
            		$rootScope.activeWXSession.sendfailed = 1;
	            }else {
	            	$rootScope.activeWXSession.sendfailed = 0;
	            }
	            
                if (data.file) item.file = data.file; //如果是文件,则通知文件路径
                if (data.filename) item.filename = data.filename; //如果是文件,则通知文件路径
            });

            if (!data.file) {
                return;
            }

            if (item.type == 2) { //图片已下载
                if (oldState != 4) {
                	
                    //回复已阅读
                    userService.invoke('SetMessageState', {
                        chatid: id,
                        chattype: 5,
                        msgid: data.msgid,
                        state: 6
                    });
                }
                return;
            }

            if (item.type == 3) { //语音已下载
                if (oldState != 4) {
                    isUpdateState = true;
                }

                var path = getWavPath(data.file);
                if (nodefile.isExists(path)) {
                    nowSong = item;
                    return media.play(path);
                }
                return;
            }

            if (item.type == 4) { //文件已下载
                if (oldState != 4) {
                    //回复已阅读
                    userService.invoke('SetMessageState', {
                        chatid: id,
                        chattype: 5,
                        msgid: data.msgid,
                        state: 6
                    });
                }
                if (fileAndVideoState == 0) {
                    return nw.openFileByExternal(decodeURIComponent(data.file));
                }
            }

            if (item.type == 5) { //视频已阅读
                if (oldState != 4) {
                    userService.invoke('SetMessageState', {
                        chatid: id,
                        chattype: 5,
                        msgid: data.msgid,
                        state: 6
                    });
                }
                if (fileAndVideoState == 0) {
                    return nodefile.playVideo(decodeURIComponent(data.file));
                }
            }
        }
    });

    //文件上传进度通知
    userService.onUploadProgress($scope, function (data, error) {
        if (!isReceive(error, data.chatId)) return;

        var idx = userService.getMsgInf(data.msgId).index;
        if (!isNaN(idx = parseInt(idx))) {
            $timeout(function () {
                $scope.messages[idx].process = data.value;
            });
        }
    });

    //输入框信息
    $scope.input = {
    };

    //用默认浏览器打开url
    $scope.openUrl = function (item) {
        item.url && nw.openUrl($filter('decodeURI')(item.url));
        if (item.state != 6) {
            userService.invoke('SetMessageState', {chatid: id, chattype: 5, msgid: item.msgid, state: 6});
        }
    };

    $scope.overMax = false;
    $scope.writerCount = 0;
    $scope.editorAfterChange = function (editor) {
        var size = editor.count("text");
        if (size > 2048) {
            var strValue = editor.text();
            strValue = strValue.substring(0, 2048);
            editor.text(strValue);
            // size = 2048;
        } else {
            $scope.overMax = false;
            $scope.editorStyle = null;
        }
        $scope.writerCount = size;

        if (!size) { //清空时获取焦点
            editor.focus();
        }
    };
    
    $scope.activateChat = function(){
    	var ret = userService.invoke('Callback', {'sessionid':$rootScope.activeWXSession.sessionid, 'userid':$rootScope.activeWXSession.wxuserid});
    	if (ret.errcode) {
        	return nw.alert({content: ret.errmsg || '发起回访失败！'});
        }
    }  
    
    userService.onSetCallbackStateResult($scope, function (data, error) {
        if (error) {
        	return nw.alert({content: error.message || '设置回访状态失败！'});
        }
        console.log(data);
         $rootScope.getCustomerSessionList(data.sessionid);
         $rootScope.tab.sessionActive = true;
         $rootScope.tab.sessionDisplay = false;
         $scope.$apply();
    });
    
    userService.onCallbackResult($scope, function (data, error) {
        if (error) {
        	return nw.alert({content: error.message || '纳税人正在与客服咨询中，请稍后发起回访'});
        }
        if (!isReceive(error, data.sessionid)) return;

        $timeout(function() {
            var item = {
                msgid: data.msgid,
                msg: data.msg,
                time: data.time,
                state: 0,
                self: 1,
                sendfailed: 0,
                type: 99
            };

            $scope.messages.push(item);
            $rootScope.getCustomerSessionList(data.sessionid);
            $rootScope.tab.sessionActive = true;
            $rootScope.tab.sessionDisplay = false;
        });
        
    });

    //发送文本消息
    $scope.postMessage = function (msg) {
        //表情转化成文字
        var inputValue;
        if(msg) {
            inputValue =  msg;
        } else if (!$scope.input.text || $scope.overMax){
            return;
        } else {
            inputValue = $scope.input.text;
        }
        inputValue = inputValue.replace(/<img src="file:\/\/[\w\S]+plugins\/emoticons\/imgs\/(emoji_\d{3}).png" border="0" alt="" \/>/gi, '[$1]');
        
        var param = {
            sessionid: chatUser.sessionid,
            msg: inputValue,
            userid:chatUser.wxuserid
        };
        var ret = userService.invoke('SendWXTextMessage', param);

        $timeout(function() {
            var item = {
                msgid: ret.value.guid,
                type: 1,
                msg: inputValue,
                time: ret.value.time,
                self: true,
                state: 0,
                sendname: $rootScope.currentUser.name,
                hid: $rootScope.currentUser.hid
            };
            if (ret.errcode) {
                item.state = 1;
            }
            $scope.messages.push(item);
            //重置选中的会话信息
            setLastMsg(item);
            $scope.input.text = '';
        });
    };

    //发送图片消息
    $scope.postImageMessage = function (obj) {
        var files = obj.imageFile;
        if (!files.length) return;
        if (files.length > 10) { //检查选择的文件个数
            files.clear();
            return nw.alert({
                content: '最多可以选择10张图片,请重新选择'
            });
        }

        for (var i = 0; i < files.length; i++) { //检查每个文件不能大小10M
    		 if (!/\.(gif|jpeg|jpg|bmp|png)$/i.test(files[i].path)) { //图片格式
                files.clear();
                return nw.alert({
                    content: '图片只支持GIF、JPEG、BMP、PNG格式,请重新选择'
                });
            }         

            if (files[i].size > 1024 * 10240) { //10M
                files.clear();
                return nw.alert({
                    content: '单张图片最大不能超过10M,请重新选择'
                });
            }
        }

        var idx = 0;//当前处理的文件索引
        var validataImg = function () {
            if (idx >= files.length) return;

            var path = files[idx].path;
            var img = new Image();
            img.src = path;

            img.onload = function () {
                idx++;
                if (idx < files.length) {
                    return validataImg();
                }

                //开始上传文件

                var ret, item;
                for (var i = 0; i < files.length; i++) {
                    var param = {
                    	userid:chatUser.wxuserid,
                        sessionid: chatUser.sessionid,
                        img: files[i].path //图片路径
                    };

                    ret = userService.invoke('SendWXPicMessage', param);
                    //组装发送图片消息
                    item = {
                        minimap: ret.value.minimap, //缩略图
                        filename: files[i].name, //文件名
                        file: files[i].path, //文件本地路径
                        time: ret.value.time,
                        msgid: ret.value.guid,
                        type: 2,
                        self: true,
                        state: 3,
                        hid: $rootScope.currentUser.hid
                    };

                    if (ret.errcode) { //有错误,则设置状态为 发送失败
                        item.state = 1;
                    }
                    $scope.messages.push(item);
                }//循环结束

                //重置选中的会话信息
                setLastMsg(item);

                $scope.$apply();
                files.clear();//清空
            };

            img.onerror = function () {
                var name = files[idx].name;
                files.clear();//清空
                return nw.alert({
                    content: '选择的图片[' + name + ']已损坏,请重新选择'
                });
            };
        };
        validataImg();
    };

    /**
     * 另存为已有文件文件, 目标路径由用户选择
     * @param filename 默认文件名称
     * @param path 资源文件路径
     * @returns {*}
     */
    var saveAsFile = function (filename, srcPath) {
        if (!nodefile.isExists(srcPath)) {
            return nw.alert({content: '该文件已被删除，保存失败'});
        }

        //打开对话框
        return nw.openSaveAsDialog(filename || '未命名', function (path) {
            nodefile.copyFile(srcPath, path, function (err) {
                if (err) {
                    return nw.alert({content: '保存文件失败,文件被损坏'});
                }
            });
        });
    };

    /**
     * 下载文件处理
     * @param msgid 消息id
     * @param path 下载到指定的路径
     * @param isShowProcess 是否显示进度条
     * @returns 成功返回true,有错误返回false
     */
    function downloadFileHandler(msgid, path, isShowProcess) {
        var method = 'DownloadWXFile';

        var ret = userService.invoke(method, {sessionid: id, msgid: msgid, file: path});
        if (ret.errcode) {
            nw.alert({content: ret.errmsg});
            return false;
        }

        if (isShowProcess) { //显示进度条
            var idx = userService.getMsgInf(msgid).index;
            if (!isNaN(idx = parseInt(idx))) {
                $timeout(function () {
                    $scope.messages[idx].state = $scope.messages[idx].self ? 3 : 2;
                });
            }
        }

        return true;
    }

    //右键菜单下载文件
    function downloadFile($itemScope) {
        fileAndVideoState = 1;
        var filename = $itemScope.message.filename || '未命名';
        if ($itemScope.message.self) {
            return saveAsFile(filename, $itemScope.message.file);
        }

        var msgid = $itemScope.message.msgid;

        nw.openSaveAsDialog(filename, function (path) {
            downloadFileHandler(msgid, path, true);
        });
    }

    $scope.reSendMessage = function (item){
        var msgid = item.msgid;
        userService.invoke('ReSendWXMessage', {sessionid: id, msgid: msgid});   
    }

    $scope.getContextMenu = function (item) {

        if (item.state == 1 && item.self) {//发送失败
            return [].concat([
                ['重发', function ($itemScope) {
                    var msgid = $itemScope.message.msgid;
                    var ret = userService.invoke('ReSendWXMessage', {sessionid: id, msgid: msgid});
                }]
            ]);
        }

        if (item.type == 1) {//文本
            return [].concat([
                ['复制', function ($itemScope) {
                    clipboard.setText($itemScope.message.msg);
                }],
            ]);
        }

        if (item.type == 2 || item.type == 4 || item.type == 5) {//图片,文件,视频
                return [].concat([
                    ['保存', downloadFile],
                ]);
            
        }

    };
    
    $scope.closeCustomerSesscion = function(item){
		var closeCustomerSessionDialog = nw.confirm({
            title: '关闭咨询',
            content: '是否要结束当前咨询？',
            ok: function (dialog) { //确定按钮
            	dialog.close();
		        var data = userService.invoke('CloseServiceChat', {sessionid: item.sessionid, userid: item.wxuserid});
		        if (data.errcode) {
				        return nw.alert({content: data.errmsg || '结束咨询失败！'});
				}
            }
        });
    }

    /**
     * 点击body页面
     */
    $rootScope.bodyClick = function () {
        //event.stopPropagation();
        $scope.down = false;
        $scope.record = false;
        $scope.words = false;//常用语知识库
        $scope.knowledge = false;
    }
    $scope.infoClick = function () {
        event.stopPropagation();
    }
    $scope.recordClick = function () {
        event.stopPropagation();
    }

    /**
     * 点击箭头按钮
     */
    $scope.downClick = function () {
    	$rootScope.bodyclick();
        $scope.record = false;
        event.stopPropagation();
        if (!$scope.isgroup) return;

        $scope.down = !$scope.down;

        if (angular.isUndefined($scope.mygroup)) {
            $scope.mygroup = (JSON.parse(taxIM.GetGroupInfo(id)).value || {}).mygroup;
        }

        if (!$scope.memberList) {
            $scope.memberList = userService.invoke('GetGroupMembers', {groupid: id}).value || [];
        }
    };
    
   
    
    //设置回访
    $scope.setVisit = function(){
    	var sessionid = $rootScope.activeWXSession.sessionid
    	var userid = $rootScope.activeWXSession.wxuserid;
    	nw.confirm({ title:'设为待回访',
        			 content:'设为待回访后，请在47小时内回访',
        			 ok:function(dialog){
        			 	dialog.close();
    					var ret = userService.invoke("SetCallbackState", {'sessionid':sessionid, 'userid':userid});
				    	if(ret.errcode) {
				        	return nw.alert({content: ret.errmsg || '设置回访状态失败！'});
				        }
        			 }
        		});
    }

    /**
     * 添加快捷键CTRT+ENTER键
     * @param edit
     */
    function onCtrlEnter(edit) {
        var settings = JSON.parse(taxIM.LoadSystemSetting());

        if (settings.value.send == 1) {
            var msg = edit.text();
            if (msg) {
                $scope.postMessage(msg);
            } else {
                edit.html('');
            }

        } else {
            edit.insertHtml('<br/><br/>');
        }
        return false;
    }

    $scope.onCtrlEnter = onCtrlEnter;

    //回车
    $scope.onEnter = function (edit) {
        var settings = JSON.parse(taxIM.LoadSystemSetting());

        if (settings.value.send == 0) {
            var msg = edit.text();
            if (msg) {
                $scope.postMessage(msg);
            } else {
                edit.html('');
            }
        } 
        return false;
    };

    $scope.sendFocus = function(){
        var loadSystemSetting = JSON.parse(taxIM.LoadSystemSetting()).value;
        if(loadSystemSetting.send == 0){
        	$scope.enterSend = "Enter";
        	$scope.ctrlsend = "Ctrl+Enter";
        }else{
        	$scope.enterSend = "Ctrl+Enter";
        	$scope.ctrlsend = "Enter";
        }
        $scope.sendTitle = "按" + $scope.enterSend +"键发送消息，按" + $scope.ctrlsend + "键换行";
    }
    
    //常用语
    $scope.usefulWordsShow = function(){
    	event.stopPropagation();

        if(!$scope.words) {
            requestServer.post('queryShortCutsLanguage')
                .then(function (data) {
                    $rootScope.bodyclick();
                    $scope.down = false;
                    $scope.userfulmsg = data.info;
                    $scope.words = true;
                });
        } else {
            $scope.words = false;
        }
    };

    //知识库
    $scope.knowledgeShow = function(){
        event.stopPropagation();

        $scope.currentItem = null;

        if(!$scope.knowledge) {
            requestServer.post('queryKnowledgeByClass', {classId:'1'})
                .then(function (data) {
                    $rootScope.bodyclick();
                    $scope.down = false;
                    $scope.knowledges = data.info;
                    $scope.knowledge = true;
                });
        } else {
            $scope.knowledge = false;
        }
    };
	
    $scope.showContent = function(item){
    	event.stopPropagation();
        $scope.currentItem = item;
    };

    //点击转单事件
    var sendOrderD;
    $scope.sendOrder = function () {
        //获取群组成员
        requestServer.post('queryGroupAndMember', {personId: $rootScope.currentUser.id})
            .then(function (result, status) {
                if (result.resultStatus != 1) {
                    return nw.alert({content: "获取数据失败!"});
                }

                sendOrderD = openWindow({
                    width: 400,
                    height: 490,
                    max_width:400,
                    max_height:490,
                    url: 'dialogs/sendOrder.html',
                    args: {
                        groups: result.info,
                        sendfor: sendfor
                    }
                });
            });
    }
    
    //点击转单对象事件
    var descContents;
    function sendfor(obj,groupname){
    	sendOrderD.close();
    	var content = null;
    	var toId;
    	var toType;
    	if(!groupname){
    		content = obj.groupName;
    		toId = obj.groupId;
    		toType =0;
    	}else {
    		content = groupname.groupName + obj.name;
    		toId = obj.person_id;
    		toType = 1;
    	}

		var sendDialog = openWindow({
            width: 400,
            height: 250,
            url: 'dialogs/orderInput.html',
            args: {
                title: "转出",
	            content: content,
	            
	            ok: function (dialog, value) { //确定按钮
	            	sendDialog.close();
	            	var descContents = value || "空";
	                var sendTo = userService.invoke('Transmit',{
	                	sessionid:$rootScope.activeWXSession.sessionid,
	                	userid:$rootScope.activeWXSession.wxuserid,
	                	toid:toId,
	                	desc:descContents,
	                	type:toType
	                });
	            }
            }
        });
    	 
    }
    
    userService.onTransmitResult($scope, function (data, error) {
	        if (error) {
	        	nw.alert({
		            content: '错误信息:'+error.message,
		            ok: function (dialog) {
		                dialog.close(true);
		                return;
		            }
		        });
		        
	        }else {
	        	if (!isReceive(error, data.sessionid)) return;
		        var item = {
		            msgid: data.msgid,
		            msg: data.msg,
		            time: data.time,
		            state:0,
		            self: 1,
		            sendfailed:0,
		            type: 99
		        };
		        $scope.messages.push(item);
		        $rootScope.getCustomerSessionList(data.sessionid);
		        $rootScope.tab.sessionActive = false;
		        $rootScope.tab.sessionDisplay = true;
		        $scope.$apply();
	        	
	        }
	});
    
}]);
function loadImage (img){
	if(img.width >= img.height) {
		img.style.height = '100px';
	}
	
	if(img.height >= img.width) {
		img.style.width = '100px';
	}
}