const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

/*
puppeteer를 통해 동적으로 페이지를 클릭, 뒤로가기 내가 수집할 카테고리들의 Iteration을 위해 해당 DOM의 Size를 구했습니다.
cheerio는 text로 쓰여진 부분을 수집하기위해 사용했습니다.
 */
(async () => {
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
  // 수집할 기사 홈페이지 : 서울경제
  await page.goto('https://www.sedaily.com/');
  const category = await page.$$("ul[class='dep1'] > li");
  /*
   서울경제 카테고리중 부동산만 수집
   */
  await page.click("#Menu1_GB");
  await page.waitForSelector("#Menu2_GB01");
  await page.click("#Menu2_GB01");
  await page.waitForSelector(".sub_news_list.type");
  const articles = await page.$$(".sub_news_list.type > li");
  const pages = await page.$$(".page > ul > li");
  const subCategory = await page.$$("#Menu1_GB > ul > li");
  for(let k = 1 ; k <= subCategory.length ; k++) {
    const $html = await page.content();
    const $$$ = cheerio.load($html);
    const subCategoryName = $$$(`li[id='Menu2_GB0${k}'] a`);
    await page.click(`li[id='Menu2_GB0${k}'] a`);
    console.log(`======== 현재 하위 카테고리 @@ ${subCategoryName.text()} @@ ========`);
  for (let j = 2; j <= pages.length - 1; j++) {
    console.log(`======== 현재 ${j - 1} 페이지 ========`);
    for (let i = 1; i <= articles.length; i++) {
      console.log(`======== 위에서부터 ${i}번째 기사 ========`);
      /*
       - 에러가 발생할때  -
       컴퓨터와 네트워크상황이 다 다르기에 puppeteer가 뒤로가기를 실행하고 밑에있는 DOM들을
       가져올때 no frame given id 라고 오류가 나옵니다. 페이지가 랜더링될떄 selector로 지정한 dom이 없어서 에러가 발생하는데,
       await page.waitForTimeout(4000)로 페이지 로딩에 대해 기다리는 시간(param)값을 늘리면 해당 오류를 해결할수있습니다.
       */
      await page.waitForTimeout(4500);
      await page.waitForSelector(".sub_left");
      await page.click(`ul[class='sub_news_list type'] li:nth-child(${i}) > a`);
      await page.waitForSelector('.art_tit');
      const html = await page.content();
      const $$ = cheerio.load(html);
      const $articleHead = $$("#v-left-scroll-in");
      const $articleBody = $$(".article_view");

      /*
       replace(/(\s\s)|(\n)|(\t)/gi => 해당 부분은 Text를 가져올떄 빈칸을 없애기위해 정규표현식을 사용했습니다.
       입력시간은 필요한 부분 만큼 slice해서 RDB에 집어넣으면됩니다.
       */
      await $articleHead.each((idx, node) => {
        console.log("제목 = " + $$(node).find(".art_tit").text());
        console.log("입력시간 = " + $$(node).find(".url_txt").text().replace(/(\s\s)|(\n)|(\t)/gi, ""));
        console.log("기자이름 = " + $$(node).find("div[class='article_head'] span:nth-child(3)").text().replace(/(\s\s)|(\n)|(\t)/gi, ""));
      })
      await $articleBody.each((idx, node) => {
        console.log("본문 = " + $$(node).text().replace(/(\s\s)|(\n)|(\t)/gi, ""));
      })
      await page.goBack();
    }
    if(j <= 10) {
    await page.click(`div[class='page'] ul li:nth-child(${j}) > a`);
    console.log(`======== ${j}페이지 클릭!!!! ========`);
    }
  }
    await page.waitForTimeout(4000);
  }
})();
