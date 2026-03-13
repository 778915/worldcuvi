const query = "시라유키 히나";
const YOUTUBE_API_KEY = "AIzaSyDf42RWOgc4vuqWJAW0iE3pBYJFdTeJYlY";

async function test() {
  const url = `https://www.googleapis.com/youtube/v3/search?q=${encodeURIComponent(query)}&part=snippet&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
