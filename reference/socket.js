const logger = console;
require("dotenv").config();
const {
    Users
} = require("../utils/users");
const socket = {};
const {
    v4: uuidv4
} = require("uuid");
const {
    createAdapter
} = require("@socket.io/redis-adapter");
const {
    createClient
} = require("redis");
const db = require("./db");
// const db2 = require("./db2");

const crypto = require("crypto");
const cluster = require("cluster");
const algorithm = "aes-256-cbc"; //Using AES encryption
//Encrypting text
function encrypt(text) {
    let iv = crypto.randomBytes(16);
    let salt = crypto.randomBytes(16);
    let key = crypto.scryptSync(process.env.CRYPTO_SECRET, salt, 32);

    let cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");

    return `${iv.toString("hex")}:${salt.toString("hex")}:${encrypted}`;
}

// Decrypting text
function decrypt(text) {
    let [ivs, salts, data] = text.split(":");
    let iv = Buffer.from(ivs, "hex");
    let salt = Buffer.from(salts, "hex");
    let key = crypto.scryptSync(process.env.CRYPTO_SECRET, salt, 32);

    let decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(data, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted.toString();
}

const countNotification = (io) => (userId) => {
    const query = `SELECT from_user_id, COUNT(*) as unreadCount
  FROM chat 
  WHERE is_read=0 AND to_user_id= ${userId} 
  GROUP BY roomId,from_user_id
  LIMIT 50`;
    logger.info(query);
    db.promise()
        .query(query)
        .then(([rows, fields]) => {
            io.in(`${userId}`).emit("notification_updated", rows);
            if (rows.length) {
                rows.forEach((msg) => {
                    io.in(`notification:${userId}`).emit("badge_update", msg);
                });
            } else {
                io.in(`notification:${userId}`).emit("badge_update", null);
            }
        });
};

const pubClient = createClient({
    url: 'redis://default:redispw@localhost:49153'
});
const subClient = pubClient.duplicate();

pubClient.connect().then(() => {
    console.log("Redis Connected");
}).catch(err => {
    console.log("Redis connection error", err);
});

socket.config = (server, cb) => {
    let users = new Users();
    const io = require("socket.io")(server, {
        cors: {
            origin: "*",
        },
    });
    if (typeof cb === "function") cb(io);
    socket.io = io;
    io.adapter(createAdapter(pubClient, subClient));
    io.sockets.on("connection", (socket) => {
        var address = socket.request.connection.remoteAddress;
        const {
            userId
        } = socket.handshake.query;
        if (!userId) return socket.disconnect();
        socket.userId = userId;
        logger.info(`New Connection`, {
            address,
            userId: userId,
            id: socket.id,
        });
        socket.join(`${userId}`);
        socket.join(`notification:${userId}`);

        // socket.user = query.userId;
        socket.on("leave", (params) => {
            logger.info("leaved", {
                ...params,
                address,
                id: socket.id,
                method: "leave",
            });
            socket.leave(params.room);
        });

        socket.on("join", async (params, cb) => {
            console.log("This is join params ==> ",params);
            let roomId = uuidv4();
            const {
                user_id,
                user_to
            } = params;

            db.query(
                "SELECT * FROM rooms WHERE ( user_1 = " + user_id + " OR user_2 = " + user_id + " ) AND ( user_1 = " + user_to + " OR user_2 = " + user_to + " ) ",
                function (err, result, fields) {
                    if (err) throw err;
                    if (result && result.length === 0) {
                        db.query(
                            "INSERT INTO `rooms` (`roomid`,`user_1`,`user_2`) VALUES ('" + roomId + "'," + user_id + "," + user_to + ")",
                            function (err, result, fields) {
                                if (err) throw err;
                                if (result) {}
                            }
                        );
                    }
                    let joinroomId = result.length === 0 ? roomId : result[0].roomid;
                    socket.roomId = joinroomId;
                    socket.join(joinroomId);
                    // db.query(
                    //   "SELECT * FROM messages WHERE roomId = '" +
                    //     roomId +
                    //     "' ORDER BY id ASC",
                    //   function (err, result, fields) {
                    //     console.log("socket join roomId", joinroomId);
                    //     socket.join(joinroomId, {
                    //       ...result,
                    //     });
                    //   }
                    // );
                }
            );
            const [sender] = await db
                .promise()
                .query(
                    "SELECT * FROM users  WHERE id = '" + user_id + "' "
                );
            const [receiver] = await db
                .promise()
                .query(
                    "SELECT * FROM users  WHERE id = '" + user_to + "' "
                );
            socket.sender = {
                [user_id]: sender[0],
            };
            socket.receiver = {
                [user_to]: receiver[0],
            };

            logger.info("Joined", {
                ...params,
                address,
                id: socket.id,
                method: "join",
            });

            // socket.username = params.username;
            // users.removeUser(socket.id);
            // users.addUser(socket.id, params.username, params.room);
            // io.to(params.room).emit('updateUserList', users.getUserList(params.room));

            // socket.broadcast.to(params.room).emit('is_online', `🔵 ${params.username} has joined.`);

            if (typeof cb === "function")
                cb({
                    sender: {
                        [user_id]: sender[0],
                    },
                    receiver: {
                        [user_to]: receiver[0],
                    },
                    room: socket.roomId,
                });
        });

        socket.on("getData", (params, cb) => {
            const {
                user_id,
                user_to
            } = params;

            const roomQry = "SELECT * FROM rooms WHERE ( user_1 = " +
                +user_to +
                " AND user_2 = " +
                +user_id +
                " ) OR ( user_1 = " +
                +user_id +
                " AND user_2 = " +
                +user_to +
                " )";
            console.log(roomQry);
            db.query(roomQry, (err, rooms) => {
                if (err) throw err;
                console.log("rooms", rooms);
                if (rooms && rooms.length > 0) {
                    const query =
                        "SELECT * FROM chat WHERE roomid = '" + rooms[0].roomid
                        + "' ORDER BY id ASC";
                    console.log(query);
                    db.query(query, function (err, result, fields) {
                        if (err) throw err;
                        if (result && result.length > 0) {
                            let arr = [];
                            for (const dta of result) {
                                let data = dta;
                                data.chat_message = dta.chat_message;
                                arr.push(data);
                            }
                            socket.emit("getData", {
                                data: arr,
                                user: {
                                    [user_id]: socket.sender,
                                    [user_to]: socket.receiver,
                                },
                            });
                            // console.log("Getdata",arr);
                        } else {
                            socket.emit("getData", {
                                data: [],
                                user: {
                                    [user_id]: socket.sender,
                                    [user_to]: socket.receiver,
                                },
                            });
                        }
                    });
                }
                if (typeof cb === "function") cb();
            })

            
        });

        socket.on("getAdminData", (params, cb) => {
            const {
                user_id,
                user_to
            } = params;
            const query =
                "SELECT * FROM chat WHERE ( to_user_id = " +
                +user_to +
                " AND from_user_id = " +
                +user_id +
                " ) OR ( to_user_id = " +
                +user_id +
                " AND from_user_id = " +
                +user_to +
                " ) ORDER BY id ASC ";
            console.log(query);
            db.query(query, function (err, result, fields) {
                if (err) throw err;
                if (result && result.length > 0) {
                    let arr = [];
                    for (const dta of result) {
                        let data = dta;
                        data.chat_message = dta.chat_message;
                        arr.push(data);
                    }
                    socket.emit("getData", {
                        data: arr,
                        user: {
                            [user_id]: socket.sender,
                            [user_to]: socket.receiver,
                        },
                    });
                    // console.log("Getdata",arr);
                } else {
                    socket.emit("getData", {
                        data: [],
                        user: {
                            [user_id]: socket.sender,
                            [user_to]: socket.receiver,
                        },
                    });
                }
            });
            if (typeof cb === "function") cb();
        });

        socket.on("message", (params, cb) => {
            const {
                user_id,
                user_to,
                room_id,
                message,
                image
            } = params;

            if (room_id) {

                let encryptmessage = message;
                db.promise()
                    .query(
                        "INSERT INTO `chat` (`from_user_id`,`to_user_id`,`chat_message`,`roomid`,`is_read`,`image`) VALUES (" +
                        user_id +
                        "," +
                        0 +
                        ",'" +
                        encryptmessage +
                        "','" +
                        room_id +
                        "','" +
                        0 +
                        "','" +
                        image +
                        "' )"
                    )
                    .then(([rows, fields]) => {
                        db.query(
                            `SELECT * FROM chat where id = ${rows.insertId}`,
                            (err, result, fields) => {
                                let data = result[0];
                                data.chat_message = data.chat_message;
                                io.in(room_id).emit("message", {
                                    data,
                                    user: {
                                        [user_id]: socket.sender,
                                        [user_to]: socket.receiver,
                                    },
                                });
                                // countNotification(io)(user_id);
                                countNotification(io)(user_to);
                            }
                        );
                    })
                    .catch((err) => console.log(err));

            } else {
                const qry =
                    "SELECT * FROM rooms WHERE ( `user_1` = " +
                    user_id +
                    " AND `user_2` = " +
                    user_to +
                    " ) OR ( `user_1` = " +
                    user_to +
                    " AND `user_2` = " +
                    user_id +
                    ")";
                console.log(qry);

                db.query(qry, function (err, results, fields) {
                    if (err) throw err;
                    if (results && results.length > 0) {
                        let encryptmessage = message;
                        db.promise()
                            .query(
                                "INSERT INTO `chat` (`from_user_id`,`to_user_id`,`chat_message`,`roomid`,`is_read`,`image`) VALUES (" +
                                user_id +
                                "," +
                                user_to +
                                ",'" +
                                encryptmessage +
                                "','" +
                                results[0].roomid +
                                "','" +
                                0 +
                                "','" +
                                image +
                                "' )"
                            )
                            .then(([rows, fields]) => {
                                db.query(
                                    `SELECT * FROM chat where id = ${rows.insertId}`,
                                    (err, result, fields) => {
                                        let data = result[0];
                                        data.chat_message = data.chat_message;
                                        io.in(results[0].roomid).emit("message", {
                                            data,
                                            user: {
                                                [user_id]: socket.sender,
                                                [user_to]: socket.receiver,
                                            },
                                        });
                                        // countNotification(io)(user_id);
                                        countNotification(io)(user_to);
                                    }
                                );
                            })
                            .catch(console.log);
                    }
                });
            }



        });

        socket.on("is_typing", (params, cb) => {
            const {
                user_id,
                status
            } = params;
            console.log("params", params);
            if (status === true) {
                let data = `${socket?.sender[user_id]?.first_name || ""} is typing...`;
                socket.broadcast.to(socket.roomId).emit("is_typing", data);
            } else {
                socket.broadcast.to(socket.roomId).emit("is_typing", "");
            }
        });

        socket.on("readmsg", (params) => {
            for (const p of params) {
                db.promise()
                    .query("UPDATE chat SET is_read = 1 WHERE id = " + p.id + "")
                    .then(() => {
                        var a = {
                            ...p,
                            is_read: 1,
                        };
                        io.in(p.roomId).emit("readmsg_ack", a);
                    });
            }
            countNotification(io)(socket.userId);
        });

        socket.on("disconnect", () => {
            logger.info("disconnected", {
                address,
                id: socket.id,
                method: "disconnect",
            });
            var user = users.removeUser(socket.id);
            if (user) {
                io.to(user.room).emit("updateUserList", users.getUserList(user.room));
            }
        });

        socket.on("unread_count", (userId) => {
            countNotification(io)(userId);
        });
    });
    if (!cluster.isMaster) {
        setupWorker(io);
    }
};

module.exports = socket;
