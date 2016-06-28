require('dotenv').config();
var server = require('http').createServer();
var url = require('url');
var WebSocketServer = require('ws').Server;
var express = require('express');
var request = require('request');

var port = process.env.OPENSHIFT_NODEJS_PORT || 3000;
var ip = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

var app = express();
var wss = new WebSocketServer({
    server: server
});

var states = [];

/**
 * Request authorization_code
 */
app.get('/callback', function(req, res) {
    request.post({
        url: process.env.ENDPOINT,
        form: {
            grant_type: 'authorization_code',
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            redirect_uri: process.env.REDIRECT_URL,
            code: req.query.code
        }
    }, function(err, httpResponse, body) {
        var response = JSON.parse(body);

        if (body.error) {
            console.error(body);
        } else {
            states[req.query.state].send(JSON.stringify({
                access_token: response.access_token
            }));
        }
    });

    res.sendStatus(200);
});

/**
 * Exchange refresh_token for new authorization_code
 */
app.post('/refresh', function(req, res) {
    request.post({
        url: process.env.ENDPOINT,
        form: {
            grant_type: 'refresh_token',
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            refresh_token: req.query.refresh_token
        }
    }, function(err, httpResponse, body) {
        var response = JSON.parse(body);

        if (body.error) {
            console.error(body);
        } else {
            res.send({
                access_token: response.access_token,
                refresh_token: response.refresh_token
            });
        }
    });

    res.sendStatus(200);
});

/**
 * Establish websocket
 */
wss.on('connection', function connection(ws) {
    var location = url.parse(ws.upgradeReq.url, true);

    states[location.query.state] = ws;
});

server.on('request', app);
server.listen(port, ip, function() {
    console.log('Listening on ' + server.address().port);
});
