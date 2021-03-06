"use strict";

const queryString = require('querystring')
const url = require('url')
const rp = require('request-promise')
const cheerio = require('cheerio')

const translateGoogle = require('./config').translateGoogle

const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36'

const getPage = (targetUrl, targetLang)=>{
    console.log(targetUrl,"---------- translate begin ----------")
    let parameter ={
        sl: 'en',
        tl: targetLang,
        hl: 'zh-CN',
        ie: 'UTF-8',
        u: targetUrl
    }
    let firstUrl = translateGoogle + queryString.stringify(parameter)

    //console.log(firstUrl,"---translate begin ----")
    return rp(firstUrl).then(function (htmlString) {
        let $ = cheerio.load(htmlString)
        let translateUrl = $('body iframe[name="c"]').attr('src')
        return rp(translateUrl)
    }).then(function(htmlString){
        let $ = cheerio.load(htmlString)
        let redirectUrl = $('head meta[http-equiv="refresh"]').attr('content')
        redirectUrl = redirectUrl.match(/(URL)\=(https\:\/\/.*)/)[2]
        let options = {
            uri: redirectUrl,
            encoding: 'UTF-8',
            headers: {
                'User-Agent': userAgent
            }
        }
        return Promise.all([rp(targetUrl), rp(options)])
        //return rp(options)
    }).then(function(htmlStrings){
        console.log("---------- translate end ----------")
        return removeTranslateMark(htmlStrings)
    })

}

// 移除翻译添加的元素
const removeTranslateMark = (parm) => {
    let originHtml,translateHtml;
    if(parm.length>1){
        originHtml=parm[0]
        translateHtml=parm[1]
    }
    let $ = cheerio.load(translateHtml)
    let headLength,$head,$body;
    headLength = cheerio.load(originHtml)('head').children().length

    $head = $('head').children()
    $head.filter((index,item)=> {
        return index<($head.length-headLength) && item.tagName!=="base" && item.tagName!=="BASE"
    }).remove()
    $('iframe').first().remove()
    $('body').first().nextAll().remove()

    let $notranslate = $('body span.notranslate')

    $notranslate.removeAttr('onmouseover').removeAttr("onmouseout").removeClass("notranslate")
    $notranslate.children('span.google-src-text').remove();
    let resultHTML = $.html();
    console.info(resultHTML);

    $notranslate.each(function(i, e){
        resultHTML = resultHTML.replace($.html($(this)), $(this).html());
    });

    return resultHTML;
}

module.exports = getPage
