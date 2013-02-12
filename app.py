import requests
import simplejson as json
import urllib
import pusher

import os
from flask import Flask, render_template, url_for, request

import settings
import logging

tmpl_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'templates')
app = Flask(__name__, template_folder=tmpl_dir)

app.config.from_pyfile('settings.py')

whosHere = []
tracks = []
venueName = ''
pusher_client = pusher.Pusher(app_id=app.config['PUSHER_APP_ID'],key=app.config['PUSHER_APP_KEY'],secret=app.config['PUSHER_APP_SECRET'])
playingTrack = None


def who_is_here():
    global whosHere
    headers = {
        "X-Parse-Application-Id": "Bwg2bgfendIUGwwNZHmjkzs9Zwxl3MMJ54xGw76t",
        "X-Parse-REST-API-Key": "RST7wZxjFEIBXk2Tj1L0x1IY0hB7wqTWIF1oDjL3",
        "Content-Type": "application/json"
    }
    payload = {'VenueId': app.config['VENUEID']}
    r = requests.post('https://api.parse.com/1/functions/whoIsHere', data=json.dumps(payload), headers=headers)
    whosHere = json.loads(r.content)['result']

def get_venue_playlist():
    global tracks
    headers = {
        "X-Parse-Application-Id": "Bwg2bgfendIUGwwNZHmjkzs9Zwxl3MMJ54xGw76t",
        "X-Parse-REST-API-Key": "RST7wZxjFEIBXk2Tj1L0x1IY0hB7wqTWIF1oDjL3",
        "Content-Type": "application/json"
    }

    payload = {'VenueId': app.config['VENUEID']}
    r = requests.post('https://api.parse.com/1/functions/getVenuePlaylist', data=json.dumps(payload), headers=headers)
    tracks = json.loads(r.content)['result']
    for track in tracks:
        if (playingTrack == track["spotifyURI"]):
            track["playing"] = True
        else:
            track["playing"] = False

def get_venue(vId):
    global venueName
    headers = {
        "X-Parse-Application-Id": "Bwg2bgfendIUGwwNZHmjkzs9Zwxl3MMJ54xGw76t",
        "X-Parse-REST-API-Key": "RST7wZxjFEIBXk2Tj1L0x1IY0hB7wqTWIF1oDjL3",
        "Content-Type": "application/json"
    }
    params = urllib.urlencode({"where":json.dumps({"SMSHandle":vId})})
    r = requests.get('https://api.parse.com/1/classes/Venue?%s' % params, headers=headers)
    venue = json.loads(r.content)['results'][0]
    if (venue is not None):
        venueName = venue['name']

@app.route("/")
def index():
    global whosHere,venueName,tracks
    who_is_here()
    get_venue_playlist()
    get_venue(app.config['VENUEID'])
    return render_template('index.html', pusher_app_key=app.config['PUSHER_APP_KEY'], whosHere=whosHere, tracks=tracks, venueName=venueName)
    
@app.route("/play")
def play():
    global request,pusher_client,playingTrack
    trackURI = request.args.get('trackURI')
    if (trackURI is not None):
        pusher_client['jukebox_channel'].trigger('play', trackURI)
        playingTrack = trackURI
    else:
        playingTrack = None
    return playingTrack

@app.route("/stop")
def stop():
    global playingTrack
    pusher_client['jukebox_channel'].trigger('stop', '')
    playingTrack = None
    return ''

@app.route("/whoshere")
def whoshere():
    global whosHere,venueName,tracks
    who_is_here()
    get_venue_playlist()
    get_venue(app.config['VENUEID'])
    
    ret = {'people':whosHere, 'tracks':tracks}
    
    return json.dumps(ret);
    
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
