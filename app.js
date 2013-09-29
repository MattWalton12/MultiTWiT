var mt = [];

mt.express  = require("express");
mt.fs       = require("fs");
mt.mongoose = require("mongoose");
mt.xmlParse = require("xml2js").parseString;
mt.http     = require("http");

mt.app      = mt.express();
mt.mongoose.connect("mongodb://localhost/mtwit");

mt.episodes = mt.mongoose.model("episodes", {title: String, identifier: String, progress: Number, id: Number, duration: Number, finished: Date});
mt.shows    = mt.mongoose.model("shows", {name : String, identifier: String});

mt.showmanage = require("./showmanage.js");

mt.showmanage.init(mt);

mt.app.configure(function() {
    mt.app.set("view engine", "ejs");
    mt.app.use("/static", mt.express.static(__dirname + "/static"));
});

mt.app.get("/", function(req, res) {
    mt.episodes.find({}, function(err, episodes) {
        var un_listened = [];
        var current = [];
        var finished = [];

        if (episodes.length > 0) {
            for (i=0;i<episodes.length;i++) {
                if (episodes[i].finished || (episodes[i].duration - episodes[i].progress) <=10) {
                    finished.push(episodes[i]);

                } else {
                    if (episodes[i].progress >=5) {
                        current.push(episodes[i]);
                    } else {
                        un_listened.push(episodes[i]);
                    }
                }

                if (i==(episodes.length-1)) {
                    res.render("index", {current: current, un_listened: un_listened});
                    break;
                }

            }


        } else {
            res.render("index", {current: current, un_listened: un_listened});
        }
    });
});

mt.app.get("/update", function(req, res) {
    var show = req.query.show;
    var id = parseInt(req.query.id);
    var progress = parseInt(req.query.prog);

    if (typeof(show) != undefined && typeof(id) != undefined && typeof(progress) != undefined) {
        mt.episodes.findOne({identifier: show, id: id}, function(err, show) {
            if (show) {
                show.progress = progress;

                if (show.progress >= show.duration) {
                    show.finished = new Date();
                }

                show.save();
                res.send(200);
                res.end();

            } else {
                res.send(404);
                res.end();
            }
        });
    }
});

var storageMiddleware = mt.express.static(__dirname + "/storage");

mt.app.get("/audio", function(req, res, next) {
    var show = req.query.show;
    var id = parseInt(req.query.id);

    if (mt.fs.existsSync(__dirname + "/storage/" + show + "/" + id + ".mp3")) {
        req.url = show + "/" + id + ".mp3";
        storageMiddleware(req, res, next);

    } else {
        res.send(404);
        res.end();
    }

});

mt.app.get("/finish", function(req, res, next) {
    var show = req.query.show;
    var id = parseInt(req.query.id);

    mt.episodes.findOne({identifier:show, id:id}, function(err, show) {
        if (show) {
            show.progress = show.duration;
            show.finished = new Date();
            show.save()

            res.send(200);
            res.end();

        } else {
            res.send(404);
            res.end();
        }
    });
});

mt.showmanage.initCheck(mt);
mt.app.listen(8080);
