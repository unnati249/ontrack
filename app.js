const express = require('express')
const app = express()
const port = 3000
const bodyParser = require('body-parser')
var session = require('express-session');
var formidable = require('formidable');
var path = require('path');
var fs = require('fs');
var db = require('./db');
var sess;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(session({
    secret: '2C44-4D44-WppQ38S',
    resave: true,
    saveUninitialized: true
}));
app.use(express.static('public'))
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(function(req, res, next) {
    res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
});

function loadUser(req, res, next) {
    sess = req.session;
    if (sess.user_id) {
        next();
    } else {
        res.render('login');
    }
};

function loadAdmin(req, res) {
    db.query("SELECT A.`model_id`, A.`model_name`, A.`image` FROM `bike_models` As A LEFT JOIN `bikes` As B ON A.`model_id` = B.`model_id` where B.`availability` = 1 group by B.`model_id`", function(err, result, fields) {
        if (err) throw err;
        res.render('admin', {
            models: result
        });
    });
}
app.get('/', loadUser, loadAdmin);
app.get('/signup', function(req, res) {
    sess = req.session;
    if (sess.user_id) {
        loadAdmin(req, res);
    } else {
        res.render('signup');
    }
});
app.get('/login', loadUser, loadAdmin);
app.get('/admin', loadUser, loadAdmin);
app.post('/signup', function(req, res) {
    sess = req.session;
    if (sess.user_id) {
        loadAdmin(req, res);
    } else {
        var params = [req.body.fullName, req.body.email, req.body.phoneNumber, req.body.password];
        var sql = "INSERT INTO users (full_name,email,phone,pwd) VALUES (?,?,?,?)";
        db.query(sql, params, function(err, result) {
            if (err) throw err;
        });
        res.render('login');
    }
})
app.post('/login', function(req, res) {
    sess = req.session;
    if (sess.user_id) {
        loadAdmin(req, res);
    } else {
        db.query("SELECT user_id, pwd FROM users where email = ?", req.body.email, function(err, result, fields) {
            if (err) throw err;
            if (result[0].pwd == req.body.password) {
                sess = req.session;
                sess.user_id = result[0].user_id;
                loadAdmin(req, res);
            } else {
                res.render('login');
            }
        });
    }
})
app.post('/admin', loadUser, loadAdmin);
app.post('/logout', loadUser, function(req, res) {
    sess = req.session;
    sess.user_id = null;
    res.render('login');
});
app.post('/upload', loadUser, function(req, res) {
    sess = req.session;
    var sql = "select * from bookings where user_id = ? ";
    db.query(sql, sess.user_id, function(err, result) {
        if (err) throw err;
        if (result.length > 0) {
            var message = "you have already booked the bike!! Come back later.";
            res.render("admin", {
                message: message
            });
        } else {
            sess.model_id = req.body.model_id;
            res.render("upload");
        }
    });
});
app.post('/fileupload', loadUser, function(req, res) {
    sess = req.session;
    var form = new formidable.IncomingForm();
    form.parse(req, function(err, fields, files) {
        var oldpath = files.filetoupload.path;
        var newpath = 'C:/Users/OWNER/Desktop/onTrack/public/files/' + files.filetoupload.name;
        fs.rename(oldpath, newpath, function(err) {
            if (err) throw err;
        });
        var params = [newpath, sess.user_id];
        var sql = "UPDATE users SET id_proof =? WHERE user_id =?";
        db.query(sql, params, function(err, result) {
            if (err) throw err;
        });
        var sql = "SELECT * FROM bikes WHERE model_id=? LIMIT 1";
        db.query(sql, sess.model_id, function(err, result) {
            if (err) throw err;
            var sql = "UPDATE bikes SET availability=0 WHERE bike_id =?";
            db.query(sql, result[0].bike_id, function(err, result) {
                if (err) throw err;
            });
            var params = [result[0].bike_id, sess.user_id];
            var sql = "INSERT INTO bookings (bike_id,user_id) VALUES (?,?)";
            db.query(sql, params, function(err, result) {
                if (err) throw err;
            });
            res.render('booking_date', {
                bike_id: result[0].bike_id
            });
        });
    });
});
app.post('/set_date', loadUser, function(req, res) {
    sess = req.session;
    var start_date = req.body.booking_date;
    var end_date = new Date(req.body.booking_date);
    var n = end_date.getMonth();
    n++;
    end_date.setMonth(n);
    var params = [start_date, end_date, sess.user_id];
    var sql = "UPDATE bookings SET start_date =? , end_date =? WHERE user_id =?";
    db.query(sql, params, function(err, result) {
        if (err) throw err;
    });
    var sql = "select B.pickup_address from bikes As A inner join renters As B on A.renter_id = B.renter_id where A.bike_id = ? ";
    db.query(sql, req.body.bike_id, function(err, result) {
        if (err) throw err;
        res.render("admin", {
            pickup_address: result[0].pickup_address
        });
    });
});
app.listen(port, () => console.log(`Example app listening on port ${port}!`))
