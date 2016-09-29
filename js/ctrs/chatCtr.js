/**
 * Created by 马德成 on 2016/2/26.
 * 聊天界面Controller
 */

app.controller('chatCtr', ['$rootScope', '$scope', '$state', '$stateParams', '$timeout', '$http', 'requestServer', '$sce', '$filter', 'userService', function ($rootScope, $scope, $state, $stateParams, $timeout, $http, requestServer, $sce, $filter, userService) {
    var chatUser = $rootScope.activeSession; //当前聊天用户
    if (!chatUser) return;
    
    //是否是群组
    $scope.isgroup = chatUser.type == 2;
    var id = $stateParams.id;
    $scope.isgroup ? registerReceiveGroupChat() : registerReceiveSingleChat(); //注册处理消息
    $scope.downStyle = $scope.isgroup && {'cursor': 'pointer'};
    var member= userService.invoke('GetGroupMembers', {groupid: id}).value || [];
    $scope.memberNum = member.length;
    /**
     * 接收消息处理
     * @param data 收到的数据
     * @param message 组装后的数据
     * @param chatType 会话类型 1-单人会话 2-群组会话
     */
    function receiveMessage(data, message, chatType) {
        if (id != data.id) return;

        setLastMsg(message);
        $timeout(function () {
            $scope.messages.push(message);
        });

        if (!data.flashsms && message.type == 1) { //文本设置已阅读
            userService.invoke('SetMessageState', {chatid: data.id, chattype: chatType, msgid: data.msgid, state: 6});
        }
    }

    //接收闪信文本
    $scope.textClick = function (msg) {
        //回复已阅读
        userService.invoke('SetMessageState', {
            chatid: id,
            chattype: $scope.isgroup ? 2 : 1,
            msgid: msg.msgid,
            state: 6
        });
        
        msg.state = 6;
        userService.invoke('FlashTiming', {chatid: id, msgid: msg.msgid});
    };

    var nowSong/*目前正在播放的音频*/;

    //播放音频
    var media = nodefile.playSong({
        onplay: function (evt) {
            $timeout(function () {
                nowSong.playing = true;
            });
        },
        onended: function (evt) {
            $timeout(function () {
                nowSong.playing = false;
            });

            if (nowSong.flashsms) { //闪信开始记时
                userService.invoke('FlashTiming', {chatid: id, msgid: nowSong.msgid});
            }

            //回复已阅读
            userService.invoke('SetMessageState', {
                chatid: id,
                chattype: $scope.isgroup ? 2 : 1,
                msgid: nowSong.msgid,
                state: 6
            });
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
    $scope.downloadAudioMedia = function (item) {
        if (nowSong && nowSong.playing) {
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
                return nw.openFileByExternal(path);
            }
        }

        //下载文件
        downloadFileHandler(item.msgid, null, true);
    };

    /**
     * 设置最后一条消息
     * @param lastmsg 消息的内容
     * @param time 时间
     */
    function setLastMsg(item) {
        if ($rootScope.activeSession) {
            var lastmsg = item.msg || item.lastmsg;

            if(item.type != 99) {
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
                } else if($scope.isgroup && item.sendname){
                    lastmsg = item.sendname+" : "+item.msg;
                }

                if(item.state == 1){
                    item.sendfailed = 1;
                }else {
                    item.sendfailed = 0;
                }
            }

            $timeout(function () {
                // 重置选中的会话信息
                $rootScope.activeSession.lastmsg = lastmsg;
                $rootScope.activeSession.time = item.time;
                $rootScope.activeSession.sendfailed = item.sendfailed;
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
            var method = $scope.isgroup ? 'GetGroupImage' : 'GetImage';
            var imgObj = userService.invoke(method, {chatid: id, msgid: item.msgid}).value;
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


        /*dialog.on('blur', function(){
         dialog.close();
         });*/
    };

    /**
     * 显示用户的详细信息
     * @param message
     */
    $scope.viewInf = function (message) {
        var id;
        var selfid = $rootScope.currentUser.id;

        if ($scope.isgroup) {
            id = message.self ? selfid : message.sendid;
        } else {
            id = message.self ? selfid : $rootScope.activeSession.id;
        }

        $rootScope.showUserInfo(id, $scope.isgroup);
    };

    /**
     * 加载更多
     */
    $scope.loadMore = function () {
        //加载完成
        if ($scope.isLoadFinish || refreshOffline) return;

        var list = $scope.messages || [];

        var time = (list[0] || {}).time || 0;
        var size = time ? 21 : 11;

        var msgLIst = $scope.isgroup ? taxIM.GetGroupMessage(id, time, size) : taxIM.GetChatMessage(id, time, size);
        msgLIst = JSON.parse(msgLIst).value || [];

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

    //监听到渲染完页面时滚动到最后一条数据
    $scope.$on('onLoaded', function (evt, index) {
        if ($scope.messages.length) {
            userService.scrollToBottom($scope.messages[index].msgid);
        }
    });

	//音频展示长度
	$scope.getVoiceLength = function(vtime){
		return  (vtime*2 + 60) + 'px';
	};

    /**
     * 注册单人消息事件
     */
    function registerReceiveSingleChat() {
        //处理单人会话-文本消息
        userService.onReceiveTextMessage($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                msgid: data.msgid,
                msg: data.msg,
                flashsms: data.flashsms,
                time: data.time,
                self: 0,
                type: 1
            };
            receiveMessage(data, message, 1);
        });

        //处理单人会话-接收图片消息
        userService.onReceivePicMessage($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                msgid: data.msgid,
                minimap: data.minimap,
                flashsms: data.flashsms,
                filename: data.filename,
                time: data.time,
                self: 0,
                type: 2
            };

            receiveMessage(data, message, 1);
            $scope.getRecordImage();
        });

        //接收语音消息
        userService.onReceiveSoundMessage($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
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
            receiveMessage(data, message, 1);
        });

        //接收文件消息
        userService.onReceiveFileMessage($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                msgid: data.msgid,
                hid: chatUser.hid,
                filename: data.filename, //文件名称
                file: data.file, //文件路径
                size: data.size, //文件大小
                flashsms: 0,
                time: data.time,
                self: 0,
                type: 4
            };

            receiveMessage(data, message, 1);
            $scope.getRecordFile();
        });

        //接收视频消息
        userService.onReceiveVideoMessage($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
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

            receiveMessage(data, message, 1);
        });

        //接收链接消息
        userService.onReceiveUrlFile($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;

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

            receiveMessage(data, message, 1);
        });
    }

    var refreshOffline = false; //是否刷新离线消息
    //注册离线消息获取完成通知 - 单人、群组
    userService.onOfflineMessageIDOK($scope, function (data, error) {
        if (!isReceive(error, data.chatId)) return;
        refreshOffline = true;

        $timeout(function () {
            $scope.messages = $scope.messages || [];
            $scope.messages.splice(0, $scope.messages.length);//清空所有记录

            var size = 11; //取未读10条消息

            var msgLIst = $scope.isgroup ? taxIM.GetGroupMessage(id, 0, size) : taxIM.GetChatMessage(id, 0, size);
            var msgLIst = JSON.parse(msgLIst).value;

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
        if (!isReceive(error, data.chatId) || !data.info || !data.info.length) return;
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
                                chattype: $scope.isgroup ? 2 : 1,
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
    userService.onOfflineMessageOK($scope, processOfflineMessage);
    //注册离线消息内容获取完成通知 - 群组
    userService.onOfflineGroupMessageOK($scope, processOfflineMessage);
    
    /**
     * 注册群组消息事件
     */
    function registerReceiveGroupChat() {
        //处理群组会话-文本消息
        userService.onReceiveGroupText($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                hid: data.hid,
                sendid: data.sendid,
                sendname: data.sendname,
                msgid: data.msgid,
                msg: data.msg,
                time: data.time,
                self: 0,
                type: 1
            };

            receiveMessage(data, message, 2);
        });

        //处理群组会话-接收图片消息
        userService.onReceiveGroupPic($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                hid: data.hid,
                sendid: data.sendid,
                sendname: data.sendname,
                filename: data.filename,//文件名称
                msgid: data.msgid,
                minimap: data.minimap,
                time: data.time,
                size: data.size, //文件大小
                self: 0,
                type: 2
            };

            receiveMessage(data, message, 2);
            $scope.getRecordImage();
        });

        //接收语音消息
        userService.onReceiveGroupSound($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                hid: data.hid,
                sendid: data.sendid,
                sendname: data.sendname,
                msgid: data.msgid,
                file: data.file, //文件路径
                time: data.time,
                vtime: data.vtime, //语音时长
                state: 0,
                self: 0,
                type: 3
            };

            receiveMessage(data, message, 2);
        });

        //接收文件消息
        userService.onReceiveGroupFile($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                hid: data.hid,
                sendid: data.sendid,
                sendname: data.sendname,
                msgid: data.msgid,
                filename: data.filename, //文件名称
                file: data.file, //文件路径
                size: data.size, //文件大小
                time: data.time,
                self: 0,
                type: 4
            };

            receiveMessage(data, message, 2);
            $scope.getRecordFile();
        });

        //接收视频消息
        userService.onReceiveGroupVideo($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                hid: data.hid,
                sendid: data.sendid,
                sendname: data.sendname,
                msgid: data.msgid,
                minimap: data.minimap, //第一帧缩略图
                filename: data.filename, //文件名称
                file: data.file, //文件路径
                size: data.size, //文件大小
                flashsms: 0,
                vtime: data.vtime, //视频时长
                time: data.time,
                self: 0,
                type: 5
            };

            receiveMessage(data, message, 2);
        });

        //接收链接消息
        userService.onReceiveGroupURL($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;

            var message = {
                hid: data.hid,
                sendid: data.sendid,
                sendname: data.sendname,
                msgid: data.msgid,
                title: data.title, //标题
                url: data.url, //链接地址
                minimap: data.minimap, //缩略图
                intro: data.intro, //摘要
                time: data.time,
                self: 0,
                type: 6
            };

            receiveMessage(data, message, 2);
        });

        //群提示信息通知
        userService.onGroupNotify($scope, function (data, error) {
            if (!isReceive(error, data.id)) return;
            var message = {
                msgid: data.msgid,
                time: data.time,
                msg:data.msg,
                type: 99
            };

            receiveMessage(data, message, 2);
        });
    }

    //消息的状状态更新
    userService.onSendMessageState($scope, function (data, error) {
        if (!isReceive(error, data.id)) return;
        if(Object.keys(forwardMap).length) {return}//如果是转发,返回
        var idx = userService.getMsgInf(data.msgid).index;

        if (isPreImage && currentMessage.msgid == data.msgid && !currentMessage.self) { //预览图片
            if (isNaN(idx = parseInt(idx))) { //不在会话记录中
                if (currentMessage.state != 4) {
                    if (currentMessage.flashsms) { //闪信开始记时
                        userService.invoke('FlashTiming', {chatid: id, msgid: data.msgid});
                    }

                    //回复已阅读
                    userService.invoke('SetMessageState', {
                        chatid: id,
                        chattype: $scope.isgroup ? 2 : 1,
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
                if(data.state == 1 && $rootScope.activeSession){
            		$rootScope.activeSession.sendfailed = 1;
	            }else {
	            	$rootScope.activeSession.sendfailed = 0;
	            }
                if (item.flashsms && data.text) item.msg = data.text;//闪信接收
                if (data.file) item.file = data.file; //如果是文件,则通知文件路径
                if (data.filename) item.filename = data.filename; //如果是文件,则通知文件路径
            });

            if (!data.file) {
                return;
            }

            if (item.type == 2) { //图片已下载
                if (oldState != 4) {
                    if (item.flashsms) { //闪信开始记时
                        userService.invoke('FlashTiming', {chatid: id, msgid: data.msgid});
                    }

                    //回复已阅读
                    userService.invoke('SetMessageState', {
                        chatid: id,
                        chattype: $scope.isgroup ? 2 : 1,
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
                        chattype: $scope.isgroup ? 2 : 1,
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
                        chattype: $scope.isgroup ? 2 : 1,
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

    //转发信息
    userService.onSendMessageState($scope, function (data, error) {
        if (!isReceive(error, data.id)) return;//如果下载会话列表和当前会话列表不是同一个
        
        var forwardData = forwardMap[data.msgid];
        if(!forwardData) return ;//如果forwardMap没有数据,就不是转发
        
        if(Object.keys(forwardMap).length && error) {//如果forwardMap有数据并且失败,是下载失败
            return nw.alert('转发失败,请重试');
        }
        
        //记住:要更改这个消息的状态和设置文件的路径,以便后面不必再去下载
        delete forwardMap[data.msgid];
        data.file = decodeURIComponent(data.file); //解码文件url
        var sessionInf, ret, lastmsg;
        
        if(forwardData.isgroup){
            if(forwardData.type == 2){
                lastmsg = '[图片]';
                ret = JSON.parse(taxIM.SendGroupPic(forwardData.id, data.file));
            }
            if(forwardData.type == 4){
                lastmsg = '[文件]';
                ret = userService.invoke('TransmitGroupFile', {chatid: forwardData.id, file:data.file, filename:forwardData.fileName});
            }
            console.log(ret);
            sessionInf = {id:forwardData.id, lastmsg:lastmsg, name:forwardData.name, time:ret.value.time, top:0, type:2, unread:0, sendfailed: data.state};
        } else {
            
            if(forwardData.type == 2){
                    var param = {
                        chatid:forwardData.id,
                        img:data.file,
                        flashsms:0
                    };
                    lastmsg = '[图片]';
                    ret = userService.invoke('SendPicMessage', param);
                }
            
                if(forwardData.type == 4){
                    lastmsg = '[文件]';
                    ret = userService.invoke('TransmitChatFile', {chatid:forwardData.id, file:data.file, filename:forwardData.fileName});
                }
                console.log(ret);
                sessionInf = {id:forwardData.id, lastmsg:lastmsg, name:forwardData.name, time:ret.value.time, top:0, type:1, unread:0, sendfailed: data.state};
        }

            if (forwardData.activeNameId == forwardData.id){//转发给当前会话对象
                var contents;
                if(forwardData.type == 2){//转发图片
                    contents = {
                        time:ret.value.time,
                        msgid:ret.value.guid,
                        flashsms:0,
                        self:true,
                        hid:$rootScope.currentUser.hid,
                        minimap:ret.value.minimap, //缩略图
                        filename:forwardData.fileName, //图片
                        file:data.file, //图片本地路径
                        type:2,
                        state:3
                    }
                }else {
                    contents = {//转发文件
                        time:ret.value.time,
                        msgid:ret.value.guid,
                        flashsms:0,
                        type:4,
                        filename:forwardData.fileName, //文件名
                        file:data.file, //文件本地路径
                        size:forwardData.size,
                        self:true,
                        state:3,
                        hid:$rootScope.currentUser.hid
                    };
                }
                $scope.messages.push(contents);//会话内容中插入一条数据
            }
            var showid = $rootScope.indexOfSessionList(sessionInf.id);
             $timeout(function(){
                if(showid == -1) {//不在最近回话中插入
                     $rootScope.sessionList.push(sessionInf);
                }else {
                    var item = $rootScope.sessionList[showid];
                    item.lastmsg = sessionInf.lastmsg;
                    item.time= sessionInf.time;
                    item.sendfailed = sessionInf.sendfailed == 1? 1 : 0;
                }
           });
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

    //撤销消息通知(可以撤销所有消息,单人和群组)
    userService.onRevocation($scope, function (data, error) {
        if (!isReceive(error, data.id)) return;
         $rootScope.recallId = data.msgid;
        var idx = userService.getMsgInf(data.msgid).index;
        if (!isNaN(idx = parseInt(idx))) {
            $timeout(function () {
                $scope.messages[idx].msg = data.text;
                $scope.messages[idx].type = 99;
            });
        }

        if (data.islast) {
            setLastMsg({msg: data.text, time: data.time});
        }
    });

    //输入框信息
    $scope.input = {
        text: $rootScope.activeSession.draftmsg, //草稿数据
        flashSMS: 0 //是否是闪信
    };

    //打开表情
    $scope.toggleEmoticons = function () {
        var emotion = document.querySelector('.ke-icon-emoticons');
        emotion.click();
    };

    //用默认浏览器打开url
    $scope.openUrl = function (item) {
        item.url && nw.openUrl($filter('decodeURI')(item.url));
        if (item.state != 6) {
            userService.invoke('SetMessageState', {chatid: id, chattype: $scope.isgroup ? 2 : 1, msgid: item.msgid, state: 6});
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

    //发送文本消息
    $scope.postMessage = function (msg) {
        var inputValue;
        if(msg) {
            inputValue =  msg;
        } else if (!$scope.input.text || $scope.overMax){
            return;
        } else {
            inputValue = $scope.input.text;
        }
        inputValue = inputValue.replace(/<img src="file:\/\/[\w\S]+plugins\/emoticons\/imgs\/(emoji_\d{3}).png" border="0" alt="" \/>/gi, '[$1]');

        var ret;
        if ($scope.isgroup) {
            ret = JSON.parse(taxIM.SendGroupText(chatUser.id, inputValue));
        } else {
            var param = {
                chatid: chatUser.id,
                msg: inputValue,
                flashsms: $scope.input.flashSMS || 0
            };
            ret = userService.invoke('SendTextMessage', param);
        }
        var item = {
            msgid: ret.value.guid,
            flashsms: $scope.isgroup ? 0 : $scope.input.flashSMS,
            type: 1,
            msg: inputValue,
            time: ret.value.time,
            self: true,
            state: 0,
            sendname:$rootScope.currentUser.name,
            hid: $rootScope.currentUser.hid
        };
        if (ret.errcode) {
            item.state = 1;
        }
        $scope.messages.push(item);
        //重置选中的会话信息
        setLastMsg(item);
        $scope.input.text = '';
    };

    //发送图片消息
    $scope.postImageMessage = function (obj,flag) {
        var files = $scope.imageFile;
        if (!files.length) return;
        if (files.length > 10) { //检查选择的文件个数
            files.clear();
            return nw.alert({
                content: '最多可以选择10张图片,请重新选择'
            });
        }

        for (var i = 0; i < files.length; i++) { //检查每个文件不能大小10M
        	if(!flag){//是闪信flag==1
        		 if (!/\.(gif|jpeg|jpg|bmp|png)$/i.test(files[i].path)) { //图片格式
	                files.clear();
	                return nw.alert({
	                    content: '图片只支持GIF、JPEG、BMP、PNG格式,请重新选择'
	                });
	            }
        	}else {
        		 if (!/\.(jpeg|jpg|bmp|png)$/i.test(files[i].path)) { //图片格式
	                files.clear();
	                return nw.alert({
	                    content: '闪信图片只支持JPEG、BMP、PNG格式,请重新选择'
	                });
	            }
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
                    if ($scope.isgroup) { //群组会话
                        ret = JSON.parse(taxIM.SendGroupPic(chatUser.id, files[i].path));
                    } else { //单人聊天
                        var param = {
                            chatid: chatUser.id,
                            img: files[i].path, //图片路径
                            flashsms: $scope.input.flashSMS || 0 //是否是闪信
                        };

                        ret = userService.invoke('SendPicMessage', param);
                    }
                    //组装发送图片消息
                    item = {
                        minimap: ret.value.minimap, //缩略图
                        filename: files[i].name, //文件名
                        file: files[i].path, //文件本地路径
                        time: ret.value.time,
                        msgid: ret.value.guid,
                        flashsms: $scope.isgroup ? 0 : $scope.input.flashSMS,
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

    //右键菜单-删除消息
    var delMenuItem = [['删除', function ($itemScope) {
        var msgid = $itemScope.message.msgid;
        var ret = $scope.isgroup ? taxIM.DeleteGroupMessage(id, msgid) : taxIM.DeleteMessage(id, msgid);
        var size = $scope.messages.length;
        if ($itemScope.$index == size - 1) {
            if (size > 1) {
                setLastMsg($scope.messages[size - 2]);
            } else {
                var item = $scope.messages[size - 1];
                item.msg = ' ';
                item.type = 1;
                setLastMsg(item);
            }
        }

        $scope.messages.splice($itemScope.$index, 1);
    }]];

    //右键菜单-撤回消息
    var recallMenuItem = [['撤回', function ($itemScope) {
        var msgid = $itemScope.message.msgid;
        var ret = $scope.isgroup ? userService.invoke('WithdrawGroupMessage', {
            chatid: id,
            msgid: msgid
        }) : JSON.parse(taxIM.WithdrawMessage(id, msgid));
        if (ret.errcode) {
            nw.alert({content: ret.errmsg});
            return false;
        }
    }]]
    
    var forwardMap = {};
    //键菜单-转发
    var forwardMenuItem = [['转发', function($itemScope){
        var $msg = $itemScope.message;

        console.log($msg.file);
        if(($msg.type == 2 || $msg.type == 4) && $msg.self && !nodefile.isExists($msg.file)) {
            return nw.alert('文件不存在,不能转发');
        }

    	/**
         * 执行转发
         * @param {Object} item
         * @param {Object} isgroup
         */
        $scope.flashsmsGroup = true;
        var flashsms = $msg.flashsms;
         if (flashsms){
            $scope.flashsmsGroup = false;
         }else {
            $scope.flashsmsGroup = true;
         }


        function sendForward (item, isgroup){
            var msgType = $msg.type;//获取转发内容类型
             var lastmsg = $msg.msg;
             var activeNameId = $itemScope.activeSession.id;
             var fileSize = $msg.size;
             var msgid = $msg.msgid;
              var flashsms = $msg.flashsms;
              if($rootScope.recallId && $rootScope.recallId == msgid){
        		return;
        	}
            if(msgType == 1){
                var textC = $msg.msg;//获取文本内容
            }
            var id = item.groupid || item.id;
            var filePath, fileName;
            
            if(msgType == 2 || msgType == 4){
                 filePath = $msg.file;//获取图片文件路径
                 fileName = $msg.filename;

                if(!filePath){
                    if(forwardMap[msgid]) {return ;}
                    forwardMap[msgid] = {
                        id:id,
                        isgroup:isgroup,
                        fileName:fileName,
                        type:msgType,
                        name : item.group || item.name,
                        activeNameId: activeNameId,
                        size:fileSize
                    };
                    downloadFileHandler(msgid, null, false);
                    return;
                }
                
            }
            
            if(msgType && msgType != 1){
                lastmsg = {
                    2:'[图片]',
                    4:'[文件]'
                }[msgType];
            }
            if(flashsms && msgType == 1){
                lastmsg = {
                    1:'[文本]'
                }[msgType];
            }
            
            var sessionInf ;
            var ret;
                if(isgroup){
                    var name =item.group || item.name;
                    if(msgType == 1){
                        ret = JSON.parse(taxIM.SendGroupText(id, textC));
                    }
                    if(msgType == 2){
                        ret = JSON.parse(taxIM.SendGroupPic(id, filePath));
                    }
                    if(msgType == 4){
                        ret = userService.invoke('TransmitGroupFile', {chatid: id, file:filePath, filename:fileName});
                    }
                    sessionInf = {id:id, lastmsg:lastmsg, name:name, time:ret.value.time, top:0, type:2, unread:0};
                    if(ret.errcode !=0){
                    	sessionInf.sendfailed = 1;
                    }
                } else {
                    if(msgType == 1){
                            param = {
                                chatid:item.id,
                                msg:textC,
                                flashsms:flashsms || 0
                            };
                            console.log("Start SendTextMessage");
                            ret = userService.invoke('SendTextMessage', param);
                    }
                    if(msgType == 2){
                        var param = {
                            chatid:item.id,
                            img:filePath,
                            flashsms:flashsms || 0
                        };
                        ret = userService.invoke('SendPicMessage', param);
                    }
                    if(msgType == 4){
                        ret = userService.invoke('TransmitChatFile', {chatid: item.id, file:filePath, filename:fileName});
                    }
                    sessionInf = {id:item.id, lastmsg:lastmsg, name:item.name, time:ret.value.time, top:0, type:1, unread:0};
                    if(ret.errcode !=0){
                    	sessionInf.sendfailed = 1;
                    }
                }
                if (activeNameId == id){//转发给当前会话对象
                    var contents;
                    if(msgType == 1){//转发文本
                        contents = {
                            time:ret.value.time,
                            msgid:ret.value.guid,
                            flashsms:flashsms,
                            self:true,
                            hid:$rootScope.currentUser.hid,
                            type:1,
                            msg:textC,
                            state:0
                        };
                    } else if(msgType == 2){//转发图片
                        contents = {
                            time:ret.value.time,
                            msgid:ret.value.guid,
                            flashsms:flashsms,
                            self:true,
                            hid:$rootScope.currentUser.hid,
                            minimap:ret.value.minimap, //缩略图
                            filename:fileName, //图片
                            file:filePath, //图片本地路径
                            type:2,
                            state:3
                        }
                    }else {
                        contents = {//转发文件
                            time:ret.value.time,
                            msgid:ret.value.guid,
                            flashsms:0,
                            type:4,
                            filename:fileName, //文件名
                            file:filePath, //文件本地路径
                            size:fileSize,
                            self:true,
                            state:3,
                            hid:$rootScope.currentUser.hid
                        };
                    }
                    $itemScope.messages.push(contents);//会话内容中插入一条数据
                }
                var showid = $rootScope.indexOfSessionList(sessionInf.id);
                 $timeout(function(){
                    if(showid == -1) {//不在最近回话中插入
                         $rootScope.sessionList.push(sessionInf);
                    }else {
                        var item = $rootScope.sessionList[showid];
                        item.lastmsg = sessionInf.lastmsg;
                        item.time= sessionInf.time;
                        item.sendfailed = sessionInf.sendfailed ==1 ? 1:0;
                    }
               });
        }
        
        openWindow({
                width:280,
                height:490,
                url:'dialogs/sendForward.html',
                args:{
                    sessionList:$rootScope.sessionList,
                    friends: JSON.parse(taxIM.GetFriends()).value || [],
                    sendForward:sendForward,
                    groups: JSON.parse(taxIM.GetGroups()).value || [],
                    flashsmsGroup: $scope.flashsmsGroup
                }
        })
        
    }]];

    /**
     * 下载文件处理
     * @param msgid 消息id
     * @param path 下载到指定的路径
     * @param isShowProcess 是否显示进度条
     * @returns 成功返回true,有错误返回false
     */
    function downloadFileHandler(msgid, path, isShowProcess) {
        var method = 'DownloadFile';
        if ($scope.isgroup) {
            method = 'DownloadGroupFile';
        }

        var ret = userService.invoke(method, {chatid: id, msgid: msgid, file: path});
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
        item.state = 0;
        var msgid = item.msgid;
        var type = $scope.isgroup ? 2 : 1;
        var ret = userService.invoke('ReSendMessage', {chatid: id, msgid: msgid, type: type});

        if (ret.errcode) {
            item.state = 1;
        }
    };

    $scope.getContextMenu = function (item) {
    	
        if (item.flashsms) {
           if(item.self){
           	
	           	if(item.type == 1){
	           		 return [].concat([
	                    ['复制', function ($itemScope) {
	                        clipboard.setText($itemScope.message.msg);
	                    }],
	                ], delMenuItem,  forwardMenuItem);
	           	}else {
           			return [].concat(delMenuItem,forwardMenuItem);
	           	}
	           	
           }else {
           		return delMenuItem;
           }
            if (item.state == 1 && item.self) {
                return [].concat([
                    ['重发', function ($itemScope) {
                        item.state = 0;
                        var msgid = $itemScope.message.msgid;
                        var type = $scope.isgroup ? 2 : 1;
                        var ret = userService.invoke('ReSendMessage', {chatid: id, msgid: msgid, type: type});

                        if(ret.errcode) {
                           item.state = 1;
                        }
                    }]
                ]);
            };
        }

        if (item.state == 1 && item.self) {//发送失败
            return [].concat([
                ['重发', function ($itemScope) {
                    item.state = 0;
                    var msgid = $itemScope.message.msgid;
                    var type = $scope.isgroup ? 2 : 1;
                    var ret = userService.invoke('ReSendMessage', {chatid: id, msgid: msgid, type: type});

                    if(ret.errcode) {
                        item.state = 1;
                    }
                }]
            ], delMenuItem);
        }

        if (item.type == 1) {//文本
            if (item.self == 1) {
                return [].concat([
                    ['复制', function ($itemScope) {
                        clipboard.setText($itemScope.message.msg);
                    }],
                ], recallMenuItem,  forwardMenuItem, delMenuItem);
            } else {
                return [].concat([
                    ['复制', function ($itemScope) {
                        clipboard.setText($itemScope.message.msg);
                    }],
                ], forwardMenuItem, delMenuItem);
            }
        }

        if (item.type == 2 || item.type == 4) {//图片,文件
            if (item.self == 1) {
                return [].concat([
                    ['保存', downloadFile],
                ], recallMenuItem, forwardMenuItem, delMenuItem);
            } else {
                return [].concat([
                    ['保存', downloadFile],
                ], forwardMenuItem, delMenuItem);
            }
        }
        
         if (item.type == 5) {//视频
            if (item.self == 1) {
                return [].concat([
                    ['保存', downloadFile],
                ], recallMenuItem, delMenuItem);
            } else {
                return [].concat([
                    ['保存', downloadFile],
                ], delMenuItem);
            }
        }

        if (item.type == 3 || item.type == 6) { //链接
            if (item.self == 1) {
                return [].concat(recallMenuItem, delMenuItem);
            } else {
                return [].concat(/*forwardMenuItem,*/ delMenuItem);
            }
        }

    };

    /**
     * 点击body页面
     */
    $rootScope.bodyClick = function () {
        $scope.down = false;
        $scope.record = false;

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

    //聊天记录搜索
    $scope.searchRecord = "";
    $scope.$watch('searchRecord', function (newV, oldV) {
        if (newV) {
            if ($scope.isgroup) {
                var searchContentChat = JSON.parse(taxIM.QueryGroupText($scope.activeSession.id, 0, 10, $scope.searchRecord)).value;
            } else {
                var searchContentChat = JSON.parse(taxIM.QueryChatText($scope.activeSession.id, 0, 10, $scope.searchRecord)).value;
            }

            console.log(searchContentChat)
            $scope.searchChat = searchContentChat;
        }

    });

    //获取会话聊天记录
    $scope.showRecordList = function () {

    	$rootScope.bodyclick();
        $scope.down = false;
        event.stopPropagation();
        $scope.record = !$scope.record;
        //获取会话图片记录
        $scope.getRecordImage = function(){


	        var imageId = 0;
	        if ($scope.isgroup) {
	            var chatImageRecord = JSON.parse(taxIM.GetGroupImageList($scope.activeSession.id, imageId, 200)).value;
	        } else {
	            var chatImageRecord = JSON.parse(taxIM.GetChatImageList($scope.activeSession.id, imageId, 200)).value;
	        }
	        if (chatImageRecord.length > 0) {
	            chatImageRecord[0].showImageTime = true;
	            for (var i = 1; i < chatImageRecord.length; i++) {
	                var date = new Date(chatImageRecord[i].time);
	                var dateNext = new Date(chatImageRecord[i - 1].time);
	                var day = date.getDate();
	                var dayNext = dateNext.getDate();
	
	                if (day - dayNext == 0) {
	                    chatImageRecord[i].showImageTime = false;
	                } else {
	                    chatImageRecord[i].showImageTime = true;
	                }
	
	            }
	        }
	        
	        $scope.imageRecordList = chatImageRecord;
	        
	        if (chatImageRecord.length < 200) {
	            $scope.loadmoreI = false;
	        } else {
	            $scope.loadmoreI = true;
	        }
	
	        $scope.loadMoreImage = function () {
	            imageId = chatImageRecord[0].time;
	            if ($scope.isgroup) {
	                chatImageRecord = JSON.parse(taxIM.GetGroupImageList($scope.activeSession.id, imageId, 200)).value;
	            } else {
	                chatImageRecord = JSON.parse(taxIM.GetChatImageList($scope.activeSession.id, imageId, 200)).value;
	            }
	
	            $scope.imageRecordList = chatImageRecord.concat($scope.imageRecordList);
	
	        };
        }
        
        //获取会话文件记录item.showFileTime
        $scope.getRecordFile = function () {
        	var fileId = 0;
	        if ($scope.isgroup) {
	            var chatFileRecord = JSON.parse(taxIM.GetGroupFileList($scope.activeSession.id, fileId, 200)).value;
	        } else {
	            var chatFileRecord = JSON.parse(taxIM.GetChatFileList($scope.activeSession.id, fileId, 200)).value;
	        }
	        if (chatFileRecord.length > 0) {
	            chatFileRecord[0].showFileTime = true;
	            for (var i = 1; i < chatFileRecord.length; i++) {
	                var datefile = new Date(chatFileRecord[i].time);
	                var datefileNext = new Date(chatFileRecord[i - 1].time);
	                var dayfile = datefile.getMonth();
	                var dayfileNext = datefileNext.getMonth();
	                if (dayfile - dayfileNext == 0) {
	                    chatFileRecord[i].showFileTime = false;
	                } else {
	                    chatFileRecord[i].showFileTime = true;
	                }	
	            }
	        }
	
	        $scope.fileRecordList = chatFileRecord;

	        if (chatFileRecord.length < 200) {
	            $scope.loadmoreM = false;
	        } else {
	            $scope.loadmoreM = true;
	        }

       
            //聊天记录文件下载

            $scope.downloadRecordFile = function (item) {
                downloadFileHandler(item.msgid, null, true);
                item.file = true;
                if (item.file) {
                    var path = decodeURIComponent(item.file); //解码文件url
                    if (nodefile.isExists(path)) {
                        if(item.type == 5){
                    		return nodefile.playVideo(path);
                    	}
                    	else{
                        	return nw.openFileByExternal(path);
                        }
                    }
                }

                //下载文件

            };
            $scope.openRecordFile = function(item){
            	//item.file = true;
                if (item.file) {
                    var path = decodeURIComponent(item.file); //解码文件url
                    if (nodefile.isExists(path)) {
                    	if(item.type == 5){
                    		return nodefile.playVideo(path);
                    	}
                    	else{
                        	return nw.openFileByExternal(path);
                        }
                    }
                }
            }


            $scope.loadMoreFile = function () {
                fileId = chatFileRecord[0].time;
                if ($scope.isgroup) {
                    chatFileRecord = JSON.parse(taxIM.GetGroupFileList($scope.activeSession.id, fileId, 200)).value;
                } else {
                    chatFileRecord = JSON.parse(taxIM.GetChatFileList($scope.activeSession.id, fileId, 200)).value;
                }

                $scope.fileRecordList = chatFileRecord.concat($scope.fileRecordList);

            };

        }

        $scope.getRecordImage && $scope.getRecordImage();
        $scope.getRecordFile && $scope.getRecordFile();

    };
    //发送文件消息
    $scope.postFileMessage = function () {
        var files = $scope.fileFile;
        if (!files.length) return;

        if (files.length > 10) { //检查选择的文件个数
            files.clear();
            return nw.alert({
                content: '最多可以10个文件,请重新选择'
            });
        }

        for (var i = 0; i < files.length; i++) { //检查每个文件不能大小10M
            if (files[i].size > 1024 * 10240) { //10M
                files.clear();
                return nw.alert({
                    content: '单个文件最大不能超过10M,请重新选择'
                });
            }
        }

        for (var i = 0; i < files.length; i++) {
            (function (file, last) {
                $timeout(function () {
                    var ret;
                    if ($scope.isgroup) { //群组会话
                        ret = JSON.parse(taxIM.SendGroupFile(chatUser.id, file.path));
                    } else {
                        ret = JSON.parse(taxIM.SendFileMessage(chatUser.id, file.path));
                    }

                    //组装发送文件消息
                    var item = {
                        time: ret.value.time,
                        msgid: ret.value.guid,
                        flashsms: 0,
                        type: 4,
                        filename: file.name, //文件名
                        file: file.path, //文件本地路径
                        size: file.size,
                        self: true,
                        state: 3,
                        hid: $rootScope.currentUser.hid
                    };

                    if (ret.errcode) { //有错误,则设置状态为 发送失败
                        item.state = 1;
                    }

                    $scope.messages.push(item);

                    if (last) {
                        //重置选中的会话信息
                        setLastMsg(item);
                        files.clear();//清空
                    }
                });
            })(files[i], i == files.length - 1);
        }//循环结束
    };

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

 

    var exiTdialog;
    //删除并退出群组
    $scope.delAndExitGroup = function () {
        if (!exiTdialog) { //保证只弹出一个对话框
            exiTdialog = nw.confirm({
                title: $rootScope.lang.exitGroup,
                content: '<div style="text-align: left">' + $rootScope.lang.delGroupMsg + '</div>',
                ok: function (dialog) { //确定按钮
                    var ret = JSON.parse(taxIM.ExitGroup(id, $rootScope.currentUser.id));
                    if (ret.errcode) {
                        return nw.alert({content: ret.errmsg || '退出群组失败,请重试'});
                    }
                    dialog.close();
                }
            });
            exiTdialog.on('closed', function () {
                exiTdialog = null;
            });
        } else {
            exiTdialog.focus();
        }
    };

    var dissolveDialog;
    //解散群组
    $scope.dissolveGroup = function () {
        if (!dissolveDialog) {
            dissolveDialog = nw.confirm({
                title: $rootScope.lang.dissolveGroup,
                content: $rootScope.lang.dissolveGroupMsg,
                ok: function (dialog) { //确定按钮
                    var ret = JSON.parse(taxIM.LogoffGroup(id));
                    if (ret.errcode) {
                        return nw.alert({content: ret.errmsg || $rootScope.lang.dissolveGroup + '失败,请重试'});
                    }
                    dialog.close();
                }
            });
            dissolveDialog.on('closed', function () {
                dissolveDialog = null;
            });
        } else {
            dissolveDialog.focus();
        }
    };

    var delGroupMemberDialog;
    //删除群成员
    $scope.delGroupMember = function (userid) {
        if (!delGroupMemberDialog) {
            delGroupMemberDialog = nw.confirm({
                title: '确认',
                content: '确认移除成员？',
                ok: function (dialog) { //确定按钮
                    var ret = JSON.parse(taxIM.RemoveFromGroup(id, userid));
                    if (ret.errcode) {
                        return nw.alert({content: ret.errmsg || '移除成员失败,请重试'});
                    }
                    dialog.close();
                }
            });

            delGroupMemberDialog.on('closed', function () {
                delGroupMemberDialog = null;
            });
        } else {
            delGroupMemberDialog.focus();
        }

    };

    var addGroupMemberDialog;
    //添加群组成员
    $scope.addGroupMember = function () {
        if (!addGroupMemberDialog) {
            addGroupMemberDialog = openWindow({
                width: 620,
                height: 490,
                url: 'dialogs/addGroup.html',
                args: {
                    list: JSON.parse(taxIM.GetFriends()).value,
                    count: (JSON.parse(taxIM.GetGroupInfo(id)).value || {}).count,
                    isSave: false, //不是创建群组
                    onSave: function (values, name, parent) {
                        var ret = JSON.parse(taxIM.AddToGroup(id, values.join(',')));
                        if (ret.errcode) {
                            nw.alert({parent:parent, content: ret.errmsg || '添加' + lang.group + '成员失败,请重试'});
                        }
                    },
                    oplist:function (searchText) {
                        var oplist = JSON.parse(taxIM.SearchContact(searchText)).value;
                        return oplist;
                    },
                    itemId:userService.invoke('GetGroupMembers', {groupid: id}).value
                }
            });

            addGroupMemberDialog.on('closed', function () {
                addGroupMemberDialog = null;
            });

        } else {
            addGroupMemberDialog.focus();
        }
    };
    
    //注册群组变更通知
    userService.onGroupChange($scope, function (data, error) {
    	var member = userService.invoke('GetGroupMembers', {groupid: id}).value || [];
    	$scope.memberNum = member.length;
        if (chatUser.id != data.id) return;
        if (error && data.type == 5) {
            return nw.alert({content: error.message});
        }
        
        if (data.type == 5) { //1:群组名称变更 2:解散 3:被移出群 4:退出群 5:群成员变更
            $timeout(function () {
                $scope.memberList = userService.invoke('GetGroupMembers', {groupid: id}).value || [];
            });

            if (addGroupMemberDialog) {
                addGroupMemberDialog.close(true);
                addGroupMemberDialog = null;
            }
        }
    });
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
}]);
function loadImage (img){
	if(img.width >= img.height) {
		img.style.height = '100px';
	}
	
	if(img.height >= img.width) {
		img.style.width = '100px';
	}
}