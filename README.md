# OpenDataAT Assistant
NodeJS chatbot as a search interface to the austrian open data portals: [data.gv.at](data.gv.at) and [opendataportal.at](opendataportal.at)

Kickstarted at the Data Pioneers Create Camp @ZAMG Vienna 2 February 2017.

## Requirements

* Node


## Future Work

* Performance

** host on a local server instead of Heroku
** bind direclty to Facebook instead of Microsoft Platform gateway

* UI

** eliminate retry dialog?

* results (short summary). For each of the datasets:

** title
** description
** link
** size (#rows)
** (publication) date


* query processing
** languages (german and english)
** plural → singular (lemmatization, stemming)
** AND regex match, e.g. 'hunde salzburg'
** regex limitations (Jahr<hunde>rte, <Hunde>wiesen)
** topic modeling

## Acknowledgment

* Sebastian Neumaier and Timea Turdean

* [Microsoft Bot framework](https://docs.botframework.com/en-us/node/builder/overview/#navtitle)

* [BotBuilder Samples](https://github.com/Microsoft/BotBuilder-Samples/tree/master/Node/demo-Search)

* [How to deploy a Facebook bot](https://medium.com/@igougi.ui/how-to-deploy-a-facebook-bot-2b8c4f4e7eae#.b8kfiw1b0)

* Inspired by [OpenDataUaBot](https://opendatabot.com/en)
