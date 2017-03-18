var util = require('util');
var _ = require('lodash');
var builder = require('botbuilder');

const defaultSettings = {
    pageSize: 5,
    multipleSelection: true,
    refiners: [],
    refineFormatter: (arr) => _.zipObject(arr, arr)
};

const CancelOption = 'Cancel';

// Create the BotBuilder library for Search with the specified Id
function create(settings) {
    settings = Object.assign({}, defaultSettings, settings);
    if (typeof settings.search !== 'function') {
        throw new Error('options.search is required');
    }

    if (settings.refineFormatter && typeof settings.refineFormatter !== 'function') {
        throw new Error('options.refineFormatter should be a function');
    }

    const library = new builder.Library('search');

    // Entry point. Closure that handlers these states
    // - A. Completing after search result selection without multipleSelection
    // - B. Cancelling after search result selection with multipleSelection
    // - C. Typing 'done'
    // - D. Selecting a refine value. Will trigger search
    // - E. Typing 'list'
    // - F. Entering search text. Will trigger search
    // - G. No input. Will trigger search prompt
    library.dialog('/',
        new builder.SimpleDialog((session, args) => {
            args = args || {};

            var query = args.query || session.dialogData.query || emptyQuery();
            var selection = args.selection || session.dialogData.selection || [];
            session.dialogData.selection = selection;
            session.dialogData.query = query;

            var done = args.done;
            if (done) {
                // A/B/C returning from search results or cancelling
                return session.endDialogWithResult({
                    selection,
                    query
                });
            }

            var input = args.response;
            var hasInput = typeof input === 'string';
            if (hasInput) {
                var command = input.trim().toLowerCase();
                var good_byes = ['bye', 'tschüss', 'ciao']
                if (good_byes.indexOf(command) >= 0) {
                    // Say bye and shut up!
                    var reply = new builder.Message(session)
                        .text('Bis bald! Sag Bescheid wenn du wieder etwas brauchst.');
                    session.send(reply);
                    // session.beginDialog('/');
                } else {
                    // F. Perform search
                    var newQuery = Object.assign({}, query, { searchText: input });
                    performSearch(session, newQuery, selection);
                }
            } else {
                // G. Prompt
                searchPrompt(session);
            }
        }));

    // Handle display results & selection
    library.dialog('results',
        new builder.IntentDialog()
            .onBegin((session, args) => {
                // console.log('args:', args);

                // Save previous state
                selection = args.selection;
                session.dialogData.searchResponse = args.searchResponse;
                query = args.query;

                // Display results
                var results = args.searchResponse;
                // console.log('Search.Output:', results.length);
                // console.log('Search.Output:', results);
                // var number_results = results.length.toString();
                // var reply_text = 'There are ' + number_results + ' datasets in the austrian open data portals that may be of interest to you.'
                // builder.Prompts.text(session, reply_text);
                var reply = new builder.Message(session)
                    // .text('Here are a few good options I found' + number_results);
                    // .text('Dazu gibt es ' + args.total + ' Datensätze in den österreichischen Open Data Portalen.')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(results.map(searchHitAsCard.bind(null, session)));

                session.send(reply);

                // Restart dialog thread
                // session.dialogData.firstTimeDone = true;
                session.replaceDialog('/');
                // session.replaceDialog('confirm-continue', {
                //     message: 'Would you like to search again?',
                //     selection: selection,
                //     query: query
                // });
                // session.send('Do you want to search *again* or *done*?');
                })
                // fix to recover from the intent null error
                .onDefault((session, args) => {
                    session.replaceDialog('/');
            }));

    function performSearch(session, query, selection) {

        var reply = new builder.Message(session)
                    .text('Einen Moment bitte ...');
        session.send(reply);

        settings.search(query).then((response) => {
            console.log('Search.Output:', response);
            var results = response.facets;
            if (results.length === 0) {
                // Report No Results and continue
                var reply = new builder.Message(session)
                    .text('Tut mir leid, dazu habe ich nichts gefunden :(');
                session.send(reply);
                session.beginDialog('/');

                // No Results - Prompt retry
                // session.beginDialog('confirm-continue', {
                //     message: 'Sorry, I didn\'t find any matches. Do you want to retry your search?',
                //     selection: selection,
                //     query: query
                // });
            } else {
                // Handle results selection
                session.beginDialog('results', {
                    searchResponse: results,
                    total: response.total,
                    selection: selection,
                    query: query
                });
            }
        });
    }

    function searchHitAsCard(session, searchHit) {
        // var buttons = showSave
        //     ? [new builder.CardAction().type('openUrl').title('Show').value(searchHit.d)]
        //     : [];

        // dataset url
        // button click does not work in Skype
        var buttons = [new builder.CardAction().type('openUrl').title('Show').value(searchHit.d)];

        var card = new builder.HeroCard()
            .title(searchHit.tit)
            .buttons(buttons);

        if (searchHit.desc) {
            // portal url
            // card.subtitle(searchHit.p);
            // description
            card.subtitle(searchHit.desc.substr(0, 200));
            // dataset url
            // link for Skype client
            card.text(searchHit.d);
        }
        // no images for results
        // if (searchHit.imageUrl) {
        //     card.images([new builder.CardImage().url(searchHit.imageUrl)]);
        // }

        card.tap(builder.CardAction.openUrl(session, searchHit.d))

        return card;
    }

    // const CancelOption = 'Bye';

    function searchPrompt(session) {
        // var prompt = 'Hello! What would you like to search for? For example, "wien ticket"';
        // give keyword to search
        var prompt = 'Wonach möchtest du suchen?';
        // if (session.dialogData.firstTimeDone) {
        //     prompt = 'What else would you like to search for?';
        //     // if (settings.multipleSelection) {
        //     //     prompt += ' You can also *list* all items you\'ve added so far.';
        //     // }
        // }
        // session.dialogData.firstTimeDone = true;
        // var options = [CancelOption];
        // var prompt = args.prompt || 'Here\'s what I found for ' + refiner + ' (select \'cancel\' if you don\'t want to select any of these):';
        builder.Prompts.text(session, prompt);

        // builder.Prompts.choice(session, prompt, options);
    }

    function emptyQuery() {
        return { pageNumber: 1, pageSize: settings.pageSize, filters: [] };
    }

    return library.clone();
}

function begin(session, args) {
    session.beginDialog('search:/', args);
}

// This helper transforms each of the AzureSearch result items using the mapping function provided (itemMap) 
function defaultResultsMapper(itemMap) {
    return function (providerResults) {
        return {
            // results: providerResults.results,
            facets: providerResults.results,
            total: providerResults.total
        };
    };
}

// Exports
module.exports = {
    create: create,
    begin: begin,
    defaultResultsMapper: defaultResultsMapper
};