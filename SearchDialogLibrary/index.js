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

            var refining = !!args.refining;
            if (refining) {
                // D. returning from refine dialog
                if (args.refiner && args.refiner.key) {
                    session.send('Filtering by %s: %s', args.refiner.key, args.refiner.value);
                }

                return performSearch(session, query, selection);
            }

            var input = args.response;
            var hasInput = typeof input === 'string';
            if (hasInput) {
                // Process input
                if (settings.multipleSelection && input.trim().toLowerCase() === 'list') {
                    // E. List items
                    listAddedItems(session);
                    searchPrompt(session);
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
                session.beginDialog('/');
                // session.beginDialog('confirm-continue', { });
                // session.replaceDialog('confirm-continue', {
                //     message: 'Would you like to search again?',
                //     selection: selection,
                //     query: query
                // });

                // session.send('Do you want to search *again* or *done*?');

            }));

    // Handle refine search
    library.dialog('refine', [
        (session, args, next) => {
            // args: query, selection, refiner(optional), prompt(optional)
            var query = args.query || emptyQuery();
            var selection = args.selection || [];
            var refiner = args.refiner;
            var prompt = args.prompt;

            session.dialogData.query = query;
            session.dialogData.selection = selection;

            // Manual call
            if (refiner) {
                return next({
                    response: { entity: refiner },
                    prompt: prompt
                });
            }

            // 1. Display choices from usable refiners
            var usedRefiners = query.filters.map(s => s.key);
            var usableRefiners = _.filter(settings.refiners, (r) => usedRefiners.indexOf(r) === -1);

            if (usableRefiners.length === 0) {
                // no more refiners
                session.send('Oops! You used all the available refiners and you cannot refine the results anymore.');
                session.endDialogWithResult({ query, selection });
            } else {
                // format them as { 'Label #1': 'value_1', 'Label #2'... }
                var options = settings.refineFormatter(usableRefiners);
                // add cancel option
                options = Object.assign(_.zipObject([CancelOption], [CancelOption]), options);
                builder.Prompts.choice(session, 'What do you want to refine by?', options);
            }
        },
        (session, args, next) => {
            // format refiners again and get value based on response
            var selectedOption = args.response.entity;
            if(selectedOption === CancelOption) {
                // continue and cancel
                return next();
            }

            var options = settings.refineFormatter(settings.refiners);
            var refiner = options[selectedOption];
            session.dialogData.refiner = refiner;

            // 2. Search using current query and new refiner
            var newQuery = Object.assign(
                { facets: [refiner] },
                session.dialogData.query);

            settings.search(newQuery).then((response) => {
                builder.Prompts.text(session, "Hi");
                // 3. Display choices with refiner values length(response.facets)
                // var facet = _.find(response.facets, ['key', refiner]);
                // if (facet) {
                //     var options = [CancelOption].concat(facet.options.map(formatRefinerOption));
                //     var prompt = args.prompt || 'Here\'s what I found for ' + refiner + ' (select \'cancel\' if you don\'t want to select any of these):';
                //     builder.Prompts.choice(session, prompt, options);
                // } else {
                //     // No results for selected facet, continue and cancel
                //     next();
                // }
            });
        },
        (session, args, next) => {
            // 4. Process refiner value selection
            var query = session.dialogData.query;
            var selection = session.dialogData.selection;
            var refiner = session.dialogData.refiner;

            args = args || {};
            args.response = args.response || { entity: CancelOption };
            var selectedValue = args.response.entity;
            if (selectedValue === CancelOption) {
                // Cancel
                session.endDialogWithResult({ query, selection });
            } else {
                var refinerValue = parseRefinerValue(selectedValue);
                // Returning dialog handles searching with current SearchTerm and new filters
                var newQuery = applyRefiner(query, refiner, refinerValue);
                session.endDialogWithResult({
                    query: newQuery,
                    selection,
                    refining: true,
                    refiner: { key: refiner, value: refinerValue }
                });
            }
        }
    ]);

    // Helpers
    library.dialog('confirm-continue', new builder.SimpleDialog((session, args) => {
        args = args || {};
        if (args.response === undefined) {
            session.dialogData.selection = args.selection;
            session.dialogData.query = args.query;
            builder.Prompts.confirm(session, args.message || 'Do you want to continue searching?');
        } else {
            return session.endDialogWithResult({
                done: !args.response,
                selection: session.dialogData.selection,
                query: session.dialogData.query
            });
        }
    }));

    function performSearch(session, query, selection) {

        var reply = new builder.Message(session)
                    .text('Let me have a look ...');
        session.send(reply);

        settings.search(query).then((response) => {
            console.log('Search.Output:', response);
            var results = response.facets;
            if (results.length === 0) {
                // No Results - Prompt retry
                session.beginDialog('confirm-continue', {
                    message: 'Sorry, I didn\'t find any matches. Do you want to retry your search?',
                    selection: selection,
                    query: query
                });
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

    function applyRefiner(query, refiner, refinerValue) {
        query.filters.push({ key: refiner, value: refinerValue });
        query.pageNumber = 1;
        return query;
    }

    function formatRefinerOption(facet) {
        return util.format('%s (%d)', facet.value, facet.count);
    }

    function parseRefinerValue(s) {
        return s.split('(')[0].trim();
    }

    function searchPrompt(session) {
        // var prompt = 'Hello! What would you like to search for? For example, "wien ticket"';
        var prompt = 'What would you like to search for?';
        if (session.dialogData.firstTimeDone) {
            prompt = 'What else would you like to search for?';
            // if (settings.multipleSelection) {
            //     prompt += ' You can also *list* all items you\'ve added so far.';
            // }
        }
        session.dialogData.firstTimeDone = true;
        builder.Prompts.text(session, prompt);
    }

    function listAddedItems(session) {
        var selection = session.dialogData.selection || [];
        if (selection.length === 0) {
            session.send('You have not added anything yet.');
        } else {
            var actions = selection.map((hit) => builder.CardAction.imBack(session, hit.title));
            var message = new builder.Message(session)
                .text('Here\'s what you\'ve added to your list so far:')
                .attachments(selection.map(searchHitAsCard.bind(null, false)))
                .attachmentLayout(builder.AttachmentLayout.list);
            session.send(message);
        }
    }

    function emptyQuery() {
        return { pageNumber: 1, pageSize: settings.pageSize, filters: [] };
    }

    return library.clone();
}

function begin(session, args) {
    session.beginDialog('search:/', args);
}

function refine(session, args) {
    session.beginDialog('search:refine', args);
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
    refine: refine,
    defaultResultsMapper: defaultResultsMapper
};