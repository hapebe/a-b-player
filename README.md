a-b-player
==========

An A-B Repeat/Loop Audio Player with HTML5, based on 
https://github.com/holin/abRepeater, largely extended 
for the practice / sing-along tracks of "The Melodetts" 
by hapebe@gmx.de

2017-10 
=======
trying to switch to WaveSurfer.js (https://wavesurfer-js.org/) as the actual player element.

2017-11
=======
* added custom favicon(s), also for Android and iOS shortcuts
* added current time indicator (playback position)
* made the track list full width and allowed 4 columns for the overview on XL screens
* add support for space bar (toggle play/pause)
* add graphic representation of loop(s) - wavesurfer.js region plugin...
	* regions: synchronize / sanitize highlighting (bg color) of loops and preset list entries
* add volume adjustment slider
* fix issue: play/pause button does not look right after looping at the track end
* allow filtering the tracks in overview by typing (search field)
	* backport the feature for the <audio> element-based version
* added links to switch between the classic <audio> player and the wavesurfer version

2017-12
=======
* replace the "trackset" data field in single track's JSON with a reference to the related pieces entry in tracks.json ("pieceID" - as to not duplicate the trackset for each single track any more)


TODOs:
* guess / extract the voice part code from the suffix of the track code
* create the track titles from their respective JSON files (via unique track code), display / save this as generated JSON code back to tracks.json
* add error message (pop-up? dialog?) if loading of track fails (e.g. when audio file is missing)
* if the number of tracks is >50 / > 100 (?), prefix the list of tracks for each initial letter with this letter.
* regions: allow creation of presets by dragging (selecting / marking) the waveform view
* display sheetMusicURL property of track data, if set
* create an overview table of the tracks from tracks.json, pieces data field



References / Acknowledgements:
* https://github.com/holin/abRepeater (abRepeater using HTML5 audio element and file drag-n-drop)
* https://codepen.io/MattIn4D/pen/LiKFC (absolute center busy spinner overlay, using CSS)
* https://wavesurfer-js.org/ (audio player library supporting graphic display of the waveform)
