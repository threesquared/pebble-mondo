var UI = require('ui');
var Settings = require('settings');
var ajax = require('ajax');

var clientId = 'oauthclient_000099fd5X64TOIy4hM3EH';
var settingsUrl = 'https://threesquared.github.io/pebble-mondo/';
var redirectUrl = 'https://pebblemondo-threesquared.rhcloud.com/callback';
var refreshUrl = 'https://pebblemondo-threesquared.rhcloud.com/refresh';
var endpoint = 'https://api.getmondo.co.uk/';
var stateToken = generateStateToken();
var balance = 0;

var main = new UI.Card({
    title: 'Mondo',
    titleColor: 'white',
    subtitle: 'Balance',
    subtitleColor: 'white',
    body: balance,
    bodyColor: 'white',
    backgroundColor: '#14233c'
});

main.show();

main.on('click', function() {
    refreshData();
});

Settings.config({ url: settingsUrl + '?client_id=' + clientId + '&redirect_uri=' + redirectUrl + '&response_type=code&state=' + stateToken }, function(data) {
    var options = JSON.parse(decodeURIComponent(data.options));

    Settings.data({
        accessToken: options.access_token
    });

    refreshData();
});

/**
 * Generate random OAUTH state token
 * @return {string}
 */
function generateStateToken()
{
    return Math.random().toString(30);
}

/**
 * Refresh balance data
 * @return {void}
 */
function refreshData()
{
    var accessToken = Settings.data('accessToken');

    if (!accessToken) {
        return false;
    }

    var accountId = Settings.data('accountId');

    if (!accountId) {
        getAccountId(function() {
            getBalance();
        });
    } else {
        getBalance();
    }
}

/**
 * Display balance
 * @return {void}
 */
function reloadBalance()
{
    main.body = '£' + balance;
}

/**
 * Get a users first account ID
 * @param {Function} callback
 * @return {void}
 */
function getAccountId(callback)
{
    makeGetRequest(endpoint + 'accounts', function(data) {

        if (!data.accounts[0]) {
            return false;
        }

        Settings.data('accountId', data.accounts[0].id);

        callback();
    });
}

/**
 * Get balance from Mondo
 * @return {void}
 */
function getBalance()
{
    var accountId = Settings.data('accountId');

    makeGetRequest(endpoint + 'balance?account_id=' + accountId, function(data) {
        balance = data.balance;

        reloadBalance();
    });
}

/**
 * Refresh expired access token
 * @param  {Function} callback
 * @return {void}
 */
function refreshToken(callback)
{
    var refreshToken = Settings.data('refreshToken');

    if (!refreshToken) {
        return false;
    }

    Settings.data({
        accessToken: null,
        refreshToken: null
    });

    ajax({
            url: refreshUrl,
            method: 'post',
            type: 'json',
            data: {
                refresh_token: refreshToken
            }
        },
        function(data) {
            Settings.data({
                accessToken: data.access_token,
                refreshToken: data.refresh_token
            });

            callback(data);
        },
        function(err) {
            console.log(JSON.stringify(err));
        }
    );
}

/**
 * Make a GET api call
 * @param  {string}   url
 * @param  {Function} callback
 * @return {void}
 */
function makeGetRequest(url, callback)
{
    var accessToken = Settings.data('accessToken');

    ajax({
            url: url,
            type: 'json',
            headers: {
                Authorization: 'Bearer ' + accessToken
            }
        },
        function(data) {
            if (data.error) {
                /*refreshToken(function() {
                    refreshData();
                });*/
            } else {
                callback(data);
            }
        },
        function(err) {
            console.log(JSON.stringify(err));
        }
    );
}
