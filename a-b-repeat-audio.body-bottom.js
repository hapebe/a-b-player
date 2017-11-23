$(
function(){
	// $('a.how').fancybox();
	$('#panelPlayer').hide();
	
	// route track selection filter clicks:
	$('#filterPartEnsemble').change(function() { 
		var flag = $(this).is(':checked');
		document.abplayer.filterPartEnsemble = flag; 
		document.abplayer.trackselection.renderMenu();
		
		_paq.push(['trackEvent', 'Top', 'clickFilterPartEnsemble', (flag?'withEnsemble':'withoutEnsemble')]);
	});
	
	// route player button clicks:
	$('#btnAtime').click(document.abplayer.setA);
	$('#btnBtime').click(document.abplayer.setB);
	$('#btnPreA').click(function() { document.abplayer.setAB('A', -1, 0) } );
	$('#btnNextA').click(function() { document.abplayer.setAB('A', 1, 0) } );
	$('#btnPreB').click(function() { document.abplayer.setAB('B', -1, 0) } );
	$('#btnNextB').click(function() { document.abplayer.setAB('B', 1, 0) } );
	$('#btnClearAB').click(document.abplayer.clearAB);
	$('#btnAddPreset').click(document.abplayer.addFavor);
	

	document.abplayer.init();
	
	// setTimeout(function(){ document.abplayer.openWebFile('audio/Bye, Bye Blackbird-Sopran.mp3'); }, 2000);
	// setTimeout(function(){ document.abplayer.openMeta("data/royals-s.json"); }, 500);	
	
	// check whether file was specified in the URL/# part:
	var hash = document.location.hash; // console.log(document.location.hash);
	if (hash) {
		var dataURL = 'data/' + hash.substring(1) + '.json';
		document.abplayer.ui.clickOpenMeta(dataURL); // console.log(dataURL);
		_paq.push(['trackEvent', 'Init', 'openByHash', hash.substring(1)]);
	}
}
);

document.abplayer = new function(){};

// global vars:
document.abplayer.filterPart = ''; // voice group selection in track selection view
document.abplayer.filterPartEnsemble = true; // track selection view: include ensemble tracks?

// loop name of currently active "favorite" / "preset" (loop):
document.abplayer.currentPresetDesc = '';

document.abplayer.aTime = -1;
document.abplayer.bTime = -1;
document.abplayer.presetList = new Array();
document.abplayer.jumpList = new Array();
document.abplayer.audio = $("#audioPlayer").get(0);
document.abplayer.fileInfo = {
	'title': 'Drag &amp; drop files or click &quot;Open file...&quot;',
	'url': false,
	'presets': []
};
document.abplayer.tracksData = new Array(); // all available tracks (meta data file index)

document.abplayer.register = true; // log some activity or ignore it?



document.abplayer.init = function() {
	document.abplayer.register=false;
	document.abplayer.disableControls();
	document.abplayer.register=true;

	document.abplayer.audio.addEventListener('canplay', document.abplayer.enableControls);
	document.abplayer.audio.addEventListener('timeupdate', document.abplayer.checkRepeat, false);
	document.abplayer.audio.addEventListener('playing', document.abplayer.registerPlaying);
	document.abplayer.audio.addEventListener('pause', document.abplayer.registerPause);
	document.abplayer.audio.addEventListener('ended', document.abplayer.repeatAB);
	
	document.abplayer.trackselection.loadTracksData('./data/tracks.json');

	// file input and DND handling:
	$('#files').bind('change', handleFileSelect1);
	document.body.addEventListener('dragover', handleDragOver, false);
	document.body.addEventListener('drop', handleFileSelect, false);
	
	
}

document.abplayer.ui = new function(){};
document.abplayer.ui.clickOpenMeta = function(url) {
	// TODO: loading... message, show player only on success.
	document.abplayer.openMeta(url);

	$('#panelPlayer').show();
	$('#panelTrackSelection').hide();
};

document.abplayer.ui.clickRelated = function(url, code) {
	// ... a track has been requested via the related tracks widget - 

	_paq.push(['trackEvent', 'Track', 'selectTrackRelated', document.abplayer.fileInfo.title + ' to ' + code]);
	
	document.abplayer.openMeta(url);

	$('#panelPlayer').show();
	$('#panelTrackSelection').hide();
};

document.abplayer.ui.closePlayer = function() {
	_paq.push(['trackEvent', 'Track', 'closeTrack', document.abplayer.fileInfo.title]);
	
	document.abplayer.register = false;
	document.abplayer.audio.pause();
	setTimeout(function(){ document.abplayer.register = true; }, 500);
	
	$('#panelPlayer').hide();
	$('#panelTrackSelection').show();
	
};

document.abplayer.ui.clickFilterPart = function (code, label) {
	document.abplayer.filterPart = code;
	$('#filterPartLabel').html(label);
	document.abplayer.trackselection.renderMenu();
	
	_paq.push(['trackEvent', 'Top', 'clickFilterPart', code]);
};


document.abplayer.trackselection = new function(){};
document.abplayer.trackselection.loadTracksData = function(url) {
	$.getJSON(url)
	.done(function(data) { // console.log(data);
		document.abplayer.tracksData = data.tracks;
		document.abplayer.trackselection.renderMenu();
	})
	.fail(function(jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		console.log( "Request Failed: " + err );
		_paq.push(['trackEvent', 'Top', 'ERROR loadTracksData', err]);
	});
};
document.abplayer.trackselection.renderMenu = function() {
	var matches = [];
	var filterPart = document.abplayer.filterPart; // strict filter (including sub-voice-group, e.g. Sopran 2)
	var wideFilterPart = filterPart.replace(/[0-9]/,""); // loose filter (i.e. treats Sopran 2 as Sopran)
		// console.log(filterPart + "/" + wideFilterPart);
	var acceptEnsembleVersions = document.abplayer.filterPartEnsemble;
	
	$.each(
		document.abplayer.tracksData, 
		function(index, value) { // console.log(value.title + "; " + value.part);
			if ((!acceptEnsembleVersions) && (value.part.match(/[0]/g) != null)) {
				// it is an ensemble version, skip:
				return;
			}
			if (filterPart.length == 0) { // accept all:
				matches.push(value);
				return;
			}
			if (value.part.indexOf(filterPart) != -1) { // strict match:
				matches.push(value);
				return;
			}
			if (value.part.match(/[1-9]/g) == null) { // the tracks itself is not for a sub-voice group!
				if (value.part.indexOf(wideFilterPart) != -1) { // loose match:
					matches.push(value);
					return;
				}
			}
		}
	); // console.log(matches);
	
	var targets = ['trackSelection1', 'trackSelection2'];
	var html = new Array();
	for (var i=0; i<targets.length; i++) { html[i] = ''; }
	for (var i=0; i<matches.length; i++) {
		var stringIdx = Math.floor(i * 2 / matches.length);
		var o = matches[i];
		var additionalClasses = '';
		if (o.category) additionalClasses += 'btn-'+o.category+' ';
		html[stringIdx] += 
			'<button type="button" class="btn btn-default ' + additionalClasses + 'btn-block" onclick="document.abplayer.ui.clickOpenMeta(\''
			+ 'data/' + o.dataURL 
			+ '\')">'
			+ o.title
			+ '</button>\n';
	}
	for (var i=0; i<targets.length; i++) { 
		$('#'+targets[i]).html(html[i]);
	}
	
};

// 


document.abplayer.clearAB = function() {
	document.abplayer.aTime = -1;
	document.abplayer.bTime = -1;
	document.abplayer.updateABButtons();

	if (document.abplayer.register) {
		_paq.push(['trackEvent', 'Track', 'clearAB', document.abplayer.fileInfo.title]);
	}

	// clear latest active loop setting:
	// document.abplayer.currentPresetDesc	= '';
	
	$('#btnPresetsLabel').html('Preset Loops: ...');
}

document.abplayer.setAB = function(target, value, mode) {
	// console.log('A: '+document.abplayer.aTime + 'B: ' + document.abplayer.bTime);
	
	var x = -2;
	if (target == 'A') x = document.abplayer.aTime;
	if (target == 'B') x = document.abplayer.bTime;
	if (x == -2) {
		// TODO: error handling (illegal target)
	}
	
	if (mode == 0) { // relative adjustment:
		if (x + value < 1) {return};
		x = x + value;
	} else if (mode == 1) { // absolute set value:
		x = value;
	} else {
		// TODO: error handling
	}
	
	if (target == 'A') {
		document.abplayer.aTime = x;
		if (document.abplayer.bTime > 0) {
			if (document.abplayer.aTime >= document.abplayer.bTime) document.abplayer.bTime = document.abplayer.aTime + 1;
		}
	}
	if (target == 'B') {
		document.abplayer.bTime = x;
		if (document.abplayer.aTime >= document.abplayer.bTime) document.abplayer.aTime = document.abplayer.bTime - 1;
	}
	// console.log('A: '+document.abplayer.aTime + 'B: ' + document.abplayer.bTime);
	
	document.abplayer.updateABButtons();
}

document.abplayer.addFavor = function() {
	if (document.abplayer.bTime < 1) {return;}
	
	var p = {t0:document.abplayer.aTime, t1:document.abplayer.bTime, desc:"custom"};
	document.abplayer.presetList.push(p);
	document.abplayer.renderFavorList();
}

document.abplayer.playFavor = function(i) {
	var o = document.abplayer;

	var p = o.presetList[i];
	
	// title line of dropdown list
	$('#btnPresetsLabel').html(p.desc); 
	
	// full list - mark the current entry as active, all others as not:
	$('#presetListLarge a').removeClass('active');
	$('#largePresets' + i).addClass('active');
	
	// remember this setting - if another track is selected next; we will try to activate a loop with the same description: 
	o.currentPresetDesc	= p.desc; // console.log("Trying to set currentPresetDesc: " + o.currentPresetDesc);

	_paq.push(['trackEvent', 'Track', 'selectLoop', o.currentPresetDesc]);
	
	document.abplayer.register = false;
	
	document.abplayer.audio.pause();
	o.setAB('A', p.t0 * 1, 1);
	o.setAB('B', p.t1 * 1, 1);
	o.repeatAB();
	
	setTimeout(function(){ document.abplayer.register = true; }, 1000);
}

document.abplayer.renderFavorList = function() {
	var o = document.abplayer;
	// dropdown list:
	var lines = [];
	for (var i = 0; i < o.presetList.length; i++) {
		var p = o.presetList[i];
		lines.push(
			"<li onclick='document.abplayer.playFavor(" + i + ")'>" 
			+ o.formatTime(p.t0) + " - " 
			+ o.formatTime(p.t1) + ": " 
			+ p.desc + "</li>");
	}
	$("#favorlist_ul").html(lines.join(""));
	
	// full list (#presetListLarge):
	lines = ['<span class="list-group-item" id="btnLargePresetsLabel">Preset Loops:</span>'];
	for (var i = 0; i < o.presetList.length; i++) {
		var p = o.presetList[i];
		lines.push(
			'<a href="#" onclick="document.abplayer.playFavor(' + i +')" class="list-group-item" id="largePresets' + i + '">'
			+ p.desc + '<span class="badge">'
			+ (p.measure ? 'T. '+p.measure+', ' : '')
			+ o.formatTime(p.t0) + ' - ' + o.formatTime(p.t1)
			+ '</span></a>'
		);
	}
	$("#presetListLarge").html(lines.join(""));
}

document.abplayer.renderRelatedTrackList = function() {
	// TODO: handle if no related tracks are present (hide the whole list / menu!)
	if (document.abplayer.fileInfo.trackset && document.abplayer.fileInfo.trackset.length > 0) {
		$('#relatedTrackContainer').show();
		var lines = [];
		$.each(
			document.abplayer.fileInfo.trackset, 
			function (index, value) {
				for (var prop in value) { // console.log(prop + ": " + value[prop]);
					lines.push(
						'<a type="button" class="btn btn-default" onclick="document.abplayer.ui.clickRelated(\''
						+ 'data/' + value[prop] + '.json\''
						+ ', '
						+ '\'' + value[prop] + '\''
						+ ')">' + prop + '</a>'
					);
				}
			}
		);
		$('#relatedTrackDiv').html(lines.join(""));
	} else { // no related tracks!
		$('#relatedTrackContainer').hide();
	}
}


document.abplayer.disableControls = function() {
	document.abplayer.presetList = new Array();
	document.abplayer.renderFavorList();
	
	$('#repeatControl *').attr("disabled", true);
	$('#repeatControl').removeClass('enabled');
	$('#repeatControl').addClass('disabled');
	document.abplayer.clearAB();
};

document.abplayer.enableControls = function() {
	// is called by the canplay event of the audio control!
	$('#repeatControl').removeClass('disabled');
	$('#repeatControl').addClass('enabled');
	$("#repeatControl *").attr("disabled", false);
	
	document.abplayer.audio.play();
};


/**
 * open a meta information (JSON) file; and based on it, an audio file
 * scope: player panel
 */
document.abplayer.openMeta = function(url) {
	var o = document.abplayer;

	document.abplayer.register=false;
	o.disableControls();
	document.abplayer.register=true;
	
	$.getJSON(url)
	.done(function(data) { // console.log(data);
		o.fileInfo = data;

		// track successful opening:
		_paq.push(['trackEvent', 'Top', 'openTrack', o.fileInfo.title]);

		o.presetList = o.fileInfo.presets;
		o.renderFavorList();
		o.renderRelatedTrackList();
		
		$("#filename").html(o.fileInfo.title);
		o.audio.src = o.fileInfo.url;
		
		// try to restore the latest active preset:
		if (o.currentPresetDesc.length > 0) { // console.log("Trying to restore currentPresetDesc: " + o.currentPresetDesc);
			$.each(
				o.presetList,
				function (index, value) {
					for (var prop in value) { // console.log(prop + ": " + value[prop]);
						if (prop=='desc' && value[prop]==o.currentPresetDesc) { // console.log("Found at [" + index + "]");
							o.playFavor(index);
						}
					}
				}
			);
		}
		
	})
	.fail(function(jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		console.log( "Request Failed: " + err );
		_paq.push(['trackEvent', 'Top', 'ERROR openTrack', err]);
	});
};

document.abplayer.openWebFile = function(url) {
	document.abplayer.disableControls();

	$("#filename").html("" + url);
	
	document.abplayer.audio.src = url; 
};

/** 
 * open audio file from file input form control
 */ 
function openFile(file) { 			
	// console.log(file);
	document.abplayer.disableControls();

	$("#filename").html("" + file.name);
	if (window.webkitURL) window.URL = window.webkitURL;
	var objectURL = window.URL.createObjectURL(file); // console.log(objectURL);
	document.abplayer.audio.src = objectURL; 
}

document.abplayer.setA = function() { 
	document.abplayer.setAB('A', parseInt(document.abplayer.audio.currentTime), 1); 
	_paq.push(['trackEvent', 'Track', 'setA', document.abplayer.fileInfo.title]);
}
document.abplayer.setB = function() { 
	document.abplayer.setAB('B', parseInt(document.abplayer.audio.currentTime), 1); 
	_paq.push(['trackEvent', 'Track', 'setB', document.abplayer.fileInfo.title]);

	document.abplayer.repeatAB();
}

document.abplayer.repeatAB = function() {
	var jumpTo = Math.max(0, document.abplayer.aTime);

	var globalRegister = document.abplayer.register;
	if (globalRegister) {
		_paq.push(['trackEvent', 'Track', 'repeat', document.abplayer.fileInfo.title]);
	}
	// even if globalRegister is active, we don't want to see our own sub-routine re-start:
	document.abplayer.register = false;
	
	document.abplayer.audio.pause();
	document.abplayer.audio.currentTime = jumpTo;
	document.abplayer.audio.play();
	
	if (globalRegister) {
		setTimeout(function(){ document.abplayer.register = true; }, 500);
	}
}

document.abplayer.checkRepeat = function() {
	if (document.abplayer.bTime < 0) return;
	if (document.abplayer.audio.currentTime > document.abplayer.bTime) { 
		document.abplayer.repeatAB(); 
	}
};

document.abplayer.registerPlaying = function() {
	if (document.abplayer.register) {
		_paq.push(['trackEvent', 'Track', 'playing', document.abplayer.fileInfo.title]);
	}
};
document.abplayer.registerPause = function() {
	if (document.abplayer.register) {
		_paq.push(['trackEvent', 'Track', 'pause', document.abplayer.fileInfo.title]);
	}
};

document.abplayer.updateABButtons = function() {
	var aTime = document.abplayer.aTime;
	if ( aTime < 0) {
		$("#btnAtime").html("A");
	} else {
		$("#btnAtime").html("A[" + document.abplayer.formatTime(aTime) + "]");
	}
	var bTime = document.abplayer.bTime;
	if ( bTime < 0) {
		$("#btnBtime").html("B");
	} else {
		$("#btnBtime").html("B[" + document.abplayer.formatTime(bTime) + "]");
	}
};

document.abplayer.formatTime = function (secondsIn) {
	var min = Math.floor(secondsIn / 60);
	var sec = secondsIn % 60;
	return min + ':' + (sec<10?'0':'') + sec;
};

// file input handling:
function handleFileSelect1(evt) {
	var files = evt.target.files; // FileList object
	var file = files[0]; // console.log(file);
	openFile(file);
}

// file dnd handling:
function handleFileSelect(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	$("body").removeClass("dragover");

	var files = evt.dataTransfer.files; // FileList object.
	var file = files[0];
	openFile(file);
}

function handleDragOver(evt) {
	evt.stopPropagation();
	evt.preventDefault();
	evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
	$("body").addClass("dragover");
}
