var factory = angular.module('ATApp.factory', ['app.lang']);
var closeGrabWindowTimer;
/**
 * 提供Http请求服务
 */
factory.factory('requestServer', ['$rootScope', '$q', '$http', 'lang', function ($rootScope, $q, $http, lang) {
    return {

        /**
         * 使用post请求api
         * @param {String} method 服务端的方法名
         * @param {Object} params 请求的业务参数
         * @returns {*}
         */
        post: function (method, params) {
            //构建请求对象
            var reqBean = {
                "jsonrpc": "2.0",
                "method": method,
                "params": params
            };

            var defer = $q.defer();  //声明延后执行
            $http.post(lang.apiUrl + 'jxms/mobile/http/api.do', reqBean, {responseType: 'json', cache: false})

                //声明执行成功
                .success(function (data, status, headers, config) {
                    if (200 <= status && status < 300) {
                        defer.resolve(data.result, status, headers, config);
                        return ;
                    }

                    defer.reject(data, status, headers, config);
                    nw.alert('获取数据失败!');
                })

                .error(function (data, status, headers, config) {
                    //声明执行失败
                    defer.reject(data, status, headers, config);

                    nw.alert('获取数据失败!');
                });

            return defer.promise; //返回承诺，返回获取数据的API
        }
    }
}]);


factory.factory('userService', function ($rootScope, lang) {

        //注册接收消息通知
        taxIM.onmessagerecv = function () {
            var strMsgList = taxIM.strMessage;

            try {
                for (var i = 0; i < strMsgList.length; i++) {
                    var message = JSON.parse(strMsgList[i]);

                    if (message.type) {
                        //放入成功时的值和失败时的值
                        var error = message.errcode ? {code: message.errcode, message: message.errmsg} : null;
                        console.log("主题="+ message.type + " data="+JSON.stringify(message.value)  + " Error="+ JSON.stringify(error));
                        $rootScope.$broadcast(message.type, {success: message.value, error: error});
                    } else {
                        nw.alert({
                            title: '系统提示',
                            content: '接收到意外的数据:' + strMsgList[i]
                        });
                    }
                }
            } catch (e) {
                console.error(e.message, strMsgList);
                nw.alert({
                    title: '系统提示',
                    content: '接收数据发生错误:' + e.message
                });
            }
        };

        var topics = [
            'UpdateContact', //联系人更新通知
            'Login', //登录通知
            'NewVersion', //新版本通知
            'ReceiveTodoMessage',//代办消息的接收通知

            'ReceiveTextMessage', //单人会话 接收文本消息
            'ReceiveSoundMessage',//单人会话 接收语音消息
            'ReceivePicMessage',//单人会话 接收图片消息
            'ReceiveFileMessage',//单人会话 接收文件消息
            'ReceiveVideoMessage', //接收视频消息
            'ReceiveUrlFile', //接收链接消息
            'SendMessageState', //单人会话 消息状态更新

            'ReceiveWXTextMessage', //单人会话 接收文本消息
            'ReceiveWXPicMessage',//单人会话 接收语音消息
            'ReceiveWXFileMessage',//单人会话 接收图片消息
            'ReceiveWXSoundMessage',//单人会话 接收文件消息
            'ReceiveWXVideoMessage', //接收视频消息
            'ReceiveWXUrlFile', //接收链接消息
            'ServiceChatClose', //会话失效通知
            'ServiceChatError',//客服会话错误

            'OfflineMessage',//离线消息通知
            'OfflineMessageIDOK',//会话的离线消息ID获取完成通知
            'OfflineMessageOK',//会话的离线消息内容获取完成通知
            'OfflineGroupMessageOK', //群组会话的离线消息获取完成
            'GroupChange', //群组变更 data:{"type":"1", "id":"群组ID", "name":"新名称"}
            'GroupInvite', //群组邀请
            'ReceiveGroupResponse',//创建群组后，群组人员的反馈

            'ReceiveGroupText',//群组会话 接收文本消息
            'ReceiveGroupPic', //群组会话 接收图片消息
            'ReceiveGroupSound', //群组会话 接收语音消息
            'ReceiveGroupFile',//群组会话 接收文件消息
            'ReceiveGroupVideo',// 群组会话 接收视频消息
            'ReceiveGroupURL',//群组会话 接收链接消息
            'GroupNotify',//群组消息变更通知
            'CreateGroup',

            'UploadProgress', //文件上传进度通知
            'Revocation', //撤销消息通知
            'ApplyAddFriend',//好友添加处理
            'Cancel',

            'GroupMessage',//群组消息通知
            'DeleteFriend',//删除好友通知
            'ApplyAddGroup', //同意或拒绝邀请的异步返回结果
            'AddFriend', //加好友通知
            'FriendMessage',//好友消息通知
            'ReceiveServiceMessageResult',//留言板接单通知
            'ServiceBindNotify',//邀请成为客服的通知
            'AgreeServiceResult',//同意或拒绝成为客服的通知
            'GrabMessageNotify',//抢单消息通知
            'GrabServiceMessageResult', //抢单结果通知
            'TransmitResult',//转单结果通知
            'TransmitMessageNotify',//转单通知
            'ServiceMessageCancel',//被其他人抢了
            "CloseServiceChatResult", //结束咨询通知
            'AgreeTransmitResult',//接受或者拒绝转来单子的结果
            
            //待回访
            "SetCallbackStateResult", //设置回访结果
            "CallbackResult", //进行回访的结果
            
            //客服离线消息
            'OfflineWXMessage',//离线消息通知
            'OfflineWXMessageIDOK',//会话的离线消息ID获取完成通知
            'OfflineWXMessageOK',//会话的离线消息内容获取完成通知
        ];

        //函数列表
        var funcs = {
            /**
             * 打开抢单对话框
             */
            openGrapOrderDialog: function (data) {
                $rootScope.grabWindow = openWindow({
                    width: 330,
                    height: 314,
                    max_width: 365,
                    max_height: 370,
                    url: 'dialogs/grabOrder.html',
                    //toolbar:true,
                    args: {
                        list: data,
                        isAgree: true,

                        onAgree: function () {
                            var params = {
                                "userid": data.userid,
                                "sessionid": data.sessionid,
                                "flag": 1
                            };
                            funcs.invoke('GrabServiceMessage', params);
                        },
                        onCancel: function () {
                            var params = {
                                "userid": data.userid,
                                "sessionid": data.sessionid,
                                "flag": 0
                            };
                            funcs.invoke('GrabServiceMessage', params);
                            clearTimeout(closeGrabWindowTimer); 
                            funcs.invoke('ResetIdleFlag', {});
                        }
                    }
                });
                $rootScope.grabWindow.setAlwaysOnTop(true);
                closeGrabWindowTimer = setTimeout(function(){
                	if($rootScope.grabWindow){
                		funcs.invoke('ResetIdleFlag', {});
                		$rootScope.grabWindow.close();
                		$rootScope.grabWindow = null;
                	}
                }, 1000*30)
            },
            /**
             * 打开修改密码对话框
             */
            openUpdatePwdDialog: function (parentWin, cb) {
                return nw.dialog({
                    title: lang.updatePwd,
                    width: 424,
                    height: 366,
                    max_width: 424,
                    max_height: 366,
                    parent: parentWin,
                    buttons: [{
                        name: lang.ok,
                        primary: true,
                        callback: function (dialog) {
                            var oldpwd = "";
                            var newpwd = "";
                            var reviewpwd = "";
                            oldpwd = dialog.window.document.getElementById('oldpwd').value;
                            newpwd = dialog.window.document.getElementById('newpwd').value;
                            reviewpwd = dialog.window.document.getElementById('reviewpwd').value;
                            
                            

                            function replace(value) {
                                dialog.window.document.getElementById('errorMessage').innerHTML = value;
                            }
                            if(oldpwd == null || oldpwd == ""){
                            	var temp = "请输入原始密码！";
                            	replace(temp);
                            	return;
                            }
                            if(newpwd == null || newpwd == ""){
                            	var temp = "请输入新密码!";
                            	replace(temp);
                            	return;
                            }
                            if(reviewpwd == null || reviewpwd == ""){
                            	var temp = "请再次输入新密码！";
                            	replace(temp);
                            	return;
                            }
                            if ((newpwd.length < 13 && newpwd.length > 5) && (reviewpwd.length < 13 && reviewpwd.length > 5)) {
                                if (newpwd == reviewpwd) {
                                    message = JSON.parse(taxIM.ChangePassword(oldpwd, newpwd));
                                    
                                    if (message.errcode == 0) {
                                        dialog.close();
                                        var wait = nw.dialog({
                                            title: lang.updatePwd,
                                            width: 424,
                                            height: 166,
                                            max_width: 424,
                                            max_height: 166,
                                            parent: parentWin,
                                            closeAble:false,
                                            content: "<div><img src='../img/loading_blue2.gif' /></div><div style='font-size: 14px;'>修改密码成功,准备重新登录...</div>"
                                        });

                                        setTimeout(function () {
                                            $rootScope.closeOperator = 1;
                                            closeAllWindow();
                                            cb && cb();
                                        }, 1500);
                                    } else {
                                        replace(message.errmsg);
                                    }
                                } else {

                                    replace("两次输入不一致");
                                }
                            } else {

                                replace("输入的新密码不符合格式要求！");
                            }


                        }
                    },
                        {
                            name: lang.cancel,
                            primary: false,
                            callback: function (dialog) {
                                dialog.close();
                            }
                        }
                    ],
                    url: rootPath + '/templates/updatePwd.html'
                });
            },
            /**
             * 打开添加好友对话框
             */
            openAddFriendsDialog: function (args, parentWin) {
                return nw.dialog({
                    title: '添加好友',
                    width: 350,
                    height: 220,
                    max_width: 350,
                    max_height: 220,
                    args: args,
                    parent: parentWin,
                    buttons: [
                        {
                            name: lang.ok,
                            primary: true,
                            callback: function (dialog) {
                                var remarksMessage = dialog.window.document.getElementById('remarksMessage').value;

                                funcs.invoke('AddFriend', {userid: args.id, msg: remarksMessage});
                                dialog.close();
                                funcs.onAddFriend($scope, function (data, error) {
                                    if (error.errcode == 0) {
                                        dialog.close();
                                    }
                                })
                            }
                        },
                        {
                            name: lang.cancel,
                            primary: false,
                            callback: function (dialog) {
                                dialog.close();
                            }
                        }
                    ],
                    url: rootPath + '/templates/addfriendsDialog.html'
                });
            },

            /**
             * 打开客服通知对话框openCustomerServiceDialog
             */
            openCustomerServiceDialog: function (data) {
                return nw.confirm({
                    width: 420,
                    height: 234,
                    max_width: 420,
                    max_height: 234,
                    title: "税信客服",
                    content: '<p><img align="middle" src="../img/kfyq.png" style="margin-right: 20px">' + data.desc + '</p>',
                    ok: function (dialog) { //确定按钮
                        funcs.invoke('AgreeService', {flag: 1});
                        /*funcs.onAgreeServiceResult($scope, function (data, error) {

                         })*/
                        dialog.close();


                    },
                    okVal: '同意',
                    cancel: function (dialog) {
                        funcs.invoke('AgreeService', {flag: 0});
                        /*funcs.onAgreeServiceResult($scope, function (data, error) {

                         })*/
                        dialog.close();

                    },
                    cancelVal: '拒绝'
                });
            },


            /**
             * 打开注销登录对话框
             * @returns {*}
             */
            openLogoutDialog: function (parentWin, callback) {
                return nw.confirm({
                    width: 420,
                    height: 234,
                    max_width: 420,
                    max_height: 234,
                    title: lang.logout,
                    content: lang.confirmLogout,
                    parent: parentWin,
                    ok: function (dialog) { //确定按钮
                        if (callback.call(dialog, require('nw.gui').App.manifest.main)) {
                            closeAllWindow();
                        }
                    }
                });
            },

            //userInfo


            /**
             * 获取指定消息的dom和在列表中的索引
             * @param msgid 消息ID
             * @returns {{dom: Element, index: *}}
             */
            getMsgInf: function (msgid) {
                var dom = document.getElementById('msg-' + msgid);
                return {
                    dom: dom,
                    index: dom ? dom.dataset.index : null
                };
            },

            /**
             * 获取指定会话I的dom和在列表中的索引
             * @param chatidd 会话Id
             * @returns {{dom: Element, index: *}}
             */
            getChatInf: function (chatidd) {
                var dom = document.getElementById('chat-' + chatidd);
                return {
                    dom: dom,
                    index: dom ? dom.dataset.index : null
                };
            },

            /**
             * 滚动到指定消息
             * @param msgid 消息Id
             */
            scrollToBottom: function (msgid) {
                var dom = this.getMsgInf(msgid).dom;
                if (dom) {
                    return dom.scrollIntoView(false);
                }
            },

            /**
             * 执行本地业务方法
             * @param method 方法名称
             * @param param 方法的参数
             */
            invoke: function (method, param) {
                var param = {
                    method: method,
                    params: param
                };
                var ret = JSON.parse(taxIM.InvokeMethod(JSON.stringify(param)));
                return ret;
            }
        };

        //批量增加通知监听
        for (var i = 0; i < topics.length; i++) {
            (function (topic) {
                funcs['on' + topic] = function ($scope, handler) {
                    $scope.$on(topic, function (event, args) {
                        console.log('topic==' + topic, args.success)
                        if (handler) handler.call($scope, args.success, args.error)
                    });
                }
            })(topics[i]);
        }

        return funcs;
    }
);