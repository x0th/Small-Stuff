const socket = io('http://localhost:1337');
const sendForm = document.getElementById('send-container');
const messageContainer = document.getElementById('message-container');
const messageInput = document.getElementById('message-input');
const userCount = document.getElementById('user-count');
const roleContainer = document.getElementById('role-container');
const timer = document.getElementById('timer');
const dayNight = document.getElementById('day-night');
const userContainer = document.getElementById('user-container');
const actionForm = document.getElementById('action-form');
const actionContainer = document.getElementById('action-container');
var u_role;
var users = [];
deadPeople = [];
var dayOrNight;
var isDead = false;
var disabled = false;

// Socket stuff, see README for details.

socket.emit('user-join', r_name, u_name);

socket.on('user-count-change', function (count) {
    userCount.innerText = 'Current users: ' + count + '/7';
});

socket.on('pass-user-list', function (userArr, increase) {
    if (increase) {
        for (var i = 0; i < userArr.length; i++) {
            var insert = true;
            for (var j = 0; j < users.length; j++) {
                if (userArr[i].username == users[j])
                    insert = false;
            }
            if (insert) {
                users.push(userArr[i]);
                appendUser(userArr[i].username);
            }
        }
    } else {
        for (var i = 0; i < users.length; i++) {
            var del = true;
            for (var j = 0; j < userArr.length; j++) {
                if (users[i].id == userArr[j].id)
                    del = false;
            }
            if (del) {
                deleteUser(users[i].username);
                users.splice(i, 1)
            }
        }
    }
});

socket.on('chat-message', function (data) {
    appendMessage(data.user, data.message);
});

socket.on('role-given', function (role) {
    u_role = role;
    roleContainer.innerText = 'Your current role: ' + role + '.';
});

socket.on('timer', function (data) {
    timer.innerText = data.time + '/' + data.max;
});

socket.on('day-night', function (day_night, whatHappened) {
    dayOrNight = day_night;
    if(whatHappened != null)
        sayWhatHappened(whatHappened);
    clearActionForm();
    if (day_night) {
        dayNight.innerText = 'It is currently daytime.';
        if (!isDead) {
            var template = citizenDayTemplate();
            renderActions(template);
        }
    } else {
        dayNight.innerText = 'It is currently nighttime.';
        if (!isDead) {
            var template;
            if (u_role == 'Citizen')
                template = citizenTemplate();
            else if (u_role == 'Mafia')
                template = mafiaTemplate();
            else if (u_role == 'Sheriff')
                template = sherrifTemplate();
            renderActions(template)
        }
    }
});

socket.on('end', function (end) {
    if (end == true || end == false)
        announceEnd(end);
});

// eventlistener for user submitting a message
sendForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var message = messageInput.value;
    socket.emit('send-message', r_name, { user: u_name, message: message });
    messageInput.value = '';
    appendMessage(u_name, message);
});

// eventlistener for user choosing an actions
actionForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearActionForm();
});

// send action to the server
function submitAction(action) {
    if (dayOrNight)
        socket.emit('submit-action', { room: r_name, role: 'Citizen', action: action });
    else
        socket.emit('submit-action', { room: r_name, role: u_role, action: action });
}

// display a message to the client
function appendMessage(user, message) {
    if (user != null) {
        var messageElement = document.createElement('div');
        messageElement.innerText = user + ': ' + message;
        messageContainer.append(messageElement);
    } else {
        var messageElement = document.createElement('div');
        messageElement.innerText = 'GAME NOTICE --- ' + message;
        messageContainer.append(messageElement);
    }
}

// display a new user to the client
function appendUser(username) {
    var userElement = document.createElement('div');
    userElement.innerText = username;
    userElement.setAttribute('id', 'user-element-' + username);
    userContainer.append(userElement);
}

// delete a user from the list of users upon him disconnecting
function deleteUser(username) {
    var userElement = document.getElementById('user-element-' + username);
    userElement.parentNode.removeChild(userElement);
}

// render possible actions
function renderActions(template) {
    for (var i = 0; i < template.length; i++) {
        var element = document.createElement('div');
        element.innerHTML = template[i];
        actionContainer.append(element);
    }
}

// action template of a Citizen during night
function citizenTemplate() {
    var arr = [];
    arr.push('<div id=\'action-prompt\'>You have nothing to do but wait...</div>');
    return arr;
}

// action template of a Mafia during night
function mafiaTemplate () {
    var ret = [];
    ret.push('<div id=\'action-prompt\'>Choose who to kill...</div>');
    for (var i = 0; i < users.length; i++) {
        if (users[i].username != u_name && !(users[i].username in deadPeople))
            ret.push('<button type=\'submit\' id=\'action-button\' onclick=\'this.form.submitted=this.value\' value=\'' + users[i].username + '\'>' + users[i].username + '</button>');
    }
    return ret;
}

// action template of a Sheriff during night
function sherrifTemplate () {
    var ret = [];
    ret.push('<div id=\'action-prompt\'>Choose who to check...</div>');
    for (var i = 0; i < users.length; i++) {
        if (users[i].username != u_name && !(users[i].username in deadPeople))
            ret.push('<button type=\'submit\' id=\'action-button\' onclick=\'this.form.submitted=this.value\' value=\'' + users[i].username + '\'>' + users[i].username + '</button>');
    }
    return ret;
}

// action template of everyone during day
function citizenDayTemplate() {
    var ret = [];
    ret.push('<div id=\'action-prompt\'>Choose who to vote out...</div>');
    for (var i = 0; i < users.length; i++) {
        if (!(users[i].username == u_name || deadPeople.includes(users[i].username)))
            ret.push('<button type=\'submit\' id=\'action-button\' onclick=\'this.form.submitted=this.value\' value=\'' + users[i].username + '\'>' + users[i].username + '</button>');
    }
    return ret;
}

// clears the actions
function clearActionForm() {
    var actionPrompt = document.getElementById('action-prompt');
    if (actionPrompt != null)
        actionPrompt.parentNode.removeChild(actionPrompt);
    var actionElement = document.getElementById('action-button');
    while (actionElement != null) {
        actionElement.parentNode.removeChild(actionElement);
        actionElement = document.getElementById('action-button');
    }
}

// append what happened to the chat, if a client died, send that info to the server
function sayWhatHappened(whatHappened) {
    for (var i = 0; i < whatHappened.length; i++) {
        var keys = Object.keys(whatHappened[i]);
        if (keys[0] == 'vote') {
            if (whatHappened[i].vote.id == socket.id) {
                appendMessage(null, whatHappened[i].vote.username + ' (You) has been voted out by the town.');
                announceDeath();
            } else
                appendMessage(null, whatHappened[i].vote.username + ' has been voted out by the town.');
            deadPeople.push(whatHappened[i].vote.username);
        } else if (keys[0] == 'kill') {
            if (whatHappened[i].kill.id == socket.id) {
                appendMessage(null, whatHappened[i].kill.username + ' (You) has been killed by the mafia.');
                announceDeath();
            } else
                appendMessage(null, whatHappened[i].kill.username + ' has been killed by the mafia.');
            deadPeople.push(whatHappened[i].kill.username)
        } else if (keys[0] == 'check') {
            if (whatHappened[i].check == true)
                appendMessage(null, 'The sheriff checked a person and found them to be mafia')
            else
                appendMessage(null, 'The sheriff checked a person and found them  be mafia')
        }
    }
}

// take action upon a client dying
function announceDeath() {
    if (!isDead) {
        isDead = true;
        socket.emit('death', r_name);
        appendMessage(null, 'You are dead! You have 20 seconds to write your last words!');
        setTimeout(disableMessaging, 20000);
    }
}

// take action upon the game ending
function announceEnd(end) {
    if (end) {
        appendMessage(null, 'Citizens have won!');
        if (disabled)
            enableMessaging();
        setTimeout(disableMessaging, 20000);
    } else {
        appendMessage(null, 'Mafia has won!');
        if (disabled)
            enableMessaging();
        setTimeout(disableMessaging, 30000);
    }
}


// turn off the ability of a client to send messages
function disableMessaging() {
    disabled = true;
    messageInput.parentNode.removeChild(messageInput);
    var messageButton = document.getElementById('send-button');
    messageButton.parentNode.removeChild(messageButton);
}

// turn on the ability of a client to send messages
function enableMessaging() {
    disabled = false;
    var mIn = document.createElement('div');
    var mS = document.createElement('div');
    mIn.innerHTML = '<input type=\'text\' id=\'message-input\'>';
    mS.innerHTML = '<button type=\'submit\' id=\'send-button\'>Send</button>';
    sendForm.append(mIn);
    sendFom.append(mS);
}