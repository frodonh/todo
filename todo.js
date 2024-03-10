/** Status names, the value is the order of the name in this array */
const statusnames=['À faire','En cours','Terminé','Abandonné'];
/** Description of the fields of a task. Each element in this array corresponds to a field. It has the following members:
 * <dl>
 * 	<dt>name</dt><dd>Name of the field</dd>
 * 	<dt>to_text</dt><dd>Function used to convert the value of the field to a string. If null the standard conversion is used.</dd>
 * 	<dt>from_text</dt><dd>Function used to convert a string to a value of this field. If null the standard conversion is used.</dd>
 * 	<dt>encode</dt><dd>Function used to encode the field in a POST request</dd>
 * </dl>
 */
const fields=[
	{'name':'task','to_text':null,'from_text':null,'encode':null},
	{'name':'resp','to_text':null,'from_text':null,'encode':null},
	{'name':'other','to_text':null,'from_text':null,'encode':null},
	{'name':'due','to_text':null,'from_text':null,'encode':(val)=>(val?('&due='+val):'')},
	{'name':'status','to_text':(val)=>statusnames[val],'from_text':(val)=>statusnames.indexOf(val),'encode':(val)=>(val?('&status='+val):'')},
	{'name':'comment','to_text':null,'from_text':null,'encode':null}
];
/** Id of the task being edited in the popup editor */
let currentid;
/** Array of tasks */
let tasks;
/** Name of the popup currently opened, or null if no popup is opened */
let popupopened=null;

/**************************
 *     Class Records      *
 **************************/
/** Array of records (tasks). The class has the following member variables:
 * <dl>
 * 	<dt>tbody</dt><dd>DOM element (tbody) which will display the records</dd>
 * 	<dt>records</dt><dd>Array of records</dd>
 * 	<dt>cat</dt><dd>Category of the task list</dd>
 * 	<dt>editmode</dt><dd>True if the table may be edited</dd>
 * 	<dt>sort_order</dt><dd>Sorting order of the table</dd>
 *  <td>full</dt><dd>True if all the tasks are loaded</dd>
 * 	<dt>filters</dt><dd>Filters applied to the display</dd>
 * </dl>
 */
class Records {
	constructor(tbody,params) {
		this.tbody=tbody;
		this.params=params;
		this.sort_order='due';
		this.filters={
			'text':null,
			'dates':[null,null],
			'status':["0","1"]
		};
		this.load_from_server()
	}

	/** Reload the list of tasks from the server
	 * @param {boolean} full - If true, load all the tasks. Otherwise don't load tasks which are finished of abandonned
	 */
	load_from_server(full=false) {
		let th=this;
		let xhttp=new XMLHttpRequest();
		xhttp.open('POST','todo.php',true);
		xhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
		xhttp.onload=function() {
			if (this.responseText=="") return;
			th.records=[];
			th.full=full;
			let arr=JSON.parse(this.responseText);
			let retparams=arr.pop();
			th.cat=parseInt(retparams['cat']);
			th.editmode=(retparams['edit'] && retparams['edit']=='ok');
			for (let line of arr) th.records.push(new Record(line));
			if (!th.editmode) document.body.classList.add('readonly');
			th.update_table(true);
		}
		let req='action=list';
		for (const pname of ['key','list']) if (this.params[pname]) req+='&'+pname+'='+this.params[pname];
		if (full) req+='&full=1'
		xhttp.send(req);
	}

	/** Test if a record is matching the filter
	 * @param {object} rec - Record testes
	 * @returns True if the object matches the filter, false otherwise
	 */
	filter(rec) {
		if (rec.values['status'] && !this.filters['status'].includes(rec.values['status'])) return false;
		if (rec.values['due']) {
			if (this.filters['dates'][0] && rec.values['due']<this.filters['dates'][0]) return false;
			if (this.filters['dates'][1] && rec.values['due']>this.filters['dates'][1]) return false;
		}
		if (this.filters['text']) {
			let found=false;
			for (let field of ['task','resp','other','comment']) if (this.filters['text'].test(rec.values[field])) found=true;
			return found;
		}
		return true;
	}

	/** Return a compare function suited to the sorting order of the task list
	 * @returns {function} Compare function that can be used to sort the table
	 */
	compare_function() {
		let reverse=1;
		let f;
		if (this.sort_order.startsWith('-')) {
			reverse=-1;
			f=this.sort_order.substring(1);
		} else f=this.sort_order;
		return function(a,b) {
			if (a.values[f]===null) return 1;
			if (b.values[f]===null) return -1;
			if (a.values[f]==b.values[f]) return 0;
			return reverse*((a.values[f]<b.values[f])?-1:1);
		}
	}

	/** Load the filter values from the popup window */
	load_filter_from_window() {
		let fil=document.getElementById('ffilter').value;
		if (fil) this.filters['text']=new RegExp(fil); else this.filters['text']=null;
		fil=document.getElementById('fdueafter').value;
		if (fil) this.filters['dates'][0]=fil; else this.filters['dates'][0]=null;
		fil=document.getElementById('fduebefore').value;
		if (fil) this.filters['dates'][1]=fil; else this.filters['dates'][1]=null;
		this.filters['status']=[];
		for (let i=0;i<4;++i) if (document.getElementById('fcheck'+i).checked) this.filters['status'].push(''+i);
	}

	/** Recreate the table
	 * @param {boolean} sort - If true, the records are sorted before recreating the table
	 */
	update_table(sort=true) {
		if (!this.full && (this.filters['status'].includes('2') || this.filters['status'].includes('3'))) this.load_from_server(true);
		else if (sort) this.records.sort(this.compare_function());
		this.tbody.innerHTML='';
		for (const rec of this.records) {
			rec.row=null;
			if (this.filter(rec)) {
				rec.create_row(this.editmode);
				this.tbody.appendChild(rec.row);
			}
		}
	}

	/**
	 * Calculate the position at which a new record should be inserted to match the sorting order. The function executes a binary search algorithm.
	 * @param {object} rec - New record that should be inserted
	 * @returns Position at which the record should be inserted
	 */
	insert_position(rec) {
		if (!this.sort_order) return this.records.length;
		if (this.records.length==0) return 0;
		const cmp=this.compare_function();
		let a=0;
		let b=this.records.length-1;
		if (cmp(this.records[a],rec)>=0) return 0;
		if (cmp(rec,this.records[b])>=0) return this.records.length;
		while (a+1<b) {
			let c=Math.trunc((a+b)/2);
			let comp=cmp(rec,this.records[c]);
			if (comp==0) return c;
			if (comp<0) b=c; else a=c;
		}
		return b;
	}

	/** Insert a new record in the array and maintain the sorting order.
	 * @param {object} rec - New record that should be inserted
	 */
	insert(rec) {
		let p=this.insert_position(rec);
		this.records.splice(p,0,rec);
		rec.create_row(this.editmode);
		let i=p+1;
		while (i<this.records.length && this.records[i].row==null) ++i;
		if (i<this.records.length) this.tbody.insertBefore(rec.row,this.records[i].row); else this.tbody.appendChild(rec.row);
	}

	/** Change a record of the array and maintain the sorting order.
	 * @param {object} rec - Record with the new values. The record in the table with the same 'id' get changed by this function.
	 * @returns DOM node corresponding to the newly-inserted record
	 */
	change(rec) {
		let oldrec=this.records.find((a)=>(a.values['id']==rec.values['id']));
		let p;
		if (this.compare_function()(oldrec,rec)==0 || this.records[p=this.insert_position(rec)]===oldrec) {
			for (const field of fields) oldrec.values[field.name]=rec.values[field.name];
			oldrec.write_to_row();
			return oldrec.row;
		}
		for (const field of fields) oldrec.values[field.name]=rec.values[field.name];
		oldrec.write_to_row();
		const oldrecpos=this.records.indexOf(oldrec);
		if (p==this.records.length) {
			this.records.push(this.records.splice(oldrecpos,1)[0]);
			return this.tbody.insertBefore(oldrec.row,null);
		}
		if (oldrecpos<p) p=p-1;
		this.records.splice(p,0,this.records.splice(oldrecpos,1)[0]);
		let i=p+1;
		while (i<this.records.length && this.records[i].row==null) ++i;
		if (i==this.records.length) return this.tbody.insertBefore(oldrec.row,null); 
		return this.tbody.insertBefore(oldrec.row,this.records[i].row);
	}

	/** Create a CSV from the list of records
	 * @returns CSV data 
	 */
	to_csv() {
		let res='"Quoi ?","Qui ?","Avec qui ?","Pour quand ?","Statut","Commentaires"\n';
		for (const rec of this.records) {
			for (let i=0;i<fields.length;++i) {
				if (i>0) res+=',';
				let val=null;
				if (fields[i].to_text) val=fields[i].to_text(rec.values[fields[i].name]); else val=rec.values[fields[i].name];
				if (val) res+='"'+val.replace(/"/g,'""')+'"'; else res+='""';
			}
			res+="\n";
		}
		return res;
	}

	/** Create a JSON from the list of records
	 * @returns JSON data 
	 */
	to_json() {
		return JSON.stringify(this.records)
	}

	/** Export the list of records to a given format
	 * @param {string} format - Format of the export
	 * @returns Exported string
	 */
	to_format(format) {
		if (format=='csv') return this.to_csv();
		else if (format=='json') return this.to_json();
	}
}

/**************************
 *      Class Record      *
 **************************/
/** Record type: a record is a task. It has the following member variables:
 * <dl>
 * 	<dt>values</dt><dd>Array of the task's attributes, the same as the fields described in {@link fields} variable (with an additional 'id')</dd>
 * 	<dt>row</dt><dd>DOM table row corresponding to the record</dd>
 * </dl>
 */
class Record {
	constructor(task=null,row=null) {
		this.values={};
		if (task) Object.assign(this.values,task);
		else {
			this.values['id']=null;
			for (const field of fields) this.values[field.name]=null;
		}
		this.row=row;
	}

	/** Load a record from the values of the editor popup */
	load_from_editor() {
		for (const field of fields) this.values[field.name]=document.getElementById('t'+field.name).value;
	}

	/** Write the record values to the editor popup */
	write_to_editor() {
		for (const field of fields) document.getElementById('t'+field.name).value=this.values[field.name];
	}

	/** Write the editor values to the DOM */
	write_to_row() {
		for (let i=0;i<fields.length;++i) {
			if (fields[i].to_text) this.row.children[i+1].textContent=fields[i].to_text(this.values[fields[i].name]);
			else this.row.children[i+1].textContent=this.values[fields[i].name];
		}
	}

	/** Associate a new DOM element to the record
	 * @param {boolean} editmode - True if the row may be edited
	 */
	create_row(editmode=false) {
		this.row=document.createElement('tr');
		this.row.dataset['key']=this.values['id'];
		let td=document.createElement('td');
		if (editmode) td.innerHTML='<button type="button" title="Tâche achevée" onclick="check(this)"><img src="check.svg" style="width: 1em" /></button> <button type="button" title="Éditer" onclick="edit(this)"><img src="edit.svg" style="width: 1em" /></button>';
		this.row.appendChild(td);
		for (let i=0;i<fields.length;++i) this.row.appendChild(document.createElement('td'));
		this.write_to_row();
	}

	/** Return an encoded serialized version of the record, suitable for a POST request
	 * @returns {string} Encoded version of the string
	 */
	encode() {
		let res='id=';
		res+=encodeURIComponent(this.values['id']);
		for (const field of fields) 
			if (this.values[field.name]!=null) {
				if (field.encode) res+=field.encode(this.values[field.name]); 
				else res+='&'+field.name+'='+encodeURIComponent(this.values[field.name]);
			}
		return res;
	}
}

/**************************
 *         Events         *
 **************************/
/**
 * Event handler used when the title of a column is pressed, change the sort order
 * @param {object} sender - DOM object responsible for the event (link)
 */
function change_sort(sender) {
	let columns=document.querySelectorAll("table#list > thead > tr > th");
	let i=0;
	while (columns.item(i)!=sender.parentNode) ++i;
	let fname=fields[i-1].name;
	if (tasks.sort_order==fname) tasks.sort_order='-'+fname; else tasks.sort_order=fname;
	tasks.update_table(true);
}

/**
 * Open a popup window
 * @param {string} win - Id of the popup in the DOM
 */
function open_window(win) {
	let overlay=document.getElementById('overlay');
	overlay.style.opacity='0';
	overlay.style.display='block';
	let editor=document.getElementById(win);
	editor.style.maxHeight='0px';
	editor.style.display='block';
	editor.style.overflow='hidden'; 
	let tfield=editor.getElementsByTagName('input')[0];
	if (tfield) {
		tfield.focus();
		tfield.select();
	}
	popupopened=win;
	setTimeout(function() { 
		editor.style.maxHeight='100%';
		editor.addEventListener('transitionend',() => editor.style.overflow='auto',{'once':true});
		overlay.style.opacity='0.5'; }
	,50);
}

/**
 * Close a popup window
 * @param {string} win - Id of the popup in the DOM
 */
function close_window(win) {
	let overlay=document.getElementById('overlay');
	let editor=document.getElementById(win);
	overlay.addEventListener('transitionend',() => overlay.style.display='none',{'once':true});
	editor.addEventListener('transitionend',() => editor.style.display='none',{'once':true});
	overlay.style.opacity='0';
	editor.style.overflow='hidden';
	editor.style.maxHeight='0px';
	popupopened=null;
}

/**
 * Function launched when the user completes the edition of a task
 */
function validate_editor() {
	let xhttp=new XMLHttpRequest();
	xhttp.open('POST','todo.php',true);
	xhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	if (currentid) {
		let rec=new Record();
		rec.load_from_editor();
		rec.values['id']=currentid;
		xhttp.onload=function() {
			let row=tasks.change(rec);
			row.addEventListener('animationend',() => row.classList.remove('blink'),{'once':true});
			row.classList.add('blink');
			close_window('editor');
		}
		let req='action=update';
		for (const pname of ['key','list']) if (tasks.params[pname]) req+='&'+pname+'='+tasks.params[pname];
		xhttp.send(req+'&'+rec.encode());
	}
	else {
		let rec=new Record();
		rec.load_from_editor();
		xhttp.onload=function() {
			rec.values['id']=parseInt(this.responseText);
			tasks.insert(rec);
			rec.row.addEventListener('animationend',() => rec.row.classList.remove('blink'),{'once':true});
			rec.row.classList.add('blink');
			close_window('editor');
		}
		let req='action=insert';
		for (const pname of ['key','list']) if (tasks.params[pname]) req+='&'+pname+'='+tasks.params[pname];
		xhttp.send(req+'&cat='+tasks.cat+'&'+rec.encode());
	}
}

/**
 * Update the filter
 */
function validate_filter() {
	tasks.load_filter_from_window();
	tasks.update_table(false);
	close_window('filters');
}

/**
 * Start editing a task
 * @param {object} obj - DOM object responsible for the event (button)
 */
function edit(obj) {
	let rec;
	if (obj) {
		currentid=obj.parentNode.parentNode.dataset['key'];
		rec=tasks.records.find((a)=>(a.values['id']==currentid));
		document.getElementById('editor').getElementsByTagName('h1')[0].textContent='Éditer la tâche';
	} else {
		rec=new Record();
		currentid=null;
		document.getElementById('editor').getElementsByTagName('h1')[0].textContent='Nouvelle tâche';
	}
	rec.write_to_editor();
	open_window('editor');
}

/**
 * Check a task, indicating it is achieved
 * @param {object} obj - DOM object responsible for the event (button)
 */
function check(obj) {
	let oldrec=tasks.records.find((a)=>(a.values['id']==obj.parentNode.parentNode.dataset['key']));
	if (oldrec.values['status']=="2") return;
	let xhttp=new XMLHttpRequest();
	xhttp.open('POST','todo.php',true);
	xhttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	let rec=new Record();
	Object.assign(rec,oldrec);
	rec.values['status']="2";
	xhttp.onload=function() {
		let row=tasks.change(rec);
		row.addEventListener('animationend',() => row.classList.remove('blink'),{'once':true});
		row.classList.add('blink');
	}
	let req='action=update';
	for (const pname of ['key','list']) if (tasks.params[pname]) req+='&'+pname+'='+tasks.params[pname];
	xhttp.send(req+'&'+rec.encode());
}

/**
 * Export the table to a CSV file
 * @param {string} format - Format of the output file, either 'csv' or 'json'
 */
function export_list(format) {
	let exporters = {
		'csv': {'mime':'text/csv', 'ext':'csv'},
		'json': {'mime':'application/json', 'ext':'json'}
	}
	let encodeduri=encodeURI(tasks.to_format(format));
	let a=document.getElementById('downloadfile');
	if (!a) {
		a=document.createElement('a');
		a.style.display='none';
		a.id='downloadfile';
		document.body.appendChild(a);
	}
	a.setAttribute('href','data:'+exporters[format].mime+';charset=utf-8,'+encodeduri);
	a.setAttribute('download',tasks.params['list']);
	a.click();
}

/**************************
 *      Main program      *
 **************************/
document.addEventListener("DOMContentLoaded",function(event) {
	// Events
	document.addEventListener("keydown",function(event) {
		if (popupopened && event.key=="Escape") close_window(popupopened);
	});
	// Retrieve request params
	let params={};
	location.search.substring(1).split("&").forEach(function(item) {
		let pvalue=item.split('=');
		params[pvalue[0]]=pvalue[1];
	});
	// Prepare interface
	document.querySelector('body > h1').textContent+=' '+params['list'];
	// Initialize table of tasks
	tasks=new Records(document.getElementById('list').getElementsByTagName('tbody')[0],params);
});
