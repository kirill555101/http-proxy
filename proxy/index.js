const fs = require('fs');
const http = require('http');
const url = require('url');
const tls = require('tls');

class ProxyServer {
    constructor() {
        this.key = fs.readFileSync('certs/cert.key');
        this.cert = fs.readFileSync('certs/ca.crt');

        this.serverInstance = http.createServer();
    }

    start() {
        this.serverInstance.on('connect', this.handleConnect.bind(this));
        this.serverInstance.on('request', this.handleRequest.bind(this));

        this.serverInstance.listen({ port: 8080 }, () => console.log('Server listening on 8080'));
    }

    handleConnect(clientRequest, proxyResponse) {
        const { port, hostname } = url.parse(`//${clientRequest.url}`, false, true);
        if (!port || !hostname) {
            clientSocket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            clientSocket.destroy();
            return;
        }

        console.log(`Establishing an HTTPS connection with ${hostname}...`);
        const options = {
            rejectUnauthorized: false,
            host: hostname,
            port
        };

        const request = tls.connect(options, () => {
            proxyResponse.write('HTTP/1.1 200 Connection Established\r\n\r\n');

            const tlsOptions = {
                key: this.key,
                cert: this.cert,
                isServer: true
            };
            const tslProxyResponse = new tls.TLSSocket(proxyResponse, tlsOptions);

            tslProxyResponse.on('data', (chunk) => request.write(chunk.toString()));
            request.on('data', (chunk) => tslProxyResponse.write(chunk.toString()));
        });

        request.on('error', () => proxyResponse.end('HTTP/1.1 500 Internal Server Error\r\n\r\n'));
    }

    handleRequest(clientRequest, proxyResponse) {
        const { port, hostname } = url.parse(clientRequest.url, false, true);
        console.log(`Establishing an HTTP connection with ${hostname}...`);

        delete clientRequest.headers['proxy-connection']
        const options = {
            method: clientRequest.method,
            path: clientRequest.url.replace(`http://${hostname}`, ''),
            hostname: clientRequest.headers.host,
            port,
            headers: clientRequest.headers
        };

        const getResponse = (body) => {
            const request = http.request(options);
            request.end(body);

            request.on('response', (serverResponse) => {
                const { statusCode, statusMessage, headers } = serverResponse;
                proxyResponse.writeHead(statusCode, statusMessage, headers);
                serverResponse.on('data', (chunk) => proxyResponse.end(chunk));
            });
            request.on('error', (error) => console.log(error));
        }

        if (!options.headers['content-length']) {
            getResponse('');
            return;
        }

        clientRequest.on('data', (body) => getResponse(body));
    }
}

const proxyServer = new ProxyServer();
proxyServer.start();
