# flask_messenger
Single-page messaging web app powered by Flask and Javascript

The Chat application is a single-page app, run from only the index.html template,
a flask server, and  Javascript file. After providing a display name, users are
able to post messages, see messages posted to their current channel in real-time,
add new channels, and delete messages.

1. Login

Before being logged in, the main content block, showing display name, current
channel, messages, and the message input form is hidden from view. Further, the
sidebar navigation links to each channel and the new channel form field are
disabled.

When logging in, the login form is hidden, all forms and links are activated, and
the current channel is loaded. The current channel and display name are both
stored in localStorage, ensuring that each browser session saves a user's info
and current location. If there is no current channel (a new user or no variable
for any other reason), this is set to the general channel, which is in the server
by default.

2. Adding and selecting a channel
Channels can be added via the sidebar new channel form. This form sends a POST
request to the server, which adds the form if a form by that name does not
already exist. This server funtion then reloads the browser. This does not use
Socket.io to echo, so other users will need to refesh their page to chekc for
new channels.

When navigating to a new channel, a click event listener listens for clicks on
sidebar links. This triggers a call to reload the page, which first clears the
existing messages, then sends a request to the server for all messages in the
desired channel. The function then appends each message to the messages element
in order of recency. Then the channel title and username is updated to match the
new channel and current user. This same function is also called on page load.

3. Messaging

When a usr submits a message, a Socket.io request is sent to the server with all
post content and metadata (date/time, channel, and user). The server then 
appends a new message entry (dictionary of content + metadata) to the appropriate
channel list. The server also uses a global counter to append a unique message id
to each message. The server then ensures that no more than 100 messages per 
channel are kept, by deleting the oldest message if needed. The server then emits a
Socket.io event back to all clients.

When a client recieves the 'message added' Socet.io event, if that client is in
the channel with a message added, a new message is added to the top of the 
message list. Other users will see the new messagewhen navigating to hat channel.

4. Personal Touch - Message Deletion

User can delee any message by clicking the 'X' button ocated in each post element.
A clcik event listener will trigger a Socket.io call to the server, sending the
message ID (gotten from the post element ID) and the channel.

The server will search for a message with that ID in the given channel list, and
delete it upon finding. It will then emit a response Socket.io event back to all
users with the message ID and channel info.

When a client recieves this event, if that client is in the given channel, the
message is removed from the DOM. Other users will not see the message when
visiting the channel, as it no longer exists!.
