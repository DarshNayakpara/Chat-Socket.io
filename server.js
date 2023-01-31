const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
// const io = new Servers(server, {
//     cors: {
//         origin: "*",
//     },
// });
var users = [];
server.listen(8005, () => {
    console.log("listening on *:8005");
});
io.on("connection", (socket) => {
    socket.on("user_connected", function (user_id) {
        users[user_id] = socket.id;
        io.emit("updateUserStatus", users);
        console.log("user connected: " + user_id);
    });

    socket.on("disconnect", function () {
        var index  = users.indexOf(socket.id);
        users.splice(index, 1,0);
        io.emit("updateUserStatus", users);
    });
});

// io.on("connection", (socket) => {
//     console.log("a user connected");
// });
