'use strict';
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var app = express();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('port', process.env.PORT || 3000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: 'secret' }));

var Users = [];
var Rooms = [];
let Roles = ['Sheriff', 'Mafia', 'Mafia', 'Citizen', 'Citizen', 'Citizen', 'Citizen'];

// GET and POST /

app.get('/', function (req, res) {
    if (req.session.user == null)
        res.redirect('/login');
    else {
        res.render('index', { title: 'Main Page', id: req.session.user.id, rooms: Rooms });
    }
});

app.post('/', function (req, res) {
    if (req.body.create)
        res.redirect('/create');
});

// GET and POST /login

app.get('/login', function (req, res) {
    res.render('login', { title: 'Login' });
});

app.post('/login', function (req, res) {
    if (!req.body.id) {
        res.status('400');
        res.send('Invalid details');
    } else {
        var cont = true;
        Users.filter(function (user) {
            if (user.id == req.body.id) {
                res.render('login', { title: 'Login', msg: "User already logged in!" });
                cont = false;
            }
        });
        if (cont) {
            var newUser = { id: req.body.id };
            Users.push(newUser);
            req.session.user = newUser;
            res.redirect('/');
        }
    }
});

// GET and POST /create

app.get('/create', function (req, res) {
    res.render('create', { title: 'Create Room' });
});

app.post('/create', function (req, res) {
    if (!req.body.room_name) {
        res.status('400');
        res.send('Invalid details');
    } else {
        var cont = true;
        Rooms.filter(function (room) {
            if (room.name == req.body.room_name) {
                res.render('create', { title: 'Create Room', msg: "Room already exists" });
                cont = false;
            }
        });
        if (cont) {
            Rooms.push({ name: req.body.room_name, playerCount: 0, users: [], roles: [], actions: { 'Mafia': [], 'Sheriff': [], 'Citizen': [] }, day_night: false, gameStarted: false, gameEnded: false });
            res.redirect('room/' + req.body.room_name);
        }
    }
});

// GET and POST /room

app.get('/room/:room', function (req, res) {
    var pCount = 0;
    Rooms.filter(function (r) {
        if (r.name == req.params.room) {
            pCount = r.playerCount;
        }
    });
    if (pCount + 1 <= 7)
        res.render('room', { title: 'Game Room', r_name: req.params.room, u_name: req.session.user.id, pCount: pCount + 1 });
    else
        res.redirect('/');
});

app.post('/room', function (req, res) {
    var cont = true;
    Rooms.filter(function (room) {
        if (room.name == req.body.join) {
            res.redirect('room/' + req.body.join);
            cont = false;
        }
    }); 
    if(cont)
        res.redirect('/');
});

// Web sockets
io.sockets.on('connection', function (socket) {
    socket.on('user-join', function (room, user) {
        socket.join(room);
        Rooms.filter(function (r) {
            if (r.name == room) {
                r.playerCount++;
                r.users.push({ id: socket.id, username: user });
                socket.to(room).emit('user-count-change', r.playerCount);
                socket.to(room).emit('pass-user-list', r.users, true);
                io.to(socket.id).emit('pass-user-list', r.users, true);

                if (r.playerCount == 7) {
                    shuffle(Roles);
                    for (var i = 0; i < Roles.length; i++) {
                        io.to(r.users[i].id).emit('role-given', Roles[i]);
                        io.to(r.users[i].id).emit('timer', { time: 30, max: 30 });
                        r.roles.push({ user: r.users[i].id, role: Roles[i], isDead: false });
                        r.gameStarted = true;
                    }
                    makeTimer(r, true);
                }
                
                console.log(r.roles);
            }
        });
    });

    socket.on('submit-action', function (data) {
        Rooms.filter(function (r) {
            if (r.name == data.room) {
                var toAppend = true;
                r.users.filter(function (u) {
                    if (u.user == socket.id && u.isDead)
                        toAppend = false;
                });
                if(toAppend)
                    r.actions[data.role].push(data.action);
            }
            console.log(r.actions);
        });
    });

    socket.on('send-message', function (room, message) {
        socket.to(room).broadcast.emit('chat-message', message);
    });

    socket.on('death', function (room) {
        Rooms.filter(function (r) {
            if (r.name == room) {
                r.roles.filter(function (u) {
                    if (u.user == socket.id)
                        u.isDead = true;
                });

                var end = isEnd(r);
                if (end != null) {
                    r.gameEnded = true;
                    for (var i = 0; i < r.users.length; i++) {
                        io.to(r.users[i].id).emit('end', end);
                    }
                }
            }
        });
    });
    
    socket.on('disconnect', function () {
        Rooms.filter(function (r) {
            r.users.filter(function (u) {
                if (u.id == socket.id) {
                    r.users.splice(u, 1);
                    r.playerCount--;
                    socket.to(r.name).emit('user-count-change', r.playerCount);
                    socket.to(r.name).emit('pass-user-list', r.users, false);
                }
            });
        });
    });
});

// day-night timer
function makeTimer(room, initial) {
    var max = 30;
    if (room.day_night)
        max = 90;
    var curr = max;
    var whatHappened = null;
    if (!initial)
        whatHappened = parseActions(room, !room.day_night);
    for (var i = 0; i < room.users.length; i++) {
        io.to(room.users[i].id).emit('day-night', room.day_night, whatHappened);
        room.actions = { 'Mafia': [], 'Sheriff': [], 'Citizen': [] };
    }
   
    var countdown = setInterval(function () {
        if (room.gameEnded)
            clearInterval(countdown)
        else {
            for (var i = 0; i < room.users.length; i++) {
                io.to(room.users[i].id).emit('timer', { time: curr, max: max });
            }
            if (curr == 0) {
                room.day_night = !room.day_night;
                makeTimer(room, false);
                clearInterval(countdown);
            }
        }
    curr--;
    }, 1000);
  
}

// ends the game if conditions are met
function isEnd(room) {
    var citizenCount = 0;
    var mafiaCount = 0;
    for (var i = 0; i < room.roles.length; i++) {
        if (room.roles[i].isDead == true) {
            if (room.roles[i].role == 'Mafia')
                mafiaCount++;
            else
                citizenCount++;
        }
    }
    if (mafiaCount == 2)
        return true;
    else if (citizenCount == 5)
        return false;
    else
        return null;
}

// parses submitted actions
function parseActions(room, dayOrNight) {
    var mafiaActions = room.actions['Mafia'];
    var sheriffActions = room.actions['Sheriff'];
    var citizenActions = room.actions['Citizen'];
    var ret = [];

    if (dayOrNight) {
        if (citizenActions.length == 0) {
            shuffle(room.users);
            ret.push({ vote: room.users[0] });
        } else {
            ret.push({ vote: makeDecision(room, citizenActions) });
        }
    }
    else {
        if (mafiaActions.length == 0) {
            shuffle(room.roles);
            for (var i = 0; i < room.roles.length; i++) {
                if (room.roles[i].role != 'Mafia') {
                    var selected;
                    room.users.filter(function (u) {
                        if (u.id == room.roles[i].user)
                            selected = u;
                    });
                    ret.push({ kill: selected });
                    break;
                }
            }
        } else {
            ret.push({ kill: makeDecision(room, mafiaActions) });
        }

        if (sheriffActions.length == 0) {
            shuffle(room.roles);
            for (var i = 0; i < room.roles.length; i++) {
                if (room.roles[i].role != 'Sheriff') {
                    var selected;
                    room.users.filter(function (u) {
                        if (u.id == room.roles[i].user) {
                            if (room.roles[i].role == 'Mafia')
                                selected = true;
                            else
                                selected = false;
                        }
                    });
                    ret.push({ check: selected });
                    break;
                }
            }
        } else {
            var selected;
            room.users.filter(function (u) {
                if (u.username == sheriffActions[0]) {
                    room.roles.filter(function (u2) {
                        if (u.id == u2.user) {
                            if (u2.role == 'Mafia')
                                selected = true;
                            else
                                selected = false;
                        }
                    });
                }
            });
            ret.push({ check: selected });
        }
    }

    return ret;
}

// selects people to kill/vote out based on submitted actions
function makeDecision(room, actions) {
    var bestNames = [];
    var bestScores = [];
    for (var i = 0; i < actions.length; i++) {
        if (actions[i] in bestNames)
            bestScores[bestNames.indexOf(actions[i])]++;
        else {
            bestNames.push(actions[i]);
            bestScores.push(1);
        }
    }

    var best = [];
    var bestVote = 0;
    for (var i = 0; i < bestScores.length; i++) {
        if (bestScores[i] == bestVote)
            best.push(bestNames[i]);
        else if (bestScores[i] > bestVote) {
            best = [];
            best.push(bestNames[i]);
            bestVote = bestScores[i];
        }
    }

    var bestName = best[Math.floor(Math.random() * (best.length))];
    var selected;
    room.users.filter(function (u) {
        if (u.username == bestName)
            selected = u;
    });
    return selected;
}

// shuffle an array
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

// Launch server

var server = http.listen(app.get('port'), 'localhost', function () {
    console.log(`Express server listening on port ${server.address().port}`);
});