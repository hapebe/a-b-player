// do this even when complete loading fails...

// hide all of the further links section:
$('#furtherLinksDiv').hide();
$('#sheetMusicLink').hide();
$('#youtubeLink').hide();
$('#panelPlayer').hide();
$("#busyIndicator").hide();


$(function(){

	// route track selection filter clicks:
	$('#filterPartEnsemble').change(function() {
		var flag = $(this).is(':checked');
		document.abplayer.filterPartEnsemble = flag;
		document.abplayer.trackselection.renderMenu();

		// paq.push(['trackEvent', 'Top', 'clickFilterPartEnsemble', (flag?'withEnsemble':'withoutEnsemble')]);
	});
	// route track selection filter text:
	$('#filterText').bind('input', function() {
		var txt = $(this).val();

		if (txt.length > 0) {
			document.abplayer.filterText = txt;
			$('#btnResetFilterText').html('<i class="glyphicon glyphicon-remove"></i>');

			// paq.push(['trackEvent', 'Top', 'filterText', txt]);
		} else {
			document.abplayer.filterText = undefined;
			$('#btnResetFilterText').html('<i class="glyphicon glyphicon-filter"></i>');

			// paq.push(['trackEvent', 'Top', 'filterText', '(EMPTY)']);
		}

		document.abplayer.trackselection.renderMenu();
	});
	// route track selection text filter reset button:
	$('#btnResetFilterText').click(function() {
		document.abplayer.filterText = undefined
		$('#filterText').val(''); // this does not trigger an "input" event...
		$('#btnResetFilterText').html('<i class="glyphicon glyphicon-filter"></i>');
		document.abplayer.trackselection.renderMenu();

		// paq.push(['trackEvent', 'Top', 'filterText', '(CLEARED)']);
	});
	// no form submission:
	$('#filterTextForm').submit(function(e) {e.preventDefault();});


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

	// do we have an inherited filterText value?
	var filterText = $('#filterText').val();
	if (filterText.length > 0) {
		document.abplayer.filterText = filterText;
		$('#btnResetFilterText').html('<i class="glyphicon glyphicon-remove"></i>');
		document.abplayer.trackselection.renderMenu();

		// paq.push(['trackEvent', 'Top', 'filterText', filterText]);
	}

	// set up volume slider:
	$('#sliderVolume').slider({
		// orientation: 'horizontal', // "vertical",
		value: Math.floor(document.abplayer.volume * 100 + 0.5),
		min: 0,
		max: 100,
		range: 'min',
		animate: true,
		step: 1,
		slide: function(e, ui) {
			document.abplayer.setVolume(ui.value / 100);
		}
	});

	// setTimeout(function(){ document.abplayer.openWebFile('audio/Bye, Bye Blackbird-Sopran.mp3'); }, 2000);
	// setTimeout(function(){ document.abplayer.openMeta("data/royals-s.json"); }, 500);

	// check whether file was specified in the URL/# part:
	if (document.location.hash) {
		document.abplayer.tryOpenByHash();
	}
});

// document.abplayer vars and methods:
document.abplayer = {
printEvents: true, // debug player events to console.log?
register: true, // controll tracking: log activity or ignore it
registerProgressTimestamp: -1,
status: 'idle', // can also be 'loading'

// overview / list:
/**
 * all available tracks, suitable for filtering and displaying links (buttons)
 * see: document.abplayer.makeTracksData()
 */
tracksData: [],
filterPart: '', // voice group selection in track selection view
filterPartEnsemble: true, // track selection view: include ensemble tracks?
fiterText: undefined, // text input filter for tracks

// detail view / player:
canPlay: false, // is set by event from player, after audio file has been loaded
playTime: 0, // currently displayed play time (position in seconds)
aTime: -1, bTime: -1,
muted: false, volume: 0.75, // audio output controls
currentPresetDesc: undefined, // loop name of currently active "favorite" / "preset" (loop)
previousPresetDesc: undefined, // last actively selected preset, if any (regardless of automated clearing etc.)
presetList: [], // preset loops, loaded from single track data (or managed manually)
trackCode: undefined, // can hold the 'code' of the currently loaded track, i.e. the name of the JSON file without extension.
fileInfo: { // can hold data loaded from a single track JSON file
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
		progressColor: '#aaaaaa',
		responsive: true, // TODO
		plugins: [
    	WaveSurfer.regions.create({})
    ],
	});
	ab.wavesurfer.on('ready', ab.registerCanPlay);
	ab.wavesurfer.on('audioprocess', ab.registerProgress);
	ab.wavesurfer.on('play', ab.registerPlaying);
	ab.wavesurfer.on('pause', ab.registerPause);
	ab.wavesurfer.on('finish', ab.registerEnded);
	ab.wavesurfer.on('seek', function(fraction) {ab.registerSeek(fraction);});
	ab.wavesurfer.on('error', function(err) {ab.registerWSError(err);});
	// extensions for region support:
	// ab.wavesurfer.on('region-in', function(region) {document.abplayer.registerRegionEvent('in', region)});
	// ab.wavesurfer.on('region-out', function(region) {document.abplayer.registerRegionEvent('out', region)});

	// handle space key for play/pause - make sure that wavesurfer is initialized before:
	$('body').keydown(function(event) {ab.ui.registerKeyPress(event)});


	ab.dataSource.loadIndexData('./data/tracks.json');
	ab.status = 'loadingTracks';

	// file input and DND handling:
	$('#files').bind('change', handleFileSelect1);
	document.body.addEventListener('dragover', handleDragOver, false);
	document.body.addEventListener('drop', handleFileSelect, false);
},

/**
 * when opening a track by URL hash  (#ave-verum-s), wait until the
 * index data is ready.
 */
tryOpenByHash: function() {
	if (document.abplayer.status != 'idle') {
		// allow some time for the pieceData to be populated...
		setTimeout(function(){
				document.abplayer.tryOpenByHash();
			},
			100
		);
	} else {
		document.abplayer.openByHash();
	}
},

/**
 * open single track by URL hash (#ave-verum-s)
 */
openByHash: function() {
	var code = document.location.hash.substring(1);
	var dataURL = 'data/' + code + '.json';
	document.abplayer.ui.clickOpenMeta(dataURL); // console.log(dataURL);
	// paq.push(['trackEvent', 'Init', 'openByHash', code]);
},

/**
 * open a meta information (JSON) file; and based on it, an audio file
 * scope: player panel
 */
openMeta: function(url) {
	var o = document.abplayer;

	o.register=false;
	o.setActivePreset(undefined);
	if (o.presetsFollower) o.presetsFollower.currentMatches = [];
	o.disableControls();
	o.clearAB();
	o.canPlay = false;
	o.register=true;

	$("#busyIndicator").show();

	o.trackCode = url.substring(url.lastIndexOf('/')+1, url.length-5); // console.log(o.trackCode);
	$.getJSON(url)
	.done(function(data) {
		var o = document.abplayer;

		if (o.printEvents) // console.log('meta data received: ', data);
		// track successful opening:
		// paq.push(['trackEvent', 'Top', 'openTrack', data.title]);

		var pieceData = o.piecesData[data.pieceID]; // console.log("pieceData: ", pieceData);

		// add DOM ID to presets data:
		for (var i=0; i<data.presets.length; i++) {
			data.presets[i].domID = o.getPresetDomID(data.presets[i]);
		}

		o.fileInfo = data;

		o.resetPresets(); // includes rendering

		o.renderRelatedTrackList();

		var titleHtml = o.fileInfo.title;
		if (pieceData.info) {
			titleHtml += ' <span class="trackInfo hidden-xs">' + pieceData.info + '</span>';
		}
		$("#filename").html(titleHtml);

		$('#linkAudio').attr('href', 'bootstrap.html#' + o.trackCode);

		$('#youtubeLink').html('');
		$('#youtubeLink').hide();

		// display additional links?
		var any = false;
		if (pieceData.sheetMusicURL && pieceData.sheetMusicURL != "") {
			any = true;
			$('#sheetMusicLink').show();
			$('#sheetMusicLink a').attr('href', pieceData.sheetMusicURL);
		}
		if (pieceData.renditions) {
			for (var i=0; i<pieceData.renditions.length; i++) {
				if (!pieceData.renditions[i]) continue;
				
				any = true;
				$('#youtubeLink').show();
				
				$('#youtubeLink').append( 
					$(
						'<div><span class="glyphicon glyphicon-expand" aria-hidden="true"></span>&nbsp;<a href="'
						+pieceData.renditions[i].url
						+'" target="_blank">'
						+pieceData.renditions[i].desc
						+'</a></div>'
					)
				);
			}
		}
		if (any) {
			$('#furtherLinksDiv').show();
		} else {
			$('#furtherLinksDiv').hide();
		}

		// wavesurfer: init
		o.canPlay = false;
		o.wavesurfer.clearRegions();
		o.status = 'loading';
		o.wavesurfer.load(o.fileInfo.url);

		// try to restore the latest active preset:
		if (o.previousPresetDesc) {
			console.log('previousPresetDesc: ', o.previousPresetDesc);
			$.each(
				o.presetList,
				function (index, p) {
					if (p.desc == o.previousPresetDesc) { // console.log("Found at [" + index + "]");
						o.playPreset(p.t0, p.t1);
					}
				}
			);
		}

	})
	.fail(function(jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		console.log( "Request Failed: " + err );
		// paq.push(['trackEvent', 'Top', 'ERROR openTrack', document.abplayer.trackCode + ': ' + err]);
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
setVolume: function(vol) {
	document.abplayer.volume = vol;
	if (document.abplayer.canPlay) document.abplayer.wavesurfer.setVolume(document.abplayer.volume);
},

disableControls: function() {
	document.abplayer.clearPresets(); // includes rendering

	$('#repeatControl *').attr("disabled", true);
	$('#repeatControl').removeClass('enabled');
	$('#repeatControl').addClass('disabled');
},

enableControls: function() {
	// is called by the canplay event of the audio control!
	$('#repeatControl').removeClass('disabled');
	$('#repeatControl').addClass('enabled');
	$("#repeatControl *").attr("disabled", false);
},

clearAB: function() {
	var o = document.abplayer;

	o.aTime = -1; o.bTime = -1; o.updateABButtons();
	o.setActivePreset(undefined); // clear preset
	// o.previousPresetDesc = undefined; // also, forget it (in case we load a different track)

	if (o.register) {
		// paq.push(['trackEvent', 'Track', 'clearAB', o.fileInfo.title]);
	}
},
setA: function() {
	document.abplayer.setAB('A', parseInt(document.abplayer.getCurrentTime()), 1);
	// paq.push(['trackEvent', 'Track', 'setA', document.abplayer.fileInfo.title]);
},
setB: function() {
	document.abplayer.setAB('B', parseInt(document.abplayer.getCurrentTime()), 1);
	// paq.push(['trackEvent', 'Track', 'setB', document.abplayer.fileInfo.title]);

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
		if (t < a - 0.001) {
			// this can happen when loading a new track with an existing pre-set loop:
			document.abplayer.setCurrentTime(a);
		}
	}
	if (b >= 0) { // is bTime in effect?
		if (t > b + 0.001) {
			document.abplayer.repeatAB();
		}
	}
},
repeatAB: function(modeParam) {
	var mode = 'repeat'; if (modeParam) mode = modeParam; // this can be 'autoplay'
	var jumpTo = Math.max(0, document.abplayer.aTime);

	if (document.abplayer.printEvents) console.log(mode);

	var globalRegister = document.abplayer.register;
	if (globalRegister) {
		// paq.push(['trackEvent', 'Track', mode, document.abplayer.fileInfo.title]);
	}
	// even if globalRegister is active, we don't want to see our own sub-routine re-start:
	document.abplayer.register = false;

	document.abplayer.pause();
	document.abplayer.setCurrentTime(jumpTo);
	document.abplayer.play();

	// update play button (bug fix: looks wrong when looping at audio end - we've turned register off here...)
	$('#btnPlayPause').html('<i class="glyphicon glyphicon-pause"></i> Pause</button>');

	if (globalRegister) {
		setTimeout(function(){ document.abplayer.register = true; }, 500);
	}
},


clearPresets: function () {
	if (document.abplayer.printEvents) console.log('clear presets');
	document.abplayer.setActivePreset(undefined);
	// document.abplayer.previousPresetDesc = undefined;

	document.abplayer.presetList = [];
	document.abplayer.renderPresetList();
},
resetPresets: function() {
	var o = document.abplayer;
	if (o.printEvents) console.log('reset presets');
	// clone the list instead of copying the reference (custom loops!)
	o.presetList = [];
	o.fileInfo.presets.forEach(function (el) {
		o.presetList.push(el);
	});
	o.renderPresetList();
},
addPreset: function() {
	var o = document.abplayer;

	if ((o.aTime < 1) || (o.bTime < 1)) {return;} // only if there is a current loop...

	// only if it does not exist yet:
	var target = o.findPresetByTimes(o.aTime, o.bTime);
	if (target.preset) return; // TODO: error message

	var p = {t0:o.aTime, t1:o.bTime, desc:"custom"};
	p.domID = o.getPresetDomID(p);

	document.abplayer.presetList.push(p);
	document.abplayer.renderPresetList();
},
playPreset: function(t0, t1) {
	var o = document.abplayer;

	var target = o.findPresetByTimes(t0, t1);
	var p = target.preset;
	if (!p) return; // TODO: error message

	o.setActivePreset(p);

	// paq.push(['trackEvent', 'Track', 'selectLoop', o.currentPresetDesc]);

	o.register = false;

	o.pause();
	o.setAB('A', p.t0 * 1, 1);
	o.setAB('B', p.t1 * 1, 1);

	if (document.abplayer.canPlay) o.repeatAB('autoplay');

	// re-enable tracking, but allow for some processing time:
	setTimeout(function(){ document.abplayer.register = true; }, 1000);
},
findPresetByDesc: function(desc) { // returns both a preset and a region, if found!
	var retval = {preset: false, region: false};

	var list = document.abplayer.presetList;
	for (var i=0; i<list.length; i++) {
		if (list[i].desc == desc) { retval.preset = list[i]; break; }
	}

	list = document.abplayer.wavesurfer.regions.list;
	Object.keys(list).forEach(function (key) {
		var r = list[key];
		if (r.id == desc) { retval.region = r; }
	});

	return retval;
},
findPresetByTimes: function(t0, t1) { // returns both a preset and a region, if found!
	var retval = {preset: false, region: false};

	var list = document.abplayer.presetList;
	for (var i=0; i<list.length; i++) {
		var p = list[i];
		if ((p.t0 == t0) && (p.t1 == t1)) {
			retval.preset = p;
			break;
		}
	}

	list = document.abplayer.wavesurfer.regions.list;
	for (var i=0; i<list.length; i++) {
		var r = list[i];
		if ((r.start == t0) && (r.end == t1)) {
			retval.regions = r;
			break;
		}
	}

	return retval;
},



// rendering section:

renderPresetList: function() {
	var o = document.abplayer;
	var colorTool = o.ui.colorTool;

	// dropdown list:
	var lines = [];
	for (var i = 0; i < o.presetList.length; i++) {
		var p = o.presetList[i];
		lines.push(
			'<li onclick="document.abplayer.playPreset(' + p.t0 +', ' + p.t1 + ')" id="smallPresets' + p.domID + '">"'
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
			'<a href="#" onclick="document.abplayer.playPreset('  + p.t0 +', ' + p.t1 + ')" class="list-group-item" id="largePresets' + p.domID + '">'
			+ ((p.desc == o.currentPresetDesc)?'<span class="glyphicon glyphicon-repeat" aria-hidden="true"></span> ':'')
			+ o.getLargePresetLabel(p) + '</a>'
		);
	}
	$("#presetListLarge").html(lines.join(""));

	// add colors for the presets:
	for (var i = 0; i < o.presetList.length; i++) {
		var p = o.presetList[i];
		var bg = colorTool.getColorForType(p.type);

		$('#smallPresets' + p.domID).css('background-color', colorTool.getCSS(bg));
		$('#largePresets' + p.domID).css('background-color', colorTool.getCSS(bg));
	}

	// don't update wavesurfer, if it is not ready yet:
	if (!o.canPlay) return;

	// update wavesurfer (graphical) sections:
	o.wavesurfer.clearRegions();
	$.each(
		o.presetList,
		function(index, preset) {
			var c = colorTool.getColorForType(preset.type);
			o.wavesurfer.addRegion({
				id: preset.desc,
				start: preset.t0,
				end: preset.t1,
				loop: false,
				drag: false, // TODO: default would be true, but needs to be handled...
				resize: false, // TODO: dito
				color: colorTool.getCSS(c)
			});
		}
	);
}, // end renderPresetList()
getPresetDomID: function(p) {
	return '_' + p.t0 + '_' + p.t1;
},
getLargePresetLabel: function(p) {
	var o = document.abplayer;
	return p.desc + '<span class="badge">'
			+ (p.measure ? 'T. '+p.measure+', ' : '')
			+ o.formatTime(p.t0) + ' - ' + o.formatTime(p.t1)
			+ '</span>';
},
renderRelatedTrackList: function() {
	// revised: no longer take the related tracks directly from track data, but instead for tracks(!) data, via pieceID:
	var o = document.abplayer;

	var error = false;
	if (!o.fileInfo.pieceID) {
		error = true;
	} else if (!o.piecesData) {
		error = true;
	} else {
		var piece = o.piecesData[o.fileInfo.pieceID];
		if (!piece) {
			error = true;
		} else {
			// now, do we have a trackset?
			if ((!piece.trackset) || (piece.trackset.length < 2)) {
				error = true;
			}
		}
	}
	if (error) {
		// well, that did not work out:
		$('#relatedTrackDiv').html('');
		$('#relatedTrackContainer').hide();
		return;
	}

	// huzzah!
	var lines = [];
	var cnt = 0;
	for (var part in piece.trackset) { // console.log(part + ": " + piece.trackset[part]);
		lines.push(
			'<a type="button" class="btn btn-default" onclick="document.abplayer.ui.clickRelated(\''
			+ 'data/' + piece.trackset[part] + '.json\''
			+ ', \'' + piece.trackset[part] + '\''
			+ ')">' + part + '</a>'
		);
		cnt ++;
	}
	// only if we have at least 2 tracks (because 1 track is probably the current one):
	if (cnt >= 2) {
		$('#relatedTrackDiv').html(lines.join(""));
		$('#relatedTrackContainer').show();
	} else {
		$('#relatedTrackDiv').html('');
		$('#relatedTrackContainer').hide();
	}
},
setActivePreset: function(preset) {
	var o = document.abplayer;
	var colorTool = o.ui.colorTool;

	if (preset) {
		// ignore if the current preset was selected again:
		if (preset.desc == o.currentPresetDesc) return;
	}

	// reset the label of the old current preset:
	if (o.currentPresetDesc) {
		var target = o.findPresetByDesc(o.currentPresetDesc);
		if (target.preset) {
			var old = target.preset;
			$('#largePresets' + old.domID).html(o.getLargePresetLabel(old));
		}
	}

	if (!preset) {
		// reset - no active preset:
		o.currentPresetDesc	= undefined;

		$('#btnPresetsLabel').html('Fertige Loops...');
		return;
	}

	// we have a new active preset:

	// remember this setting - if another track is selected next; we will try to activate a loop with the same description:
	o.currentPresetDesc	= preset.desc;
	o.previousPresetDesc = preset.desc;

	// title line of dropdown list
	$('#btnPresetsLabel').html(preset.desc);

	// full list - mark the current entry as active:
	$('#largePresets' + preset.domID).html(
		'<span class="glyphicon glyphicon-repeat" aria-hidden="true"></span> '
		+ o.getLargePresetLabel(preset)
	);
},
updateABButtons: function() {
	var o = document.abplayer;

	if ( o.aTime < 0) {
		$("#btnAtime").html("A");
	} else {
		$("#btnAtime").html("A[" + o.formatTime(o.aTime) + "]");
	}
	if ( o.bTime < 0) {
		$("#btnBtime").html("B");
	} else {
		$("#btnBtime").html("B[" + o.formatTime(o.bTime) + "]");
	}
},


// events section:
registerCanPlay: function() {
	var o = document.abplayer;

	if (o.printEvents) console.log('canPlay');

	o.status = 'idle';
	o.canPlay = true;

	// render favor list & wavesurfer regions!
	o.renderPresetList();

	$("#busyIndicator").hide();

	o.enableControls();
	o.wavesurfer.setVolume(o.volume);
	o.repeatAB('autoplay'); // try to autoplay (implicitly calls play at pos t=0 if no aTime is set)
},
registerProgress: function() {
	var o = document.abplayer;
	var currentTime = o.getCurrentTime();

	if (o.printEvents) {
		var now = (new Date()).getTime()/1000 | 0;
		if (now >= o.registerProgressTimestamp + 5) {
			console.log('progress: ' + currentTime);
			o.registerProgressTimestamp = now;
		}
	}

	// update current play time display:
	if (Math.floor(currentTime) != o.playTime) {
		o.playTime = Math.floor(currentTime);
		$('#playTimeDisplay').html(o.formatTime(o.playTime));
	}

	if (o.presetsFollower) { // enable a plug-in-like / optional behaviour:
		o.presetsFollower.update();
	}

	o.checkRepeat();
},
registerSeek: function(fraction) {
	var o = document.abplayer;

	var t1 = o.wavesurfer.getDuration();
	var t = fraction * t1;

	var msg = o.formatTime(t) + 'min';

	// is it outside the current preset?
	if (o.currentPresetDesc) {
		var target = o.findPresetByDesc(o.currentPresetDesc);
		if (target.preset) {
			if ((t < target.preset.t0 - 0.001) || (t > target.preset.t1 + 0.001)) {
				o.setActivePreset(undefined);
				msg += ', outside of current preset.';
			}
		}
	}

	if (document.abplayer.printEvents) {
		console.log('seek to ' + msg );
	}
	if (document.abplayer.register) {
		// paq.push(['trackEvent', 'Track', 'seek to', msg]);
	}

	document.abplayer.registerProgress(); // mainly in order to update the current time display
},
registerEnded: function() {
	if (document.abplayer.printEvents) console.log('ended');
	document.abplayer.repeatAB();
},
registerPlaying: function() {
	if (document.abplayer.register) {
		if (document.abplayer.printEvents) console.log('playing');
		$('#btnPlayPause').html('<i class="glyphicon glyphicon-pause"></i> Pause</button>');
	}
},
registerPause: function() {
	if (document.abplayer.register) {
		if (document.abplayer.printEvents) console.log('pause');
		$('#btnPlayPause').html('<i class="glyphicon glyphicon-play"></i> Play</button>');
	}
},
registerWSError: function(err) {
	var o = document.abplayer;
	console.error(err);

	if (o.status == 'loading') {
		// probably file not found or unsupported file format...
		alert('Sorry, die Audio-Datei konnte nicht geladen werden...');
		$("#busyIndicator").hide();
		o.status = 'idle';
		o.ui.closePlayer();
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


document.abplayer.dataSource = {
/**
 * loads central database from tracks.json file
 */
loadIndexData: function(url) {
	$.getJSON(url)
	.done(function(data) { // console.log(data);
		document.abplayer.piecesData = data.pieces;

		// revision 2017-12-18: tracksData is now calculated from piecesData and titleDict:
		// document.abplayer.tracksData = data.tracks;
		document.abplayer.dataSource.makeTracksData(data);

		document.abplayer.status = 'idle';

		// plug in: data validation / testing / checking:
		if (document.abplayer.validator) document.abplayer.validator.validateList();

		document.abplayer.trackselection.renderMenu();
	})
	.fail(function(jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		console.log( "Request Failed: " + err );
		// paq.push(['trackEvent', 'Top', 'ERROR loadIndexData', err]);
	});
},
/**
 * generates abplayer.tracksData from tracks.json data
 */
makeTracksData: function(data) {
	// source: data.pieces
	// source: data.titleDict

	var o = document.abplayer;
	o.tracksData = [];

	for (var pieceCode in data.pieces) {
		var piece = data.pieces[pieceCode];

		if (!piece.trackset) continue;

		for (var label in piece.trackset) {
			var trackCode = piece.trackset[label]; // console.log(trackCode);

			var entry = {};
			entry['trackCode'] = trackCode;
			entry['title'] = data.titleDict[trackCode];

			var codeParts = trackCode.toUpperCase().split('-');
			var suffix = codeParts.pop();

			// check if a special extra suffix is present:
			if (suffix == 'LIVE') {
				entry['isLive'] = true;
				suffix = codeParts.pop();
			} else if ((suffix == 'PIANO') || (suffix == 'INSTR') || (suffix == 'FLUTE')) {
				entry['isInstrumental'] = true;
				suffix = codeParts.pop();
			}

			// now expect a part code:
			if ((suffix == 'SATB') || (suffix == 'SAB')) {
				entry['part'] = 'SATB0';
				entry['isEnsemble'] = true;
			} else {
				entry['part'] = suffix;
			}

			entry['category'] = 'track';
			if (piece.category) entry['category'] = piece.category;

			o.tracksData.push(entry);
		}
	}
	// debug output: resulting JSON:
	// $('#devOutput').html('<code><pre>' + JSON.stringify(o.tracksData, null, 2) + '</pre></code>');

}, // end makeTracksData
}; // end document.abplayer.dataSource


// document.abplayer.ui
document.abplayer.ui = {
	regionColors: {
		DEFAULT: {r: 125, g: 194, b: 255, alpha: 0.2}, // #7DC2FF - hellblau
		alternative: {r: 162, g: 111, b: 255, alpha: 0.2}, // #A26FFF - lila
		verse: {r: 255, g: 241, b: 125, alpha: 0.2}, // #FFF17D - gelb
		chorus: {r: 255, g: 125, b: 125, alpha: 0.2}, // #FF7D7D - lachsrot
		intro: {r: 224, g: 255, b: 128, alpha: 0.2}, // #E0FF80 - gelbgrün
		bridge: {r: 162, g: 255, b: 162, alpha: 0.2}, // #A2FFA2 - hellgrün
		invisible: {r: 255, g: 255, b: 255, alpha: 0.0} // (weiß)
	},
	clickOpenMeta: function(url) {
		// TODO: loading... message, show player only on success.
		document.abplayer.openMeta(url);

		$('#panelPlayer').show();
		$('#panelTrackSelection').hide();
	},
	clickRelated: function(url, code) {
		var o = document.abplayer;

		// ... a track has been requested via the related tracks widget -
		// paq.push(['trackEvent', 'Track', 'relatedTrackFromTo', o.trackCode + ' to ' + code]);
		// paq.push(['trackEvent', 'Track', 'relatedTrackFrom', o.trackCode]);
		// paq.push(['trackEvent', 'Track', 'relatedTrackTo', code]);

		o.stop();

		o.openMeta(url);

		// $('#panelPlayer').show();
		// $('#panelTrackSelection').hide();
	},
	closePlayer: function() {
		var o = document.abplayer;

		// paq.push(['trackEvent', 'Track', 'closeTrack', o.fileInfo.title]);

		o.register = false;

		o.setActivePreset(undefined);
		o.previousPresetDesc = undefined;
		if (o.presetsFollower) o.presetsFollower.currentMatches = [];

		// o.audio.pause(); // audio element
		o.stop();

		o.wavesurfer.clearRegions();

		setTimeout(function(){ document.abplayer.register = true; }, 500);

		// hide all of the further links section:
		$('#furtherLinksDiv').hide();
		$('#sheetMusicLink').hide();
		$('#youtubeLink').hide();

		// hide the player itself:
		$('#panelPlayer').hide();
		$('#panelTrackSelection').show();
	},
	clickFilterPart: function (code, label) {
		document.abplayer.filterPart = code;
		$('#filterPartLabel').html(label);
		document.abplayer.trackselection.renderMenu();

		// paq.push(['trackEvent', 'Top', 'clickFilterPart', code]);
	},
	clickPlayPause: function() {
		if (document.abplayer.wavesurfer.isPlaying()) {
			// pause:
			// paq.push(['trackEvent', 'Track', 'pause', document.abplayer.fileInfo.title]);
			document.abplayer.pause();
		} else {
			// play:
			// paq.push(['trackEvent', 'Track', 'playing', document.abplayer.fileInfo.title]);
			document.abplayer.play();
		}
	},
	registerKeyPress: function(event) {
		if (event.which == 32) { // space bar
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
	},

	// colorTool helper class:
	colorTool: {
		getColorForType: function(type) {
			var ui = document.abplayer.ui;
			var c = ui.regionColors.DEFAULT;
			if (ui.regionColors[type]) {
				c = ui.regionColors[type];
			}
			return c;
		},
		getCurrentColor: function(color) { // return a more opaque version of this color object:
			return {
				r: color.r,
				g: color.g,
				b: color.b,
				alpha: color.alpha * 2
			};
		},
		getActiveColor: function(color) { // return a *very* opaque version of this color object:
			// (used for preset list, to mark the currently selected loop)
			return {
				r: color.r,
				g: color.g,
				b: color.b,
				alpha: 0.7
			};
		},
		getCSS: function(c) {
			return 'rgba('+c.r+','+c.g+','+c.b+','+c.alpha+')'
		}
	}
}; // end ui

// document.abplayer.presetsFollower (added 2017-10-03)
document.abplayer.presetsFollower = {
	currentMatches: [], // contains IDs (preset.desc, region.id)
	update: function() {
		var o = document.abplayer;
		var colorTool = o.ui.colorTool;
		var t = document.abplayer.getCurrentTime();
		// if (o.printEvents) console.log('presetsFollower.update(); t=' + t);

		// find matching presets:
		var tMatches = [];
		$.each(o.presetList, function(i, preset) {
			if ((t >= preset.t0 - 0.001) && (t <= preset.t1 + 0.001)) {
				tMatches.push(preset.desc);
			}
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

			$.each(addHighlight, function(i, id) {
				var target = o.findPresetByDesc(id);
				var preset = target.preset;	// TODO: if (!preset) ...
				var region = target.region;

				// background color: more opaque version of the base color:
				var base = colorTool.getColorForType(preset.type);
				var bg = colorTool.getCurrentColor(base);
				var bg2 = colorTool.getActiveColor(base); // even darker version...

				$('#smallPresets' + preset.domID).css('background-color', colorTool.getCSS(bg2));
				$('#largePresets' + preset.domID).css('background-color', colorTool.getCSS(bg2));
				if (region) region.update({color: colorTool.getCSS(bg)});
			});
			$.each(removeHighlight, function(i, id) {
				var target = o.findPresetByDesc(id);
				var preset = target.preset;	// TODO: if (!preset) ...
				var region = target.region;

				// background color: base color:
				var bg = colorTool.getColorForType(preset.type);

				$('#smallPresets' + preset.domID).css('background-color', colorTool.getCSS(bg));
				$('#largePresets' + preset.domID).css('background-color', colorTool.getCSS(bg));
				if (region)	region.update({color: colorTool.getCSS(bg)});
			});

			// memorize the new status:
			o.presetsFollower.currentMatches = tMatches;
		};
	}, // end update()
}; // end presetsFollower

// document.abplayer.trackselection
document.abplayer.trackselection = {
	renderMenu: function() {
		var matches = [];

		var filterSubGroup = document.abplayer.filterPart; // strict filter (including sub-voice-group, e.g. Sopran 2)
		var filterGroup = filterSubGroup.replace(/[0-9]/,""); // loose filter (i.e. treats Sopran 2 as Sopran)
			// console.log(filterSubGroup + "/" + filterGroup);
		var acceptEnsembleVersions = document.abplayer.filterPartEnsemble;

		var filterText = document.abplayer.filterText;

		$.each(
			document.abplayer.tracksData,
			function(index, value) { // console.log(value.title + "; " + value.part);
				// a tracks has to match all (active) filters...
				if ((!acceptEnsembleVersions) && (value.part.match(/[0]/g) != null)) {
					// console.log('skipping an ensemble version: ' + value.title + ', ' + value.part);
					// it is an ensemble version, skip:
					return;
				}

				// filterSubGroup:
				if (filterSubGroup.length > 0) {
					if (value.part.indexOf(filterGroup) == -1) return; // not even group match...
					if (value.part.match(/[1-9]/g) != null) { // the tracks itself IS for a sub-voice group!
						if (value.part.indexOf(filterSubGroup) == -1) { // not a sub-group match:
							return;
						}
					}
				}

				// filterText:
				if (filterText && (filterText.length > 0)) {
					var regex = new RegExp(filterText, 'ig')
					if (!value.title) return;
					if (value.title.match(regex) == null) return;
				}

				matches.push(value);
			}
		); // console.log(matches);


		var targets = ['trackSelection1', 'trackSelection2', 'trackSelection3', 'trackSelection4'];
		if (matches.length == 0) {
			// oh no, no matches!
			$('#trackSelectionMessage').html('<div class="alert alert-danger" role="alert"><strong>Oh nein, es gibt keine Treffer!</strong> Bitte andere Filter-Kriterien versuchen!</div>');

			for (var i=0; i<targets.length; i++) {
				$('#'+targets[i]).html('');
			}
			return;
		}
		$('#trackSelectionMessage').html(''); // if we have matches, clear empty message...

		var html = []; for (var i=0; i<targets.length; i++) { html[i] = ''; }

		// distribute div-by-4-able tracks to the columns:
		var targetCounts = []; for (var i=0; i<targets.length; i++) { targetCounts[i] = Math.floor(matches.length / targets.length); }
		var cursor = 0;
		// round-robin remaining tracks to the columns:
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
				+ 'data/' + o.trackCode + '.json\')">'
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
