//index.js
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // আপনার ইউটিউব লাইভ ভিডিও আইডি এখানে দিন
    const VIDEO_ID = "08aTMz0Yxeg"; 
    const baseHost = url.host;

    if (url.pathname === "/playlist.m3u8") {
      return await handleManifest(VIDEO_ID, baseHost);
    }

    if (url.pathname.startsWith("/proxy/")) {
      const targetUrl = decodeURIComponent(url.pathname.replace("/proxy/", ""));
      return fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.youtube.com/"
        }
      });
    }

    return new Response("Worker is running! Access stream at /playlist.m3u8", {
      headers: { "content-type": "text/plain" }
    });
  }
};

async function handleManifest(videoId, baseHost) {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  
  try {
    const response = await fetch(ytUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
      }
    });

    const html = await response.text();
    const hlsMatch = html.match(/"hlsManifestUrl":"(.*?)"/);
    
    if (hlsMatch && hlsMatch[1]) {
      const m3u8Link = hlsMatch[1].replace(/\\/g, "");
      const manifestRes = await fetch(m3u8Link);
      let manifestText = await manifestRes.text();

      // সকল .googlevideo.com লিংক রিরাইট করে নিজের প্রক্সির আন্ডারে নিয়ে আসা
      const proxyManifest = manifestText.replace(/https:\/\/(.*?)\.googlevideo\.com/g, (match) => {
        return `https://${baseHost}/proxy/${encodeURIComponent(match)}`;
      });

      return new Response(proxyManifest, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });
    }

    return new Response("Live stream not found or offline.", { status: 404 });
  } catch (e) {
    return new Response("Error: " + e.message, { status: 500 });
  }
}
