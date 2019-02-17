var mysql = require('mysql');

var con = mysql.createConnection({
			  host: "localhost",
			  user: "root",
			  password: "unnati",
			  database: "ontrack"
			});
			

con.connect(function(err) {
    if (err) throw err;
	console.log("connected");
});

module.exports = con;