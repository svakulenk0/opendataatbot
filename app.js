var restify = require('restify');
var builder = require('botbuilder');

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 8080, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
  
var SearchLibrary = require('./SearchDialogLibrary');
var AzureSearch = require('./SearchProviders/azure-search');

// Create chat bot
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
    gzipData: true
});
var bot = new builder.UniversalBot(connector, function (session) {
    // var message = session.message;
    // Trigger Search
    SearchLibrary.begin(session);
});

// listen for messages
server.post('/api/messages', connector.listen());

// Azure Search
var azureSearchClient = AzureSearch.create('opendataatportals');
var realStateResultsMapper = SearchLibrary.defaultResultsMapper(realstateToSearchHit);


// Register Search Dialogs Library with bot
bot.library(SearchLibrary.create({
    multipleSelection: true,
    search: (query) => azureSearchClient.search(query).then(realStateResultsMapper),
}));

// Maps the AzureSearch RealState Document into a SearchHit that the Search Library can use
function realstateToSearchHit(realstate) {
    return {
        key: realstate.listingId,
        title: util.format('%d bedroom, %d bath in %s, $%s',
            realstate.beds, realstate.baths, realstate.city, realstate.price.toFixed(2)),
        description: realstate.description,
        imageUrl: realstate.thumbnail
    };
}

//=========================================================
// Bots Dialogs
//=========================================================

// bot.dialog('/', function (session) {
    // session.send("Hello World");
// });

// bot.on('conversationUpdate', function (message) {
// })