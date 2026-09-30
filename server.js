const http = require("http");

const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.statusCode = 410;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify({
    status: "offline",
    message: "OC DealCheck public validator is no longer available."
  }));
}).listen(port, "0.0.0.0", () => {
  console.log(`OC DealCheck inert shell listening on port ${port}`);
});
