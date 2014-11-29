var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , fs = require('fs')
  , redis = require("redis");


var http = require("http");

http.get('http://economictimes.feedsportal.com/c/33041/f/534037/index.rss', function (http_res) {
    // initialize the container for our data
    var data = "";

    // this event fires many times, each time collecting another piece of the response
    http_res.on("data", function (chunk) {
        // append this chunk to our growing `data` var
        data += chunk;
    });

    // this event fires *one* time, after all the `data` events/chunks have been gathered
    http_res.on("end", function () {
        // you can use res.send instead of console.log to output via express
        console.log(data);
    });
});
  
app.listen(8080);

/** 
 * Our redis client which subscribes to channels for updates
 */
redisClient = redis.createClient();

//look for connection errors and log
redisClient.on("error", function (err) {
    console.log("error event - " + redisClient.host + ":" + redisClient.port + " - " + err);
});

/**
 * Dummy redis client which publishes new updates to redis 
 */
redisDummyPublishClient = redis.createClient();

/**
 * http handler, currently just sends index.html on new connection
 */
function handler (req, res) {
  fs.readFile(__dirname + '/../www/client.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html' + __dirname);
    }

    res.writeHead(200);
    res.end(data);
  });
}

/** 
 * set socket.io log level to warn
 *
 * uncomment below line to change debug level
 * 0-error, 1-warn, 2-info, 3-debug 
 *
 * For more options refer https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
 */
//io.set('log level', 3);

/**
 * socket io client, which listens for new websocket connection
 * and then handles various requests
 */
io.sockets.on('connection', function (socket) {
  
  //on connect send a welcome message
  socket.emit('data', { text : 'Welcome!' });

  //on subscription request joins specified room
  //later messages are broadcasted on the rooms
  socket.on('subscribe', function (data) {
    socket.join(data.channel);
  });
});

/**
 * subscribe to redis channel when client in ready
 */
redisClient.on('ready', function() {
  redisClient.subscribe('notif');
});

/**
 * wait for messages from redis channel, on message
 * send updates on the rooms named after channels. 
 * 
 * This sends updates to users. 
 */
redisClient.on("data", function(channel, message){
    var resp = {'text': message, 'channel':channel}
    io.sockets.in(channel).emit('message', resp);
});

/**
 * Simulates publish to redis channels
 * Currently it publishes updates to redis every 5 seconds.
 */
setInterval(function() {
  var no = Math.floor(Math.random() * 100);
  redisDummyPublishClient.publish('notif', 'Generated random no ' + no);
}, 5000);
