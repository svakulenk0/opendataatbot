var util = require('util');
var _ = require('lodash');
var Promise = require('bluebird');
var request = require('request');

function create(serviceName) {
    // base url
    // e.g.: https://realestate.search.windows.net/indexes('listings')/docs/search.post.search?api-version=2015-02-28-Preview 
    // var url = "http://data.wu.ac.at/sparql/";

    return {
        search: function (query) {
            return new Promise((resolve, reject) => {

                // create request & azure query
                // var sparql_query = `
                //                 select distinct ?d ?p ?tit ?desc from <http://data.wu.ac.at/portalwatch/1704> 
                //                 where {
                //                   {
                //                     <https://www.opendataportal.at/> dcat:dataset ?d .
                //                     <https://www.opendataportal.at/> dct:title ?p .
                //                     ?d dct:title ?tit .
                //                     ?d dct:description ?desc .
                //                    FILTER (regex(?tit, "${{keyword}}", "i") || regex(?desc, "${{keyword}}", "i"))
                //                   } UNION {
                //                     <https://www.opendataportal.at/> dcat:dataset ?d .
                //                     <https://www.opendataportal.at/> dct:title ?p .
                //                     ?d dct:title ?tit .
                //                     ?d dct:description ?desc .
                //                     ?d dcat:distribution ?dist .
                //                     ?dist dcat:accessURL ?url . 
                //                     ?csv csvw:url ?url .
                //                     ?csv csvw:tableSchema ?schema . 
                //                     ?schema csvw:column ?col .
                //                     ?col csvw:name ?name .
                //                    FILTER regex(?name, "${{keyword}}", "i")
                //                   } UNION   {
                //                     <http://data.gv.at> dcat:dataset ?d .
                //                     <https://www.opendataportal.at/> dct:title ?p .
                //                     ?d dct:title ?tit .
                //                     ?d dct:description ?desc .
                //                    FILTER (regex(?tit, "${{keyword}}", "i") || regex(?desc, "${{keyword}}", "i"))
                //                   } UNION {
                //                     <http://data.gv.at> dcat:dataset ?d .
                //                     <https://www.opendataportal.at/> dct:title ?p .
                //                     ?d dct:title ?tit .
                //                     ?d dct:description ?desc .
                //                     ?d dcat:distribution ?dist .
                //                     ?dist dcat:accessURL ?url . 
                //                     ?csv csvw:url ?url .
                //                     ?csv csvw:tableSchema ?schema . 
                //                     ?schema csvw:column ?col .
                //                     ?col csvw:name ?name .
                //                    FILTER regex(?name, "${{keyword}}", "i")
                //                   }
                //                 }`
                var keyword = unescape(encodeURIComponent(query.searchText));
                console.log('Search.inputQuery:', keyword);

                // var url = 'http://data.wu.ac.at/sparql/?default-graph-uri=&query=select%20distinct%20%3Fd%20%3Fp%20%3Ftit%20%3Fdesc%20from%20%3Chttp%3A%2F%2Fdata.wu.ac.at%2Fportalwatch%2F1704%3E%20where%20%7B%20%7B%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dcat%3Adataset%20%3Fd%20.%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dct%3Atitle%20%3Fp%20.%20%3Fd%20dct%3Atitle%20%3Ftit%20.%20%3Fd%20dct%3Adescription%20%3Fdesc%20.%20FILTER%20(regex(%3Ftit%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7C%7C%20regex(%3Fdesc%2C%20%22' + keyword + '%22%2C%20%22i%22))%20%7D%20UNION%20%7B%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dcat%3Adataset%20%3Fd%20.%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dct%3Atitle%20%3Fp%20.%20%3Fd%20dct%3Atitle%20%3Ftit%20.%20%3Fd%20dct%3Adescription%20%3Fdesc%20.%20%3Fd%20dcat%3Adistribution%20%3Fdist%20.%20%3Fdist%20dcat%3AaccessURL%20%3Furl%20.%20%3Fcsv%20csvw%3Aurl%20%3Furl%20.%20%3Fcsv%20csvw%3AtableSchema%20%3Fschema%20.%20%3Fschema%20csvw%3Acolumn%20%3Fcol%20.%20%3Fcol%20csvw%3Aname%20%3Fname%20.%20FILTER%20regex(%3Fname%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7D%20UNION%20%7B%20%3Chttp%3A%2F%2Fdata.gv.at%3E%20dcat%3Adataset%20%3Fd%20.%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dct%3Atitle%20%3Fp%20.%20%3Fd%20dct%3Atitle%20%3Ftit%20.%20%3Fd%20dct%3Adescription%20%3Fdesc%20.%20FILTER%20(regex(%3Ftit%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7C%7C%20regex(%3Fdesc%2C%20%22' + keyword + '%22%2C%20%22i%22))%20%7D%20UNION%20%7B%20%3Chttp%3A%2F%2Fdata.gv.at%3E%20dcat%3Adataset%20%3Fd%20.%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dct%3Atitle%20%3Fp%20.%20%3Fd%20dct%3Atitle%20%3Ftit%20.%20%3Fd%20dct%3Adescription%20%3Fdesc%20.%20%3Fd%20dcat%3Adistribution%20%3Fdist%20.%20%3Fdist%20dcat%3AaccessURL%20%3Furl%20.%20%3Fcsv%20csvw%3Aurl%20%3Furl%20.%20%3Fcsv%20csvw%3AtableSchema%20%3Fschema%20.%20%3Fschema%20csvw%3Acolumn%20%3Fcol%20.%20%3Fcol%20csvw%3Aname%20%3Fname%20.%20FILTER%20regex(%3Fname%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7D%20%7D%20'
                // var url = 'http://data.wu.ac.at/sparql/?default-graph-uri=&query=select%20distinct%20%3Fd%20%3Fp%20%3Ftit%20%3Fdesc%20from%20%3Chttp%3A%2F%2Fdata.wu.ac.at%2Fportalwatch%2F1704%3E%20where%20%7B%20%7B%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dcat%3Adataset%20%3Fd%20.%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dct%3Atitle%20%3Fp%20.%20%3Fd%20dct%3Atitle%20%3Ftit%20.%20%3Fd%20dct%3Adescription%20%3Fdesc%20.%20%3Fd%20dcat%3Akeyword%20%3Fk%20.%20FILTER%20(regex(%3Ftit%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7C%7C%20regex(%3Fdesc%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7C%7C%20regex(%3Fk%2C%20%22' + keyword + '%22%2C%20%22i%22))%20%7D%20UNION%20%7B%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dcat%3Adataset%20%3Fd%20.%20%3Chttps%3A%2F%2Fwww.opendataportal.at%2F%3E%20dct%3Atitle%20%3Fp%20.%20%3Fd%20dct%3Atitle%20%3Ftit%20.%20%3Fd%20dct%3Adescription%20%3Fdesc%20.%20%3Fd%20dcat%3Adistribution%20%3Fdist%20.%20%3Fdist%20dcat%3AaccessURL%20%3Furl%20.%20%3Fcsv%20csvw%3Aurl%20%3Furl%20.%20%3Fcsv%20csvw%3AtableSchema%20%3Fschema%20.%20%3Fschema%20csvw%3Acolumn%20%3Fcol%20.%20%3Fcol%20csvw%3Aname%20%3Fname%20.%20FILTER%20regex(%3Fname%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7D%20UNION%20%7B%20%3Chttp%3A%2F%2Fdata.gv.at%3E%20dcat%3Adataset%20%3Fd%20.%20%3Chttp%3A%2F%2Fdata.gv.at%3E%20dct%3Atitle%20%3Fp%20.%20%3Fd%20dct%3Atitle%20%3Ftit%20.%20%3Fd%20dct%3Adescription%20%3Fdesc%20.%20%3Fd%20dcat%3Akeyword%20%3Fk%20.%20FILTER%20(regex(%3Ftit%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7C%7C%20regex(%3Fdesc%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7C%7C%20regex(%3Fk%2C%20%22' + keyword + '%22%2C%20%22i%22))%20%7D%20UNION%20%7B%20%3Chttp%3A%2F%2Fdata.gv.at%3E%20dcat%3Adataset%20%3Fd%20.%20%3Chttp%3A%2F%2Fdata.gv.at%3E%20dct%3Atitle%20%3Fp%20.%20%3Fd%20dct%3Atitle%20%3Ftit%20.%20%3Fd%20dct%3Adescription%20%3Fdesc%20.%20%3Fd%20dcat%3Adistribution%20%3Fdist%20.%20%3Fdist%20dcat%3AaccessURL%20%3Furl%20.%20%3Fcsv%20csvw%3Aurl%20%3Furl%20.%20%3Fcsv%20csvw%3AtableSchema%20%3Fschema%20.%20%3Fschema%20csvw%3Acolumn%20%3Fcol%20.%20%3Fcol%20csvw%3Aname%20%3Fname%20.%20FILTER%20regex(%3Fname%2C%20%22' + keyword + '%22%2C%20%22i%22)%20%7D%20%7D'
                var url = 'http://data.wu.ac.at/portalwatch/api/v1/search/austrian?q=' + keyword + '&limit=10&offset=0'
                // create request query
                var options = {
                    url: url,
                    headers: { },
                    withCredentials: false,
                    json: true
                    // body: {
                    //     // count: false,
                    //     // facets: query.facets || [],
                    //     // filter: createFilterParams(query.filters),
                    //     // queryType: 'simple',
                    //     // scoringParameters: [],
                    //     // search: query.searchText,
                    //     // searchMode: 'all',
                    //     // skip: (query.pageNumber - 1) * query.pageSize,
                    //     // top: query.pageSize
                    // }
                };
                request.get(options, (err, httpResponse, azureResponse) => {
                    if (err) {
                        return reject(err);
                    }
                    console.log('Search.Output:', azureResponse.total);

                    resolve({
                        total: azureResponse.total,
                        results: azureResponse.results,
                        facets: getFacets(azureResponse.results)
                    });
                });
            });
        }
    };
}

// Helpers
function getFacets(azureResponse) {
    var rawFacets = azureResponse;
    if (!rawFacets) {
        return [];
    }

    var facets = _.toPairs(rawFacets)
        .filter(p => _.isArray(p[1]))
        .map(p => ({ key: p[0], options: p[1] }));

    return facets;
}

function createFilterParams(filters) {
    if (!filters || !filters.length) {
        return '';
    }

    return filters.map((f) => util.format('%s eq \'%s\'', f.key, escapeFilterString(f.value)))
        .join(' and ');
}

function escapeFilterString(string) {
    return string.replace(/'/g, '\'\'');
}

// Exports
module.exports = {
    create: create
};