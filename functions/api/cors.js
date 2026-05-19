export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // Get target URL from query parameter
  let targetUrl = url.searchParams.get("url");

  if (!targetUrl) {
    return new Response("CORS Proxy is Active. Usage: /api/cors?url=[Target URL]", {
      status: 200,
      headers: { "Content-Type": "text/plain" }
    });
  }

  // Handle preflight OPTIONS request from the browser
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") || "*",
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  try {
    // Re-create the request to the target platform API
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.blob() : null,
      redirect: "follow"
    });

    // Fetch the target URL from the server side (bypassing browser CORS)
    const response = await fetch(newRequest);

    // Copy original response headers and append permissive CORS headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    newHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    newHeaders.set("Access-Control-Allow-Headers", "*");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders
    });
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Content-Type": "text/plain"
      }
    });
  }
}
