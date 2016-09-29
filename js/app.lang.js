/**
 * Created by mdc on 2015/12/29.
 * 界面语言信息
 */
angular.module('app.lang', []).constant('lang', (function () {
    var pwd = '密码',
        account='帐号',
        contacts = '联系人',
        friend = '好友',
        group = '群组',
        search = '搜索',
        chat = '聊天',
        customer = '客服'
        settings = '设置',
        groupName = group + '名称',
        session = '会话',
        confirm = '确认',
        ok = '确定',
        cancel = '取消';

    return {
        appName: '行政助手', //应用名称
        appLogo: '', //应用图标
        account: account,
        pwd: pwd,
        login: '登录',
        inputPwd: '请输入' + pwd,
        inputAccount: '请输入' + account,
        remember: '记住' + pwd,
        autoLogin: '自动登录',
        documents: '代办公文',

        //菜单文字
        maxWindow: '最大化/恢复',
        minWindow: '最小化',
        closeIndexow: '关闭',
        addrBook: '通讯录',
        session: '会话',
        contacts: contacts,
        group: group,
        app: '办公',
        grouphatC: '发起群聊',
        settings: settings,
        search: search,
        searchContactsAndGround: search + friend + '/' + group, //搜索联系人/群组
        sessionRecord: session + '记录', //会话记录
        question: '常见问题',
        help: '帮助中心',
        checkUpdate: '检查更新',
        about: '关于',
        messageBox:'消息盒子',
        updatePwd: '修改' + pwd, //修改密码
        logout: '注销登录',
        exit: '退出',

        groupNotify: '群通知',
        newFriends: '新朋友',
        groupName: groupName,
        friends: '好友',
        workmate: '同事',
        dept: '部门',
        mobile: '手机',
        sendMsg: '发送消息',
        chat: chat,
        pic: '图片',
        file: '文件',
        enterChat: '进入' + chat,
        exitGroup: '删除并退出群组',

        topChat: '置顶' + chat,
        delChat: '删除' + chat,
        clearChat: '清空' + chat + '记录',
        updateGroup: '修改' + groupName,
        dissolveGroup: '解散' + group,
        commonSettings: '通用' + settings,
        shortcutSettings: '快捷键' + settings,
        screenCapture: '截取屏幕',
        openApp: '打开',
        openAppText: '税务办公',
        delFriend:'删除好友',
        addFriend:'添加好友',
        confirm: confirm,
        ok: ok,
        cancel: cancel,
        dissolveGroupMsg:ok + '要解散' + group + '？',
        delGroupMsg:'删除并退出后，将不再接收此群组消息',
        confirmLogout:'退出登录后将无法接收到消息,确定退出登录？',

        agree:'同意',
        refuse:'拒绝',
        
        resend:'重新发送',
        //文件服务器地址
        fileSvr: 'http://192.168.9.124:8211/fileAgent-web/JxFileBreakDownload?fileId=',
	    //随机数
	    random: parseInt(6 * Math.random() + 1),

        //税信api地址
        apiUrl:'http://192.168.9.124:8210/'
    };
})());