//Curl发送数据
function http_get($clurl, $ftoken, $ctime = 1, $timeout = 3)
{
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $clurl."/?token=".$ftoken);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, $ctime);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, FALSE);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, FALSE);
 
    $result = curl_exec($ch);
    curl_close($ch);
 
    return $result;
}
 
//站点访问数量
global $clicki_vistors,$click_str;//定义全局变量,可以选择在主题中输出纯数字或者是组合好后的字串
$imem = new Memcache;
$memc_stat = $imem->connect('127.0.0.1','11211');//可以去掉前面的变量
//echo '<!--'.$memc_stat.'-->';//Debug时用到的。。。
$clicki_vistors = $imem->get('c_vistors');
if ($clicki_vistors == FALSE) {
    /* do{ */ //如果网络不好，多次调用失败，可以将这个循环的注释去掉
        $itmp = http_get('http://www.clicki.cn/api/summary','你的clicki的API Token'); $itmp = json_decode($itmp); $i+=1;
/* }while($itmp == '' && $i<= 1 ); 根据情况修改循环条件*/
    if ($itmp != '') {//判断是否调用失败，下行同
        if ($itmp->success != FALSE) {
            $imem->add('c_vistors',$itmp->history->pageviews,FALSE,259200);
            //添加数据到Memcache中，并设置失效时间为3天，这里可以自己更改（单位为秒）！
            $clicki_vistors = $itmp->history->pageviews
 
            unset $itmp;//销毁Object
 
            $click_str = "\n<!--GET Remote Data-->".'总访问量：'.$clicki_vistors.'次';
            //组合字串
        }else{
            $click_str = FALSE;
        }
    }else{
        $click_str = FALSE;
    }
}else{
    $click_str = "\n<!--Form Memc-->总访问量：".($clicki_vistors).' 次';
    //$imem->increment('c_vistors');
    //去掉注释，每次被访问可以自动加1，这个视情况可以去掉
    //博主就没去掉。。。不知道是啥原因，总是加2。。。。
}