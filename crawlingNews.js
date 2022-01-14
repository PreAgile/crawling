const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const CATEGORY = require('./commonVar');
const NEWS_HOMEPAGE = 'https://www.mk.co.kr/news/';

(async () => {
    const categoryArr = Object.keys(CATEGORY);

    const browser = await puppeteer.launch({
        headless: false,
        args: [`--window-size=1920,1080`],
        defaultViewport: {
            width: 1920,
            height: 1080
        },
        slowMo: 30,
    });
    const page = await browser.newPage();

    await Promise.all([
        page.goto(NEWS_HOMEPAGE),
        page.waitForNavigation()
    ])
    for (const categoryArrKey of categoryArr) {
        await clickTarget(page, CATEGORY[categoryArrKey]);
        await waitTillHTMLRendered(page);
        let html = await page.content();
        let $ = cheerio.load(html);
        const $mkgnbList = $(".mkgnb_list > li");
        console.log("$mkgnbList = " + $mkgnbList.length);
        const listLength = $mkgnbList.length - 4;
        const $mklnbList = $(".mklnb_list > li");
        // 큰 카테고리(경제, 기업, 사회, 국제, 부동산, 증권, 정치, IT·과학, 문화)
        for (let k = 1; k < listLength; k++) {
            let target = `//div[@class='mkgnb_wrap']//li[${k}]/descendant::a`;
            const $mkgnb = $(`div[class=\'mkgnb_wrap\'] li:nth-child(${k})`);
            console.log("선택한 카테고리  = " + $mkgnb.text());
            await clickTarget(page, target);
            await waitTillHTMLRendered(page);
            // 하위 카테고리(경제 => 경제정책, 경기지표, 무역통상, 세금, 외환·환율, 은행, 보험, 카드·캐피탈, 당좌거래
            for (let j = 2; j < $mklnbList.length; j++) {
                const categoryHtml = await page.content();
                const $$ = cheerio.load(categoryHtml);
                let target = `//div[@class='mklnb_wrap']//li[${j}]/descendant::a`;
                const $$pagingName = $$(`div[class='mklnb_wrap'] li:nth-child(${j}) a`);
                console.log("선택한 영역  = " + $$pagingName.text());
                try {
                    await clickTarget(page, target);
                    await waitTillHTMLRendered(page);
                } catch (e) {
                    console.error(e.message);
                } finally {
                    const $paging = $$(".paging > a");
                    console.log("$paging.length = " + $paging.length);
                    for (let l = 1; l < $paging.length; l++) {
                        if (l === 1) {
                            continue;
                        }
                        let target = `//a[normalize-space()='${l}']`;
                        try {
                            await clickTarget(page, target);
                            await waitTillHTMLRendered(page);
                        } catch (e) {
                            console.error(e.message);
                        }
                        let html = await page.content();
                        let $ = cheerio.load(html);
                        const $listUl = $(".list_area > dl");
                        // 선택한 영역에 대한 기사들
                        for (let i = 1; i < $listUl.length; i++) {
                            const target = `(//dt[@class=\'tit\'])[${i}]/descendant::a`;
                            try {
                                await clickTarget(page, target);
                                await waitTillHTMLRendered(page);
                                // await page.setDefaultNavigationTimeout(0)
                            } catch (e) {
                                console.log(e);
                            } finally {
                                const html = await page.content();
                                const $$ = cheerio.load(html);
                                const $articleHeader = $$("#top_header");
                                const $articleBody = $$(".art_txt");
                                $articleHeader.each((idx, node) => {
                                    console.log("top_title = " + $(node).find(".top_title").text());
                                    console.log("sub_title1_new = " + $(node).find(".sub_title1_new").text());
                                    console.log("author = " + $(node).find(".author > a").text());
                                    console.log("lasttime = " + $(node).find(".lasttime").text());
                                    console.log("$(node).find(\".lasttime\").text() = " + $(node).find(".lasttime").text().slice(-19));
                                })
                                $articleBody.each((idx, node) => {
                                    console.log("art_txt = " + $(node).replaceWith(" "));
                                    console.log("text = " + $(node).text());
                                    let text = $(node).text();
                                    console.log("typeof = " + typeof text);
                                    let result = text.replace(/(\s\s)|(\n)|(\t)/gi, "");
                                    console.log("result = " + result);
                                })
                                await page.goBack();
                                await waitTillHTMLRendered(page);

                            }
                        }

                    }
                }
            }
        }
    }
    await page.waitForTimeout(3000);
    await browser.close();
})();

const clickTarget = async (page, target) => {
    await page.waitForXPath(target);
    let s = await page.$x(target);
    s = s[0]
    await s.click();
    await page.waitForTimeout(3000);
}

const waitTillHTMLRendered = async (page, timeout = 50000) => {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;

    while (checkCounts++ <= maxChecks) {
        let html = await page.content();
        let currentHTMLSize = html.length;

        let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);

        console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);

        if (lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize)
            countStableSizeIterations++;
        else
            countStableSizeIterations = 0; //reset the counter

        if (countStableSizeIterations >= minStableSizeIterations) {
            console.log("Page rendered fully..");
            break;
        }

        lastHTMLSize = currentHTMLSize;

        await page.waitFor(checkDurationMsecs);
    }
};