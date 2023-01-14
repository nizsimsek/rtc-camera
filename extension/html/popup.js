const domain = 'back.denizaksu.dev';
const channelId = chrome.runtime.id;

const drawQRCode = () => {
    const div = document.getElementById('qr');
    const url = `https://${domain}/${channelId}`;
    const qr = QRCode.generateSVG(url, { ecclevel: 'M', fillcolor: '#F2F2F2', textcolor: '#130F40', margin: 4, modulesize: 8 });
    div.appendChild(qr);
};

drawQRCode();