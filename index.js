export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const VIDEO_ID = "08aTMz0Yxeg"; // নিশ্চিত করুন এই আইডিটি বর্তমানে লাইভ আছে
    const baseHost = url.host;

    if (url.pathname === "/playlist.m3u8") {
      return await getStream(VIDEO_ID, baseHost);
    }

    if (url.pathname.startsWith("/proxy/")) {
      const targetUrl = decodeURIComponent(url.pathname.replace("/proxy/", ""));
      return fetch(targetUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Referer": "https://www.youtube.com/"
        }
      });
    }

    return new Response("YT Proxy Running... Access: /playlist.m3u8");
  }
};

async function getStream(videoId, baseHost) {
  // ইউটিউব ওয়েব প্লেয়ার এপিআই
  const ytApiUrl = `https://www.youtube.com/youtubei/v1/player?prettyPrint=false`;
  
  const payload = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20240501.01.00",
        originalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        platform: "DESKTOP"
      }
    },
    videoId: videoId
  };

  try {
    const response = await fetch(ytApiUrl, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
      }
    });

    const data = await response.json();

    // ১. প্রথমেই চেক করি hlsManifestUrl আছে কি না
    let m3u8Link = data.streamingData?.hlsManifestUrl;

    // ২. যদি সরাসরি না পাওয়া যায়, তবে রেজোলিউশন ভিত্তিক ফরমেট চেক করবে
    if (!m3u8Link && data.streamingData?.formats) {
        const liveStream = data.streamingData.formats.find(f => f.mimeType.includes('application/x-mpegURL') || f.isLive);
        if (liveStream) m3u8Link = liveStream.url;
    }

    if (m3u8Link) {
      const manifestRes = await fetch(m3u8Link);
      let manifestText = await manifestRes.text();

      // সকল .googlevideo.com লিংক রিরাইট করা (Smooth Playback এর জন্য)
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

    // যদি এরর আসে তবে কেন আসছে সেটা দেখাবে
    const reason = data.playabilityStatus?.reason || "Unknown reason (Video might be offline)";
    return new Response(`Error: ${reason}`, { status: 403 });

  } catch (e) {
    return new Response("Internal Error: " + e.message, { status: 500 });
  }
}
