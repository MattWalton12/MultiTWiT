var audioPlayer;
var hUpdateTimer;
var updateTimer;
var audioElement;
var lockPercentage;

$(document).ready(function() {
    if ($("#listening .content").find("a").length > 0) {
        $("#listening").fadeIn("slow");
    }

    if ($("#un-listened .content").find("a").length > 0) {
        $("#un-listened").fadeIn("slow");
    }

    $("#add-button").click(function() {
        $(this).hide();
        $("#add-shows").fadeIn();
    });

    $("a.link-block").click(function() {
        var show = $(this).data("show");
        var id = $(this).data("id");
        var time = parseInt($(this).data("time")) || 0;

        element = this;

        if (audioPlayer) {
            if (audioPlayer.show == show && audioPlayer.id == id) {
                if (audioPlayer.paused) {
                    audioPlayer.play();
                    $(element).find(".padding").removeClass("paused");

                } else {
                    audioPlayer.pause();
                    $(element).find(".padding").addClass("paused");
                }

                return;
            }

            audioPlayer.pause()
            audioPlayer = null;
        }

        if (updateTimer) {
            clearTimeout(updateTimer);
            clearTimeout(hUpdateTimer);
        }

        if ($("#listening .content").find("a").length == 0) {
            $("#listening").fadeIn("slow");
        }

        if ($(element).parent().parent().attr("id") == "un-listened") {
            $(element).find(".padding").append(' <span class="darker">(<span id="percentage">0</span>% complete)</span>');
            $(element).appendTo("#listening .content");

            if ($("#un-listened .content").find("a").length == 0) {
                $("#un-listened").fadeOut();
            }
        }

        $(".listening").removeClass("listening");
        $(".paused").removeClass("paused");

        audioPlayer = document.createElement("audio");
        audioPlayer.setAttribute("src", "/audio?show="+show+"&id="+id);
        audioPlayer.setAttribute("autoplay", "autoplay");
        audioPlayer.show = show;
        audioPlayer.id = id;

        audioPlayer.play();
        audioPlayer.pause();
        var stime = time;

        audioPlayer.addEventListener("canplaythrough", function() {

            audioPlayer.play();
            audioPlayer.pause();
            lockPercentage = true;
            setTimeout(function() {
                audioPlayer.currentTime = stime;
                audioPlayer.play();
                lockPercentage = false;
            }, 3000);

            updateTimer = setInterval(function() {
                if (!lockPercentage) {
                    $(element).data("time", Math.round(audioPlayer.currentTime).toString());
                    $(element).find(".padding .darker #percentage").html(Math.round( 100 * (audioPlayer.currentTime / parseInt($(element).data("duration")) )));
                }
            }, 1000)

            hUpdateTimer = setInterval(function() {
                if (!audioPlayer.paused) {
                    $.get("/update?show=" + show + "&id=" + id + "&prog=" + audioPlayer.currentTime);
                }
            }, 5 * 1000);
        });

        audioPlayer.addEventListener("ended", function() {
            $(".listening").removeClass("listening");
            $(".paused").removeClass("paused");
            $(element).fadeOut("fast", function() {
                $(element).remove();
                if ($("#listening .content").find("a").length == 0) {
                    $("#listening").fadeOut();
                }
            });
        });


        $(this).find(".padding").addClass("listening");
    });

    $("#add-cancel").click(function() {
        $(this).parent().parent().fadeOut("fast", function() {
            $("#add-button").show();
        });
    });

    $("#add-submit").click(function() {
        var name = $("#add-name").val();
        var id = $("#add-id").val();

        $.get("/add?name=" + name + "&show=" + id, function() {
            alert("Sucessfully created show.");
            $(this).parent().parent().fadeOut("fast", function() {
                $("#add-button").show();
            });
        })
        .fail(function(err) {
            var text = "";
            if (err.status == 400) {
                text = "Invalid parameters";

            } else if (err.status == 409) {
                text = "Show already exists";
            }

            alert(text);
        });
    });
});
