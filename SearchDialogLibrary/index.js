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
                if (input.trim().toLowerCase() === 'bye') {
                    // Say bye and shut up!
                    var reply = new builder.Message(session)
                        .text('Cool, just let me know when you need my help. Have a nice day! ');
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
                    .text('There are ' + args.total + ' datasets in the austrian open data portals that may be of interest to you.')
                    .attachmentLayout(builder.AttachmentLayout.carousel)
                    .attachments(results.map(searchHitAsCard.bind(null, true)));

                session.send(reply);

                // Restart dialog thread
                // session.dialogData.firstTimeDone = true;
                session.replaceDialog('/');
                // session.beginDialog('confirm-continue', { });
                // session.replaceDialog('confirm-continue', {
                //     message: 'Would you like to search again?',
                //     selection: selection,
                //     query: query
                // });

                // session.send('Do you want to search *again* or *done*?');

            }));

    function performSearch(session, query, selection) {

        var reply = new builder.Message(session)
                    .text('Let me have a look ...');
        session.send(reply);

        settings.search(query).then((response) => {
            console.log('Search.Output:', response);
            var results = response.facets;
            if (results.length === 0) {
                // Report No Results and continue
                var reply = new builder.Message(session)
                    .text('Sorry, I didn\'t find any matches.');
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

    function searchHitAsCard(showSave, searchHit) {
        var buttons = showSave
            ? [new builder.CardAction().type('openUrl').title('Show').value(searchHit.d)]
            : [];
        // dataset url
        // var buttons = new builder.CardAction().type('openUrl').title('Show').value(searchHit.d.value);

        var card = new builder.HeroCard()
            .title(searchHit.tit)
            .buttons(buttons);

        if (searchHit.desc) {
            // portal url
            card.subtitle(searchHit.p);
            // dataset url
            // searchHit.d.value
            // description
            card.text(searchHit.desc.substr(0, 200));
        }
        // no images for results
        // if (searchHit.imageUrl) {
        //     card.images([new builder.CardImage().url(searchHit.imageUrl)]);
        // }

        return card;
    }

    // const CancelOption = 'Bye';

    function searchPrompt(session) {
        // var prompt = 'Hello! What would you like to search for? For example, "wien ticket"';
        // give keyword to search
        var prompt = 'What would you like to search for?';
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