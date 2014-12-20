var feed = require('feed-read'),  // require the feed-read module
    http = require("http"),
    port = process.env.PORT || 5000, // allow heroku/nodejitsu to set port 
    urls = [
        "http://feeds.bbci.co.uk/news/rss.xml",
        "http://news.sky.com/feeds/rss/home.xml",
        "http://www.techmeme.com/feed.xml",
		"http://economictimes.feedsportal.com/c/33041/f/534037/index.rss",
		"http://www.timesonline.co.uk/tol/feeds/rss/uknews.xml",
		"http://www.independent.co.uk/news/business/rss",
		"http://www.dailymail.co.uk/money/index.rss"
    ]; // Example RSS Feeds

http.createServer(function (req, res) { 
    // send basic http headers to client
    res.writeHead(200, {
        "Content-Type": "text/html",
        "Transfer-Encoding": "chunked"
    });

    // setup simple html page:
    res.write("<html>\n<head>\n<title>RSS Feeds - Stream</title>\n</head>\n<body>");

    // loop through our list of RSS feed urls
    for (var j = 0; j < urls.length; j++) {

        // fetch rss feed for the url:
        feed(urls[j], function(err, articles) {

            // loop through the list of articles returned
            for (var i = 0; i < articles.length; i++) {

                // stream article title (and what ever else you want) to client
                displayArticle(res, articles[i]); 

                // check we have reached the end of our list of articles & urls
                if( i === articles.length-1 && j === urls.length-1) {
                    res.end("</body>\n</html>"); // end http response
                } // else still have rss urls to check
            } //  end inner for loop
        }); // end call to feed (feed-read) method
    } // end urls for loop
}).listen(port);
console.log("HTTP Listening on: http://localhost:"+port);

// a mini-rendering function - you can expand this or add html markup
function displayArticle(res, a) {

  var author = a.author || a.feed.name; // some feeds don't have author (BBC!)  

  // send the article content to client
  res.write("<h3>"+a.title +"</h3>");
  res.write("<p><strong>" +author +" - " +a.published +"</strong> <br />\n");
  res.write(a.content+"</p>\n");
}
