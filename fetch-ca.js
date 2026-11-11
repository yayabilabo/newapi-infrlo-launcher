// Infrlo 运行时镜像不带 CA 根证书,Go 程序(cloudflared/xray)的 HTTPS 会直接失败
const fs = require('fs');

(async () => {
  const res = await fetch('https://curl.se/ca/cacert.pem');
  if (!res.ok) throw new Error('HTTP ' + res.status);
  fs.writeFileSync('cacert.pem', Buffer.from(await res.arrayBuffer()));
  console.log('cacert.pem saved');
})();
