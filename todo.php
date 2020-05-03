<?php
require 'login.php';

function test_authorized($cat,$key) {
	return $key==substr(base64_encode(str_rot13(strtoupper($cat))),0,-1);
}

if (array_key_exists('action',$_POST))	{	
	if ($_POST['action']=='list') {	// List all tasks
		$dbconn=pg_connect("host=".$host." dbname=".$dbname." user=".$user." password=".$password) or die ('Impossible to connect to the database: '.pg_last_error());
		$res=pg_query_params("select id from todo.categories where name ilike $1",array($_POST['list'])) or die('Request failed: '.pg_last_error());
		$cat=pg_fetch_row($res)[0];
		if ($cat) {
			$res=pg_query_params("select id,task,resp,due,status,comment,other from todo.todo where cat=$1 and (status is null or status<=1)",array($cat)) or die('Request failed: '.pg_last_error());
			$list=pg_fetch_all($res);
			$params=array("cat"=>$cat);
			if (array_key_exists('key',$_POST) && test_authorized($_POST['list'],$_POST['key'])) $params["edit"]="ok";
			if ($list) array_push($list,$params); else $list=$params;
			header("Content-Type: application/json");
			echo json_encode($list);
		}
		pg_free_result($res);
		pg_close($dbconn);
	}
	elseif ($_POST['action']=='update') {	// Update a task
		if (!(array_key_exists('key',$_POST) && test_authorized($_POST['list'],$_POST['key']))) return;
		$dbconn=pg_connect("host=".$host." dbname=".$dbname." user=".$user." password=".$password) or die ('Impossible to connect to the database: '.pg_last_error());
		pg_query_params("update todo.todo set task=$2,resp=$3,other=$4,due=$5,status=$6,comment=$7 where id=$1",array($_POST['id'],$_POST['task'],$_POST['resp'],$_POST['other'],$_POST['due'],$_POST['status'],$_POST['comment'])) or die('Request failed: '.pg_last_error());
		echo "OK";
		pg_close($dbconn);
	}
	elseif ($_POST['action']=='insert') {	// Create a new task
		if (!(array_key_exists('key',$_POST) && test_authorized($_POST['list'],$_POST['key']))) return;
		$dbconn=pg_connect("host=".$host." dbname=".$dbname." user=".$user." password=".$password) or die ('Impossible to connect to the database: '.pg_last_error());
		pg_query_params("insert into todo.todo (task,resp,other,due,status,comment,cat) values ($1,$2,$3,$4,$5,$6,$7)",array($_POST['task'],$_POST['resp'],$_POST['other'],$_POST['due'],$_POST['status'],$_POST['comment'],$_POST['cat'])) or die('Request failed: '.pg_last_error());
		$res=pg_query("select currval(pg_get_serial_sequence('todo.todo','id'))") or die('Request failed: '.pg_last_error());
		$row=pg_fetch_row($res);
		echo $row[0];
		pg_close($dbconn);
	}
}
?>
