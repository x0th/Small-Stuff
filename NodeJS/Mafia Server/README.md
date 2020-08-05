# Mafia
A small little project created using node.js and sockets.io.
I am not a web designer, also the looks were not the focus of the project.
For rules of the game, see *rules.md*.

## What you can do:
* Upon entering, you are promted to enter your username. Only one person with a particular username can be logged in at one time.
* After that, you will enter the rooms hub.
	* You can create a room.
	* You can access other people's rooms by name.
* In a room, you can see the userlist, type in room chat and take actions (again, see *rules.md*).
* After the game ends, you have some time to write in the chat, and then the room will become non-functional.

## How rooms work:
There are multiple websocket events handled.
The approximate event map looks as such:

### Phase 1 (before game):
* **Server**
	* Upon a new socket connecting, send out new user count and all the users in a room.
	* Upon a socket disconnecting, send out new user count and all the users in a room.
	* Are there 7 sockets in a room? If yes, assign roles to sockets and start the timer. Go to Phase 2.

* **Client**
	* Upon creating a socket, send appropriate message to the server.
	* Update user list if other people connect, disconnect.
	* Upon receiving assignment of role from the server, go to Phase 2.

### Phase 2 (during game):
* **Server**
	* Emit timer tick every second.
	* Emit change of time of day every 30 or 90 seconds.
	* Receive actions from users.
	* Make a decision based on actions and emit them during change of time of day.
	* If a user was killed or voted out store the information.
	* If all users of a particular role were killed, emit end of game.

* **Client**
	* Update timer every second.
	* If time of day changed, update possible actions and say what happened during previous action period.
	* If this client died, emit that to server.
	* If received notice that the game ended, say who won and shutdown the room.

### Messages (at all phases):
* **Server**
	* A client sent a message? Send it to all others in the room.

* **Client**
	* A user typed out a message? Display it, also send to the server.
	* Somebody else sent a message? Display it.

## Events:
* **user-join**
	* Emitted by client.
	* Upon receiving, server emits **user-count-change** and **pass-user-list** to the room.
	* If player count reaches maximum (7), server also emits **role-given** and **timer** to the room, as well as starting an internal timer.

* **disconnect**
	* Emitted by client.
	* Upon receiving, server emits **user-count-change** and **pass-user-list** to the room.

* **user-count-change**
	* Emitted by server.
	* Emmited upon a user connecting or disconnecting to/from the room.
	* Upon receiving, client changes client-side user count.

* **pass-user-list**
	* Emitted by server.
	* Emmited upon a user connecting or disconnecting to/from the room.
	* Upon receiving, client adds or removes users from the client-side user list.

* **send-message**
	* Emitted by client.
	* Emitted upon client typing a message in the message form.
	* Upon receiving, server emits **chat-message** to the room.

* **chat-message**
	* Emitted by server.
	* Emitted to the room upon receiving **send-message**.
	* Sends out a message typed by another user.

* **role-given**
	* Emitted by server.
	* Emitted upon the room reaching maximum capacity of 7 people.
	* Assigns a role to a socket and emits that role to that particular socket. Only emits a role of one socket, not all.

* **timer**
	* Emitted by server.
	* Emitted first when the room reaches maximum capacity of 7 people. Afterwards emitted every second until the game ends.
	* Sends the current timer and the max possible value (30 during night, 90 during day).

* **day-night**
	* Emitted by server.
	* Emitted upon timer restarting due to change to day or night.
	* Passes time of day, actions of the previous action period.
	* Upon receiving, client appends actions of the previous action period to the chat as well as showing new possible actions during this period (if not dead).

* **submit-action**
	* Emitted by client.
	* Emitted upon user submitting an action.
	* Sends a useraname of a selected person to the server.
	* Upon receiving, the server adds the action to the consideration of the action period.

* **death**
	* Emitted by client.
	* Emitted upon a client receiving a note that he has been killed/voted out from **day-night**.
	* Upon receiving, the server adds the user to the list of the dead, and if all players of a particular role have died, sends out **end**.

* **end**
	* Emitted by server.
	* Emitted to the room if all players of a particular role have died.
	* Upon receiving, the client starts the room shutdown.
