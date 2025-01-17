// IP de l'access point
const serverUrl = "http://192.168.1.68:5000";

const upThroughputSpan = document.getElementById('up_throughput');
const downThroughputSpan = document.getElementById('down_throughput');
const packetLossSpan = document.getElementById('packet-loss');
const delaySpan = document.getElementById('delay');

const maxUpSpan = document.getElementById('up_max');
const minUpSpan = document.getElementById('up_min');
const maxDownSpan = document.getElementById('down_max');
const minDownSpan = document.getElementById('down_min');
const maxLossSpan = document.getElementById('loss_max');
const maxRttSpan = document.getElementById('delay_max');
const minRttSpan = document.getElementById('delay_min');

let max_up_throughput = 0;
let min_up_throughput = Infinity;
let max_down_throughput = 0;
let min_down_throughput = Infinity;
let max_packetloss = 0;
let max_delay = 0;
let min_delay = Infinity;

/*
Donat un throughput en bps, ho representa en una string amb el
format i unitats adequades 
*/
function throughput_toString(throughput) {
    if (throughput > 1e6) {
        return `${(throughput / 1e6).toFixed(2)} MB/s`;
    }
    else if (throughput > 1e3) {
        return `${(throughput / 1e3).toFixed(2)} KB/s`;
    }
    else {
        return `${throughput} B/s`;
    }
}

/*
Monitoritza velocitat de pujada.
Envia 10MB de dades i calcula el temps necessari
*/
async function testUpload() {

    // Genera 10 MB i envia
    const data = new Uint8Array(10 * 1024 * 1024); // 10 MB

    // Comptem temps que triga a enviar els 10 MB
    // const startTime = performance.now();
    const startTime = Date.now();
    try {
        const response = await fetch(`${serverUrl}/test`, {
            method: "POST",
            body: data
        });
        if (response.ok) {
            const result = await response.json();
            const endTime = result.server_time;
            // Calculat a partir del temps que hem trigat a penjar els 10MB
            const throughput = result.data_size_bytes / ((endTime - startTime) / 1000);

            upThroughputSpan.textContent = throughput_toString(throughput);
            max_up_throughput = Math.max(max_up_throughput, throughput);
            min_up_throughput = Math.min(min_up_throughput, throughput);
            maxUpSpan.textContent = throughput_toString(max_up_throughput);
            minUpSpan.textContent = throughput_toString(min_up_throughput);

            addData(uploadChart, new Date().toLocaleTimeString(), throughput);

            // Debug
            console.log(`
-----Upload Test Result-----
    Data Size: ${result.data_size_bytes} bytes<br>
    Client-Side Duration: ${(endTime - startTime) / 1000} seconds
    Client-Side Throughput: ${throughput_toString(throughput)} Bps
                    `)
        } else {
            upThroughputSpan.textContent = "NaN";
        }
    } catch (error) {
        upThroughputSpan.textContent = "NaN";
        console.error(error);
    }
}

/*
Monitoritza velocitat de baixada.
Fa consulta i a la resposta hi ha 10MB de dades i calcula el temps necessari
*/
async function testDownload() {
    // Comptem temps que tardem a obtenir 10 MB de dades de servidor
    try {
        const response = await fetch(`${serverUrl}/test`);
        const data = await response.arrayBuffer(); // Fetch and read the data
        const endTime = Date.now() 

        const dataSize = response.headers.get("X-Data-Size");
        const time = parseInt(response.headers.get("X-Time"), 10);
        // Calculem temps que CLIENT ha trigat a obtenir les dades (descarrega) i rate de descarrega
        const client_throughput = dataSize / ((endTime - time) / 1000);

        downThroughputSpan.textContent = throughput_toString(client_throughput);
        max_down_throughput = Math.max(max_down_throughput, client_throughput);
        min_down_throughput = Math.min(min_down_throughput, client_throughput);
        maxDownSpan.textContent = throughput_toString(max_down_throughput);
        minDownSpan.textContent = throughput_toString(min_down_throughput);
        
        addData(downloadChart, new Date().toLocaleTimeString(), client_throughput);

        console.log(`
-----Download Test Result-----
    Data Size: ${dataSize} bytes<br>
    Client-Side Duration: ${(endTime - time) / 1000} seconds
    Client-Side throughput: ${throughput_toString(dataSize / ((endTime - time) / 1000))} Bps
                `);
    } catch (error) {
        downThroughputSpan.textContent = "NaN";
        console.error(error);
    }
}

// Variables per monitoratge de delay i packet loss
let sequenceNumber = 0; // nº paquet actual
let lostPackets = 0; // nº paquets perduts
const sentPackets = new Set(); // registre de paquets enviats i no ACKs
let rtt_values = []; // valors de rtt obtinguts per fer mitjana

/*
Calcula la mitjana del round time trip a partir de la llista `rtt_Values`
*/
function calculateAverageRTT() {
    if (rtt_values.length === 0) return 0;
    const sum = rtt_values.reduce((a, b) => a + b, 0);
    return (sum / rtt_values.length).toFixed(2); // Return average RTT
}

/*
Envia consultes cada 250ms. Cada consulta conté un número de seqüència i un timestamp.
El servidor respon a un número de seqüència concret, amb el timestamp que ha enviat
el client i el timestamp en que ell rep la consulta
*/
async function testLatencyLoss() {
    sequenceNumber = 0;
    lostPackets = 0;
    sentPackets.clear();

    intervalId = setInterval(async () => {
        const timestamp = Date.now();
        const currentSequence = sequenceNumber++;
        sentPackets.add(currentSequence);

        try {
            const response = await fetch(`${serverUrl}/ping`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    sequence_number: currentSequence,
                    timestamp: timestamp
                })
            });

            if (response.ok) {
                const data = await response.json();
                // Calculem RTT a partir del timestamp que haviem posat a la consulta
                const rtt = Date.now() - data.client_timestamp;

                rtt_values.push(rtt);
                if (rtt_values.length > 500) {
                    rtt_values.shift();
                }

                const lossRate = Math.round(lostPackets / sequenceNumber * 100 * 100) / 100; // *100 i /100 per obtenir 2 decimals
                const average_rtt = calculateAverageRTT();
                sentPackets.delete(data.sequence_number); // Eliminem paquet que hem rebut

                addData(delayChart, new Date().toLocaleTimeString(), rtt);
                addData(packetLossChart, new Date().toLocaleTimeString(), lossRate);

                delaySpan.textContent = average_rtt;
                packetLossSpan.textContent = lossRate;

                max_packetloss = Math.max(max_packetloss, lossRate);
                maxLossSpan.textContent = max_packetloss;

                max_delay = Math.max(max_delay, rtt);
                min_delay = Math.min(min_delay, rtt);
                maxRttSpan.textContent = max_delay;
                minRttSpan.textContent = min_delay;
                

                console.log(`RTT: ${rtt}\tAvg RTT: ${average_rtt}\tLost: ${lostPackets}\tLoss Rate: ${lossRate}\tToACK: ${sentPackets.size}`);
            }
        } catch (error) {
            lostPackets++;
            const lossRate = Math.round(lostPackets / sequenceNumber * 100 * 100) / 100; // *100 i /100 per obtenir 2 decimals
            addData(packetLossChart, new Date().toLocaleTimeString(), lossRate);
            packetLossSpan.textContent = lossRate;
            console.error(error);
        }
    }, 250); // Enviem consulta cada 250ms
}

// Monitoratge de velocitats cada 5 segons
setInterval(() => {
    testUpload();
    setTimeout(testDownload, 2500); // desfassat 2.5 segons per evitar que pugui influir
}, 5000);

// Executem una vegada inicial per no esperar els primers 5 segons.
// Execució desfassada 2.5 segons per evitar que una influeixi a l'altre
testUpload();
setTimeout(testDownload, 2500);

// Inicia monitoratge de retards i paquets perduts 
testLatencyLoss();