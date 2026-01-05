
async function testLink() {
    const input = "https://maps.app.goo.gl/EVQ9oBGiuagyzqTx7";
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(input)}`;

    try {
        const res = await fetch(proxyUrl);
        const text = await res.text();
        console.log("RESPONSE_TEXT:", text.substring(0, 500));
    } catch (e) {
        console.error("Error:", e);
    }
}

testLink();
