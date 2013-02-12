function play(spotifyUri)
{
	$.ajax({url: "http://localhost:5000/play?trackURI=" + spotifyUri, success: function(data) {}});
}

($('.btn').click(function() {
	var spotifyURI = $(this).id;
	alert(spotifyURI);
}))();