var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , redis = require("redis");

var http = require("http");

// initialize the container for our data
var data = "";

var nfs = [
	"http://economictimes.feedsportal.com/c/33041/f/534037/index.rss",
	"http://www.timesonline.co.uk/tol/feeds/rss/uknews.xml",
	"http://www.independent.co.uk/news/business/rss",
	"http://www.dailymail.co.uk/money/index.rss"
];

setInterval(function() {
	for(var i=0; i<nfs.length; i++){
		//console.log(nfs[i]);	
			http.get(nfs[i], function (http_res) {

				// this event fires many times, each time collecting another piece of the response
				http_res.on("data", function (chunk) {
					// append this chunk to our growing `data` var
					data += chunk;
				});

				// this event fires *one* time, after all the `data` events/chunks have been gathered
				http_res.on("end", function () {
					// you can use res.send instead of console.log to output via express
					console.log("data received");
				});
			});	
	}
}, 30000);
  
app.listen(8080);

function handler (req, res) {
  fs.readFile(__dirname + '/client.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', function (socket) {
  
  //setInterval(function() {
	  socket.emit('news', data);
	  /*socket.on('my other event', function (data) {
		console.log(data);
	  });*/
  //}, 5000);
  
});

