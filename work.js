if (!jQuery) { throw new Error("OTAS Base Visualisation requires jQuery") }

+function ($) {
    "use strict";

    // GOOGLE ANALYTICS
    (function (i, s, o, g, r, a, m) {
        i['GoogleAnalyticsObject'] = r; i[r] = i[r] || function () {
            (i[r].q = i[r].q || []).push(arguments)
        }, i[r].l = 1 * new Date(); a = s.createElement(o),
        m = s.getElementsByTagName(o)[0]; a.async = 1; a.src = g; m.parentNode.insertBefore(a, m)
    })(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

    ga('create', 'UA-55029988-1', 'auto');
    ga('send', 'pageview');

    // DATA API CLASS DEFINITION
    // =====================
    var Data = function () { };

    var apiCall = function (url, params, callback) {
        if (!Data.apiKey)
            throw new Error("Must set apiKey property to your api key")

        var deferred = $.Deferred();

        if (params === 'stamp') {
            deferred.resolve(url);
        } else {
            $.ajax({
                url: url,
                type: 'get',
                data: params,
                dataType: 'json',
                timeout: 300000,
                success: function (data) {
                    if (data != null) {
                        deferred.resolve(data);
                    } else {
                        this.error("No data");
                    }
                },
                error: function (e) {
                    deferred.resolve(e);
                },
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", Data.apiKey);

                }
            });
        }

        if (callback) {
            deferred.done(callback);
        } else {

            return deferred.promise();
        }
    };

    Data = {
        // VERSION 1
        v1: {
            stock: function (stock) {
                var toReturn = function (callback) {
                    ga('send', 'event', 'APICALL', 'Stock', stock);
                    return apiCall(otasBase.baseUrl + "/stock/" + stock + "/", null, callback);
                }
                // GET DAILY FLAGS
                toReturn.dailyFlags = function (params, callback) {
                    ga('send', 'event', 'APICALL', 'Dailyflags', stock);
                    return apiCall(otasBase.baseUrl + "/stock/" + stock + "/dailyFlags", params, callback);
                }

                // GET DAILY SERIES
                toReturn.dailySeries = function (type, params, callback) {
                    ga('send', 'event', 'APICALL', 'Series', type);
                    return apiCall(otasBase.baseUrl + "/stock/" + stock + "/series/" + type + "/", params, callback);
                }

                // GET PEERS
                toReturn.stockPeers = function (callback) {
                    ga('send', 'event', 'APICALL', 'Stock Peer', stock);
                    return apiCall(otasBase.baseUrl + "/stock/" + stock + "/peers", null, callback);
                }

                // GET STAMPS
                toReturn.stockStamps = function (params, callback) {
                    ga('send', 'event', 'APICALL', 'Stock Stamp', stock);
                    var header = params['isHeader'];
                    if (header === true || header === 'true') {
                        return apiCall(otasBase.baseUrl + "/stock/" + params['stock'] + "/stamp/" + params['topic'] + "/true", 'stamp', callback);
                    } else {
                        return apiCall(otasBase.baseUrl + "/stock/" + params['stock'] + "/stamp/" + params['topic'] + "/false", 'stamp', callback);
                    }
                }

                // GET NATURAL LANGUAGE
                toReturn.naturalLanguage = function (params, callback) {
                    return apiCall(otasBase.baseUrl + "/stock/" + stock + "/text", params, callback);
                }

                return toReturn;
            },
            stocks: function (watchlisttype, watchlist) {
                // GET WATCHLIST
                var toReturn = function (callback) {
                    ga('send', 'event', 'APICALL', 'Watchlist', watchlisttype);
                    return apiCall(otasBase.baseUrl + "/list/" + watchlisttype + "/" + watchlist + "/", null, callback);
                }
                // GET DAILY FLAGS OF LIST
                toReturn.dailyFlags = function (params, callback) {
                    ga('send', 'event', 'APICALL', 'Dailyflag List', watchlisttype);
                    return apiCall(otasBase.baseUrl + "/list/" + watchlisttype + "/" + watchlist + "/dailyFlags", params, callback);
                }
                return toReturn;
            },
            // GET LISTS
            lists: function (params) {
                var toReturn = function (callback) {
                    ga('send', 'event', 'APICALL', 'List', params);
                    return apiCall(otasBase.baseUrl + "/lists", params, callback);
                }
                // GET LIST STAMPS
                toReturn.listStamp = function (params, callback) {
                    ga('send', 'event', 'APICALL', 'List Stamp');
                    var header = params['isHeader'];
                    if (header === true || header === 'true') {
                        return apiCall(otasBase.baseUrl + "/list/" + params['type'] + "/" + params['id'] + "/stamp/" + params['topic'] + "/true", 'stamp', callback);
                    } else {
                        return apiCall(otasBase.baseUrl + "/list/" + params['type'] + "/" + params['id'] + "/stamp/" + params['topic'] + "/false", 'stamp', callback);
                    }
                }
                return toReturn;
            },
            // GET CUSTOM STAMP
            customstamp: function (params, callback) {
                ga('send', 'event', 'APICALL', 'Custom Stamp');
                return apiCall(otasBase.baseUrl + "/stock/stamp/custom/" + params['title'] + "/" + params['value'] + "/" + params['valueheader'] + "/" + params['zscore'] + "/" + params['color'], 'stamp', callback);
            }
        }
    };
    // UTILITY FUNCTIONS
    Data.utils = {
        // COMBINE STOCKS AND RESPECTED FLAGS
        zipStocksAndFlags: function (stocks, flags) {
            var flagdict = new Object();
            for (var i = 0; i < flags.length; i++) {
                for (var f in flags[i]) {

                    flagdict[flags[i][f].otasSecurityId] = flags[i];
                    break;
                }
            }
            for (var i = 0; i < stocks.length; i++) {
                stocks[i].flags = flagdict[stocks[i].otasSecurityId];
            }

        },
        // SORT STOCKS BY NAME AND BY FLAGS
        sorting: {
            sortStocksByName: function (options) {
                return function (a, b) {
                    if (a.stock.name > b.stock.name) return 1.0;
                    return -1.0;
                }
            },
            sortStocksByFlags: function (options) {
                return function (a, b) {

                    options = $.extend({}, { direction: false }, options);

                    var getLogP = function (row) {
                        var flags = row.cells.signals.data("otas.dailyFlagRow").dailyFlags;

                        var totalPos = 0.0;
                        var totalNeu = 0.0;
                        var totalNeg = 0.0;
                        for (var i = 0; i < flags.length; i++) {
                            if (flags[i].pvalue) {
                                if (flags[i].direction == Enums.buySell.BUY)
                                    totalPos += Math.log(flags[i].pvalue);
                                else if (flags[i].direction == Enums.buySell.SELL)
                                    totalNeg += Math.log(flags[i].pvalue);
                                else
                                    totalNeu += Math.log(flags[i].pvalue);
                            } else {
                                totalNeu += Math.log(0.5);
                            }
                        }

                        if (options.direction) {
                            if (totalPos > totalNeg)
                                return (totalPos - totalNeg)// + totalNeu;
                            else
                                return (totalPos - totalNeg)// - totalNeu;
                        }
                        else {
                            return totalPos + totalNeg + totalNeu;
                        }
                    }

                    if (getLogP(a) > getLogP(b)) return 1.0;
                    return -1.0;
                };
            }
        },
        // CUMULATE VALUES
        cumulative: function (seriesData) {
            var srs = new Array(2);

            srs['additionalInfo'] = seriesData.additionalInfo;
            srs['series'] = new Array('series');

            var sVal = [];

            for (var j = 0; j < seriesData.series.length; j++) {
                sVal[j] = seriesData.series[j].value;
            }

            for (var i = 0; i < seriesData.series.length; i++) {
                srs['series'][i] = {
                    date: new Date(seriesData.series[i].date),
                    value: sVal.slice(0, i + 1).reduce(function (p, i) { return p + i; })
                };

            }

            return srs;
        }
    };


    // DISPLAY UTILS CLASS DEFINITION
    // ==============================
    var DisplayUtils = function () { };
    // VALUE TO PERCENTILE CONVERTER
    DisplayUtils.percentile = function (value, sig) {
        if (!sig)
            sig = 2;

        if (value < 99.50) {
            value = (value).toPrecision(sig);
        } else {
            value = (value).toFixed(0);
        }

        var txt = "th";
        if (value % 10 == 1)
            txt = "st";
        if (value % 10 == 2)
            txt = "nd";
        if (value % 10 == 3)
            txt = "rd";
        return value + txt;
    }
    // VALUE TO UNIT CONVERTER
    DisplayUtils.floatShort = function (value, sig) {

        if (!sig)
            sig = 3;
        if (value > 1e9) {
            // billions
            return (value / 1e9).toPrecision(sig) + " B";
        } else if (value > 1e6) {
            // millions
            return (value / 1e6).toPrecision(sig) + " M";
        } else if (value > 1e3) {
            // thousands
            return (value / 1e3).toPrecision(sig) + " k";
        }
        return value.toPrecision(sig);
    }

    DisplayUtils.percentage = function (value) {
        return (value) + "%";

    };
    // GET INTRADAY FLAG HEADERS
    DisplayUtils.intradayFlagHeader = function (flagType) {
        switch (flagType) {
            case Enums.intradayFlagType.RETURN:
                return "Return";
            case Enums.intradayFlagType.VOLUME:
                return "Volume";
            case Enums.intradayFlagType.SPREAD:
                return "Spread";
            case Enums.intradayFlagType.LIQUIDITY:
                return "Liquidity";
        }
    }
    // GET DAILY FLAG HEADERS
    DisplayUtils.dailyflagheader = function (flagType) {
        switch (flagType) {
            case Enums.dailyFlagType.SIGNALS:
                return "Signals";
            case Enums.dailyFlagType.EPSMOMENTUM:
                return "EPS Mmt.";
            case Enums.dailyFlagType.VALUATION:
                return "Valuation";
            case Enums.dailyFlagType.VOLUME:
                return "Volume";
            case Enums.dailyFlagType.VOLATILILTY:
                return "Implied Vol";
            case Enums.dailyFlagType.OPTIONVOLUME:
                return "Option Volume";
            case Enums.dailyFlagType.SHORTINTEREST:
                return "Short Int.";
            case Enums.dailyFlagType.CDS:
                return "CDS";
            case Enums.dailyFlagType.DIVERGENCECDS:
                return "Divergence";
            case Enums.dailyFlagType.DIVERGENCEEPS:
                return "Divergence";
            case Enums.dailyFlagType.DIVERGENCESI:
                return "Divergence";
            case Enums.dailyFlagType.DIVERGENCEVOLATILITY:
                return "Divergence";
            case Enums.dailyFlagType.EVENTS:
                return "Events";
            case Enums.dailyFlagType.DIRECTORDEALINGS:
                return "Dir. Dealings";
            case Enums.dailyFlagType.DIVIDEND:
                return "Dividend";
            case Enums.dailyFlagType.RETURNVSSECTOR1D:
                return "1D Rel. Return";
        }
    }

    // TECHNICALS CLASS DEFINITION
    // ===========================
    var Technicals = function () { };
    // GET TECHNICAL SIGANLS HEADERS
    Technicals.getDisplayName = function (signalType, signalDirection) {
        var name;
        switch (signalType) {
            case Enums.technicalSignalType.BOLLINGERBAND:
                name = "Bollinger Band";
                break;
            case Enums.technicalSignalType.RSI:
                name = "RSI";
                break;
            case Enums.technicalSignalType.MACD:
                name = "MACD";
                break;
            case Enums.technicalSignalType.FASTSTOCHASTIC:
                name = "Fast Stochastic";
                break;
            case Enums.technicalSignalType.SLOWSTOCHASTIC:
                name = "Slow Stochastic";
                break;
            case Enums.technicalSignalType.FULLSTOCHASTIC:
                name = "Full Stochastic";
                break;
        }
        if (signalDirection == Enums.buySell.BUY)
            name += " (+)";
        else
            name += " (-)";
        return name;
    };

    // ENUMERATIONS
    // =============
    var Enums = function () { };

    Enums.upDown = {
        UP: "up",
        DOWN: "down"
    }

    Enums.buySell = {
        BUY: "buy",
        SELL: "sell"
    };

    Enums.technicalSignalType = {
        BOLLINGERBAND: "bollingerBand",
        RSI: "rsi",
        MACD: "macd",
        FASTSTOCHASTIC: "fastStochastic",
        SLOWSTOCHASTIC: "slowStochastic",
        FULLSTOCHASTIC: "fullStochastic"
    };

    Enums.intradayFlagType = {
        RETURN: "intradayReturn",
        VOLUME: "intradayVolume",
        LIQUIDITY: "intradayLiquidity",
        SPREAD: "intradaySpread"
    }

    Enums.dailyFlagType = {
        SIGNALS: "signals",
        EPSMOMENTUM: "epsMomentum",
        VALUATION: "valuation",
        VOLUME: "volume",
        VOLATILILTY: "volatility",
        OPTIONVOLUME: "optionVolume",
        SHORTINTEREST: "shortInterest",
        CDS: "cds",
        DIVERGENCEEPS: "divergenceEps",
        DIVERGENCEVOLATILITY: "divergenceVolatility",
        DIVERGENCECDS: "divergenceCds",
        DIVERGENCESI: "divergenceSi",
        DIVIDEND: "dividend",
        EVENTS: "events",
        DIRECTORDEALINGS: "directorDealings",
        RETURNVSSECTOR1D: "returnVsSector1d"
    };

    Enums.otasListType = {
        WACTHCLIST: "watchlist",
        REGIONALINDEX: "regionalindex",
        ORDERLIST: "orderlist",
        MARKETINDEX: "marketindex",
        PORTFOLIO: "portfolio",
        INDUSTRYINDEX: "industryindex"
    };

    Enums.regionalWatchlist = {
        EUROPE: "1",
        NORTHAMERICA: "2",
        JAPAN: "3",
        ASIAEXJAPAN: "4",
        EEMEA: "5",
        LATAM: "6"
    };

    Enums.seriesType = {
        RETURN: "ReturnAbsolute",
        RETURNVSSECTOR: "ReturnVsSector",
        RETURNVSMARKET: "ReturnVsMarket"
    };

    Enums.stampType = {
        PERFORMANCE: "Performance",
        SIGNALS: "Signals",
        VOLUME: "Volume",
        EPSMOMENTUM: "EpsMomentum",
        DIRECTORDEALINGS: "DirectorDealings",
        VALUATION: "Valuation",
        VOLATILITY: "Volatility",
        SHORTINTEREST: "ShortInterest",
        CDS: "Cds",
        DIVERGENCE: "Divergence",
        EVENTS: "Events",
        DIVIDEND: "Dividend"
    };

    Enums.listStampTopic = {
        PERFORMANCE: "Performance",
        SIGNALS: "Signals",
        EPSMOMENTUM: "EpsMomentum",
        DIRECTORDEALINGS: "DirectorDealings",
        VALUATION: "Valuation",
        VOLATILITY: "Volatility",
        SHORTINTEREST: "ShortInterest",
        CDS: "Cds",
        DIVERGENCE: "Divergence",
        EVENTS: "Events",
        DIVIDEND: "Dividend"
    };

    // FLAG CLASS DEFINITION
    // =====================
    var Flag = function () {
    }

    // large positive up arrow
    Flag.prototype._createLrgUpPos = function () {
        return this._createIcon("icon-up-dir-1", "lrg", "pos");
    }

    // small positive up arrow
    Flag.prototype._createSmlUpPos = function () {
        return this._createIcon("icon-up-dir-1", "sml", "pos");
    }

    // large negative down arrow
    Flag.prototype._createLrgDownNeg = function () {
        return this._createIcon("icon-down-dir-1", "lrg", "neg");
    }

    // small negative down arrow
    Flag.prototype._createSmlDownNeg = function () {
        return this._createIcon("icon-down-dir-1", "sml", "neg");
    }

    // large negative up arrow
    Flag.prototype._createLrgUpNeg = function () {
        return this._createIcon("icon-up-dir-1", "lrg", "neg");
    }

    // small negative up arrow
    Flag.prototype._createSmlUpNeg = function () {
        return this._createIcon("icon-up-dir-1", "sml", "neg");
    }

    // large positive down arrow
    Flag.prototype._createLrgDownPos = function () {
        return this._createIcon("icon-down-dir-1", "lrg", "pos");
    }

    Flag.prototype._createLrgDownDPos = function () {
        return this._createIcon("icon-downd-dir-1", "lrg", "pos");
    }

    // small positive down arrow
    Flag.prototype._createSmlDownPos = function () {
        return this._createIcon("icon-down-dir-1", "sml", "pos");
    }

    Flag.prototype._createIcon = function (iconCls, sizeCls, clrCls) {
        var div = $(document.createElement("div")).addClass('dailyflag');
        var icon = $(document.createElement("icon")).addClass(iconCls)
                                                    .addClass(sizeCls)
                                                    .addClass(clrCls);
        div.append(icon);
        return div;
    }
    // create custom icon element
    Flag.prototype._createCustomIcon = function (flagColor, flagSize, flagDir) {

        var div = $(document.createElement("div")).addClass('dailyflag');
        var icon = $(document.createElement("icon"));
        var dirCls, sizeCls;

        if (flagDir == 'up') {
            dirCls = 'icon-up-dir-1';
        } else {
            dirCls = 'icon-down-dir-1';
        }
        $(icon).addClass(dirCls);

        if (flagSize == 'small') {
            sizeCls = 'sml';
        } else {
            sizeCls = 'lrg';
        }
        $(icon).addClass(sizeCls);

        $(icon).css('color', flagColor);

        div.append(icon);
        return div;
    }
    // create text element
    Flag.prototype._createText = function (text, textCls, sizeCls) {
        var div = $(document.createElement("div")).addClass('dailyflag');
        var span = $(document.createElement("span")).addClass(textCls)
                                                      .addClass(sizeCls);
        span.text(text);
        div.append(span);
        return div;
    }
    // create container element
    Flag.prototype._createContainer = function (flagElem, flagHeader) {
        var container = $(document.createElement("div"));
        var header = $(document.createElement("div"));
        container.addClass("dailyflag-container");
        header.addClass("dailyflag-header");
        container.append(header);
        container.append(flagElem);
        header.text(flagHeader);
        return container;
    }

    // INTRADAY FLAG CLASS DEFINITION
    // ====================================
    var IntradayFlag = function (element, options) {
        this.$element = $(element);
        this.flag = options.flag;
        this.options = $.extend({}, IntradayFlag.DEFAULTS, options);
    }

    IntradayFlag.prototype = new Flag();
    IntradayFlag.prototype.constructor = Flag;

    // flag conditions
    IntradayFlag.conditions = {
        intradayReturn: {
            veryLow: -2.0,
            low: -1.5,
            high: 1.5,
            veryHigh: 2.0
        },
        intradayVolume: {
            veryLow: -2.0,
            low: -1.5,
            high: 2.5,
            veryHigh: 3.0
        },
        intradayLiquidity: {
            veryLow: -2.0,
            low: -1.5,
            high: 2.5,
            veryHigh: 3.0
        },
        intradaySpread: {
            veryLow: -2.0,
            low: -1.5,
            high: 2.5,
            veryHigh: 3.0
        }
    };

    // create the flag
    IntradayFlag.prototype.createFlag = function () {
        var flagElem;
        var flag = this.flag;
        var tooltipopts = IntradayFlag.TOOLTIO_OPTIONS;
        if (!flag)
            flagElem = null;
        else {
            switch (flag.flagType) {
                case Enums.intradayFlagType.RETURN:         // INTRADAY RETURN
                    if (flag.zScore < IntradayFlag.conditions.intradayReturn.veryLow)
                        flagElem = this._createLrgDownNeg();
                    else if (flag.zScore < IntradayFlag.conditions.intradayReturn.low)
                        flagElem = this._createSmlDownNeg();
                    else if (flag.zScore > IntradayFlag.conditions.intradayReturn.veryHigh)
                        flagElem = this._createLrgUpPos();
                    else if (flag.zScore > IntradayFlag.conditions.intradayReturn.high)
                        flagElem = this._createSmlUpPos();
                    break;
                case Enums.intradayFlagType.SPREAD:        // INTRADAY SPREAD
                    if (flag.zScore < IntradayFlag.conditions.intradaySpread.veryLow)
                        flagElem = this._createLrgDownPos();
                    else if (flag.zScore < IntradayFlag.conditions.intradaySpread.low)
                        flagElem = this._createSmlDownPos();
                    else if (flag.zScore > IntradayFlag.conditions.intradaySpread.veryHigh)
                        flagElem = this._createLrgUpNeg();
                    else if (flag.zScore > IntradayFlag.conditions.intradaySpread.high)
                        flagElem = this._createSmlUpNeg();
                    break;
                case Enums.intradayFlagType.LIQUIDITY:    // INTRADAY LIQUIDITY
                    if (flag.zScore < IntradayFlag.conditions.intradayLiquidity.veryLow)
                        flagElem = this._createLrgDownNeg();
                    else if (flag.zScore < IntradayFlag.conditions.intradayLiquidity.low)
                        flagElem = this._createSmlDownNeg();
                    else if (flag.zScore > IntradayFlag.conditions.intradayLiquidity.veryHigh)
                        flagElem = this._createLrgUpPos();
                    else if (flag.zScore > IntradayFlag.conditions.intradayLiquidity.high)
                        flagElem = this._createSmlUpPos();
                    break;
                case Enums.intradayFlagType.VOLUME:    // INTRADAY VOLUME
                    if (flag.zScore < IntradayFlag.conditions.intradayVolume.veryLow)
                        flagElem = this._createLrgDownNeg();
                    else if (flag.zScore < IntradayFlag.conditions.intradayVolume.low)
                        flagElem = this._createSmlDownNeg();
                    else if (flag.zScore > IntradayFlag.conditions.intradayVolume.veryHigh)
                        flagElem = this._createLrgUpPos();
                    else if (flag.zScore > IntradayFlag.conditions.intradayVolume.high)
                        flagElem = this._createSmlUpPos();
                    break;
            }
        }
        if (this.options.tooltip) {
            $(flagElem).tooltip(tooltipopts);
        }
        if (this.options.header && this.flag) {
            return this._createContainer(flagElem, DisplayUtils.intradayflagheader(this.flag.flagType));
        }
        return flagElem;
    }

    // create the flag display elements according to flag state
    IntradayFlag.prototype.init = function () {
        var flag = this.flag;
        var flagElem = this.createFlag();
        if (!flagElem)
            flagElem = this._createEmpty();

        this.$element.append(flagElem);
    }

    // INTRADAY FLAG PLUGIN DEFINITION
    // ===============================

    var old = $.fn.intradayFlag;

    $.fn.intradayFlag = function (option) {

        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.intradayFlag');

            if (!data) $this.data('otas.intradayFlag', (data = new IntradayFlag(this, option)))
            data.init();
        })
    }


    // DAILY FLAG CLASS DEFINITION
    // ==============================
    var DailyFlag = function (element, options) {
        this.$element = $(element);
        this.flag = options.flag;
        this.error = options.isError;
        this.header = options.header;
        this.options = $.extend({}, DailyFlag.DEFAULTS, options);
    }

    DailyFlag.prototype = new Flag();
    DailyFlag.prototype.constructor = DailyFlag;

    // constants
    DailyFlag.TOOLTIP_OPTIONS = {
        animation: true,
        html: true,
        placement: "bottom"
    }

    DailyFlag.DEFAULTS = {
        tooltip: true
    }

    DailyFlag.lowerZscore = 1.5;
    DailyFlag.higherZscore = 2.0;
    DailyFlag.divergencePercentile = 90;

    // flag conditions
    DailyFlag.conditions = {
        signals: {
            reliability: 65,
            daysAgo: 1
        },
        earnings: {
            percentile: 90
        },
        valuation: {
        },
        volume: {
        },
        volatility: {
        },
        shortinterest: {
        },
        cds: {
        },
        divergenceEps: {
        },
        directorDealing: {
            gblddtotalamount: 500 * 0.7 * 1000,
            gblddcount: 1
        },
        dividend: {
        }
    };
    // create normal tooltip element
    DailyFlag.prototype._getNormTooltipContent = function () {
        var dummy = $(document.createElement("div"));
        var tbl = $(document.createElement("table"));
        tbl.addClass("dailyflag-tooltip");
        var tr1 = $(document.createElement("tr"));
        var tr2 = $(document.createElement("tr"));
        var tr3 = $(document.createElement("tr"));

        var td1 = $(document.createElement("td"));
        var td2 = $(document.createElement("td"));
        var td3 = $(document.createElement("td"));
        var td4 = $(document.createElement("td"));
        var td5 = $(document.createElement("td"));
        var td6 = $(document.createElement("td"));

        td1.css("text-align", "center");
        td2.css("text-align", "right");
        td3.css("text-align", "center");
        td4.css("text-align", "right");
        td5.css("text-align", "center");
        td6.css("text-align", "right");

        td1.text("Std Dev:");
        td5.text("Z score:");
        td3.text("Mean:");

        td2.text(this.flag.standardDeviation);
        td4.text(this.flag.mean);
        td6.text(this.flag.zScore);

        tr1.append(td1)
           .append(td2);
        tr2.append(td3)
           .append(td4);
        tr3.append(td5)
           .append(td6);

        tbl.append(tr1)
           .append(tr2)
           .append(tr3);

        if (this.flag.flagType.toLowerCase() == 'returnvssector1d') {
            var tr4 = $(document.createElement("tr"));
            var td7 = $(document.createElement("td"));
            var td8 = $(document.createElement("td"));
            td7.css("text-align", "center");
            td8.css("text-align", "right");
            td7.text("T-1 Return:");
            td8.text(this.flag.currentLevel);
            tr4.append(td7)
               .append(td8);
            tbl.append(tr4);
        }

        dummy.append(tbl);
        return dummy.html();
    }
    // create custom tooltip element
    DailyFlag.prototype._getCustomTooltipContent = function () {
        var dummy = $(document.createElement("div"));
        var tbl = $(document.createElement("table"));
        tbl.addClass("dailyflag-tooltip");

        var tr1 = $(document.createElement("tr"));
        var td1 = $(document.createElement("td"));
        var td2 = $(document.createElement("td"));

        td1.css("text-align", "center");
        td2.css("text-align", "right");

        td1.text("Tip:");
        td2.text(this.options.tooltip);

        tr1.append(td1).append(td2);
        tbl.append(tr1);
        dummy.append(tbl);
        return dummy.html();
    }
    // create event tooltip element
    DailyFlag.prototype._getEventTooltipContent = function () {
        var dummy = $(document.createElement("div"));
        var tbl = $(document.createElement("table"));
        tbl.addClass("dailyflag-tooltip");

        var tr1 = $(document.createElement("tr"));
        var td1 = $(document.createElement("td"));
        var td2 = $(document.createElement("td"));

        td1.css("text-align", "center");
        td2.css("text-align", "right");

        td1.text(this.flag.eventType);
        var eventdate = new Date(this.flag.asOfDate), locale = "en-us";
        eventdate.setDate(eventdate.getDate() + this.flag.dayDifference);
        var dd = eventdate.getDate();
        var mm = eventdate.toLocaleString(locale, { month: "short" });
        var y = eventdate.getFullYear();
        var eventFormattedDate = dd + '/' + mm + '/' + y;
        td2.text('Date: ' + eventFormattedDate);

        tr1.append(td1).append(td2);
        tbl.append(tr1);
        dummy.append(tbl);
        return dummy.html();
    }
    // create percentile tooltip element
    DailyFlag.prototype._getPercentileTooltipContent = function () {
        var dummy = $(document.createElement("div"));
        var tbl = $(document.createElement("table"));
        tbl.addClass("dailyflag-tooltip");
        var tr1 = $(document.createElement("tr"));
        var td1 = $(document.createElement("td"));
        var td2 = $(document.createElement("td"));
        td1.css("text-align", "center");
        td2.css("text-align", "right");
        td1.text("Percentile:");
        td2.text(DisplayUtils.percentile(this.flag.percentile));
        tr1.append(td1)
           .append(td2);
        tbl.append(tr1)
        dummy.append(tbl);
        return dummy.html();
    }
    // create directordealing tooltip element
    DailyFlag.prototype._getDirectorDealingToolipContent = function () {
        var dummy = $(document.createElement("div"));
        var tbl = $(document.createElement("table"));
        tbl.addClass("dailyflag-tooltip");
        if (this.flag.buyCount > 0) {
            var trb1 = $(document.createElement("tr"));
            var trb2 = $(document.createElement("tr"));
            var trb3 = $(document.createElement("tr"));
            var tdb1 = $(document.createElement("td"));
            var tdb2 = $(document.createElement("td"));
            var tdb3 = $(document.createElement("td"));
            var tdb4 = $(document.createElement("td"));
            var tdb5 = $(document.createElement("td"));
            var tdb6 = $(document.createElement("td"));
            tdb1.text("Total Buy:")
            tdb2.text(DisplayUtils.floatShort(this.flag.buyTotalValueLocal) + " (" + this.flag.buyLocalCurrencySymbol + ")");
            tdb3.text("Insider Count:");
            tdb4.text("" + this.flag.buyCount);
            tdb5.text("Last Transaction:");
            tdb6.text((-this.flag.buyDaysAgo) + " days ago");
            trb1.append(tdb1);
            trb1.append(tdb2);
            trb2.append(tdb3);
            trb2.append(tdb4);
            trb3.append(tdb5);
            trb3.append(tdb6);
            tbl.append(trb1);
            tbl.append(trb2);
            tbl.append(trb3);
        }
        if (this.flag.sellCount > 0) {
            var trs1 = $(document.createElement("tr"));
            var trs2 = $(document.createElement("tr"));
            var trs3 = $(document.createElement("tr"));
            var tds1 = $(document.createElement("td"));
            var tds2 = $(document.createElement("td"));
            var tds3 = $(document.createElement("td"));
            var tds4 = $(document.createElement("td"));
            var tds5 = $(document.createElement("td"));
            var tds6 = $(document.createElement("td"));
            tds1.text("Total Sell:")
            tds2.text(DisplayUtils.floatShort(this.flag.sellTotalValueLocal) + " (" + this.flag.sellLocalCurrencySymbol + ")");
            tds3.text("Insider Count:");
            tds4.text("" + this.flag.sellCount);
            tds5.text("Last Transaction:");
            tds6.text((-this.flag.sellDaysAgo) + " days ago");
            trs1.append(tds1);
            trs1.append(tds2);
            trs2.append(tds3);
            trs2.append(tds4);
            trs3.append(tds5);
            trs3.append(tds6);
            tbl.append(trs1);
            tbl.append(trs2);
            tbl.append(trs3);
        }
        dummy.append(tbl);
        return dummy.html();
    }
    // create volume tooltip element
    DailyFlag.prototype._getVolumeTooltipContent = function () {
        var dummy = $(document.createElement("div"));
        var tbl = $(document.createElement("table"));
        tbl.addClass("dailyflag-tooltip");
        var tr1 = $(document.createElement("tr"));
        var tr2 = $(document.createElement("tr"));
        var td1 = $(document.createElement("td"));
        var td2 = $(document.createElement("td"));
        var td3 = $(document.createElement("td"));
        var td4 = $(document.createElement("td"));
        td1.css("text-align", "center");
        td2.css("text-align", "right");
        td3.css("text-align", "center");
        td4.css("text-align", "right");
        td1.text("Std Dev:");
        td3.text("Z score:");
        td2.text(this.flag.standardDeviation);
        td4.text(this.flag.zScore);
        tr1.append(td1)
           .append(td2);
        tr2.append(td3)
           .append(td4);
        tbl.append(tr1)
           .append(tr2);
        dummy.append(tbl);
        return dummy.html();
    }
    // create priceaction tooltip element
    DailyFlag.prototype._getPriceActionTooltipContent = function () {
        var name = Technicals.getDisplayName(this.flag.technical, this.flag.signalDirection);
        var dummy = $(document.createElement("div"));
        var tbl = $(document.createElement("table"));
        tbl.addClass("dailyflag-tooltip");
        var tr1 = $(document.createElement("tr"));
        var tr2 = $(document.createElement("tr"));
        var tr3 = $(document.createElement("tr"));
        var tr4 = $(document.createElement("tr"));
        var tr5 = $(document.createElement("tr"));
        var td1 = $(document.createElement("td"));
        var td2 = $(document.createElement("td"));
        var td3 = $(document.createElement("td"));
        var td4 = $(document.createElement("td"));
        var td5 = $(document.createElement("td"));
        var td6 = $(document.createElement("td"));
        var td7 = $(document.createElement("td"));
        var td8 = $(document.createElement("td"));
        var td9 = $(document.createElement("td"));
        td1.attr("colspan", 2);
        td1.css("text-align", "center");
        td2.css("text-align", "right");
        td3.css("text-align", "center");
        td4.css("text-align", "right");
        td5.css("text-align", "right");
        td6.css("text-align", "right");
        td7.css("text-align", "right");
        td8.css("text-align", "right");
        td9.css("text-align", "right");
        td1.text(name);
        td2.text("Fired:");
        td3.text(this.flag.daysAgo + " " + (this.flag.daysAgo == 1 ? "Day Ago" : "Days Ago"));
        td4.text("Return:");
        td5.text(DisplayUtils.percentage(this.flag.avgHistReturn));
        td6.text("Reliability:")
        td7.text(DisplayUtils.percentage(this.flag.reliability));
        td8.text("P value:")
        td9.text(this.flag.pValue);
        tr1.append(td1);
        tr2.append(td2)
           .append(td3);
        tr3.append(td4)
           .append(td5);
        tr4.append(td6)
           .append(td7);
        tr5.append(td8)
           .append(td9);
        tbl.append(tr1)
           .append(tr2)
           .append(tr3)
           .append(tr4)
           .append(tr5);
        dummy.append(tbl);
        return dummy.html();
    }
    // create cds flag element
    DailyFlag.prototype._createCds = function (tighter, sizeCls) {
        var div = $(document.createElement("div")).addClass('dailyflag');
        var icon1 = $(document.createElement("icon")).addClass(tighter ? "icon-right-dir-1" : "icon-left-dir-1")
                                                     .addClass(sizeCls)
                                                     .addClass(tighter ? "pos" : "neg")
                                                     .addClass("cds-signal");
        var icon2 = $(document.createElement("icon")).addClass(tighter ? "icon-left-dir-1" : "icon-right-dir-1")
                                                     .addClass(sizeCls)
                                                     .addClass(tighter ? "pos" : "neg")
                                                     .addClass("cds-signal");
        div.append(icon1);
        div.append(icon2);
        return div;
    }
    // create divergence flag element
    DailyFlag.prototype._createDivergence = function (text, iconCls1, iconCls2) {
        var div = $(document.createElement("div")).addClass('dailyflag');
        var span2 = $(document.createElement("span")).addClass('diverg-signal');
        span2.text(text);
        var icon2 = $(document.createElement("icon")).addClass("sml")
                                                     .addClass("diverg-signal")
                                                     .addClass("neu")
                                                     .addClass(iconCls2);
        div.append(span2);
        div.append(icon2);
        return div;
    }
    // create si dividend flag element
    DailyFlag.prototype._createSIDividend = function (iconCls1, iconCls2, iconCls3) {
        var div = $(document.createElement("div")).addClass('dailyflag');
        var icon = $(document.createElement("icon")).addClass(iconCls1).addClass(iconCls2).addClass(iconCls3);
        var span = $(document.createElement("span")).addClass('si-div');

        if (iconCls3 == 'neg') {
            $(span).addClass('div-signal-neg');
        } else {
            $(span).addClass('div-signal-pos');
        }
        span.text('D');

        div.append(icon);
        div.append(span);

        return div;
    }
    // create volume flag element
    DailyFlag.prototype._createDirectorDealings = function (text, cls) {
        var div = $(document.createElement("div")).addClass('dailyflag');
        var span = $(document.createElement("span")).addClass("dd-signal")
                                                    .addClass(cls);

        span.text(text);
        div.append(span);
        return div;
    }
    // create event flag element
    DailyFlag.prototype._createEvent = function (difference) {
        var div = $(document.createElement("div")).addClass('dailyflag');
        var span = $(document.createElement("span")).addClass("event-signal");

        if (difference == 0) {
            span.addClass("today");
            span.text("T");
        } else if (difference > 0) {
            span.addClass("future");
            span.text("+" + difference);
        } else {
            span.addClass("past");
            span.text(difference);
        }
        div.append(span);
        return div;
    }
    // create empty element
    DailyFlag.prototype._createEmpty = function () {
        var div = $(document.createElement("div")).addClass('dailyflag');
        return div;
    }
    // create custom flag element
    DailyFlag.prototype._createCustomFlag = function () {
        var flagElem;
        var flagColor = this.options.color;
        var flagDir = this.options.direction;
        var flagTooltip = this.options.tooltip;
        var flagSize = this.options.size;
        var flagTitle = this.options.title;
        var flagCustTooltip = DailyFlag.TOOLTIP_OPTIONS;

        flagCustTooltip = $.extend({}, flagCustTooltip, { title: this._getCustomTooltipContent() });
        flagElem = this._createCustomIcon(flagColor, flagSize, flagDir);

        if (flagTooltip && flagElem) {
            $(flagElem).tooltip(flagCustTooltip);
        }
        if (this.options.header) {
            return this._createContainer(flagElem, flagTitle);
        }

        return flagElem;
    }

    // create the flag
    DailyFlag.prototype.createFlag = function () {
        var flagElem;
        var flag = this.flag;
        var tooltipopts = DailyFlag.TOOLTIP_OPTIONS;
        if (!flag) {
            flagElem = null;
        }
        else {
            switch (flag.flagType.toLowerCase()) {
                case "signals":
                    if (!flag)
                        flagElem = null;
                    else {
                        // large up
                        if (flag.tradeDirection == Enums.buySell.BUY && flag.reliability > DailyFlag.conditions.signals.reliability && flag.daysAgo == DailyFlag.conditions.signals.daysAgo) {
                            flagElem = this._createLrgUpPos();
                        }
                        // small up
                        if (flag.tradeDirection == Enums.buySell.BUY && (flag.reliability <= DailyFlag.conditions.signals.reliability || flag.daysAgo > DailyFlag.conditions.signals.daysAgo)) {
                            flagElem = this._createSmlUpPos();
                        }
                        // large down
                        if (flag.tradeDirection == Enums.buySell.SELL && flag.reliability > DailyFlag.conditions.signals.reliability && flag.daysAgo == DailyFlag.conditions.signals.daysAgo) {
                            flagElem = this._createLrgDownNeg();
                        }
                        // small down
                        if (flag.tradeDirection == Enums.buySell.SELL && (flag.reliability <= DailyFlag.conditions.signals.reliability || flag.daysAgo > DailyFlag.conditions.signals.daysAgo)) {
                            flagElem = this._createSmlDownNeg();
                        }
                        tooltipopts = $.extend({}, tooltipopts, { title: this._getPriceActionTooltipContent() });
                    }
                    break;

                case "epsmomentum":
                    if ((flag.percentile >= Math.abs(DailyFlag.conditions.earnings.percentile)) && flag.direction == Enums.upDown.UP) {
                        flagElem = this._createLrgUpPos();
                    }
                    else if ((flag.percentile >= Math.abs(DailyFlag.conditions.earnings.percentile)) && flag.direction == Enums.upDown.DOWN) {
                        flagElem = this._createLrgDownNeg();
                    }
                    else
                        flagElem = null;
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getPercentileTooltipContent() });
                    break;
                case "valuation":               // valuation flag
                    if (flag.zScore < -(DailyFlag.conditions.valuation.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgDownPos();
                    }
                    else if (flag.zScore < -(DailyFlag.conditions.valuation.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlDownPos();
                    }
                    else if (flag.zScore > (DailyFlag.conditions.valuation.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgUpNeg();
                    }
                    else if (flag.zScore > (DailyFlag.conditions.valuation.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlUpNeg();
                    }

                    tooltipopts = $.extend({}, tooltipopts, { title: this._getNormTooltipContent() });
                    break;
                case "volume":

                    if (flag.zScore < -(DailyFlag.conditions.volume.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createText("Low", "volume-signal", "lrg");
                    }
                    else if (flag.zScore < -(DailyFlag.conditions.volume.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createText("Low", "volume-signal", "sml");
                    }
                    else if (flag.zScore > (DailyFlag.conditions.volume.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createText("High", "volume-signal", "lrg");
                    }
                    else if (flag.zScore > (DailyFlag.conditions.volume.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createText("High", "volume-signal", "sml");
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getVolumeTooltipContent() });
                    break;
                case "volatility":

                    if (flag.zScore < -(DailyFlag.conditions.volatility.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgDownPos();
                    }
                    else if (flag.zScore < -(DailyFlag.conditions.volatility.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlDownPos();
                    }

                    else if (flag.zScore > (DailyFlag.conditions.volatility.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgUpNeg();
                    }
                    else if (flag.zScore > (DailyFlag.conditions.volatility.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlUpNeg();
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getNormTooltipContent() });
                    break;
                case "optionvolume":

                    if (flag.zScore > (DailyFlag.conditions.volatility.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgUpNeg();
                    }
                    else if (flag.zScore > (DailyFlag.conditions.volatility.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlUpNeg();
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getNormTooltipContent() });
                    break;
                case "shortinterest":

                    if (flag.zScore < -(DailyFlag.conditions.shortinterest.higherZscore || DailyFlag.higherZscore)) {

                        if (flag.isDividend == 1) {
                            flagElem = this._createSIDividend("icon-down-dir-1", "lrg", "pos");
                        } else {
                            flagElem = this._createLrgDownPos();
                        }
                    }
                    else if (flag.zScore < -(DailyFlag.conditions.shortinterest.lowerZscore || DailyFlag.lowerZscore)) {

                        if (flag.isDividend == 1) {
                            flagElem = this._createSIDividend("icon-down-dir-1", "sml", "pos");
                        } else {
                            flagElem = this._createSmlDownPos();
                        }
                    }
                    else if (flag.zScore > (DailyFlag.conditions.shortinterest.higherZscore || DailyFlag.higherZscore)) {

                        if (flag.isDividend == 1) {
                            flagElem = this._createSIDividend("icon-up-dir-1", "lrg", "neg");
                        } else {
                            flagElem = this._createLrgUpNeg();
                        }
                    }
                    else if (flag.zScore > (DailyFlag.conditions.shortinterest.lowerZscore || DailyFlag.lowerZscore)) {

                        if (flag.isDividend == 1) {
                            flagElem = this._createSIDividend("icon-up-dir-1", "sml", "neg");
                        } else {
                            flagElem = this._createSmlUpNeg();
                        }
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getNormTooltipContent() });
                    break;
                case "cds":
                    if (flag.zScore < -(DailyFlag.conditions.cds.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createCds(true, "med");
                    }
                    else if (flag.zScore < -(DailyFlag.conditions.cds.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createCds(true, "sml");
                    }
                    else if (flag.zScore > (DailyFlag.conditions.cds.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createCds(false, "med");
                    }
                    else if (flag.zScore > (DailyFlag.conditions.cds.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createCds(false, "sml");
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getNormTooltipContent() });
                    break;
                case "divergenceeps":

                    if (flag.percentile >= (Math.abs(DailyFlag.conditions.divergenceEps.percentile) || DailyFlag.divergencePercentile)) {
                        flagElem = this._createDivergence("EPS", flag.direction == Enums.upDown.UP ? "icon-up-dir-1" : "icon-down-dir-1",
                                                                 flag.direction == Enums.upDown.UP ? "icon-up-dir-1" : "icon-down-dir-1");
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getPercentileTooltipContent() });
                    break;

                case "divergencevolatility":
                    if (flag.percentile >= (Math.abs(DailyFlag.conditions.divergenceEps.percentile) || DailyFlag.divergencePercentile)) {
                        flagElem = this._createDivergence("VOL", flag.direction == Enums.upDown.UP ? "icon-up-dir-1" : "icon-down-dir-1",
                                                                 flag.direction == Enums.upDown.UP ? "icon-up-dir-1" : "icon-down-dir-1");
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getPercentileTooltipContent() });
                    break;
                case "divergencesi":

                    if (flag.percentile >= (Math.abs(DailyFlag.conditions.divergenceEps.percentile) || DailyFlag.divergencePercentile)) {
                        flagElem = this._createDivergence("SI", flag.direction == Enums.upDown.UP ? "icon-up-dir-1" : "icon-down-dir-1",
                                                                 flag.direction == Enums.upDown.UP ? "icon-up-dir-1" : "icon-down-dir-1");
                        tooltipopts = $.extend({}, tooltipopts, { title: this._getPercentileTooltipContent() });
                    }
                    break;
                case "divergencecds":
                    if (flag.percentile >= (Math.abs(DailyFlag.conditions.divergenceEps.percentile) || DailyFlag.divergencePercentile)) {
                        flagElem = this._createDivergence("CDS", flag.direction == Enums.upDown.UP ? "icon-up-dir-1" : "icon-down-dir-1",
                                                                 flag.direction == Enums.upDown.UP ? "icon-up-dir-1" : "icon-down-dir-1");
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getPercentileTooltipContent() });
                    break;
                case "events":

                    if (!flag)
                        flagElem = this._createEmpty();

                    else {
                        flagElem = this._createEvent(flag.dayDifference);
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getEventTooltipContent() });
                    break;
                case "directordealings":
                    if (!flag)
                        flagElem = this._createEmpty();
                    else {

                        var cls = "";
                        var text = "";
                        if (flag.buyCount > 0 && flag.sellCount > 0 && flag.buyTotalValueEuro > DailyFlag.conditions.directorDealing.gblddtotalamount && flag.sellTotalValueEuro > DailyFlag.conditions.directorDealing.gblddtotalamount) {
                            cls = "buysell";
                            text = "" + (flag.buyDaysAgo > flag.sellDaysAgo ? flag.buyDaysAgo : flag.sellDaysAgo);
                            flagElem = this._createDirectorDealings(text, cls);
                        }
                        else if (flag.buyCount > 0 && flag.buyTotalValueEuro > DailyFlag.conditions.directorDealing.gblddtotalamount) {
                            cls = "buy";
                            text = "" + flag.buyDaysAgo;
                            flagElem = this._createDirectorDealings(text, cls);
                        }
                        else if (flag.sellCount > 0 && flag.sellTotalValueEuro > DailyFlag.conditions.directorDealing.gblddtotalamount) {
                            cls = "sell";
                            text = "" + flag.sellDaysAgo;
                            flagElem = this._createDirectorDealings(text, cls);
                        } else {
                        }

                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getDirectorDealingToolipContent() });
                    break;
                case "dividend":

                    if (flag.zScore <= -(DailyFlag.conditions.dividend.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgDownNeg();
                    }
                    else if (flag.zScore <= -(DailyFlag.conditions.dividend.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlDownNeg();
                    }
                    else if (flag.zScore >= (DailyFlag.conditions.dividend.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgUpPos();
                    }
                    else if (flag.zScore >= (DailyFlag.conditions.dividend.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlUpPos();
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getNormTooltipContent() });
                    break;

                case "returnvssector1d":

                    if (flag.zScore <= -(DailyFlag.conditions.dividend.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgDownNeg();
                    }
                    else if (flag.zScore <= -(DailyFlag.conditions.dividend.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlDownNeg();
                    }
                    else if (flag.zScore >= (DailyFlag.conditions.dividend.higherZscore || DailyFlag.higherZscore)) {
                        flagElem = this._createLrgUpPos();
                    }
                    else if (flag.zScore >= (DailyFlag.conditions.dividend.lowerZscore || DailyFlag.lowerZscore)) {
                        flagElem = this._createSmlUpPos();
                    }
                    tooltipopts = $.extend({}, tooltipopts, { title: this._getNormTooltipContent() });
                    break;
            }
        }
        // if tooltip is enabled
        if (this.options.tooltip && flagElem) {
            $(flagElem).tooltip(tooltipopts);
        }
        // if header is enabled
        if ((this.header == true || this.header == 'true') && this.flag && flagElem) {
            return this._createContainer(flagElem, DisplayUtils.dailyflagheader(this.flag.flagType));
        }
        return flagElem;
    }

    // create the flag display elements according to flag state
    DailyFlag.prototype.init = function () {
        var flag = this.flag;
        var flagElem;
        var error = this.error;

        if (error == "No data") {
            flagElem = '<font color=red><b>' + error + '</b></font>';
        } else if ($(error).prop("readyState") == "4") {
            flagElem = '<font color=red><b>' + error.responseJSON.message + '</b></font>';
        } else if (flag == 'custom') {
            flagElem = this._createCustomFlag();
        } else {
            flagElem = this.createFlag();
            if (!flagElem)
                flagElem = this._createEmpty();
        }

        this.$element.append(flagElem);
    }

    // DAILY FLAG PLUGIN DEFINITION
    // ===============================
    var old = $.fn.dailyFlag;

    $.fn.dailyFlag = function (option) {

        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.dailyFlag');

            if (!data) $this.data('otas.dailyFlag', (data = new DailyFlag(this, option)))
            data.init();
        })
    }

    $.fn.dailyFlag.constructor = DailyFlag;

    // DAILY FLAG NO CONFLICT
    // =========================

    $.fn.dailyFlag.noConflict = function () {
        $.fn.dailyFlag = old;
        return this;
    }

    // DAILY FLAG DATA API
    // ======================
    $(document).ready(function () {
        $('.dailyflag-load').each(function () {
            var $this = $(this);
            var topic = $this.data("otas-topic");

            if (topic == 'custom') {
                var header = $this.data("otas-header");
                var topic = $this.data("otas-topic");
                var dir = $this.data("otas-direction");
                var clr = $this.data("otas-color");
                var title = $this.data("otas-title");
                var size = $this.data("otas-size");
                var tt = $this.data("otas-tooltip");

                $this.dailyFlag({ flag: topic, header: header, direction: dir, color: clr, title: title, tooltip: tt, size: size });

            } else {
                var stock = $this.data("otas-stock");
                var date = $this.data("otas-date");

                var url = window.otasBase.baseUrl + "stock/" + stock + "/dailyflags";
                Data.v1.stock(stock).dailyFlags({ date: date, topic: topic }, function (flag) {
                    $this.dailyFlag({ flag: flag[topic], tooltip: $this.data("tooltip"), header: $this.data("otas-header"), isError: flag });
                });
            }
        });
    });

    // DAILY FLAG ROW CLASS DEFINITION
    // ===============================
    var DailyFlagRow = function (element, options) {
        this.$element = $(element);
        this.flags = options.flags;
        this.error = options.isError;
        this.options = $.extend({}, DailyFlagRow.DEFAULTS, options);
    }

    // constants
    DailyFlagRow.DEFAULTS = {
        flagOrder: [
            Enums.dailyFlagType.RETURNVSSECTOR1D,
            Enums.dailyFlagType.SIGNALS,
            Enums.dailyFlagType.VOLUME,
            Enums.dailyFlagType.EPSMOMENTUM,
            Enums.dailyFlagType.DIRECTORDEALINGS,
            Enums.dailyFlagType.VALUATION,
            Enums.dailyFlagType.VOLATILILTY,
            Enums.dailyFlagType.OPTIONVOLUME,
            Enums.dailyFlagType.SHORTINTEREST,
            Enums.dailyFlagType.CDS,
            Enums.dailyFlagType.DIVERGENCEEPS,
            Enums.dailyFlagType.DIVERGENCEVOLATILITY,
            Enums.dailyFlagType.DIVERGENCESI,
            Enums.dailyFlagType.DIVERGENCECDS,
            Enums.dailyFlagType.EVENTS,
            Enums.dailyFlagType.DIVIDEND
        ]
    }

    DailyFlagRow.prototype.init = function () {

        var error = this.error;

        if (error == "No data") {
            flagElem = '<font color=red><b>' + error + '</b></font>';
            this.$element.append(flagElem);
        } else if ($(error).prop("readyState") == "4") {
            var flagElem = '<font color=red><b>' + error.responseJSON.message + '</b></font>';
            this.$element.append(flagElem);
        } else {
            this.$element.addClass("dailyflagrow-container");
            // iterate over flags
            var dfs = new Array();
            if (typeof this.flags != 'undefined') {
                for (var i = 0; i < this.options.flagOrder.length; i++) {

                    var df = new DailyFlag(null, { flag: this.flags[this.options.flagOrder[i]], header: true, tooltip: this.options.tooltip });
                    var flagElem = df.createFlag();
                    if (flagElem)
                        this.$element.append(flagElem);
                    dfs.push(df);
                }
                this.dailyFlags = dfs;
            }
        }
    }

    // DAILY FLAG ROW PLUGIN DEFINITION
    // ===============================
    var old = $.fn.dailyFlagRow;

    $.fn.dailyFlagRow = function (option) {
        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.dailyFlagRow');

            if (!data) $this.data('otas.dailyFlagRow', (data = new DailyFlagRow(this, option)))
            data.init();
        })
    }

    // DAILY FLAG ROW NO CONFLICT
    // =========================

    $.fn.dailyFlagRow.noConflict = function () {
        $.fn.dailyFlagRow = old;
        return this;
    }

    // DAILY FLAG ROW DATA API
    // ======================
    $(document).ready(function () {
        $('.dailyflagrow-load').each(function () {
            var $this = $(this);
            var stock = $this.data("otas-stock");
            var date = $this.data("otas-date");

            Data.v1.stock(stock).dailyFlags({ date: date }, function (flags) {
                $this.dailyFlagRow({ flags: flags, tooltip: $this.data("tooltip"), isError: flags })
            });
        });
    });


    // NATURAL LANGUAGE CLASS DEFINITION
    // ===============================
    var NaturalLanguage = function (element, options) {
        this.$element = $(element);
        this.flagText = options.text;
        this.options = $.extend({}, NaturalLanguage.DEFAULTS, options);
    }

    // constants
    NaturalLanguage.DEFAULTS = {
        flagOrder: [
            Enums.dailyFlagType.RETURNVSSECTOR1D,
            Enums.dailyFlagType.SIGNALS,
            Enums.dailyFlagType.VOLUME,
            Enums.dailyFlagType.EPSMOMENTUM,
            Enums.dailyFlagType.DIRECTORDEALINGS,
            Enums.dailyFlagType.VALUATION,
            Enums.dailyFlagType.VOLATILILTY,
            Enums.dailyFlagType.OPTIONVOLUME,
            Enums.dailyFlagType.SHORTINTEREST,
            Enums.dailyFlagType.CDS,
            Enums.dailyFlagType.DIVERGENCEEPS,
            Enums.dailyFlagType.DIVERGENCEVOLATILITY,
            Enums.dailyFlagType.DIVERGENCESI,
            Enums.dailyFlagType.DIVERGENCECDS,
            Enums.dailyFlagType.EVENTS,
            Enums.dailyFlagType.DIVIDEND
        ]
    }

    NaturalLanguage.prototype.init = function () {
        var flagElem = this.$element;
        var textData = this.flagText;

        $.each(textData, function (i, item) {
            var textDesc = textData[i].text;
            var textDiv = $(document.createElement("div"));
            $(textDiv).html(textDesc);
            flagElem.append(textDiv);
        });
    }

    // NATURAL LANGUAGE PLUGIN DEFINITION
    // ===============================
    var old = $.fn.naturalLanguage;

    $.fn.naturalLanguage = function (option) {
        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.naturalLanguage');

            if (!data) $this.data('otas.naturalLanguage', (data = new NaturalLanguage(this, option)))
            data.init();
        })
    }

    // NATURAL LANGUAGE NO CONFLICT
    // =========================

    $.fn.naturalLanguage.noConflict = function () {
        $.fn.naturalLanguage = old;
        return this;
    }

    // NATURAL LANGUAGE DATA API
    // ======================
    $(document).ready(function () {
        $('.naturallang-load').each(function () {
            var $this = $(this);
            var stock = $this.data("otas-stock");
            var topic = $this.data("otas-topic");
            var date = $this.data("otas-date");

            Data.v1.stock(stock).naturalLanguage({ topic: topic, date: date }, function (text) {
                $this.naturalLanguage({ text: text });
            });
        });
    });


    // DAILY FLAG LIST CLASS DEFINITION
    // ================================
    var DailyFlagList = function (element, options) {
        this.$element = $(element);
        this.error = options.isError;
        this.options = $.extend({}, DailyFlagList.DEFAULTS, options);
    }

    DailyFlagList.COLUMNS = {
        name: {
            header: "Stock",
            create: function (row) {
                return $(document.createElement("div")).stockDescriptor({ stock: row.stock, small: true, noBackground: true });
            },
            name: "stock"
        },
        signals: {
            header: "Signals",
            create: function (row) {
                return $(document.createElement("div")).dailyFlagRow({ flags: row.stock.flags });
            },
            name: "signals"
        }
    }

    // constants
    DailyFlagList.DEFAULTS = {
        columns: [DailyFlagList.COLUMNS.name, DailyFlagList.COLUMNS.signals]
    }

    DailyFlagList.prototype.init = function () {
        var stocks = this.options.stocks;
        var error = this.error;

        if ($(error).prop("readyState") == "4") {
            var flagElem = '<font color=red><b>' + error.responseJSON.message + '</b></font>';
            this.$element.append(flagElem);
        } else {
            var cols = this.options.columns;
            var tbl = $(document.createElement("table")).addClass("dashboard");
            for (var i = 0; i < stocks.length; i++) {
                var tr = $(document.createElement("tr"));
                tbl.append(tr);
                tr.data("stock", stocks[i]);
                var cells = new Object();
                for (var j = 0; j < cols.length; j++) {
                    var td = $(document.createElement("td"));
                    var content = cols[j].create({ stock: stocks[i] });
                    td.append(content);
                    tr.append(td);
                    cells[cols[j].name] = content;
                }
                tr.data("cells", cells);
            }
            this.$element.append(tbl);
        }
    }
    // sort daily flag list
    DailyFlagList.prototype.sort = function (sortFunction) {
        this.$element.find("tr").tsort({
            sortFunction: function (a, b) {
                return sortFunction({ stock: a.e.data("stock"), cells: a.e.data("cells") }, { stock: b.e.data("stock"), cells: b.e.data("cells") });
            }
        });
    }

    // DAILY FLAG LIST PLUGIN DEFINITION
    // =================================

    var old = $.fn.dailyFlagList;

    $.fn.dailyFlagList = function (option, arg) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('otas.dailyFlagList');
            if (!data) {
                $this.data('otas.dailyFlagList', (data = new DailyFlagList(this, option)))
                data.init();
            }
            if (typeof option == 'string') data[option].call(data, arg)
        })
    }

    // DAILY FLAG LIST DATA API
    // =========================
    $(document).ready(function () {
        $('.dailyflag-list').each(function () {
            var $this = $(this);
            var listtype = $this.data("otas-list-type");
            var listid = $this.data("otas-list-id");
            var date = $this.data("otas-date");

            $.when(Data.v1.stocks(listtype, listid)(),
                   Data.v1.stocks(listtype, listid).dailyFlags({ date: date }))
            .done(function (stocks, flags) {
                Data.utils.zipStocksAndFlags(stocks, flags);
                $this.dailyFlagList({ stocks: stocks, isError: flags });
            });
        });
    });

    // DAILY FLAG LIST NO CONFLICT
    // =========================

    $.fn.dailyFlagList.noConflict = function () {
        $.fn.dailyFlagList = old;
        return this;
    }

    Array.prototype.accumulate = function (fn) {
        var r = [this[0].value];
        for (var i = 1; i < this.length; i++)
            r.push(fn(r[i - 1], this[i]));
        return r;
    }

    // DAILY SERIES CLASS DEFINITION
    // =======================
    var DailySeries = function (options, element) {
        this.$element = $(element);
        DailySeries.highchartOptions.title.text = options.chartTitle;
        this.error = options.isError;
        this.isStdDev = options.stdDev;
        var sVal = [];

        this.options = $.extend({}, DailySeries.DEFAULTS, options);

        var parseSeries = function (seriesData) {

            for (var j = 0; j < seriesData.series.length; j++) {
                sVal[j] = seriesData.series[j].value;
            }

            for (var i = 0; i < seriesData.series.length; i++) {
                sVal[i] = {
                    date: new Date(seriesData.series[i].date),
                    value: seriesData.series[i].value
                };
            }
            return sVal;
        }
        // series tooltip
        var $tooltip = $(document.createElement("div"));
        $tooltip.addClass('thetooltip');
        var $text = $(document.createElement("p"));
        $tooltip.append($text);
        $('body').append($tooltip);
        $tooltip.hide();

        // std dev tooltip
        var $tooltipY = $(document.createElement("div"));
        $tooltipY.addClass('tooltipYcls');
        $('.highcharts-container').append($tooltipY);

        // positioning tooltip
        var displayTooltip = function (e, text, left) {
            $text.html(text);
            $tooltip.show();
            $tooltip.css('top', e.clientY);
            $tooltip.css('left', e.clientX + 'px');
        };
        var timer;
        var hideTooltip = function (e) {
            clearTimeout(timer);
            timer = setTimeout(function () {
                $tooltip.fadeOut('slow');
            }, 2000);
        };

        var postSeries = function (postsrs) {
            var dfr = $.Deferred();
            // ajax post call to get cummulative series
            $.when($.ajax({
                url: otasBase.baseUrl + "/series/info",
                type: 'post',
                data: JSON.stringify(postsrs),
                contentType: "application/json; charset=utf-8",
                timeout: 300000,
                async: false,
                success: function (data) {
                    if (data != null) {

                        if (stddev == true) {
                            dfr.resolve(data);

                        }

                    } else {
                        this.error("No data");
                    }
                },
                error: function (e) {
                    dfr.resolve(e);
                },
                beforeSend: function (xhr) {
                    xhr.setRequestHeader("Authorization", Data.apiKey);
                }
            })).done(function (data) {
                var _std1stposdev = data.mean + data.standardDeviation;
                var _std1stnegdev = data.mean - data.standardDeviation;
                var _std2ndposdev = data.mean + (2 * data.standardDeviation);
                var _std2ndnegdev = data.mean - (2 * data.standardDeviation);

                // std dev lines
                DailySeries.highchartOptions.yAxis.plotLines = [{
                    value: _std1stposdev,
                    color: '#2A5170',
                    dashStyle: 'shortdash',
                    width: 1,
                    id: "1",
                    tooltipText: 'Standard Deviation(+1): ' + Highcharts.numberFormat(Math.abs(_std2ndnegdev), 2),
                    events: {
                        mouseover: function (e) {
                            displayTooltip(e, this.options.tooltipText, this.svgElem.d.split(' ')[1]);
                        },
                        mouseout: hideTooltip
                    }
                }, {
                    value: _std1stnegdev,
                    color: '#2A5170',
                    dashStyle: 'shortdash',
                    width: 1,
                    id: "2",
                    tooltipText: 'Standard Deviation(-1): ' + Highcharts.numberFormat(Math.abs(_std1stnegdev), 2),
                    events: {
                        mouseover: function (e) {
                            displayTooltip(e, this.options.tooltipText, this.svgElem.d.split(' ')[1]);
                        },
                        mouseout: hideTooltip
                    }
                }, {
                    value: _std2ndnegdev,
                    color: '#2A5170',
                    dashStyle: 'solid',
                    width: 1,
                    id: "3",
                    tooltipText: 'Standard Deviation(-2): ' + Highcharts.numberFormat(Math.abs(_std2ndnegdev), 2),
                    events: {
                        mouseover: function (e) {
                            displayTooltip(e, this.options.tooltipText, this.svgElem.d.split(' ')[1]);
                        },
                        mouseout: hideTooltip
                    }

                }, {
                    value: _std2ndposdev,
                    color: '#2A5170',
                    dashStyle: 'solid',
                    width: 1,
                    id: "4",
                    tooltipText: 'Standard Deviation(+2): ' + Highcharts.numberFormat(Math.abs(_std1stposdev), 2),
                    events: {
                        mouseover: function (e) {
                            displayTooltip(e, this.options.tooltipText, this.svgElem.d.split(' ')[1]);
                        },
                        mouseout: hideTooltip
                    }
                }];
            });
        }

        if (this.options.series) {
            // parse all the dates
            this._series = parseSeries(this.options.series);
            var stddev = this.isStdDev;
            this._addData = postSeries(this._series);
        }
    }

    DailySeries.highchartOptions = {
        chart: {
            type: 'line',
            backgroundColor: 'black',
            height: 400,
            width: 700
        },
        credits: {
            enabled: false
        },
        title: {
            text: '',
            style: 'display:none'
        },
        xAxis: {
            type: 'datetime',
            title: ''
        },
        yAxis: {
            gridLineWidth: 0,
            minorGridLineWidth: 0,
            title: '',
            labels: {
                formatter: function () {
                    if (this.value) {
                        return this.value;
                    }
                }
            }
        },
        plotOptions: {
            line: {
                marker: {
                    enabled: false
                },
                events: {
                    legendItemClick: function () {
                        return false; // <== returning false will cancel the default action
                    }
                }
            },
            series: {
                color: '#ffffff'
            }
        },
        legend: {
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'bottom',
            x: 0,
            y: -10,
            itemStyle: {
                color: '#ffffff',
                fontWeight: 'bold'
            },
            labelFormatter: function () {
                return (DailySeries.highchartOptions.title.text);
            },
            itemHoverStyle: {
                color: '#ffffff'
            }
        },
        tooltip: {
            formatter: function () {
                return ("Date: " + Highcharts.dateFormat('%e-%b-%Y', new Date(this.x)) + "<br/>Value: " + Highcharts.numberFormat(this.y, 2));
            },
            // positioning tooltip
            positioner: function (labelWidth, labelHeight, point) {
                var tooltipX, tooltipY;
                if (point.plotX + DailySeries.highchartOptions.chart.plotLeft < labelWidth && point.plotY + labelHeight > DailySeries.highchartOptions.chart.plotHeight) {
                    tooltipX = point.plotX + DailySeries.highchartOptions.chart.plotLeft + 20;
                    tooltipY = point.plotY + DailySeries.highchartOptions.chart.plotTop - labelHeight - 20;
                } else {
                    tooltipX = DailySeries.highchartOptions.chart.plotLeft;
                    tooltipY = DailySeries.highchartOptions.chart.plotTop + DailySeries.highchartOptions.chart.plotHeight - labelHeight;
                }
                return {
                    x: tooltipX,
                    y: tooltipY
                };
            }
        }
    };

    DailySeries.DEFAULTS = {

    };
    // store series in highchart format
    DailySeries.prototype.getHighchartSeries = function () {
        try {
            var hs = new Array(this._series.length);

            for (var i = 0; i < this._series.length; i++) {
                hs[i] = [this._series[i].date.getTime(), this._series[i].value]
            }
            return { name: this.name, data: hs };
        } catch (err) {
            return 'error' + err;
        }

    }

    DailySeries.prototype.getHighchartOptions = function (options) {
        return $.extend({}, DailySeries.highchartOptions, this.options.highchartOptions, options, { series: [this.getHighchartSeries()] });
    }

    DailySeries.prototype.getSeries = function () {
        return this._series;
    }

    DailySeries.prototype.plot = function (options) {
        var ho = $.extend({}, DailySeries.highchartOptions, this.options.highchartOptions, options, DailySeries.ployYlines, { series: [this.getHighchartSeries()] });
        var error = this.error;
        var flagElem;

        if (error == "No data") {
            flagElem = '<font color=red><b>' + error + '</b></font>';
            this.$element.append(flagElem);
        } else {
            this.$element.empty();
            this.$element.highcharts(ho);
        }
    }

    // DAILY SERIES PLUGIN DEFINITION
    // ==============================

    var old = $.fn.dailySeries;

    $.fn.dailySeries = function (option) {

        return this.each(function () {
            var $this = $(this);
            var data = $this.data('otas.dailySeries');

            if (!data) $this.data('otas.dailySeries', (data = new DailySeries(option, this)))
            data.plot();
        })
    }

    // DAILY SERIES DATA API
    // =========================
    $(document).ready(function () {
        $('.dailyseries').each(function () {
            var $this = $(this);
            var stock = $this.data("otas-stock");
            var seriestype = $this.data("otas-series-topic");
            var date = $this.data("otas-start-date");
            var end = $this.data("otas-end-date");

            Data.v1.stock(stock).dailySeries(seriestype, { start: date, date: end }, function (points) {
                // series with cumulative data and stddev
                var newS = Data.utils.cumulative(points);
                $this.dailySeries({ chartTitle: seriestype, series: newS, isError: newS, stdDev: true });
            });
        });
    });

    // STOCK DESCRIPTOR CLASS DEFINITION
    // =================================
    var StockDescriptor = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, StockDescriptor.DEFAULTS, options);
        this.stock = options.stock;
    }

    StockDescriptor.DEFAULTS = {
    }

    StockDescriptor.prototype.init = function () {
        var stock = this.stock;
        var container;

        container = $(document.createElement("div")).addClass("stock-descriptor");
        if (this.options.small)
            container.addClass("sml");
        if (this.options.noBackground)
            container.css("background-color", "transparent");
        var header = $(document.createElement("div")).addClass("header");
        header.text(stock.name);

        var sector = $(document.createElement("div")).addClass("sector");
        var sectorText = $(document.createElement("span"));
        sector.append(sectorText);
        sectorText.text(stock.industry);

        var country = $(document.createElement("div")).addClass("country");
        var countryText = $(document.createElement("span"));

        country.append(countryText);
        countryText.text(stock.country);
        container.append(header);
        container.append(sector);
        container.append(country);

        this.$element.append(container);
    }

    // STOCK DESCRIPTOR PLUGIN DEFINITION
    // ==================================

    var old = $.fn.stockDescriptor;

    $.fn.stockDescriptor = function (option) {
        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.stockDescriptor');

            if (!data) $this.data('otas.stockDescriptor', (data = new StockDescriptor(this, option)))
            data.init();
        })
    }

    // STOCK DESCRIPTOR DATA API
    // =========================
    $(document).ready(function () {
        $('.stock-descriptor-load').each(function () {
            var $this = $(this);
            var stock = $this.data("otas-stock");
            var small = $this.data("otas-small");

            Data.v1.stock(stock)(function (data) {
                $this.stockDescriptor({ stock: data, small: small });
            });
        });
    });

    // STOCK DESCRIPTOR NO CONFLICT
    // =========================

    $.fn.stockDescriptor.noConflict = function () {
        $.fn.stockDescriptor = old;
        return this;
    }


    // NEWS ANALYTICS CLASS DEFINITION
    // =================================
    var NewsAnalytics = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, NewsAnalytics.DEFAULTS, options);
    }

    NewsAnalytics.DEFAULTS = {
    }

    NewsAnalytics.prototype.init = function () {
        var newsElem = this.$element;
        // ROW TEMPLATE
        var divRow = $(document.createElement("div"));
        $(divRow).addClass('row clearfix');
        //$(divRow).css('margin-top', '.3%');
        $(newsElem).prepend(divRow);

        var getNewsComp = function (data) {
            function comp(a, b) {
                return new Date(a.datetime).getTime() - new Date(b.datetime).getTime();
            }

            data.sort(comp);

            $.each(data, function (i, item) {
                // NEWS ATTRIBUTES
                var secId = item.otasSecurityId;
                var tickers = item.tickers;
                var headLine = item.headline;
                var link = item.link;
                //var dateUTC = Date.parse(item.datetime + ' UTC');
                //var dateTime = new Date(dateUTC);
                //debugger;
                //var timeAMPM = ('0' + dateTime.getHours()).slice(-2) >= 12 ? 'pm' : 'am'
                //dateTime = ('0' + dateTime.getHours()).slice(-2) + ':' + ('0' + dateTime.getMinutes()).slice(-2) + ' ' + timeAMPM;
                //console.log(dateTime);
                var date = new Date(item.datetime);
                var dateTime = ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2);
                var source = item.source;
                var topics = item.topics;
                if (otasBase.maxNewsTimeStamp != null && otasBase.maxNewsTimeStamp != undefined && otasBase.maxNewsTimeStamp < item.newsTimeStamp) {
                    otasBase.maxNewsTimeStamp = item.newsTimeStamp;
                }

                // PANEL
                var divPanel = $(document.createElement("div"));
                $(divPanel).addClass('panel grid-row');
                /*if (i % 2 == 0) {
                    $(divPanel).css('background-color', '#1b1b1b');
                } else {
                    $(divPanel).css('background-color', '#111');
                }*/
                $(divPanel).css('border-bottom', '0').css('margin-bottom', '0px').css('font-family', 'Verdana, Helvetica, Sans-Serif').css('font-size', '11px');
                $(divRow).append(divPanel);

                $(divPanel).click(function () {
                    $(this).closest(".row").find(".grid-row-active").removeClass("grid-row-active")
                    $(this).addClass("grid-row-active");
                });

                // NEWS HEADLINE
                var divPanelHead = $(document.createElement("span"));
                $(divPanelHead).addClass('panel-heading');
                $(divPanelHead).css('font-size', '14px').css('padding-left', '10px');
                $(divPanelHead).html('<a style="color:#fff;" href=' + link + ' target=new>' + headLine + '</a>');
                $(divPanelHead).children('a').hover(function () {
                    $(this).css("text-decoration", "none");
                });
                $(divPanelHead).children('a').click(function () {
                    otas.event({ Newslink: $(this).attr("href") });
                    //if (callfrom.toLowerCase() == "application") {
                        return false;
                    //}

                });
                $(divPanel).append(divPanelHead);                

                // PANEL BODY
                var divPanelBody = $(document.createElement("div"));
                $(divPanelBody).addClass('panel-body');
                $(divPanelBody).css('padding', '3px 10px 5px');
                $(divPanel).append(divPanelBody);

                // PANEL CONTENT ROW
                var divPanelContentRow = $(document.createElement("div"));
                $(divPanelContentRow).addClass('row');
                $(divPanelBody).append(divPanelContentRow);

                if (topics.length !== 0) {
                    // TOPICS COLUMN
                    var divPanelTopicsCol = $(document.createElement("div"));
                    $(divPanelTopicsCol).addClass('col-md-3');
                    $(divPanelContentRow).append(divPanelTopicsCol);
                    // NEWS TOPICS
                    var divPanelTopic = $(document.createElement("span"));
                    $(divPanelTopic).css('margin-left', '1%').css('color', '#aaaaaa');
                    $.each(topics, function (i, tpc) {
                        var topicName = tpc.topicName;
                        var topicWght = tpc.weight;

                        if (i) $(divPanelTopic).append(', ');
                        $(divPanelTopic).append(topicName);
                        $(divPanelTopicsCol).append(divPanelTopic);
                    });
                }
                // COMPANY NAME
                var divPanelCompName = $(document.createElement("span"));
                $(divPanelCompName).addClass('col-md-3');
                $(divPanelCompName).css('font-size', '10px').css('color', '#aaaaaa');
                $.each(tickers, function (i, tckr) {
                    if (i < 5) {
                        var compName = tckr.name;
                        if (i) $(divPanelCompName).append(', ');
                        $(divPanelCompName).append(compName);
                    }
                });
                $(divPanelContentRow).append(divPanelCompName);

                // PANEL CONTENT ROW
                var divPanelContentRowThree = $(document.createElement("div"));
                $(divPanelContentRowThree).addClass('row');
                $(divPanelBody).append(divPanelContentRowThree);

                // NEWS DATE COLUMN
                var divPanelTimeCol = $(document.createElement("div"));
                $(divPanelTimeCol).addClass('col-md-3');
                $(divPanelContentRowThree).append(divPanelTimeCol);

                // NEWS DATE
                var divPanelDateTime = $(document.createElement("span"));
                $(divPanelDateTime).css('float', 'left').css('color', '#aaaaaa');
                $(divPanelDateTime).html(dateTime);
                $(divPanelTimeCol).append(divPanelDateTime);

                // NEWS SOURCE
                var divPanelSource = $(document.createElement("span"));
                $(divPanelSource).css('margin-left', '5%').css('color', '#aaaaaa');
                $(divPanelSource).html(source);
                $(divPanelTimeCol).append(divPanelSource);
                
            });
            otas.event({ initiallyloaded: true });
        }
        try {
            $.getJSON('http://localhost/otasbase_1_1/news/' + this.options.listType + '/' + this.options.listId + '/' + otasBase.maxNewsTimeStamp + '/?apikey=' + Data.apiKey, getNewsComp);
        } catch (ex) {
            console.log(ex.message);
        }
    }

    // NEWS ANALYTICS PLUGIN DEFINITION
    // ==================================

    var old = $.fn.newsAnalytics;

    $.fn.newsAnalytics = function (option) {
        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.newsAnalytics');

            if (!data) $this.data('otas.newsAnalytics', (data = new NewsAnalytics(this, option)))
            data.init();
        })
    }

    // NEWS ANALYTICS DATA API
    // =========================
    $(document).ready(function () {
        $('.newsAnalytics-load').each(function () {
            var $this = $(this);
            $this.newsAnalytics();
        });
    });

    // NEWS ANALYTICS NO CONFLICT
    // =========================

    $.fn.newsAnalytics.noConflict = function () {
        $.fn.newsAnalytics = old;
        return this;
    }


    // STOCK PEERS CLASS DEFINITION
    // =================================
    var StockPeers = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, StockPeers.DEFAULTS, options);
        this.peers = options.stock;
        this.error = options.isError;
        this.isPeerDailyFlag = options.peerDailyFlag;
    }

    StockPeers.DEFAULTS = {

    }

    StockPeers.prototype.init = function () {
        var peers = this.peers;
        var container = $(document.createElement("table")).addClass("dashboard");
        var error = this.error;

        if ($(error).prop("readyState") == "4") {
            var flagElem = '<font color=red><b>' + error.responseJSON.message + '</b></font>';
            container.append(flagElem);
        } else {
            var header = $(document.createElement("th"));
            header.text('Peers');
            container.append(header);
            var tbody = $(document.createElement("tbody"));
            container.append(header);
            var peerDailyFlag = this.isPeerDailyFlag;

            $.each(peers, function (index) {
                var peer = peers[index].otasSecurityId;

                var peerRow = $(document.createElement("tr"));
                container.append(peerRow);

                var peerName = $(document.createElement("td"));
                window.otasBase.data.v1.stock(peer)(function (peer) {
                    $(peerName).stockDescriptor({ stock: peer });
                });

                if (peerDailyFlag === true || peerDailyFlag === 'true') {
                    var peerFlagRow = $(document.createElement("tr"));
                    container.append(peerFlagRow);

                    var peerDailyFlagRow = $(document.createElement("td"));
                    window.otasBase.data.v1.stock(peer).dailyFlags({}, function (flags) {
                        $(peerDailyFlagRow).dailyFlagRow({ flags: flags })
                    });
                    peerFlagRow.append(peerDailyFlagRow);
                }

                peerRow.append(peerName);

            });
        }

        this.$element.append(container);
    }

    // STOCK PEERS PLUGIN DEFINITION
    // ==================================

    var old = $.fn.stockPeers;

    $.fn.stockPeers = function (option) {
        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.stockPeers');

            if (!data) $this.data('otas.stockPeers', (data = new StockPeers(this, option)))
            data.init();
        })
    }

    // STOCK PEERS DATA API
    // =========================
    $(document).ready(function () {
        $('.stock-peer').each(function () {
            var $this = $(this);
            var stock = $this.data("otas-stock");
            var peerDailyFlag = $this.data("otas-dailyflag");

            Data.v1.stock(stock).stockPeers(function (peers) {
                $this.stockPeers({ stock: peers, peerDailyFlag: peerDailyFlag })
            });
        });
    });

    // STOCK PEERS NO CONFLICT
    // =========================

    $.fn.stockPeers.noConflict = function () {
        $.fn.stockPeers = old;
        return this;
    }


    // STOCK STAMP PLUGIN DEFINITION
    // ==================================

    var old = $.fn.stockStamp;

    $.fn.stockStamp = function (option) {
        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.stockStamp');

            if (!data) $this.data('otas.stockStamp', (data = new Stamp(this, option)))
            data.init();
        })
    }

    // STOCK STAMP DATA API
    // =========================
    $(document).ready(function () {
        $('.stock-stamp').each(function () {
            var $this = $(this);
            var topic = $this.data("otas-topic");

            if (topic == 'custom') {
                var title = $this.data("otas-title");
                var val = $this.data("otas-value");
                var valhead = $this.data("otas-valueheader");
                var zscore = $this.data("otas-zscore");
                var color = $this.data("otas-color");

                Data.v1.customstamp({ type: topic, title: title, value: val, valueheader: valhead, zscore: zscore, color: color }, function (stamp) {
                    $this.stockStamp({ stock: stamp })
                });

            } else {
                var stock = $this.data("otas-stock");
                var header = $this.data("otas-header");

                Data.v1.stock(stock).stockStamps({ stock: stock, topic: topic, isHeader: header }, function (stamp) {
                    $this.stockStamp({ stock: stamp })
                });
            }
        });
    });


    // STOCK STAMP NO CONFLICT
    // =========================

    $.fn.stockStamp.noConflict = function () {
        $.fn.stockStamp = old;
        return this;
    }

    // STAMP CLASS DEFINITION
    // =================================
    var Stamp = function (element, options) {
        //console.log(options);
        this.$element = $(element);
        this.options = $.extend({}, Stamp.DEFAULTS, options);
        /*if (this.options.type !== 'custom') {
            this.stamp = options.stock;            
        }*/
    }

    Stamp.DEFAULTS = {
    }

    Stamp.prototype.init = function () {
        var container = $(document.createElement("div")), stampDiv;
        var jsonSerialized;

        var stampPostCall = function (stampObject) {
            jsonSerialized = JSON.stringify(stampObject);
            var dfr = $.Deferred();
            // ajax post call to get custom stamp
            $.when($.ajax({
                url: "http://localhost/Base.CustomStamp/custom/",
                type: 'post',
                contentType: 'application/json; charset=utf-8',
                dataType: 'xml',
                timeout: 300000,
                async: false,
                data: jsonSerialized,
                success: function (data) {
                    dfr.resolve(data);
                },
                error: function (e) {
                    dfr.resolve(e);
                }
            })).done(function (data) {
                if (data != null) {
                    var importedSVGRootElement = document.importNode(data.documentElement, true);
                    //$(importedSVGRootElement).removeAttr('style');
                    container.append(importedSVGRootElement);
                }
            });
        }

        // embed svg document
        if (this.options.type == 'Performance') {

            var perfStampObject = {
                type: this.options.type,
                title: this.options.title,
                value: this.options.value,
                valueTitle: this.options.valueTitle,
                border: this.options.border,
                series: this.options.series
            };
            stampPostCall(perfStampObject);
        } else if (this.options.type == 'Short') {

            var shortStampObject = {
                type: this.options.type,
                title: this.options.title,
                value: this.options.value,
                valueTitle: this.options.valueTitle,
                border: this.options.border
            };
            stampPostCall(shortStampObject);
        } else if (this.options.type == 'BoxWhisker') {

            var boxStampObject = {
                type: this.options.type,
                title: this.options.title,
                value: this.options.value,
                valueTitle: this.options.valueTitle,
                border: this.options.border,
                color: this.options.color,
                zScore: this.options.zScore
            };
            stampPostCall(boxStampObject);
        } else {
            stampDiv = $(document.createElement("embed")).attr("src", this.options.stock + '?apikey=' + Data.apiKey).attr("type", "image/svg+xml");
            container.append(stampDiv);
        }

        this.$element.append(container);
    }

    // LIST STAMP CLASS DEFINITION
    // =================================
    var ListStamp = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, Stamp.DEFAULTS, options);
        this.stamp = options.list;
    }

    ListStamp.DEFAULTS = {
    }

    ListStamp.prototype.init = function () {
        var container = $(document.createElement("div"));
        // embed svg document
        var stampDiv = $(document.createElement("img")).attr("src", this.stamp + '?apikey=' + Data.apiKey);//.attr("type", "image/svg+xml");
        container.append(stampDiv);
        this.$element.append(container);
    }

    // LIST STAMP PLUGIN DEFINITION
    // ==================================

    var old = $.fn.listStamp;

    $.fn.listStamp = function (option) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('otas.listStamp');

            if (!data) $this.data('otas.listStamp', (data = new ListStamp(this, option)))
            data.init();
        })
    }

    // LIST STAMP DATA API
    // =========================
    $(document).ready(function () {
        $('.list-stamp').each(function () {
            var $this = $(this);
            var topic = $this.data("otas-list-topic");
            var listId = $this.data("otas-list-id");
            var listType = $this.data("otas-list-type");
            var header = $this.data("otas-header");

            Data.v1.lists().listStamp({ type: listType, id: listId, topic: topic, isHeader: true }, function (stamp) {
                $this.listStamp({ list: stamp })
            });
        });
    });


    // LIST STAMP NO CONFLICT
    // =========================

    $.fn.listStamp.noConflict = function () {
        $.fn.listStamp = old;
        return this;
    }

    // LIST STAMP ROW CLASS DEFINITION
    // =================================
    var ListStampRow = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, ListStampRow.DEFAULTS, options);
        this.type = options.type;
        this.id = options.id;
        this.header = options.isHeader;
    }

    // constants
    ListStampRow.DEFAULTS = {
        stampOrder: [
                Enums.stampType.PERFORMANCE,
                Enums.stampType.SIGNALS,
                Enums.stampType.EPSMOMENTUM,
                Enums.stampType.DIRECTORDEALINGS,
                Enums.stampType.VALUATION,
                Enums.stampType.VOLATILITY,
                Enums.stampType.SHORTINTEREST,
                Enums.stampType.CDS,
                Enums.stampType.DIVERGENCE,
                Enums.stampType.EVENTS,
                Enums.stampType.DIVIDEND
        ]
    }

    ListStampRow.prototype.init = function () {
        var container = $(document.createElement("div"));
        container.addClass('list-stamp-svg-cont');

        var looper = $.Deferred().resolve();

        var topic = new Array();
        for (var key in this.options.stampOrder) {
            topic.push(this.options.stampOrder[key]);
        }
        topic.pop(topic.length - 1);

        var type = this.type;
        var id = this.id;
        var header = this.header;
        var elem = this.$element;

        $.each(topic, function (i, val) {
            $.when(Data.v1.lists().listStamp({ type: type, id: id, topic: val, isHeader: true })).done(function (stamp) {
                // embed svg document
                var stampDiv = $(document.createElement("img")).attr("src", stamp + '?apikey=' + Data.apiKey);
                $(stampDiv).addClass('svgDiv');
                container.append(stampDiv);
                elem.append(container);
            });
        });
    }

    // LIST STAMP ROW PLUGIN DEFINITION
    // ==================================

    var old = $.fn.listStampRow;

    $.fn.listStampRow = function (option) {
        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.listStampRow');

            if (!data) $this.data('otas.listStampRow', (data = new ListStampRow(this, option)))
            data.init();
        })
    }

    // LIST STAMP ROW DATA API
    // =========================
    $(document).ready(function () {
        $('.list-stamp-row').each(function () {
            var $this = $(this);
            var listId = $this.data("otas-list-id");
            var listType = $this.data("otas-list-type");
            var header = $this.data("otas-header");

            Data.v1.lists({ type: listType })(function (list) {
                $this.listStampRow({ type: listType, id: listId, isHeader: header });
            });
        });
    });

    // LIST STAMP ROW NO CONFLICT
    // =========================

    $.fn.listStampRow.noConflict = function () {
        $.fn.listStampRow = old;
        return this;
    }

    // STAMP ROW CLASS DEFINITION
    // =================================
    var StampRow = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, StampRow.DEFAULTS, options);
        this.stock = options.stock;
        this.header = options.isHeader;
    }

    // constants
    StampRow.DEFAULTS = {
        stampOrder: [
                Enums.stampType.PERFORMANCE,
                Enums.stampType.SIGNALS,
                Enums.stampType.VOLUME,
                Enums.stampType.EPSMOMENTUM,
                Enums.stampType.DIRECTORDEALINGS,
                Enums.stampType.VALUATION,
                Enums.stampType.VOLATILITY,
                Enums.stampType.SHORTINTEREST,
                Enums.stampType.CDS,
                Enums.stampType.DIVERGENCE,
                Enums.stampType.EVENTS,
                Enums.stampType.DIVIDEND
        ]
    }

    StampRow.prototype.init = function () {
        var container = $(document.createElement("div"));
        container.addClass('stock-stamp-svg-cont');

        var looper = $.Deferred().resolve();

        var topic = new Array();
        for (var key in this.options.stampOrder) {
            topic.push(this.options.stampOrder[key]);
        }
        topic.pop(topic.length - 1);

        var stock = this.stock;
        var header = this.header;
        var elem = this.$element;

        var appendStamp = function (stamp) {
            // embed svg document
            var stampDiv = $(document.createElement("img")).attr("src", stamp + '?apikey=' + Data.apiKey);
            $(stampDiv).addClass('svgDiv');
            container.append(stampDiv);
            elem.append(container);
        }

        $.each(topic, function (i, val) {
            $.when(Data.v1.stock(stock).stockStamps({ stock: stock, topic: val, isHeader: header })).done(function (stamp) { appendStamp(stamp); });
        });
    }

    // STOCK STAMP ROW PLUGIN DEFINITION
    // ==================================

    var old = $.fn.stockStampRow;

    $.fn.stockStampRow = function (option) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('otas.stockStampRow');

            if (!data) $this.data('otas.stockStampRow', (data = new StampRow(this, option)))
            data.init();
        })
    }

    // STOCK STAMP ROW DATA API
    // =========================
    $(document).ready(function () {
        $('.stock-stamp-row').each(function () {
            var $this = $(this);
            var stockId = $this.data("otas-stock");
            var header = $this.data("otas-header");

            Data.v1.stock(stockId)(function (stock) {
                $this.stockStampRow({ stock: stockId, isHeader: header });
            });
        });
    });

    // STOCK STAMP ROW NO CONFLICT
    // =========================

    $.fn.stockStampRow.noConflict = function () {
        $.fn.stockStampRow = old;
        return this;
    }

    // LIST CLASS DEFINITION
    // =================================
    var List = function (element, options) {
        this.$element = $(element);
        this.options = $.extend({}, StampRow.DEFAULTS, options);
        this.list = options.list;
    }

    List.prototype.init = function () {

        var container = $(document.createElement("table")).addClass("dashboard");
        var tbody = $(document.createElement("tbody"));
        container.append(tbody);

        var hRow = $(document.createElement("tr"));

        var hCellId = $(document.createElement("td"));
        hCellId.text('ID');
        hRow.append(hCellId);

        var hCellPublic = $(document.createElement("td"));
        hCellPublic.text('Public?');
        hRow.append(hCellPublic);

        var hCellName = $(document.createElement("td"));
        hCellName.text('Name');
        hRow.append(hCellName);

        var hCellOwnerName = $(document.createElement("td"));
        hCellOwnerName.text('Owner');
        hRow.append(hCellOwnerName);

        var hCellType = $(document.createElement("td"));
        hCellType.text('Type');
        hRow.append(hCellType);

        container.append(hRow);

        var list = this.list;

        $.each(list, function (indx) {
            var securityListId = list[indx].securityListId;
            var securityListIsPublic = list[indx].securityListIsPublic;
            var securityListName = list[indx].securityListName;
            var securityListOwnerName = list[indx].securityListOwnerName;
            var securityListType = list[indx].securityListType;

            var listTr = $(document.createElement("tr"));

            var idTd = $(document.createElement("td"));
            idTd.text(securityListId);
            listTr.append(idTd);

            var isPublicTd = $(document.createElement("td"));
            isPublicTd.text(securityListIsPublic ? "Yes" : "No");
            listTr.append(isPublicTd);

            var nameTd = $(document.createElement("td"));
            nameTd.text(securityListName);
            listTr.append(nameTd);

            var ownerNameTd = $(document.createElement("td"));
            ownerNameTd.text(securityListOwnerName);
            listTr.append(ownerNameTd);

            var listTypeTd = $(document.createElement("td"));
            listTypeTd.text(securityListType);
            listTr.append(listTypeTd);

            container.append(listTr);
        })

        this.$element.append(container);
    }

    // LIST PLUGIN DEFINITION
    // ==================================

    var old = $.fn.list;

    $.fn.list = function (option) {
        return this.each(function () {
            var $this = $(this);

            var data = $this.data('otas.list');

            if (!data) $this.data('otas.list', (data = new List(this, option)))
            data.init();
        })
    }

    // LIST DATA API
    // =========================
    $(document).ready(function () {
        $('.list').each(function () {
            var $this = $(this);
            var type = $this.data("type");

            Data.v1.lists({ type: type })(function (list) {
                $this.list({ list: list });
            });
        });
    });

    // LIST NO CONFLICT
    // =========================

    $.fn.list.noConflict = function () {
        $.fn.list = old;
        return this;
    }

    window.otasBase = {
        dailyFlag: DailyFlag,
        enums: Enums,
        technicals: Technicals,
        baseUrl: "https://api-dev.otastech.com/v1",
        DailySeries: DailySeries,
        data: Data,
        maxNewsTimeStamp: 0
    };

}(window.jQuery);
