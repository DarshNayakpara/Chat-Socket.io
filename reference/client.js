var socketServer = window.env.socketServerUrl;
// console.log("socketserver",socketServer);
var socket = io(socketServer);
// console.log('socket', socket?.id);
let name;
let textarea = document.querySelector("#textarea");
let admintextarea = document.querySelector("#admintextarea");
let msgarea = document.querySelector(".message__area");
let imagename = "";
let flag = 1;

if (textarea) {
    textarea.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            sendMessage();
        }
    });
}

if (admintextarea) {
    admintextarea.addEventListener("keyup", (e) => {
        if (e.key === "Enter") {
            AdminsendMessage();
        }
    });
}

function resetUi() {
    $(".message__area").text("");
    $(".chat__section").hide();
    // $("#notification-count").hide();
}
resetUi();

function counterValue(val) {
    let maxCount = 100;
    let number = +val;
    if (!isNaN(number)) {
        if (number > 0 && number < maxCount) {
            return number;
        } else if (number >= maxCount) {
            return "99+";
        }
        return "";
    }
    return "";
}

function socketListeners() {

    socket.on("connect", function () {
        console.log("connected ==> ", socket.id, socket.userId);
    });

    socket.on("getData", function (datas) {
        console.log("getdatas__->", datas);

        if(datas.data?.length){

            for (const data of datas.data) {
                if (`${data.from_user_id}` == document.getElementById("user_id").value) {
                    appendMessage(data, "outgoing");
                } else if (`${data.from_user_id}` == Object.keys(socket.receiver)[0]) {
                    appendMessage(data, "incoming");
                } else {
                    appendMessage(data, "incoming");
                }
            }
        } else {
           noMsgFound();
        }

        // for(const admindata of datas.data){
        //     appendMessage(admindata,"incoming")
        // }

        let dta = datas.data.filter(
            (x) => x.is_read === 0 && x.user_id !== Object.keys(socket.receiver)[0]
        );
        socket.emit("readmsg", dta);
        ScrollTobottom();
    });

    socket.on("readmsg_ack", (msg) => {
        console.log("readmsg_ack", msg);
        appendMessage(msg, msg.from_user_id == socket.userId ? "outgoing" : "incoming", true);
    });

    socket.on("message", (msg) => {

        if (msg.data.to_user_id == socket.userId) {
            socket.emit("readmsg", [msg.data]);
        }

        appendMessage(msg.data, msg.data.from_user_id == socket.userId ? "outgoing" : "incoming");

        document.querySelector("#notification-count").innerText = msg.counter;

        ScrollTobottomAnimated();
    });

    socket.on("is_typing", function (data) {
        document.querySelector("#status").innerText = data;
    });

    socket.on("notification_updated", function (data) {

        $("#user-list li span").each(function () {
            this.innerText = "";
        });

        const unreadMessageCount = data.reduce((a, b) => a + b.unreadCount, 0);
        if (unreadMessageCount)
            $("#notification-count").show().text(counterValue(unreadMessageCount));
        else $("#notification-count").hide();
    });

    socket.on("badge_update", function (data) {
        if (data) {
            $(`span[data-id=${data.from_user_id}]`).text(counterValue(data.unreadCount));
        }
    });
}


function fetchRooms(userId) {
    let url = `${socketServer}/rooms/${userId}`;

    fetch(url, {
            method: "get",
        })
        .then(function (x) {
            return x.json();
        })
        .then(function (json) {
            $(".sidebar").text("");
            for (const rooms of json.data) {
                const username = rooms.sender.first_name || "?????";
                if (rooms.user_1.toString() === userId) {
                    $(".sidebar").append(
                        '<li data-id="' + rooms.user_2 + '" id="saveID"><img src="img/user.png" width="40px" height="40px"style="border-radius:18px;margin:0px 10px 0px 0px" >' + username + " " + rooms.sender.last_name + "" +
                        '<span data-id="' + rooms.user_2 + `"data-roomId="${rooms.roomid}" class ="badge bg-secondary float-end mt-1" id="badge"></span></li>`
                    );
                } else {
                    $(".sidebar").append(
                        '<li data-id="' + rooms.user_1 + '" id="saveID">' + username + " " + rooms.sender.last_name + "" +
                        '<span data-id="' + rooms.user_1 + `"data-roomId="${rooms.roomid}" class ="badge bg-secondary float-end mt-1" id="badge"></span></li>`
                    );
                }
            }
        });
}


function connect(userId) {
    socket.disconnect();
    resetUi();
    socket = io.connect(`${socketServer}/?userId=${userId}`);
    socket.userId = userId;
    socketListeners();
    fetchRooms(userId);
}

function joinNewUser() {
    let user_to = $("#newuser").val();

    if (user_to) {
        joinUser(user_to);
        fetchRooms(socket.userId);
    }

    fetchIsAdminRooms(socket.userId)
}

async function sendMessage() {

    var user_id = socket.userId;
    var user_to = Object.keys(socket.receiver)[0];
    var message = $("#textarea").val();

    // upload image
    file = document.forms["form1"]["imagefile"].files[0];
    let formData = new FormData();
    formData.append("image", file);
    let url = `${socketServer}/fileupload`;

    if (file) {
        fetch(url, {
                body: formData,
                method: "post",
            }).then(function (a) {
                return a.json(); // call the json method on the response to get JSON
            })
            .then(function (json) {
                imagename = json.data;
                let msgDetails = {
                    user_id: user_id,
                    user_to: user_to,
                    message: message.trim(),
                    image: imagename,
                };

                if (msgDetails.message.length || msgDetails.image.length) {
                    socket.emit("message", msgDetails);

                    $("#textarea").val("");
                    $("#imgPreview").val("");
                    $("#imagefile").val("");
                    $("#imgBuffer").val("");
                    $("#img-preview-container").hide();

                    imagename = "";
                }
            });
    } else {
        let msgDetails = {
            user_id: user_id,
            user_to: user_to,
            message: message.trim(),
            image: '',
        };

        if (msgDetails.message.length || msgDetails.image.length) {
            socket.emit("message", msgDetails);

            console.log("emit_message", msgDetails);

            $("#textarea").val("");
            $("#imgPreview").val("");
            $("#imagefile").val("");
            $("#imgBuffer").val("");
            $("#img-preview-container").hide();

            imagename = "";
        }
    }

    return false;
}

$("#send").click(function () {
    sendMessage();
});

const debounce = (func, delay) => {
    let debounceTimer;
    return function () {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
};
$("#textarea").find("textarea").keyup(
        debounce(function (e) {
            var user_id = socket.userId;
            var user_to = Object.keys(socket.receiver)[0];

            var userStatus = {
                user_id: user_id,
                user_to: user_to,
                status: false,
            };
            socket.emit("is_typing", userStatus);
        }, 1000)
    );

$("#textarea").find("textarea").keypress(function (e) {
        var user_id = socket.userId;
        var user_to = Object.keys(socket.receiver)[0];

        var userStatus = {
            user_id: user_id,
            user_to: user_to,
            status: true,
        };
        socket.emit("is_typing", userStatus);
});

$("#imagefile").on('change', function () {

    var reader = new FileReader();

    reader.onload = function () {
        $("#img-preview-container").show();
        var output = document.getElementById("image_preview");
        output.src = reader.result;
    };

    reader.readAsDataURL(document.forms["form1"]["imagefile"].files[0]);
});

$(".closeclick").click(function () {
    $("#image_preview").val("");
    $("#imgPreview").val("");
    $("#imagefile").val("");
    $("#imgBuffer").val("");
    $("#img-preview-container").hide();
});

// Saved Info about who login and tolking to who
function joinUser(userToId) {
    const user_id = +socket.userId;
    const user_to = +userToId;
    let data = {
        user_id: user_id,
        user_to: user_to,
    };
    // console.log({data});
    $(".chat__section").show();
    $(".message__area").text("");
    $("#img-preview-container").hide();
    if (socket ? socket.roomId : "")
        socket.emit("leave", {
            room: socket ? socket.roomId : "",
        });
    socket.emit("join", data, (userData) => {
        socket.user = {
            ["id_" + user_id]: userData.sender,
            ["id_" + user_to]: userData.receiver,
        };
        socket.sender = userData.sender;
        socket.receiver = userData.receiver;
        socket.roomId = userData.room;


        socket.emit("getData", data, () => {
            // console.log("getData", data);
            document.querySelector("#receiver-name").innerText = socket.receiver[user_to].first_name;
        });
    });
}


$("#user-list").click(function (e) {
    console.log("e===>", $(e.target));

    var user_to = $(e.target).data("id");

    if (user_to) {
        joinUser(user_to);
    }
});



function appendMessage(msg, type, replace = false) {
    let mainDiv = replace ? $(".message__area div[data-id=" + msg.id + "]") : $(document.createElement("div"));
    mainDiv.attr("data-id", msg.id);

    let classname = type;

    let user = parseInt(msg.from_user_id);

    let image = msg.image ? `<img src="${socketServer}${msg.image}"  height = "100" width = "100" alt=''>` : "";

    // var readMsg = ($("div").data("id") == msg.id) ? $("div").attr("class", "message read") : $(".div").attr("class", "message sent")
    // console.log("msg===>", user, msg, socket.user);

    let username = parseInt(msg.to_user_id) ?
    msg.user ? msg.user[user][user].first_name : socket.user["id_" + user][user].first_name
    : 'Admin';

    let userDiv = $(document.createElement("div"));
    userDiv.addClass("user-info " + classname);
    userDiv.html(`<img style="border-radius:20px" height ="25" src="user.png" alt=""/>
    <span>${username}</span>`);

    let messageDiv = $(document.createElement("div"));
    // let readMsg = msg.is_read == 1 ? "read" : "sent";`

    messageDiv.addClass("message " + classname);
    if (msg.is_read === 1) {
        messageDiv.addClass("read");
    } else {
        messageDiv.addClass("sent");
    }

    messageDiv.html(`<div style="word-break:break-all;">${msg.chat_message}</div>
                  <div>${image}</div>
                  <small> 
                  <span class="checkmark">${msg.is_read == 1 ? '<div class="checkmark_circle"></div>' : ""}
                  <div class="checkmark_stem"></div>
                  <div class="checkmark_kick"></div></span>
                  <span >${msg.created_at ?msg.created_at: ''}</span>
                  </small>
                  `);

    mainDiv.html("").append(userDiv).append(messageDiv);
    if (!replace) {
        $(".message__area").append(mainDiv);
    }
}

//Recieve msg

function ScrollTobottom() {
    $(".message__area").animate({
            scrollTop: +$(".message__area").prop("scrollHeight") + 300,
        },
        0
    );
}

function ScrollTobottomAnimated() {
    $(".message__area").animate({
            scrollTop: $(".message__area").prop("scrollHeight"),
        },
        200
    );
}


/////=======================Admin-Side=======================//////


function AdminsocketListeners() {
    socket.on("connect", function () {
        console.log("connected ==> ", socket.id, socket.userId);
    });

    socket.on("getData", function (datas) {
        console.log("getAdminData__->", datas);

        for (const admindata of datas.data) {
            if(admindata.to_user_id==0){
                appendAdminMessage(admindata, "outgoing")
            }
            else {
                appendAdminMessage(admindata, "incoming")
            }
        }
       
        let dta = datas.data.filter(
            (x) => x.is_read === 0 && x.user_id !== Object.keys(socket.receiver)[0]
        );
        socket.emit("readmsg", dta);
        ScrollTobottom();
    });

    socket.on("readmsg_ack", (msg) => {
        console.log("admin_readmsg_ack", msg);
        appendAdminMessage(msg, msg.to_user_id !== 0 && msg.from_user_id == socket.userId 
            ? "outgoing" : msg.to_user_id == socket.userId 
             ? "incoming" : msg.to_user_id == 0 ? "outgoing" : "incoming", true, );
    });

    socket.on("message", (msg) => {

        console.log("message_admin_emit", msg);

        if (msg.data) {
            socket.emit("readmsg", [msg.data]);
        }

        appendAdminMessage(msg.data,"outgoing");

        document.querySelector("#notification-count").innerText = msg.counter;

        ScrollTobottomAnimated();
    });

    socket.on("is_typing", function (data) {
        document.querySelector("#status").innerText = data;
    });

    socket.on("notification_updated", function (data) {

        $("#room-list li span").each(function () {
            this.innerText = "";
        });

        const unreadMessageCount = data.reduce((a, b) => a + b.unreadCount, 0);
        if (unreadMessageCount)
            $("#notification-count").show().text(counterValue(unreadMessageCount));
        else $("#notification-count").hide();
    });

    socket.on("badge_update", function (data) {
        if (data) {
            $(`span[data-id=${data.from_user_id}]`).text(counterValue(data.unreadCount));
        }
    });
}

function fetchIsAdminRooms(userId) {
    let url = `${socketServer}/admin/rooms/${userId}`;

    fetch(url, {
            method: "get",
        })
        .then(function (x) {
            return x.json();
        })
        .then(function (json) {
            $(".sidebar").text("");
            for (const rooms of json.data) {
                // console.log("rooms",rooms);
                const username = rooms.sender.first_name || "?????";
                $(".sidebar").append(
                    '<li data-id="' + rooms.user_1 + '" data-userto="' + rooms.user_2 + '"id="saveID"><img src="/img/user.png" width="40px" height="40px"style="border-radius:18px;margin:0px 10px 0px 0px">' + username + "-" + rooms.receiver.first_name +
                    '<span data-id="' + rooms.user_2 + `"data-roomId="${rooms.roomid}" class ="badge bg-secondary float-end mt-1" id="badge"></span></li>`
                );
            }
        });
}

function adminConnect(userId) {
    socket.disconnect();
    resetUi();
    socket = io.connect(`${socketServer}/?userId=${userId}`);
    socket.userId = userId;
    AdminsocketListeners();
    fetchIsAdminRooms(userId)
}

async function AdminsendMessage() {

    var user_id = socket.userId;
    var user_to = Object.keys(socket.receiver)[0];
    var message = $("#admintextarea").val();

    // upload image
    file = document.forms["form1"]["imagefile"].files[0];
    let formData = new FormData();
    formData.append("image", file);
    let url = `${socketServer}/fileupload`;

    if (file) {
        fetch(url, {
                body: formData,
                method: "post",
            }).then(function (a) {
                return a.json(); // call the json method on the response to get JSON
            })
            .then(function (json) {
                imagename = json.data;
                let msgDetails = {
                    user_id: user_id,
                    user_to: user_to,
                    message: message.trim(),
                    image: imagename,
                    room_id: socket.roomId
                };

                if (msgDetails.message.length || msgDetails.image.length) {
                    socket.emit("message", msgDetails);

                    $("#admintextarea").val("");
                    $("#imgPreview").val("");
                    $("#imagefile").val("");
                    $("#imgBuffer").val("");
                    $("#img-preview-container").hide();

                    imagename = "";
                }
            });
    } else {
        let msgDetails = {
            user_id: user_id,
            user_to: user_to,
            message: message.trim(),
            image: '',
            room_id: socket.roomId
        };

        if (msgDetails.message.length || msgDetails.image.length) {
            socket.emit("message", msgDetails);

            console.log("emit_message", msgDetails);

            $("#admintextarea").val("");
            $("#imgPreview").val("");
            $("#imagefile").val("");
            $("#imgBuffer").val("");
            $("#img-preview-container").hide();

            imagename = "";
        }
    }

    return false;
}

$("#sendMessage").click(function () {
    AdminsendMessage();
});

function adminJoin(userid, usertoid) {
    const user_id = usertoid;
    const user_to = userid;
    let data = {
        user_id: user_id,
        user_to: user_to,
    };
    // console.log("adminjoindata", {
    //     data
    // });
    $(".chat__section").show();
    $(".message__area").text("");
    $("#img-preview-container").hide();
    if (socket ? socket.roomId : "")
        socket.emit("leave", {
            room: socket ? socket.roomId : "",
        });
    socket.emit("join", data, (userData) => {
        console.log('userdata', userData);
        socket.user = {
            ["id_" + user_id]: userData.sender,
            ["id_" + user_to]: userData.receiver,
        };
        socket.sender = userData.sender;
        socket.receiver = userData.receiver;
        socket.roomId = userData.room;

        socket.emit("getData", data, () => {
            document.querySelector("#name").innerText = socket.sender[user_id].first_name + "-" + socket.receiver[user_to].first_name;
        });
    });
}

$("#room-list").click(function (e) {
    console.log("e===>", $(e.target));

    var user_to = $(e.target).data("id");
    var user_id = $(e.target).data("userto")

    if (user_id && user_to) {
        adminJoin(user_id, user_to)
    }
});

function noMessageFound() {
    let mainDiv = $(document.createElement("div"));
    let messageDiv = $(document.createElement("div"));
    messageDiv.html(`<div style="word-break:break-all;" class='center'>No match found</div>`);
    mainDiv.html("").append(messageDiv);
    $(".message__area").append(mainDiv);
}
function noMsgFound() {
    let mainDiv = $(document.createElement("div"));
    let messageDiv = $(document.createElement("div"));
    messageDiv.html(`<div style="word-break:break-all;" class='center'>No Message found</div>`);
    mainDiv.html("").append(messageDiv);
    $(".message__area").append(mainDiv);
}


function appendAdminMessage(msg, type, replace = false, search = false) {


    let mainDiv = replace ? $(".message__area div[data-id=" + msg.id + "]") : $(document.createElement("div"));
    mainDiv.attr("data-id", msg.id);

    let classname = type;

    let user = parseInt(msg.from_user_id);

    let image = msg.image ? `<img src="${socketServer}${msg.image}"  height = "100" width = "100" alt=''>` : "";

    // var readMsg = ($("div").data("id") == msg.id) ? $("div").attr("class", "message read") : $(".div").attr("class", "message sent")
    // console.log("msg===>", user, msg, socket.user);

    let username = parseInt(msg.to_user_id) ? msg.user ? msg.user[user][user].first_name : socket.user["id_" + user][user].first_name : "Admin" ;

    let userDiv = $(document.createElement("div"));
    userDiv.addClass("user-info " + classname);
    userDiv.html(`<img style="border-radius:20px" height ="25" src="user.png" alt=""/>
    <span>${username}</span>`);

    let messageDiv = $(document.createElement("div"));
    // let readMsg = msg.is_read == 1 ? "read" : "sent";`

    messageDiv.addClass("message " + classname);
    if (msg.is_read === 1) {
        messageDiv.addClass("read");
    } else {
        messageDiv.addClass("sent");
    }

    // var  formatWord ="";
    const searchWord = `${msg.chat_message}`.match(new RegExp(search, 'i'));
    const styledMsg = searchWord ? '<span style="background-color: red;color:white">' + searchWord[0] + '</span>' : '';
    const htmlMsg = searchWord ? `${msg.chat_message}`.replace(searchWord[0], styledMsg) : msg.chat_message;

    messageDiv.html(`<div style="word-break:break-all;">${htmlMsg}</div>
                  <div>${image}</div>
                  <small> 
                  <span class="checkmark">${msg.is_read == 1 ? '<div class="checkmark_circle"></div>' : ""}
                  <div class="checkmark_stem"></div>
                  <div class="checkmark_kick"></div></span>
                  </small><span class="timestamp">${msg.created_at ? dayjs(msg.created_at).format('DD-MM-YYYY hh:mm:ss A') : ''}</span>`);

    mainDiv.html("").append(userDiv).append(messageDiv);
    if (!replace) {
        $(".message__area").append(mainDiv);
    }
}

let search_input = document.querySelector("#search");
if (search_input){
    search_input.addEventListener('keyup', (e) => {
        if (e.key == "Enter") {
            search();
            $("#search").val("");
        }
    });
}
    
function searchMessages(roomId, keyword) {
    let url = `${socketServer}/admin/messages?room=${roomId}&search=${keyword}`;

    fetch(url, {
            method: "GET",
        })
        .then(function (x) {
            return x.json();
        })
        .then(function (json) {
            $('.message__area.adminmsg').html('');
            if(json.data?.length){
                for(const msg of json.data) {
                        appendAdminMessage(msg, msg.to_user_id !== 0 && msg.from_user_id == socket.userId ?
                            "outgoing" : msg.to_user_id == socket.userId ?
                            "incoming" : msg.to_user_id == 0 ? "outgoing" : "incoming", false, keyword);
                }
            } else {
                noMessageFound();
            }
        }).catch(err => {
            console.log(err);
        });
}

$(document).find("#search").keyup(
    debounce(function (e) {
        search()
    }, 1000)
);

function search() {
    var search = document.getElementById("search").value
    // API Call 
    searchMessages(socket.roomId, search)
}

//Delete Messages
$(".Delete-Messages").click(function(){
    DeleteMessages(socket.roomId);
    $(".modal").hide();
    // window.location.reload();
});

function DeleteMessages(roomId){

    url = `${socketServer}/admin/rooms/${roomId}`;

    fetch(url, {
        method: "delete"
    })
}