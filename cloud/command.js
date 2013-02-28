var twilio = require('twilio');
twilio.initialize('AC7091352a407b05963e4ea43950ea94f5', 'e541313a846212acc8426da463e20ad2');

var PUSHER_APP_ID = '17894';

exports.parse = function(command, fromSMS, response) {
	if (command) {
		console.log("Parsing command " + command);
		var tokens = command.split(' ');
		var operation = tokens[0].toLowerCase();
		switch (operation) {
			case 'checkin':
				if (tokens.length > 1) {
					exports.checkin(tokens[1].toLowerCase(), fromSMS, response);
				}
				break;
			case 'whoshere':
				if (tokens.length > 1) {
					exports.whosHere(tokens[1].toLowerCase(), fromSMS, response);
				}
				break;
			case 'nextsong':
				exports.nextSong(fromSMS, response);
				break;
			default:
				response.error("No valid command given.");
				break;
		}
	}
	else {
		response.error("No command");
	}
}

exports.sendSMS = function(toSMS, message) {
	twilio.sendSMS({
  		From: "+16305065688",
  		To: toSMS,
  		Body: message
		}, {
  			success: function(httpResponse) {
    			console.log(httpResponse);
    			return true;
  		},
  		error: function(httpResponse) {
    		console.error(httpResponse);
    		return false;
  		}
	});
}


exports.whosHere = function(venue, fromSMS, response) {
	console.log("Seeing whos at the venue: " + venue);
	var venueQuery = new Parse.Query("Venue");
	venueQuery.equalTo("SMSHandle", venue);
	
	var attendanceQuery = new Parse.Query("VenueCheckIn");
	attendanceQuery.matchesQuery("venue", venueQuery);
	var curTime = new Date();
	var fourHoursAgo = new Date(curTime.getTime() - 14400000); //4 hrs in mills
	var fourHoursAgoUTC = Date.UTC(fourHoursAgo.getFullYear(), fourHoursAgo.getMonth(), fourHoursAgo.getDate(),
											fourHoursAgo.getHours(), fourHoursAgo.getMinutes(), fourHoursAgo.getSeconds(), fourHoursAgo.getMilliseconds());
	attendanceQuery.greaterThanOrEqualTo("checkInMills", fourHoursAgoUTC);
	var checkInCollection = attendanceQuery.collection();
	checkInCollection.fetch({
		success: function(checkInCollection) {
			var checkedInUserIds = new Array();
			
			checkInCollection.each(function(c) {
				checkedInUserIds.push(c.get("user").id);
			});
			
			var userQuery = new Parse.Query(Parse.User);
			userQuery.containedIn("objectId", checkedInUserIds);
			
			userQuery.find({
				success: function(results) {
					response.success(results);
					
					if (fromSMS) {
						var msg = JSON.stringify(results);
						if (results.length == 0)
							msg = "No one in da house.";
				
						exports.sendSMS(fromSMS, msg);
					}
				}
			});
		},
		error: function(checkInCollection, err) {
			response.error(err);
		}
	});
}

exports.checkin = function(venue, fromSMS, response) {
	console.log("Attempting checkin to venue: " + venue + " from user: " + fromSMS);
	var userQuery = new Parse.Query(Parse.User);
	userQuery.equalTo("SMS", fromSMS);
	
	var venueQuery = new Parse.Query("Venue");
	venueQuery.equalTo("SMSHandle", venue);
	
	venueQuery.first({
		success: function(v) {
			userQuery.first({
				success: function(u) {
					var VenueCheckin = Parse.Object.extend("VenueCheckIn");
					var checkin = new VenueCheckin();
					checkin.set("user", u);
					checkin.set("venue", v);
					var curDate = new Date();
					var checkInTime = Date.UTC(curDate.getFullYear(), curDate.getMonth(), curDate.getDate(),
											curDate.getHours(), curDate.getMinutes(), curDate.getSeconds(), curDate.getMilliseconds());
					checkin.set("checkInMills", checkInTime);
					checkin.save(null, {});
					
					if (fromSMS)
						exports.sendSMS(fromSMS, "You are checked into " + v.get("name") + ".  Your tunes will be added to the playlist.");
					//exports.sendPusherCheckInNotification(v.get("channelName"), u);
					response.success("Checked in user: " + u.get("username") + " at venue " + v.get("name"));
				},
				error: function(u,err) {
					response.error(err);
				}
			});
		},
		error: function(v, err) {
			response.error(err);
		}
	});
	
}