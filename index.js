const express = require('express');

const app = express();
const https = require('https');
const http = require('http');

const targetUrl = process.env.TARGET_URL || 'https://www.google.com'; // Run localtunnel like `lt -s rscraper -p 8080 --print-requests`; then visit https://yourname.loca.lt/todos/1 .

const proxyServerPort = process.env.PROXY_SERVER_PORT || 8080;

app.use('/', function (clientRequest, clientResponse) {
  const parsedHost = targetUrl.split('/').splice(2).splice(0, 1).join('/');
  let parsedPort;
  let parsedSSL;
  if (targetUrl.startsWith('https://')) {
    parsedPort = 443;
    parsedSSL = https;
  } else if (targetUrl.startsWith('http://')) {
    parsedPort = 80;
    parsedSSL = http;
  }
  const options = {
    hostname: parsedHost,
    port: parsedPort,
    path: clientRequest.url,
    method: clientRequest.method,
    headers: {
      'User-Agent': clientRequest.headers['user-agent'],
    },
  };

  const serverRequest = parsedSSL.request(options, function (serverResponse) {
    let body = '';
    if (String(serverResponse.headers['content-type']).indexOf('text/html') !== -1) {
      serverResponse.on('data', function (chunk) {
        body += chunk;
      });

      serverResponse.on('end', function () {
        // Make changes to HTML files when they're done being read.
         body = body.replace(`class="dorik-branding"`, `style="display:none;"`);
         body = body.replace(`class='dorik-branding'`, `style="display:none;"`);

         serverResponse.headers['cache-control'] = 'max-age=604800';
         delete serverResponse.headers['cf-cache-status'];
         delete serverResponse.headers['cf-ray'];
         delete serverResponse.headers['nel'];
         delete serverResponse.headers['report-to'];
         delete serverResponse.headers['server'];
         delete serverResponse.headers['strict-transport-security'];

        clientResponse.writeHead(serverResponse.statusCode, serverResponse.headers);
        clientResponse.end(body);
      });
    } else {
      serverResponse.pipe(clientResponse, {
        end: true,
      });
      clientResponse.contentType(serverResponse.headers['content-type']);
    }
  });

  serverRequest.end();
});

app.listen(proxyServerPort);
console.log(`Proxy server listening on port ${proxyServerPort}`);
