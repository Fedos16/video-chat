require('dotenv').config();

const path = require('path');
const express = require("express");
const app = express();

const server = app.listen(process.env.PORT || 8000, () => console.log('server is running on port 8000'))
const io = require('socket.io')(server);

const users = {};
const socketToRoom = {};

if (process.env.IS_PRODUCTION) {
    const serveStatic = require('serve-static');
    const history = require('connect-history-api-fallback');
  
    app.use(history());
    app.use(serveStatic(path.join(__dirname, 'static')))
  }

io.on('connection', socket => {
    socket.on("join room", roomID => {
        if (users[roomID]) {
            const length = users[roomID].length;
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id !== socket.id);

        socket.emit("all users", usersInThisRoom);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    socket.on('disconnect', () => {
        const roomID = socketToRoom[socket.id];
        let room = users[roomID];
        if (room) {
            room = room.filter(id => id !== socket.id);
            users[roomID] = room;
        }
    });

});