exports.exceptions = {
    "ttg" : "kfi"
};

exports.currentlyUpdating = [];

exports.init = function(mt) {
    mt.app.get("/add", function(req, res) {
        var show = req.query.show;
        var name = req.query.name;

        if (!show || !name || show.length < 2 || name.length < 5) {
            res.send(400);
            res.end("Invalid parameters.");
            return;
        }

        mt.shows.findOne({identifier: show}, function(err, data) {
            if (data) {
                res.send(409);
                res.end("Show identifier already exists.");

            } else {
                var nShow = new mt.shows({
                    identifier: show,
                    name : name
                });

                nShow.save();

                res.send(201);

                mt.fs.mkdirSync(__dirname + "/storage/" + show);
                mt.showmanage.checkShow(mt, nShow);
            }
        });
    });

    setInterval(function() {
        mt.showmanage.initCheck(mt)
    }, 5 * 60 * 1000);
}

exports.initCheck = function(mt) {
    mt.shows.find({}, function(err, shows) {
        for (i=0; i<shows.length; i++) {
            if (!mt.showmanage.currentlyUpdating[shows[i].identifier]) {
                mt.showmanage.checkShow(mt, shows[i]);
            }
        }
    });
}

function parseDuration(str) {
    str = str.split(":");
    var secs = 0;

    secs += (parseInt(str[0]) * 60 * 60);
    secs += (parseInt(str[1]) * 60);
    secs += (parseInt(str[2]));

    return secs;
}

exports.checkShow = function(mt, show) {
    console.log("Checking for updates for '" + show.identifier + "'");
    var handle = show.identifier;
    var urlHandle = handle;

    if (mt.showmanage.exceptions[handle]) {
        urlHandle = mt.showmanage.exceptions[handle];
    }

    mt.http.get("http://feeds.twit.tv/" + urlHandle.toLowerCase() + ".xml", function(res) {
        var data = "";
        res.on("data", function(body) {
            data += body.toString();
        });

        res.on("end", function() {
            mt.xmlParse(data, function(err, result) {
                var string = result.rss.channel[0].item[0].title[0].toString();
                var link = result.rss.channel[0].item[0].link[0].toString().replace("http://www.podtrac.com/pts/redirect.mp3/", "http://");
                var durationString = result.rss.channel[0].item[0]['itunes:duration'].toString();
                var id = result.rss.channel[0].item[0].comments[0].toString().split("/").pop();


                var duration = parseDuration(durationString);

                var ps = string.split(":");

                var title = ps[1].substring(1);

                if (handle.toLowerCase() == "ttg") {
                    title = "The Tech Guy";
                }

                mt.episodes.findOne({identifier: show.identifier, id: parseInt(id)}, function(err, data) {
                    if (data) {
                        console.log("No new episodes for " + show.identifier);

                    } else {
                        mt.showmanage.currentlyUpdating[show.identifier] = true;
                        console.log("New episode for " + show.identifier + " .. downloading");

                        mt.http.get(link, function(res) {

                            res.on("data", function(chunk) {
                                mt.fs.appendFileSync(__dirname + "/storage/" + show.identifier + "/" + id + ".mp3", chunk);
                            });

                            res.on("end", function() {
                                console.log("Downloaded episode " + id + " for " + show.identifier);
                                mt.showmanage.currentlyUpdating[show.identifier] = null;

                                var newEpisode = new mt.episodes({
                                    identifier: show.identifier,
                                    id : id,
                                    duration : duration,
                                    title : title,
                                    progress: 0
                                });

                                newEpisode.save();

                            });

                        });

                    }
                });
            });
        });

    }).on("error", function(err) {
        console.log("Error getting XML document: " + err)
    });
}