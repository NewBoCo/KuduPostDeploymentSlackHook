var https                   = require('https');
var url                     = require('url');
var gravatar                = require('gravatar');
var slackHookRequestOptions = getSlackHookRequestOptions();
module.exports.sendToSlack  = sendToSlack;

function getSlackHookRequestOptions()
{
    var hookUri     =   url.parse(process.env.slackhookuri);
    return {
        host:       hookUri.hostname,
        port:       hookUri.port,
        path:       hookUri.path,
        method:     'POST',
        headers:    { 'Content-Type': 'application/json' }
    };
}

function sendToSlack(parsedRequest, callback)
{
        if (!parsedRequest || (parsedRequest.body||'').trim()=='') {
            callback(true);
            return;
        }

        var error           = false;
        parsedRequest.body  = trParseBody(parsedRequest.body);
        console.log(parsedRequest.body);
        var slackMessage    = convertToSlackMessage(parsedRequest);
        console.log(slackMessage);

        var req             = https.request(slackHookRequestOptions);

        req.on('error', function(e) {
            console.error(e);
            error = true;
        });

        req.on('close', function() { callback(error); } );

        req.write(JSON.stringify(slackMessage));
        req.end();
}

function convertToSlackMessage({ body, channel, repo, appScheme })
{
    repo = repo || process.env.repo;
    var scheme = appScheme || process.env.appScheme || 'https';

    var success = (body.status=='success' && body.complete);
    return {
        icon_emoji: success ? ':sun_small_cloud:' : ':rain_cloud:',
        text: body.hostName ?
            `${scheme}://${body.hostName.replace('.scm.','.')}/` :
            `${scheme}://${body.siteName}.azurewebsites.net/`,
        attachments: [
            {
                color: success ? 'good' : 'danger',
                author_name: body.author,
                author_icon: gravatar.url(body.authorEmail, { s: '64', d: '404' }, true),
                title: body.id,
                title_link: repo && `https://github.com/${repo}/commit/${body.id}`,
                text: body.message,
                footer: body.deployer,
                ts: new Date(body.startTime)/1000|0,
            }
        ],
        channel:    channel || process.env.slackchannel
    };
}

function trParseBody(body)
{
    try
    {
        return JSON.parse(body) || {
            status: 'failed',
            complete: false
        };
    } catch(err) {
        console.error(err);
        return {
            status: err,
            complete: false
        };
    }
}
