$(document).ready(() => {
    const textarea = $("#message");
    const send = $(".send");
    const photo = $(".photo");

    $("body").on("contextmenu", ".blue-tick", function (e) {
        return false;
    });

    photo.show();
    send.hide();

    textarea
        .on("input keydown keyup", function () {
            textarea.height(0).height(this.scrollHeight);
            if (textarea.val().trim().length > 0) {
                send.show();
                photo.hide();
            } else {
                send.hide();
                photo.show();
            }
        })
        .find(textarea)
        .change();

    $(".person").click(() => {
        textarea.focus();
    });

    function add() {
        var message = textarea.val().trim();
        $(".messages").append(
            "<div class='clip sent'><div class='text'>" +
                message +
                "</div></div>"
        );
        $(".content").html(
            "<div class='message'> <b>You :</b> " + message + "</div>"
        );
        textarea.val("");
        send.hide();
        photo.show();

        textarea.focus();
        textarea.height("");
    }

    send.click(() => {
        add();
    });

    textarea.on("keydown", (event) => {
        if (event.keyCode == 13 && !event.shiftKey) {
            if (textarea.val().trim().length > 0) {
                send.removeAttr("disabled");
                add();
            }
            event.preventDefault();
        }
    });
});
