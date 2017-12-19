document.abplayer.validator = {
	// for 'tracks' records:
	uniqueParts: {},
	uniqueCategories: {},
	uniqueComments: {},
	
	// dictionary: track code => track title
	trackTitleDictionary: { _comment:'This is a computer-generated dictionary of the titles of all single tracks IF they are registered in any {trackset} in {pieces}.'},
	
	// single track validation: queued, and asynchronous
	singleTrackQueue: [],
	singleTrackBusy: false,
	singleTrackCounter: 0,
	singleTrackInterval: false,
	handleValidateSingleTracks: function() {
		if (this.singleTrackQueue.length == 0) {
			// we are finished!
			clearInterval(this.singleTrackInterval);
			console.log('finished single track validation.');
			
			// display trackTitleDictionary:
			$('#devOutput').html('<code><pre>"titleDict": ' + JSON.stringify(this.trackTitleDictionary, null, 2) + '</pre></code>');
			
			return;
		}
		if (!this.singleTrackBusy) {
			if (this.singleTrackCounter % 10 == 0) {
				console.log('finished ' + this.singleTrackCounter + ' single tracks...');
			}
			
			var trackCode = this.singleTrackQueue.shift();
			this.validateSingleTrackFile(trackCode);
		}
	},
	runValidateSingleTracks: function() {
		console.log('starting single track validation of ' + this.singleTrackQueue.length  + ' tracks...');
		this.singleTrackInterval = setInterval(function() {document.abplayer.validator.handleValidateSingleTracks();}, 50);
	},
	
	
	// main validation function:
	validateList: function() {
		var o = document.abplayer;
		
		if (!o.tracksData || o.tracksData.length == 0) {
			console.log('No tracks data present!');
		} else {
			var tracks = o.tracksData;
			
			console.log(tracks.length + ' tracks records are present.');
			
			// check them individually
			for (var i=0; i<tracks.length; i++) {
				var check = this.validateTracksEntry(tracks[i]);
				if (check !== true) {
					console.log('track #' + i + ' (' + tracks[i].title + '): ' + check.join(', '));
				}
			}
		}

		this.printUniqueTrackValues();
		
		if (!o.piecesData || o.piecesData.length == 0) {
			console.log('No pieces data present!');
		} else {
			var pieces = o.piecesData; // this is an object, not a plain array!
			
			var cnt = 0;
			for (var key in pieces) {
				if (pieces.hasOwnProperty(key)) {
					cnt ++;
					// var piece = pieces[key];
				}
			}
			console.log(cnt + ' pieces records are present.');
			
			// check them individually
			for (var key in pieces) {
				if (pieces.hasOwnProperty(key)) {
					var check = this.validatePiecesEntry(pieces[key]);
					if (check !== true) {
						console.log('piece [' + key + ']: ' + check.join(', '));
					}
				}
			}
		}

		
		
		
		// regarding the individual track data sets / files:
		// trigger validation of single tracks:
		this.runValidateSingleTracks();
		
		
	}, // end function validateList

	
	validateTracksEntry: function(entry) {
		var errors = [];

		// must have fields:
		if (!entry.title) { errors.push('no title'); }
		if (!entry.trackCode) { errors.push('no trackCode'); }
		if (!entry.part) {
			errors.push('no part'); 
		} else {
			this.uniqueParts[entry.part] = true;
		}
		
		// can have fields:
		if (entry.category) { this.uniqueCategories[entry.category] = true; }
		if (entry.comment) { this.uniqueComments[entry.comment] = true; }
		
		// does it have unknown fields?
		for (var key in entry) {
			if (entry.hasOwnProperty(key)) {
				if (key == 'title') continue;
				if (key == 'trackCode') continue;
				if (key == 'part') continue;
				if (key == 'category') continue;
				if (key == 'isLive') continue;
				if (key == 'isEnsemble') continue;
				if (key == 'isInstrumental') continue;
				if (key == 'comment') continue;
				
				// unknown field!
				errors.push('unknown data field ' + key + '!');
			}
		}

		if (errors.length == 0)	return true;
		return errors;
	},
	
	validatePiecesEntry: function(entry) {
		var errors = [];

		// must have fields:
		if (!entry.title) { errors.push('no title'); }
		if (!entry.trackset) { errors.push('no trackset'); }
		
		// can have fields:
		// NOP at the moment
		
		// does it have unknown fields?
		for (var key in entry) {
			if (entry.hasOwnProperty(key)) {
				if (key == 'title') continue;
				if (key == 'category') continue;
				if (key == 'key') continue;
				if (key == 'tempo') continue;
				if (key == 'info') continue;
				if (key == 'authorMusic') continue;
				if (key == 'authorText') continue;
				if (key == 'sheetMusicURL') continue;
				if (key == 'trackset') continue;
				if (key == 'renditions') continue;
				
				// unknown field!
				errors.push('unknown data field ' + key + '!');
			}
		}
		
		// validate trackset:
		if (entry.trackset) {
			var check = this.validateTrackSet(entry.trackset);
			if (check !== true) {
				errors.push('Problem with trackset: ' + check.join(', '));
			}
		}

		if (errors.length == 0) return true;
		return errors;
	},

	/**
	 * parameter data is the complete content of a single track data file
	 */
	validateSingleTrack: function(data) {
		var errors = [];

		// must have fields:
		if (!data.title) { errors.push('no title'); }
		if (!data.url) { errors.push('no audio url'); }
		if (!data.presets) { errors.push('no presets'); }
		if (!data.pieceID) { errors.push('no pieceID'); }
		
		// can have fields:
		// NOP at the moment
		
		// does it have unknown fields?
		for (var key in data) {
			if (data.hasOwnProperty(key)) {
				if (key == 'title') continue;
				if (key == 'url') continue;
				if (key == 'presets') continue;
				if (key == 'pieceID') continue;
				// if (key == 'trackset') continue; // we don't accept this any longer: it is now controlled in tracks.json/pieces
				
				// unknown field!
				errors.push('unknown data field ' + key + '!');
			}
		}
		
		if (errors.length == 0) return true;
		return errors;
	},
	
	validateTrackSet: function(trackset) {
		var errors = [];
		
		if (trackset.length == 0) errors.push('no tracks in trackset');
		
		var cnt = 0;
		for (var part in trackset) {
			var trackCode = trackset[part];
			
			// add this to the global list of trackCodes, IF it is new / unique:
			if (this.singleTrackQueue.indexOf(trackCode) == -1) {
				this.singleTrackQueue.push(trackCode);	
			} else {
				errors.push(trackCode + ' is referenced more than once');
			}
			
			cnt++;
		}
		if (cnt == 0) { errors.push('trackset has no entries!'); }
		
		if (errors.length == 0) return true;
		return errors;
	},
	
	/**
	 * no return value here - does its own (async) error handling...
	 */
	validateSingleTrackFile: function(trackCode) {
		// only allow one instance at a time...
		if (this.singleTrackBusy) return ['cannot run - another instance is busy'];
		this.singleTrackBusy = true;
		
		var url = 'data/' + trackCode + '.json';
		$.getJSON(url)
		.done(function(data) { 
			var check = document.abplayer.validator.validateSingleTrack(data);
			if (check != true) {
				console.log(trackCode + ': ' + check.join(', '));
			} else {
				document.abplayer.validator.trackTitleDictionary[trackCode] = data.title;
			}
			document.abplayer.validator.singleTrackBusy = false; // only allow one instance at a time...
			document.abplayer.validator.singleTrackCounter++;
		})
		.fail(function(jqxhr, textStatus, error ) {
			console.log((url + ': ' + textStatus + ": " + error));
			document.abplayer.validator.singleTrackBusy = false; // only allow one instance at a time...
			document.abplayer.validator.singleTrackCounter++;
		});
	}, // end function validateSingleTrackFile

	
	printUniqueTrackValues: function() {
		var parts = [];
		for (var key in this.uniqueParts) {
			parts.push(key);
		}
		parts.sort();
		console.log('All unique part codes: ' + parts.join(', '));
		
		var categories = [];
		for (var key in this.uniqueCategories) {
			categories.push(key);
		}
		categories.sort();
		console.log('All unique category codes: ' + categories.join(', '));
		
		var comments = [];
		for (var key in this.uniqueComments) {
			comments.push(key);
		}
		comments.sort();
		console.log('All unique comments: ' + comments.join(', '));
	}
};
