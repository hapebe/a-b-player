$(function(){
	$('#panelPlayer').hide();
	$("#busyIndicator").hide();
	
	// route track selection filter clicks:
	$('#filterPartEnsemble').change(function() { 
		var flag = $(this).is(':checked');
		document.abplayer.filterPartEnsemble = flag; 
		document.abplayer.trackselection.renderMenu();
		
		_paq.push(['trackEvent', 'Top', 'clickFilterPartEnsemble', (flag?'withEnsemble':'withoutEnsemble')]);
	});
	
	// route player button clicks:
	$('#btnClosePlayer').click(document.abplayer.ui.closePlayer);
	$('#btnPlayPause').click(document.abplayer.ui.clickPlayPause);
	$('#btnAtime').click(document.abplayer.setA);
	$('#btnBtime').click(document.abplayer.setB);
	$('#btnPreA').click(function() { document.abplayer.setAB('A', -1, 0) } );
	$('#btnNextA').click(function() { document.abplayer.setAB('A', 1, 0) } );
	$('#btnPreB').click(function() { document.abplayer.setAB('B', -1, 0) } );
	$('#btnNextB').click(function() { document.abplayer.setAB('B', 1, 0) } );
	$('#btnClearAB').click(document.abplayer.clearAB);
	$('#btnAddPreset').click(document.abplayer.addPreset);
	$('#btnResetPresets').click(document.abplayer.ui.clickResetPresets);
	$('#btnClearPresets').click(document.abplayer.ui.clickClearPresets);

	
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
});

// document.abplayer vars and methods:
document.abplayer = {
printEvents: true, // debug player events to console.log?
register: true, // controll tracking: log activity or ignore it
registerProgressTimestamp: -1,

// overview / list:
tracksData: [], // all available tracks (meta data file index)
filterPart: '', // voice group selection in track selection view
filterPartEnsemble: true, // track selection view: include ensemble tracks?

// detail view / player:
canPlay: false, // is set by event from player, after audio file has been loaded
playTime: 0, // currently displayed play time (position in seconds)
aTime: -1, bTime: -1,
currentPresetDesc: '', // loop name of currently active "favorite" / "preset" (loop)
presetList: [], // preset loops, loaded from single track data (or managed manually)
fileInfo: {
	'title': 'Drag &amp; drop files or click &quot;Open file...&quot;',
	'url': false,
	'presets': []
},
	
init: function() {
	var ab = document.abplayer;
	
	// ab.audio = $("#audioPlayer").get(0); // with audio element
	
	ab.register=false;
	ab.disableControls();
	ab.register=true;

	// audio element event listeners:
	// ab.audio.addEventListener('canplay', document.abplayer.registerCanPlay);
	// ab.audio.addEventListener('timeupdate', document.abplayer.registerProgress, false);
	// ab.audio.addEventListener('playing', document.abplayer.registerPlaying);
	// ab.audio.addEventListener('pause', document.abplayer.registerPause);
	// ab.audio.addEventListener('ended', document.abplayer.registerEnded);
	
	// prepare wavesurfer:
	ab.wavesurfer = WaveSurfer.create({
		container: '#wavesurferTarget',
		waveColor: '#d9534f',
		progressColor: '#aaaaaa'
	});
	ab.wavesurfer.on('ready', document.abplayer.registerCanPlay);
	ab.wavesurfer.on('audioprocess', document.abplayer.registerProgress);
	ab.wavesurfer.on('play', document.abplayer.registerPlaying);
	ab.wavesurfer.on('pause', document.abplayer.registerPause);
	ab.wavesurfer.on('finish', document.abplayer.registerEnded);
	ab.wavesurfer.on('seek', function(fraction) {document.abplayer.registerSeek(fraction);});
	// extensions for region support:
	ab.wavesurfer.on('region-in', function(region) {document.abplayer.registerRegionEvent('in', region)});
	ab.wavesurfer.on('region-out', function(region) {document.abplayer.registerRegionEvent('out', region)});
	
	// handle space key for play/pause - make sure that wavesurfer is initialized before:
	$('body').keydown(function(event) {document.abplayer.ui.pressKey(event)});
	
	
	ab.trackselection.loadTracksData('./data/tracks.json');

	// file input and DND handling:
	$('#files').bind('change', handleFileSelect1);
	document.body.addEventListener('dragover', handleDragOver, false);
	document.body.addEventListener('drop', handleFileSelect, false);	
},	

/**
 * open a meta information (JSON) file; and based on it, an audio file
 * scope: player panel
 */
openMeta: function(url) {
	var o = document.abplayer;

	o.register=false;
	o.disableControls();
	o.register=true;

	$("#busyIndicator").show();
	
	$.getJSON(url)
	.done(function(data) { 
		var o = document.abplayer;
	
		if (o.printEvents) console.log('meta data received: ', data);
		// track successful opening:
		_paq.push(['trackEvent', 'Top', 'openTrack', o.fileInfo.title]);

		o.fileInfo = data;
		
		o.resetPresets(); // includes rendering
		
		o.renderRelatedTrackList();
		$("#filename").html(o.fileInfo.title);
		
		// wavesurfer: init
		o.canPlay = false;
		o.wavesurfer.clearRegions();
		o.wavesurfer.load(o.fileInfo.url);
		
		// try to restore the latest active preset:
		if (o.currentPresetDesc.length > 0) { // console.log("Trying to restore currentPresetDesc: " + o.currentPresetDesc);
			$.each(
				o.presetList,
				function (index, value) {
					for (var prop in value) { // console.log(prop + ": " + value[prop]);
						if (prop=='desc' && value[prop]==o.currentPresetDesc) { // console.log("Found at [" + index + "]");
							o.playPreset(index);
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
		$("#busyIndicator").hide();
	});
}, // end function openMeta()

getCurrentTime: function() {
	// return document.abplayer.audio.currentTime; // audio element
	return document.abplayer.wavesurfer.getCurrentTime();
},
setCurrentTime: function(t0) {
	var t1 = document.abplayer.wavesurfer.getDuration();
	document.abplayer.wavesurfer.seekAndCenter(t0 / t1); // param is fraction, not seconds!
},
play: function() {
	// document.abplayer.audio.play(); // audio element
	document.abplayer.wavesurfer.play();
},
pause: function() {
	document.abplayer.wavesurfer.pause();
},
stop: function() {
	document.abplayer.wavesurfer.stop();
},

disableControls: function() {
	document.abplayer.clearPresets(); // includes rendering
	
	$('#repeatControl *').attr("disabled", true);
	$('#repeatControl').removeClass('enabled');
	$('#repeatControl').addClass('disabled');
	document.abplayer.clearAB();
},

enableControls: function() {
	// is called by the canplay event of the audio control!
	$('#repeatControl').removeClass('disabled');
	$('#repeatControl').addClass('enabled');
	$("#repeatControl *").attr("disabled", false);
},

clearAB: function() {
	document.abplayer.aTime = -1;
	document.abplayer.bTime = -1;
	document.abplayer.updateABButtons();

	if (document.abplayer.register) {
		_paq.push(['trackEvent', 'Track', 'clearAB', document.abplayer.fileInfo.title]);
	}

	// clear latest active loop setting:
	// document.abplayer.currentPresetDesc	= '';
	$('#presetListLarge a').removeClass('active');
	$('#btnPresetsLabel').html('Fertige Loops: ...');
},
setA: function() { 
	document.abplayer.setAB('A', parseInt(document.abplayer.getCurrentTime()), 1); 
	_paq.push(['trackEvent', 'Track', 'setA', document.abplayer.fileInfo.title]);
},
setB: function() { 
	document.abplayer.setAB('B', parseInt(document.abplayer.getCurrentTime()), 1); 
	_paq.push(['trackEvent', 'Track', 'setB', document.abplayer.fileInfo.title]);

	document.abplayer.repeatAB(); // just in case B is now before the current position
},
setAB: function(target, value, mode) {
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
},

checkRepeat: function() {
	var a = document.abplayer.aTime;
	var b = document.abplayer.bTime;
	var t = document.abplayer.getCurrentTime();
	
	if (a >= 0) { // is aTime in effect?
		if (t < a) { 
			// this can happen when loading a new track with an existing pre-set loop:
			document.abplayer.setCurrentTime(a); 
		}
	}
	if (b >= 0) { // is bTime in effect?
		if (t > b) { 
			document.abplayer.repeatAB(); 
		}
	}
},
repeatAB: function() {
	var jumpTo = Math.max(0, document.abplayer.aTime);

	var globalRegister = document.abplayer.register;
	if (globalRegister) {
		_paq.push(['trackEvent', 'Track', 'repeat', document.abplayer.fileInfo.title]);
	}
	// even if globalRegister is active, we don't want to see our own sub-routine re-start:
	document.abplayer.register = false;
	
	document.abplayer.pause();
	document.abplayer.setCurrentTime(jumpTo);
	document.abplayer.play();
	
	if (globalRegister) {
		setTimeout(function(){ document.abplayer.register = true; }, 500);
	}
},


clearPresets: function () {
	console.log('clear presets');
	document.abplayer.presetList = [];
	document.abplayer.renderPresetList();
},
resetPresets: function() {
	console.log('reset presets');
	document.abplayer.presetList = document.abplayer.fileInfo.presets;
	document.abplayer.renderPresetList();
},
addPreset: function() {
	if (document.abplayer.bTime < 1) {return;}
	
	var p = {t0:document.abplayer.aTime, t1:document.abplayer.bTime, desc:"custom"};
	document.abplayer.presetList.push(p);
	document.abplayer.renderPresetList();
},
playPreset: function(i) {
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
	
	o.register = false;
	
	o.pause();
	o.setAB('A', p.t0 * 1, 1);
	o.setAB('B', p.t1 * 1, 1);
	
	if (document.abplayer.canPlay) o.repeatAB();
	
	// re-enable tracking, but allow for some processing time:
	setTimeout(function(){ document.abplayer.register = true; }, 1000);
},
findPresetByTimes: function(t0, t1) {
	var list = document.abplayer.presetList;
	for (var i=0; i<list.length; i++) {
		var p = list[i];
		if ((p.t0 == t0) && (p.t1 == t1)) {
			return p;
		}
	}
	return false; // not found...
},

// rendering section:
renderPresetList: function() {
	var o = document.abplayer;
	// dropdown list:
	var lines = [];
	for (var i = 0; i < o.presetList.length; i++) {
		var p = o.presetList[i];
		lines.push(
			"<li onclick='document.abplayer.playPreset(" + i + ")'>" 
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
			'<a href="#" onclick="document.abplayer.playPreset(' + i +')" class="list-group-item" id="largePresets' + i + '">'
			+ p.desc + '<span class="badge">'
			+ (p.measure ? 'T. '+p.measure+', ' : '')
			+ o.formatTime(p.t0) + ' - ' + o.formatTime(p.t1)
			+ '</span></a>'
		);
	}
	$("#presetListLarge").html(lines.join(""));
	
	// don't update wavesurfer, if it is not ready yet:
	if (!o.canPlay) return;
	
	// update wavesurfer (graphical) sections:
	o.wavesurfer.clearRegions();
	$.each(
		o.presetList,
		function(index, preset) {
			var c = o.ui.regionColors.DEFAULT;
			if (o.ui.regionColors[preset.type]) {
				c = o.ui.regionColors[preset.type];
			}
			o.wavesurfer.addRegion({
				id: preset.desc,
				start: preset.t0,
				end: preset.t1,
				loop: false,
				drag: false, // TODO: default would be true, but needs to be handled...
				resize: false, // TODO: dito
				color: 'rgba('+c.r+','+c.g+','+c.b+','+c.alpha+')'
			});
		}
	);
}, // end renderPresetList()
renderRelatedTrackList: function() {
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
},
updateABButtons: function() {
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
},


// events section:
registerCanPlay: function() {
	var o = document.abplayer;
	
	if (o.printEvents) console.log('canPlay');
	
	o.canPlay = true;

	// render favor list & wavesurfer regions!
	o.renderPresetList();

	$("#busyIndicator").hide();
	
	o.enableControls();
	o.repeatAB(); // try to autoplay (implicitly calls play at pos t=0 if no aTime is set)
},
registerProgress: function() {
	// update current play time display:
	var currentTime = document.abplayer.getCurrentTime();
	if (Math.floor(currentTime) != document.abplayer.playTime) { // respect > 100 ms difference
		document.abplayer.playTime = Math.floor(currentTime);
		$('#playTimeDisplay').html(document.abplayer.formatTime(document.abplayer.playTime));
	}
	
	if (document.abplayer.printEvents) {
		var now = (new Date()).getTime()/1000 | 0;
		if (now >= document.abplayer.registerProgressTimestamp + 5) {
			console.log('progress: ' + currentTime);
			document.abplayer.registerProgressTimestamp = now;
		}
	}
	
	if (document.abplayer.presetsFollower) { // enable a plug-in-like / optional behaviour:
		document.abplayer.presetsFollower.updateForTime(currentTime);
	}

	document.abplayer.checkRepeat();
},
registerSeek: function(fraction) {
	var t1 = document.abplayer.wavesurfer.getDuration();
	document.abplayer.registerProgress(); // mainly in order to update the current time display
},
registerEnded: function() {
	if (document.abplayer.printEvents) console.log('ended');
	document.abplayer.repeatAB();
},
registerPlaying: function() {
	if (document.abplayer.printEvents) console.log('playing');
	if (document.abplayer.register) {
		_paq.push(['trackEvent', 'Track', 'playing', document.abplayer.fileInfo.title]);
	}
	$('#btnPlayPause').html('<i class="glyphicon glyphicon-pause"></i> Pause</button>');
},
registerPause: function() {
	if (document.abplayer.printEvents) console.log('pause');
	if (document.abplayer.register) {
		_paq.push(['trackEvent', 'Track', 'pause', document.abplayer.fileInfo.title]);
	}
	$('#btnPlayPause').html('<i class="glyphicon glyphicon-play"></i> Play</button>');
},
// wavesurfer region events:
registerRegionEvent: function(eventType, region) {
	if (eventType == 'in') {
		console.log('region-in: ' + region.id);
		var c = document.abplayer.ui.regionColorActive(region.color);
		region.update({color: 'rgba('+c.r+','+c.g+','+c.b+','+c.alpha+')'});
	}
	if (eventType == 'out') {
		console.log('region-out: ' + region.id);
		var c = region.color;
		region.update({color: 'rgba('+c.r+','+c.g+','+c.b+','+0.2+')'});  // TODO: find the original color param instead...
	}
},
// end events section


formatTime: function (secondsIn) {
	var min = Math.floor(secondsIn / 60);
	var sec = secondsIn % 60;
	// var msec = sec - Math.floor(sec); msec = Math.floor(msec * 10);
	return min + ':' + (sec<10?'0':'') + sec; // + '.' + msec;
},

}; // end definition of document.abplayer

// document.abplayer.ui
document.abplayer.ui = {
	regionColors: {
		DEFAULT: {r: 125, g: 194, b: 255, alpha: 0.2},
		verse: {r: 255, g: 241, b: 125, alpha: 0.2},
		chorus: {r: 255, g: 125, b: 125, alpha: 0.2},
		bridge: {r: 162, g: 255, b: 162, alpha: 0.2}
	},
	regionColorActive: function(color) {
		// return a more opaque version of this color object:
		return {
			r: color.r,
			g: color.g,
			b: color.b,
			alpha: color.alpha + 0.2
		};
	},
	clickOpenMeta: function(url) {
		// TODO: loading... message, show player only on success.
		document.abplayer.openMeta(url);

		$('#panelPlayer').show();
		$('#panelTrackSelection').hide();
	},
	clickRelated: function(url, code) {
		// ... a track has been requested via the related tracks widget - 
		_paq.push(['trackEvent', 'Track', 'selectTrackRelated', document.abplayer.fileInfo.title + ' to ' + code]);
		
		document.abplayer.stop();
		
		document.abplayer.openMeta(url);

		$('#panelPlayer').show();
		$('#panelTrackSelection').hide();
	},
	closePlayer: function() {
		_paq.push(['trackEvent', 'Track', 'closeTrack', document.abplayer.fileInfo.title]);
		
		document.abplayer.register = false;
		
		// document.abplayer.audio.pause(); // audio element
		document.abplayer.stop();
		
		document.abplayer.wavesurfer.clearRegions();
		
		setTimeout(function(){ document.abplayer.register = true; }, 500);
		
		$('#panelPlayer').hide();
		$('#panelTrackSelection').show();
	},
	clickFilterPart: function (code, label) {
		document.abplayer.filterPart = code;
		$('#filterPartLabel').html(label);
		document.abplayer.trackselection.renderMenu();
		
		_paq.push(['trackEvent', 'Top', 'clickFilterPart', code]);
	},
	clickPlayPause: function() {
		if (document.abplayer.wavesurfer.isPlaying()) {
			// pause:
			document.abplayer.pause();
		} else {
			// play:
			document.abplayer.play();
		}
	},
	pressKey: function(event) {
		if (event.which == 32) {
			if (document.abplayer.canPlay) {
				event.preventDefault();
				document.abplayer.ui.clickPlayPause();
			}
		}
	},
	clickResetPresets: function() {
		document.abplayer.resetPresets();
	},
	clickClearPresets: function() {
		document.abplayer.clearPresets();
	}
};

// document.abplayer.presetsFollower (added 2017-10-03)
document.abplayer.presetsFollower = {
	currentMatches: [],
	updateForTime: function(t) {
		var o = document.abplayer;
		// if (o.printEvents) console.log('presetsFollower.updateForTime(' + t + ')');
		
		// calculate matching presets:
		var tMatches = [];
		$.each(o.presetList, function(i, preset) {
			if ((t >= preset.t0) && (t <= preset.t1)) tMatches.push(i);
		});
		
		// collect presets that should lose their highlight:
		var removeHighlight = [];
		$.each(o.presetsFollower.currentMatches, function(i, currentMatch) {
			if ($.inArray(currentMatch, tMatches) == -1) removeHighlight.push(currentMatch);
		});
		
		// collect presets that should get a new highlight:
		var addHighlight = [];
		$.each(tMatches, function(i, futureMatch) {
			if ($.inArray(futureMatch, o.presetsFollower.currentMatches) == -1) {
				addHighlight.push(futureMatch);
			}
		});
		
		if (false && o.printEvents) { 
			console.log(
				'Updating preset highlighting: old matches ' + JSON.stringify(o.presetsFollower.currentMatches)
				+ ', t matches ' + JSON.stringify(tMatches)
				+ ', remove ' + JSON.stringify(removeHighlight) 
				+ ', add ' + JSON.stringify(addHighlight)
			);
		}

		if (removeHighlight.length > 0 || addHighlight.length > 0) {
			if (o.printEvents) console.log('Updating preset highlighting: remove ' + JSON.stringify(removeHighlight) + ', add ' + JSON.stringify(addHighlight));
			
			$.each(addHighlight, function(i, presetIdx) {
				$('#largePresets' + presetIdx).addClass('currentPresetMatch');
			});
			$.each(removeHighlight, function(i, presetIdx) {
				$('#largePresets' + presetIdx).removeClass('currentPresetMatch');
			});
			
			// memorize the new status:
			o.presetsFollower.currentMatches = tMatches;
		};
	},
};

// document.abplayer.trackselection
document.abplayer.trackselection = {
	loadTracksData: function(url) {
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
	},
	renderMenu: function() {
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
		
		var targets = ['trackSelection1', 'trackSelection2', 'trackSelection3', 'trackSelection4'];
		var html = []; for (var i=0; i<targets.length; i++) { html[i] = ''; }
		
		// distribute the tracks to the columns:
		var targetCounts = []; for (var i=0; i<targets.length; i++) { targetCounts[i] = Math.floor(matches.length / targets.length); }
		var cursor = 0;
		while (arraySum(targetCounts) < matches.length) {
			targetCounts[cursor] ++;
			cursor = (cursor + 1) % targets.length;
		}
		// the first two columns must have an equal number of entries, otherwise the 2-column layout for MD screens breaks ugly:
		if (targets.length >= 4) {
			if (targetCounts[0] > targetCounts[1]) {
				if (targetCounts[2] > targetCounts[3]) {
					targetCounts[1] ++;
					targetCounts[2] --;
				} else {
					targetCounts[1] ++;
					targetCounts[3] --;
				}
			}
		}
		
		
		cursor = 0;
		var targetCount = 0;
		for (var i=0; i<matches.length; i++) {
			targetCount ++;
			if (targetCount > targetCounts[cursor]) {
				cursor += 1;
				targetCount = 1;
			} 
			
			var o = matches[i];
			var additionalClasses = (o.category)?('btn-'+o.category+' '):('');
			html[cursor] += 
				'<button type="button" class="btn btn-default ' + additionalClasses + 'btn-block" onclick="document.abplayer.ui.clickOpenMeta(\''
				+ 'data/' + o.dataURL 
				+ '\')">'
				+ o.title
				+ '</button>\n';
		}
		for (var i=0; i<targets.length; i++) { 
			$('#'+targets[i]).html(html[i]);
		}
	},
};



function arraySum(a) {
	var sum = 0;
	for (var i=0; i<a.length; i++) {
		sum += a[i];
	}
	return sum;
}

// ===========================================================================
// *** below: legacy features, would need work...
// ===========================================================================

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