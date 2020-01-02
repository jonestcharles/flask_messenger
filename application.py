import os
import requests

from flask import Flask, render_template, jsonify, request
from flask_socketio import SocketIO, emit

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

# stores all msg and channel info
app_data = {"general": []}

# global counter to create unique message ids
msg_counter = 0

# maximum number of posts the server stores per channel
MAX_PER_CHANNEL = 100

'''
Home Route

Upon page load, gets the existing keys from app_data, which are the channel names,
and uses them to render the HTML template with an up-to-date channel list.
'''
@app.route("/")
def index():
    channels = app_data.keys()
    error = None
    return render_template("index.html", channels = channels, error = error)

'''
Load Route

Called when a user is changing messaging channels. Recieves a channel name from
the request, and returns the list of messages in the channel from app_data.
'''
@app.route("/load", methods=["POST"])
def load():
    channel_name = request.form.get("channel")

    return jsonify({"messages": app_data[channel_name]})

'''
Channel Route

Called when a user submits the the form to add a channel. If the channel exists,
reports an error. Otherwise, the channel is added as empty. Returns the channel
names (keys in app_data) and renders the HTML template.
'''
@app.route("/channel", methods=["POST"])
def channel():
    channel = request.form.get("channel-name")

    error = None

    if channel not in app_data: 
        app_data[channel] = []

    else:
        error = True
    
    channels = app_data.keys()

    return render_template("index.html", channels = channels, error = error)

'''
Message Submission Socket Event

This socket event recieves a new message submission from a client. Client sends
message content, the channel, username, and full date/time of the message as
request data.

Each message is created as a dictionary of that information (except the channel)
and a unique ID gotten from the global message counter. The message is then appended
to the appropriate channel list in app_data.

If after adding the new message there are more than MAX_PER_CHANNEL messages in
the channel, the oldest message is removed. The return event is then broadcast to
all clients.
'''
@socketio.on("submit message")
def message(data):
    message = data["message"]
    channel = data["channel"]
    user = data["username"]
    date = data["date"]

    global msg_counter
    msg_counter += 1

    msg_entry = {"msg": message, "user": user, "date": date, "id": msg_counter}

    app_data[channel].append(msg_entry)

    if len(app_data[channel]) > MAX_PER_CHANNEL:
        app_data[channel].pop(0)

    emit("announce message", {"message": msg_entry, "channel": channel, 
        "date": date}, broadcast=True)

'''
Delete Message Socket Event

This event is triggered when a message is deleted by a client. Messages are not
only removed from the DOM, but deleted from the server.

If the provided channel is in app_data, then the first (and only) message with 
the matching ID is removed from the message list. If the channel or message
doesn't exist, an error flag is passed back to the client.
'''
@socketio.on("delete message")
def delete(data):
    msg_id = int(data["msg_id"])
    channel = data["channel"]

    error = None

    if channel in app_data:
        target_msg = next((msg for msg in app_data[channel] if msg["id"] == msg_id), None)

        if not target_msg:
            error = True

        else:
            app_data[channel].remove(target_msg)

    else:
        error = True

    emit("message deleted", {"error": error, "id": msg_id, 
        "channel": channel}, broadcast=True)
