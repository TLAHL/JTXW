/**
 * Created by 马德成 on 2016/2/26.
 * 群组列表Controller
 */

app.controller('groupsCtr', function ($rootScope, $scope, $timeout, $state, userService) {
//数据结构 {"groupid":"g1", "group":"测试群", "mygroup":"1"}
    $scope.groups = JSON.parse(taxIM.GetGroups()).value || [];

    /**
     * 进入聊天界面
     * @param sessionObject 会话信息
     * {id:'id', name:'会话名称', time:时间, mygroup:是否是我的群组, top:0, type:2, unread:0};
     */
    var intoChatWindow = function (sessionObject) {
        $rootScope.ifInSessionList(sessionObject);
        $scope.$parent.selectedIndex = 1;//让菜单选中
    };

    $scope.intoChatWindow = intoChatWindow;


    //点击群组列表中的一个事件
    $scope.clickGroupItem = function (obj) {
        $rootScope.activeGroup = obj;
        openMemberWindow(obj.groupid);
    };

    //打开群组成员页面
    openMemberWindow($rootScope.activeGroup && $rootScope.activeGroup.groupid);

    //打开群成员界面
    function openMemberWindow(groupid) {
        $state.go('memberwindow', {groupid: groupid});
    }

    //发送消息菜单项
    var sendMsgMenuItem = [$rootScope.lang.sendMsg, function ($itemScope) {
        var item = $itemScope.conv;
        intoChatWindow({id: item.groupid, name: item.group, time: new Date().getTime(), top: 0, type: 2, unread: 0});
    }];

    var exiTdialog;

    //菜单列表
    var otherMenuOptions = [

        //退出群组
        [$rootScope.lang.exitGroup, function ($itemScope) {
            if (!exiTdialog) { //保证只弹出一个对话框
                exiTdialog = nw.confirm({
                    title: $rootScope.lang.exitGroup,
                    content: '<div style="text-align: left">' + $rootScope.lang.delGroupMsg + '</div>',
                    ok: function (dialog) { //确定按钮
                        var item = $itemScope.conv;
                        var ret = JSON.parse(taxIM.ExitGroup(item.groupid, $rootScope.currentUser.id));
                        if (ret.errcode) {
                            return nw.alert({content: ret.errmsg || '退出群组失败,请重试'});
                        }
                        if (dialog) {
                            dialog.close();
                        }

                    }
                });
                exiTdialog.on('closed', function () {
                    exiTdialog = null;
                });
            } else {
                exiTdialog.focus();
            }
        }]
    ];
    otherMenuOptions.splice(0, 0, sendMsgMenuItem);

    //接收群消息
    userService.onGroupChange($scope, function (data, error) {
        if (error) {
            nw.alert({content: error.message});
        }
        //修改群名称
        if (data.type == 1) {
            var groupid = data.id;
            if ($scope.groups.length) {

                for (var i = 0; i < $scope.groups.length; i++) {
                    var group = $scope.groups[i];
                    if (groupid == $scope.groups[i].groupid) {
                        $timeout(function () {
                            group.group = data.name;
                             
                            if ($rootScope.activeGroup && group.groupid == $rootScope.activeGroup.groupid) {
                                $rootScope.activeGroup.group = data.name;
                            }
                            if (updateDialog) {
                                updateDialog.close();
                                updateDialog = null;
                            }
                        });
                        return;
                    }
                }
            }
        }

        //退出群组和解散群组
        if (data.type == 4 || data.type == 2 || data.type == 3) {
            var groupid = data.id;
            if ($scope.groups.length) {
                for (var i = 0; i < $scope.groups.length; i++) {
                    if (groupid == $scope.groups[i].groupid) {
                        $timeout(function () {
                            $scope.groups.splice(i, 1);

                            if ($rootScope.activeGroup.groupid == groupid) {
                                if ($scope.groups.length > 0) {
                                    $rootScope.activeGroup = $scope.groups[0];
                                    openMemberWindow($rootScope.activeGroup.groupid);
                                } else {
                                    $rootScope.activeGroup = null;
                                }
                            }
                        });
                        return;
                    }
                }
            }
        }

        /**
         * 获取变化的群组在groups中的索引值 -1表示未找到
         * @param groupid 群组id
         * @returns -1表示未找到, 非-1的值表示所在的索引
         */
        function indexOfGroupList(groupid) {
            $scope.groups = $scope.groups || [];
            var index = -1;
            for (var i = 0; i < $scope.groups.length; i++) {
                if (groupid == $scope.groups[i].groupid) {
                    index = 1;
                }
            }
            return index;
        }

        //群成员变更
        if (data.type == 5) {
            var groupid = data.id;
            //群组信息
            var groupInfo = JSON.parse(taxIM.GetGroupInfo(groupid)).value;
            var index = indexOfGroupList(groupid);
            if (index == -1) {
                $timeout(function () {
                    $scope.groups.push({
                        count: groupInfo.count,
                        group: groupInfo.group,
                        groupid: groupInfo.groupid,
                        jp: groupInfo.jp,
                        mygroup: groupInfo.mygroup,
                        qp: groupInfo.qp
                    });
                });
            }
        };
    });

    //菜单列表
    $scope.otherMenuOptions = otherMenuOptions;

    var updateDialog, dissolveDialog;
    var myMenuOptions = [
        //修改群名称
        [$rootScope.lang.updateGroup, function ($itemScope) {
            if (!updateDialog) {
                updateDialog = nw.confirm({
                    title: $rootScope.lang.updateGroup,
                    content: '<input type="text" class="input-text input-group-name" autofocus id="group-name" maxlength="12" placeholder="请输入群组名称（2-12字）" value="' + $itemScope.conv.group + '"/>',
                    ok: function (dialog) {
                        var newName = dialog.window.document.getElementById('group-name').value;
                        if (newName.length < 2) {
                            return;
                        }
                        var id = $itemScope.conv.groupid;
                        var ret = JSON.parse(taxIM.RenameGroup(id, newName));

                        if (ret.errcode) {//修改失败
                            return nw.alert({
                                content: ret.errmsg || $rootScope.lang.updateGroup + '失败,请重试'
                            });
                        }

                    }
                });
                updateDialog.on('closed', function () {
                    updateDialog = null;
                });
            } else {
                updateDialog.focus();
            }
        }],
        //解散群
        [$rootScope.lang.dissolveGroup, function ($itemScope) {
            if (!dissolveDialog) {
                dissolveDialog = nw.confirm({
                    title: $rootScope.lang.dissolveGroup,
                    content: $rootScope.lang.dissolveGroupMsg,
                    ok: function (dialog) { //确定按钮
                        var id = $itemScope.conv.groupid;
                        var ret = JSON.parse(taxIM.LogoffGroup(id));
                        if (ret.errcode) {
                            return nw.alert({content: ret.errmsg || $rootScope.lang.dissolveGroup + '失败,请重试'});
                        }
                        if (dialog) {
                            dialog.close();
                        }
                    }
                });
                dissolveDialog.on('closed', function () {
                    dissolveDialog = null;
                });
            } else {
                dissolveDialog.focus();
            }
        }]
    ];
    myMenuOptions.splice(0, 0, sendMsgMenuItem);

    //菜单列表
    $scope.myMenuOptions = myMenuOptions;


    //监视列表长度
    $scope.$watch(function () {
        return $scope.groups.length;
    }, function () {
        if (!$scope.groups.length) {
            delete $rootScope.activeGroup;
            openMemberWindow();
            return;
        }

    });
});