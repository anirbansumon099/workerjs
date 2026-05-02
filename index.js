export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const VIDEO_ID = "08aTMz0Yxeg"; // আপনার ভিডিও আইডি
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
  // ইউটিউব প্লেয়ার এপিআই-তে রিকোয়েস্ট পাঠানো (এটি yt-dlp এর মতোই কাজ করে)
  const ytApiUrl = `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_S-Jv8u8q9q9q9q9q9q9q9q9q9q9q9`; // ডিফল্ট ইউটিউব এপিআই কি
  
  const payload = {
    context: {
      client: {
        clientName: "ANDROID", // অ্যান্ড্রয়েড ক্লায়েন্ট সাধারণত কম ব্লক হয়
        clientVersion: "19.16.35",
        androidSdkVersion: 30
      }
    },
    videoId: videoId,
    playbackContext: {
      contentPlaybackContext: {
        signatureTimestamp: Math.floor(Date.now() / 1000)
      }
    }
  };

  try {
    const response = await fetch(ytApiUrl, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" }
    });

    const data = await response.json();
    
    // streamingData থেকে hlsManifestUrl খুঁজে বের করা
    let m3u8Link = data.streamingData?.hlsManifestUrl;

    if (m3u8Link) {
      const manifestRes = await fetch(m3u8Link);
      let manifestText = await manifestRes.text();

      // সেগমেন্ট প্রক্সিং নিশ্চিত করা
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

    return new Response("Error: Could not extract HLS Link. Video might be restricted or not live.", { status: 404 });
  } catch (e) {
    return new Response("Internal Error: " + e.message, { status: 500 });
  }
}
