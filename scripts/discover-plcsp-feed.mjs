// discover-plcsp-feed.mjs
import axios from "axios";
import * as cheerio from "cheerio";
import RSSParser from "rss-parser";

const PROFILE_URL = "https://contrataciondelestado.es/wps/portal/!/ut/p/b0/04_Sj9CPykssy0xPLMnMz0vMAfIjU1JTC3Iy87KtClKL0jJznPPzSooSSxLzSlL1w_Wj9KMyU5wK9CPLDCLKSt2Kizy1PW31C3JzHQEV8m1v/";

async function discoverAtom(url) {
  const { data: html } = await axios.get(url, { timeout: 60000 });
  const $ = cheerio.load(html);
  let candidates = [];

  $("link").each((_, el) => {
    const rel = ($(el).attr("rel") || "").toLowerCase();
    const type = ($(el).attr("type") || "").toLowerCase();
    const href = $(el).attr("href");
    if (rel.includes("alternate") && href && (type.includes("atom") || type.includes("rss"))) {
      candidates.push(href);
    }
  });

  return candidates[0] || null;
}

async function main() {
  const feedUrl = await discoverAtom(PROFILE_URL);
  if (!feedUrl) {
    console.error("[!] No se encontró feed <link rel='alternate' ... atom|rss> en el perfil.");
    process.exit(2);
  }
  console.log("[✓] Feed encontrado:", feedUrl);

  // Leer primeras entradas
  const parser = new RSSParser();
  const feed = await parser.parseURL(feedUrl);
  console.log(`Título: ${feed.title}`);
  feed.items.slice(0, 10).forEach((it) => {
    console.log("-", it.title);
    console.log("  ", it.link);
    if (it.pubDate) console.log("   Publicado:", it.pubDate);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
