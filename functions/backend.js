export async function onRequest(context) {
    const request = context.request;
    const headers = new Headers({
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
        "Cache-Control": "no-cache, no-store, must-revalidate"
    });

    if (request.method === 'OPTIONS') return new Response(null, { headers });
    if (request.method === 'HEAD' || request.method === 'GET') return new Response("Pong", { headers });
    if (request.method === 'POST') return new Response("Upload OK", { headers });

    return new Response("Method Not Allowed", { status: 405, headers });
}