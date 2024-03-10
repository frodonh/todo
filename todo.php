<?php
require 'login.php';

function encrypt($cat) {
	return substr(base64_encode(str_rot13(strtoupper($cat))),0,-1);
}

function test_authorized($cat,$key) {
	return $key==encrypt($cat);
}

if (array_key_exists('action',$_POST))	{	
	if ($_POST['action']=='list') {	// List all tasks
		$dbconn=pg_connect("host=".$host." dbname=".$dbname." user=".$user." password=".$password) or die ('Impossible to connect to the database: '.pg_last_error());
		$res=pg_query_params("select id from todo.categories where name ilike $1",array($_POST['list'])) or die('Request failed: '.pg_last_error());
		$cat=pg_fetch_row($res)[0];
		if ($cat) {
			if (array_key_exists('full',$_POST) && $_POST['full']=='1')
				$res=pg_query_params("select id,task,resp,due,status,comment,other from todo.todo where cat=$1",array($cat)) or die('Request failed: '.pg_last_error());
			else
				$res=pg_query_params("select id,task,resp,due,status,comment,other from todo.todo where cat=$1 and (status is null or status<=1)",array($cat)) or die('Request failed: '.pg_last_error());
			$list=pg_fetch_all($res);
			if (!$list) $list=array();
			$params=array("cat"=>$cat);
			if (array_key_exists('key',$_POST) && test_authorized($_POST['list'],$_POST['key'])) $params["edit"]="ok";
			array_push($list,$params);
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
	elseif ($_POST['action']=='create') {	// Create a new list
		$dbconn=pg_connect("host=".$host." dbname=".$dbname." user=".$user." password=".$password) or die ('Impossible to connect to the database: '.pg_last_error());
		pg_query_params("insert into todo.categories (name) values ($1)",array($_POST['name'])) or die('Request failed: '.pg_last_error());
		echo "OK\n";
		echo encrypt($_POST['name']);
		pg_close($dbconn);
	}
	elseif ($_POST['action']=='upsert') {	// Insert several actions from the same source. Delete the old rows with the same source
		if (!(array_key_exists('key',$_POST) && test_authorized($_POST['list'],$_POST['key']))) return;
		$dbconn=pg_connect("host=".$host." dbname=".$dbname." user=".$user." password=".$password) or die ('Impossible to connect to the database: '.pg_last_error());
		pg_query_params("delete from todo.todo where source=$1",array($_POST["source"])) or die('Request failed: '.pg_last_error());
		$res=pg_query_params("select id from todo.categories where name ilike $1",array($_POST['list'])) or die('Request failed: '.pg_last_error());
		$cat=pg_fetch_row($res)[0];
		$table=json_decode($_POST['table']);
		$rows=array();
		foreach ($table as $row) {
			array_push($rows,implode('|',array($row->task,$row->resp,$row->due,$cat,$_POST["source"])). "\n");
		}
		pg_copy_from($dbconn,"todo.todo (task,resp,due,cat,source)",$rows,"|","") or die('Request failed: '.pg_last_error());
		echo "OK";
		pg_close($dbconn);
	}
}
?>
