// do this even when complete loading fails...
$('#panelPlayer').hide();
$("#busyIndicator").hide();

$(function(){
	document.abplayer.init();
});

// document.abplayer CUT DOWN OBJECT DEFINITION:
document.abplayer = {
/**
 * all available pieces, as defined in tracks.json
 */
piecesData: {},
/**
 * all available tracks, suitable for filtering and displaying links (buttons)
 * this is a generated data array, see: document.abplayer.makeTracksData()
 */
tracksData: [],

init: function() {
	document.abplayer.dataSource.loadIndexData('./data/tracks.json');
},	

onDataReady: function() {
	document.trackTableView.render('trackTableRows');
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
		document.abplayer.dataSource.makeTracksData(data);
		
		// fire data ready event:
		document.abplayer.onDataReady();
	})
	.fail(function(jqxhr, textStatus, error ) {
		var err = textStatus + ", " + error;
		console.log( "Request Failed: " + err );
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
		DEFAULT: {r: 125, g: 194, b: 255, alpha: 0.2},
		alternative: {r: 162, g: 111, b: 255, alpha: 0.2},
		verse: {r: 255, g: 241, b: 125, alpha: 0.2},
		chorus: {r: 255, g: 125, b: 125, alpha: 0.2},
		bridge: {r: 162, g: 255, b: 162, alpha: 0.2},
		invisible: {r: 255, g: 255, b: 255, alpha: 0.0}
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
		_paq.push(['trackEvent', 'Track', 'relatedTrackFromTo', o.trackCode + ' to ' + code]);
		_paq.push(['trackEvent', 'Track', 'relatedTrackFrom', o.trackCode]);
		_paq.push(['trackEvent', 'Track', 'relatedTrackTo', code]);
		
		o.stop();
		
		o.openMeta(url);

		// $('#panelPlayer').show();
		// $('#panelTrackSelection').hide();
	},
	closePlayer: function() {
		var o = document.abplayer;
		
		_paq.push(['trackEvent', 'Track', 'closeTrack', o.fileInfo.title]);
		
		o.register = false;
		
		o.setActivePreset(undefined);
		o.previousPresetDesc = undefined;
		if (o.presetsFollower) o.presetsFollower.currentMatches = [];

		// o.audio.pause(); // audio element
		o.stop();
		
		o.wavesurfer.clearRegions();
		
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
			_paq.push(['trackEvent', 'Track', 'pause', document.abplayer.fileInfo.title]);
			document.abplayer.pause();
		} else {
			// play:
			_paq.push(['trackEvent', 'Track', 'playing', document.abplayer.fileInfo.title]);
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

// document.trackTableView (added 2017-12-20)
document.trackTableView = {
	render: function(targetId) {
		var ab = document.abplayer;
		for (var pieceId in ab.piecesData) {
			var piece = ab.piecesData[pieceId];
			
			var html = [];
			html.push('<tr>');
			
			// sheetMusic:
			if (piece.sheetMusicURL && piece.sheetMusicURL.length > 0) {
				html.push('<td><a href="' + piece.sheetMusicURL + '" target="_blank"><span class="glyphicon glyphicon-paperclip"></span></a></td>');
			} else {
				html.push('<td></td>');
			}
			
			// title:
			html.push('<td>' + piece.title + '</td>');
			
			// Ensemble:
			if (piece.trackset['SATB']) {
				html.push('<td align="center"><a href="' + this.makePlayerLink(piece.trackset['SATB']) + '">SATB</a></td>');
			} else {
				html.push('<td></td>');
			}
			
			// S, A, T, B:
			html.push(this.makePartCell(piece.trackset, 'S'));
			html.push(this.makePartCell(piece.trackset, 'A'));
			html.push(this.makePartCell(piece.trackset, 'T'));
			html.push(this.makePartCell(piece.trackset, 'B'));
			
			// Live:
			// TODO
			html.push('<td></td>');
			
			// Links:
			// TODO
			html.push('<td></td>');
			
			
			html.push('</tr>');
			
			// actually inject the generated HTML:
			$('#'+targetId).append(html.join("\n"));
		}
	},
	makePartCell: function(trackset, part) {
		part = part.toUpperCase();
		if (trackset[part]) {
			// okay, we have a combined part:
			var trackcode = trackset[part];
			return '<td align="center" colspan="2"><a href="' + this.makePlayerLink(trackcode) + '">' + part + '</a></td>';
		} else if (trackset[part+'1'] || trackset[part+'2']) {
			// we have one or two subGroup tracks:
			var cells = [];
			if (trackset[part+'1']) {
				var trackcode = trackset[part+'1'];
				cells.push('<td align="center"><a href="' + this.makePlayerLink(trackcode) + '">' + part+'1' + '</a></td>');
			} else {
				cells.push('<td>&nbsp;</td>');
			}
			if (trackset[part+'2']) {
				var trackcode = trackset[part+'2'];
				cells.push('<td align="center"><a href="' + this.makePlayerLink(trackcode) + '">' + part+'2' + '</a></td>');
			} else {
				cells.push('<td>&nbsp;</td>');
			}
			return cells.join("\n");
		} else {
			// we have nothing here...
			return '<td colspan="2">&nbsp;</td>';
		}
	},
	makePlayerLink: function(trackcode) {
		return 'wavesurfer.html#' + trackcode;
	},
}; // end trackTableView

