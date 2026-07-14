async function test() {
    const slug = 'myslug' + Date.now();
    const res = await fetch('http://localhost:3000/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://www.google.com', type: 'standard', slug: slug })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
test();
