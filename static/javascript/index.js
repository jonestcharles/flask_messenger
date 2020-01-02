// if no currentChannel variable exists, create one.
if (!localStorage.getItem('currentChannel'))
    localStorage.setItem('currentChannel', 'general');


const postTemplate = Handlebars.compile(document.querySelector('#post').innerHTML);

// set up socket
const socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

document.addEventListener('DOMContentLoaded', () => {
    
    // declare some variables
    const messageSubmitBtn = document.querySelector('#message-submit');
    const messageFormField = document.querySelector('#message');
    const channelSubmitBtn = document.querySelector('#channel-submit');
    const channelFormField = document.querySelector('#channel-name');
    const loginSubmitBtn = document.querySelector('#login-submit');
    const userFormField = document.querySelector('#username');
    const loginBlock = document.querySelector('#login-block');
    const mainBlock = document.querySelector('#main');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // set all form submit buttons to disabled after DOM loads
    messageSubmitBtn.disabled = true;
    channelSubmitBtn.disabled = true;
    loginSubmitBtn.disabled = true;

    // if no displayName, show the login form, hide main/channel form, and 
    // disable links.
    // Else, hide login and show main content; load channel general
    if (!localStorage.getItem('displayName')) {
        loginBlock.style.display = 'block';
        mainBlock.style.display = 'none';
        navLinks.forEach(channel => {
            channel.classList.toggle('link-off');
        });
    }

    else {
        loginBlock.style.display = 'none';
        mainBlock.style.display = 'block';
        changeChannel(localStorage.getItem('currentChannel'));
    }

    // sets channel submit field to active when valid submission present, and user
    // is logged in
    messageFormField.onkeyup = () => {
        if (messageFormField.value.length > 0 &&
            localStorage.getItem('displayName'))
            messageSubmitBtn.disabled = false;
        else
            messageSubmitBtn.disabled = true;
    };

    // sets channel submit field to active when valid submission present, and user
    // is logged in
    channelFormField.onkeyup = () => {
        if (channelFormField.value.length > 0 &&
            localStorage.getItem('displayName'))
            channelSubmitBtn.disabled = false;
        else
            channelSubmitBtn.disabled = true;
    };

    // sets username submit field to active when a valid submission present
    userFormField.onkeyup = () => {
        if (userFormField.value.length > 0)
            loginSubmitBtn.disabled = false;
        else
            loginSubmitBtn.disabled = true;
    };

    // When username submitted, sets displayName in localStorage, hides login content,
    // shows main content and channel form, loads the general channel, toggles
    // channel links on,and clears/disables the login form
    document.querySelector('#login').onsubmit = () => {
        const username = userFormField.value;
        localStorage.setItem('displayName', username);

        loginBlock.style.display = 'none';
        mainBlock.style.display = 'block';
        navLinks.forEach(channel => {
            channel.classList.toggle('link-off');
        });
        changeChannel('general');

        userFormField.value = '';
        loginSubmitBtn.disabled = true;

        return false;
    };

    // when any nav-link is clicked, changes main content to show messages for
    // new channel, or returns false if link is disabled
    navLinks.forEach(link => {
        link.onclick = () => {
            if (link.classList.contains('link-off'))
                return false;
            
            else {
                changeChannel(link.dataset.page);
                return false;
            }
        };
    }); 

    socket.on('connect', () => {

        // when message is submitted, emit the message, displayName and current 
        // channel to the server. Clear input and disable form.
        document.querySelector('#new-message').onsubmit = () => {
            const message = messageFormField.value;
            const current_channel = document.querySelector('.channel-title').id;
            var date = new Date();

            socket.emit('submit message', {'message': message, 
                'channel': current_channel, 'username': localStorage.getItem('displayName'),
                'date': date.toUTCString()});
            
            messageFormField.value = '';
            messageSubmitBtn.disabled = true;
            
            return false;
        };
   
        // When message is announced from the server, a new message is added to the
        // list for users in that current channel. For others, message is displayed
        // when switching channels to channel with new message.
        socket.on('announce message', data => {
            if (data.channel === localStorage.getItem('currentChannel')) {
                addPost(data.message);
            }
        });

        // When recieving a socket response from the server indicating a successful
        // message deletion, triggers the delete animation, and removes the
        // message form the DOM for all clients in the channel. For others, the
        // deleted message isn't visible, and won't be loaded if those users
        // navigate to the given channel.
        socket.on('message deleted', data => {
            if (!data.error && data.channel === localStorage.getItem('currentChannel')) {
                const post = document.querySelector('#' + CSS.escape(data.id));

                post.style.animationPlayState = 'running';
                post.addEventListener('animationend', () => {
                    post.remove();
                });
            }
        });
    });
});

// Click event listener. If the click target is a delete button on a post, this 
// sends a scket event to the server trigger mesage deletion from the server.
document.addEventListener('click', event => {
    const element = event.target;

    if (element.className == 'delete') {
        
        const parentId = element.parentElement.id;

        socket.emit('delete message', {
            'msg_id': parentId,
            'channel': localStorage.getItem('currentChannel')
        });

    return false;
    }
});

// On a scroll event, if the window has scrolled beyond the top of the header 
// a classes pinning it to the top of the browser window is added. If this is
// not true, the class is removed
window.addEventListener('scroll', () => {
    // Get the header
    var header = document.querySelector(".header");

    // Get the offset position of the navbar
    var sticky = header.offsetTop;

    // Add the sticky class to the header when you reach its scroll position. 
    // Remove "sticky" when you leave the scroll position
    if(window.pageYOffset > sticky) {
        header.classList.add("sticky");
    } 
    
    else {
        header.classList.remove("sticky");
    }
});

// This funciton is called when initially loading the current page, or when
// changing channels.
//
// The function first clears all messages from the DOM. loadMessages() is called
// to add all messages in the channel 'name' (initial or new channel being
// navigated to).
//
// After mesages are loaded, the channel name, user name, and currentChannel 
// variable in localStorage are updated, and the new active channel link is
// given a style to highlight it as current.
function changeChannel(name) {
    
    const chatroom = document.querySelector('#messages');
    const title = document.querySelector('.channel-title');

    // clear all messages from DOM
    chatroom.innerHTML = null;
    
    // send load page request
    loadMessages(name);
    // also does all the active channel and title changing

    // update active channel and title
    title.innerHTML = '#' + name;
    title.id = name;
    localStorage.setItem('currentChannel', name);
    document.querySelector('.logged-in-as').innerHTML = "Logged in as: " 
        + localStorage.getItem('displayName');

    // set the link to active
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.id === name) {
            link.classList.add('active')
        }

        else {
            link.classList.remove('active');
        }
    });
};

// Called when loading messages to the DOM (changing channels). Creates a new POST
// request using AJAX.
//
// Upon request load, the JSON response is parsed. If successful, all messages 
// are added to the message list. Else, an error flag is returned
//
// The name of the desired channel, taken from the link, is sent as form data
// with the request.
function loadMessages(name) {

    const chatroom = document.querySelector('#messages');
    const request = new XMLHttpRequest();
    request.open('POST', `/load`);

    request.onload = () => {

        // get response
        const result = JSON.parse(request.responseText);

        if (result.error == true) {
            return;
        }

        // load messages from new channel, show error if error occurred
        const messages = result.messages;

        messages.forEach(message => {
            addPost(message)
        }); 
    };
    
    // send channel name as form data
    const data = new FormData();
    data.append('channel', name);

    request.send(data);
};

// Adds a new post with given contents to DOM. Uses a Handlebars template.
function addPost(message) {

    const messageBlock = document.querySelector('#messages');
    // Create new post.
    const post = postTemplate({'post-content': message.msg, 
        'post-author': message.user, 'post-date': message.date, 'post-id': message.id});

    // Add post to DOM.
    messageBlock.insertAdjacentHTML('afterbegin', post);
};
