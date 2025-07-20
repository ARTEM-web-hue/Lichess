// potion-random.js
const http = require("http");

http.createServer((req, res) => {
  const min = 0;
  const max = 97; // длина списка зелий
  const random = Math.floor(Math.random() * (max - min + 1)) + min;
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end(random.toString());
}).listen(10000, () => {
  console.log("Сервис 2: слушаю порт 10000");
});
