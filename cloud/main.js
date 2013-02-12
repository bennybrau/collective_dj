var command = require('cloud/command.js');

Parse.Cloud.define("receiveSMS", function(request, response) {
	var fromSMS = request.params.From;
	var input = request.params.Body;
	console.log("Received a text from " + fromSMS);
	command.parse(input, fromSMS, response);
});

Parse.Cloud.define("whoIsHere", function(request, response) {
	var venueId = request.params.VenueId;
	command.whosHere(venueId, null, {
		success: function(users) {
			response.success(users);
		},
		error: function(err) {
			response.error(err);
		}
	});
});


Parse.Cloud.define("getVenuePlaylist", function(request, response) {
	var venueId = request.params.VenueId;
	var httpResponse = response;
	command.whosHere(venueId, null, {
		success: function(users) {
			
			var Playlist = Parse.Object.extend("Playlist");
			var playlistQuery = new Parse.Query(Playlist);
			playlistQuery.containedIn("user", users);
			
			var Track = Parse.Object.extend("Track");
			var trackQuery = new Parse.Query(Track);
			trackQuery.matchesQuery("playlists", playlistQuery);
			
			trackQuery.find({
				success: function(tracks) {
					httpResponse.success(tracks);
				},
				error: function(tracks, err) {
					httpResponse.error(err.message);
				}
			});
			
		},
		error:  function(err) {
			httpResponse.error(err);
		}
	});
	
});