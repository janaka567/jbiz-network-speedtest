const serverEndpoint = "/backend";

const ui = {
    ping: document.getElementById('pingValue'),
    dl: document.getElementById('dlValue'),
    ul: document.getElementById('ulValue'),
    goBtn: document.getElementById('goBtn'),
    gaugeProgress: document.getElementById('gaugeProgress'),
    liveSpeedDisplay: document.getElementById('liveSpeedText'),
    liveSpeedValue: document.getElementById('liveSpeedValue'),
    testAgainBtn: document.getElementById('testAgainBtn'),
    connType: document.getElementById('connType')
};

const maxDashOffset = 691; 

function resetTest() {
    ui.ping.innerText = "--";
    ui.dl.innerText = "--";
    ui.ul.innerText = "--";
    ui.goBtn.style.display = "block";
    ui.liveSpeedDisplay.style.display = "none";
    ui.testAgainBtn.style.display = "none";
    updateGauge(0, '#1bd0bd');
}

function updateGauge(speedMbps, color) {
    ui.gaugeProgress.style.stroke = color;
    let cappedSpeed = Math.min(speedMbps, 100); 
    let fillPercentage = cappedSpeed / 100;
    let offset = maxDashOffset - (maxDashOffset * fillPercentage);
    ui.gaugeProgress.style.strokeDashoffset = offset;
    ui.liveSpeedValue.innerText = parseFloat(speedMbps).toFixed(1);
}

async function startTest() {
    ui.goBtn.style.display = "none";
    ui.liveSpeedDisplay.style.display = "block";
    ui.testAgainBtn.style.display = "none";
    
    const isMulti = ui.connType.value === 'multi';

    try {
        await measurePing();
        
        ui.gaugeProgress.style.stroke = "#1bd0bd"; 
        await measureDownloadLive(isMulti);

        ui.gaugeProgress.style.stroke = "#9b51e0"; 
        await measureUploadLive();

    } catch (error) {
        console.error("Test failed", error);
    }

    updateGauge(0, '#1bd0bd');
    ui.liveSpeedValue.innerText = "DONE";
    ui.testAgainBtn.style.display = "block";
}

async function measurePing() {
    const start = performance.now();
    await fetch(serverEndpoint + "?ping=" + Math.random(), { method: 'HEAD' });
    const end = performance.now();
    ui.ping.innerText = (end - start).toFixed(0);
}

function measureDownloadLive(isMulti) {
    return new Promise((resolve) => {
        const threads = isMulti ? 4 : 1; 
        const dlSize = 25 * 1024 * 1024; 
        let loadedPerThread = new Array(threads).fill(0);
        let isDone = false;
        const xhrs = [];
        const start = performance.now();

        const timeoutId = setTimeout(() => {
            isDone = true;
            xhrs.forEach(xhr => xhr.abort());
            clearInterval(uiInterval);
            resolve();
        }, 12000); 

        const uiInterval = setInterval(() => {
            if (isDone) return;
            const now = performance.now();
            const durationInSeconds = (now - start) / 1000;
            const totalLoaded = loadedPerThread.reduce((a, b) => a + b, 0);

            if (durationInSeconds > 0.5) { 
                const speedMbps = ((totalLoaded * 8) / durationInSeconds / (1024 * 1024)).toFixed(2);
                ui.dl.innerText = speedMbps;
                updateGauge(speedMbps, '#1bd0bd'); 
            }
        }, 150);

        let completedThreads = 0;
        for (let i = 0; i < threads; i++) {
            const xhr = new XMLHttpRequest();
            xhrs.push(xhr);
            const testUrl = "https://speed.cloudflare.com/__down?bytes=" + dlSize + "&thread=" + i + "&cache=" + Math.random();
            
            xhr.open('GET', testUrl, true);
            xhr.onprogress = function(event) { loadedPerThread[i] = event.loaded; };
            xhr.onload = function() {
                completedThreads++;
                if (completedThreads === threads && !isDone) {
                    isDone = true;
                    clearTimeout(timeoutId);
                    clearInterval(uiInterval);
                    resolve();
                }
            };
            xhr.send();
        }
    });
}

function measureUploadLive() {
    return new Promise((resolve) => {
        const ulDataSize = 2 * 1024 * 1024; 
        const data = new Uint8Array(ulDataSize);
        for(let i=0; i<data.length; i++) data[i] = Math.random() * 255;
        const blob = new Blob([data]);
        
        const xhr = new XMLHttpRequest();
        const start = performance.now();
        
        const timeoutId = setTimeout(() => {
            xhr.abort();
            resolve();
        }, 12000);
        
        xhr.open('POST', serverEndpoint, true);
        
        xhr.upload.onprogress = function(event) {
            const now = performance.now();
            const durationInSeconds = (now - start) / 1000;
            if (durationInSeconds > 0.2) {
                const speedMbps = ((event.loaded * 8) / durationInSeconds / (1024 * 1024)).toFixed(2);
                ui.ul.innerText = speedMbps;
                updateGauge(speedMbps, '#9b51e0'); 
            }
        };
        
        xhr.onload = function() { clearTimeout(timeoutId); resolve(); };
        xhr.onerror = function() { clearTimeout(timeoutId); resolve(); };
        xhr.send(blob);
    });
}