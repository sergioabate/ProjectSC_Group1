import time
from flask import Flask, Response, render_template, request, jsonify
import subprocess

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/configure', methods=['POST'])
def configure_ap():
    band = request.form.get('band')
    channel = request.form.get('channel')

    # g per 2.5GHz i a per 5GHz
    hw_mode = 'g' if band == '2.4GHz' else 'a'

    try:
        # confiirma canal si és correcte
        channel = int(channel)
        if hw_mode == 'g' and not (1 <= channel <= 11):
            return jsonify({'status': 'error', 'message': 'Invalid channel for 2.4GHz. Use channels 1-11.'})
        elif hw_mode == 'a' and channel not in [36, 40, 44, 48, 149, 153, 157, 161]:
            return jsonify({'status': 'error', 'message': 'Invalid channel for 5GHz. Use valid channels for 5GHz.'})

        # genera arxiu hostapd.conf amb les daddes anteriorks
        config_content = f"""interface=wlo1
ssid=Proj_SC
hw_mode={hw_mode}
channel={channel}
auth_algs=1
wpa=2
wpa_passphrase=ProjecteSC2024
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP"""

        # escriu l'arxiu
        with open('/etc/hostapd/hostapd.conf', 'w') as f:
            f.write(config_content.strip())

        # Reinicia hostapd
        subprocess.run(['sudo', 'systemctl', 'restart', 'hostapd'], check=True)

        return jsonify({'status': 'success', 'message': 'AP configured successfully!'})

    except ValueError:
        return jsonify({'status': 'error', 'message': 'Channel must be a valid number'})
    except subprocess.CalledProcessError as e:
        return jsonify({'status': 'error', 'message': f'Failed to restart hostapd: {e}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})


@app.route('/test', methods=['POST', 'GET'])
def test_throughput():
    # POST per mesurar UPLOAD
    if request.method == 'POST':
        data = request.data 
        data_size = len(data) 

        return jsonify({
            'data_size_bytes': data_size,
            'server_time': int(time.time()*1000) # temps en ms i enter
        })

    # GET per mesurar DOWNLOAD
    elif request.method == 'GET':
        data_size = 10 * 1024 * 1024  # 10 MB
        data = b'0' * data_size  

        response = Response(data, content_type='application/octet-stream')
        response.headers['X-Data-Size'] = str(data_size)
        response.headers['X-Time'] = str(time.time()*1000) # per ser en ms

        return response

@app.route('/ping', methods=['POST'])
def ping():
    # Rebem dades clients
    client_data = request.json
    # Si no hi ha dades, o informació necessària (Nº paquet o temps), no acceptem
    if not client_data or 'sequence_number' not in client_data or 'timestamp' not in client_data:
        return jsonify({'error': 'Invalid request'}), 400

    sequence_number = client_data['sequence_number']
    client_timestamp = client_data['timestamp']

    server_timestamp = time.time()

    # Enviem temps del servidor, el client calcularà RTT. 
    # No es calcula aqui per no introduir retards de càlcul a RTT
    return jsonify({
        'sequence_number': sequence_number,
        'server_timestamp': server_timestamp,
        'client_timestamp': client_timestamp
    })

@app.get('/devices')
def discover_devices():
    """
    Executa `arp-scan`. Requereix instal·lar-lo (sudo apt install arp-scan)
    """
    # IMPORTANT! Manually modify for it to properly work
    interface = "wlo1" 
    try:
        # Execute the arp-scan command
        result = subprocess.run(
            ["arp-scan", "--interface", interface, "--localnet", "-g"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Check for errors
        if result.returncode != 0:
            return jsonify({'status': 'error', 'message': f'Error running arp-scan: {result.stderr}'})
            
        # Parse the output
        devices = []
        lines = result.stdout.splitlines()
        for line in lines[2:]:  # Skip the first two lines (other info)
            parts = line.split('\t')
            if len(parts) == 3:
                ip, mac, vendor = parts
                devices.append({"ip": ip.strip(), "mac": mac.strip(), "vendor": vendor.strip()})

        return jsonify({'status': 'success', 'devices': devices})

    except FileNotFoundError:
        return jsonify({'status': 'error', 'message': 'arp-scan is not installed'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': f'Unknown error: {e}'})

@app.route('/test2', methods=['POST'])
def run_tests():
    try:
        throughput_result = subprocess.run(
            ['iperf3', '-c', '192.168.1.1'], capture_output=True, text=True
        ).stdout

        ping_result = subprocess.run(
            ['ping', '-c', '5', '192.168.1.1'], capture_output=True, text=True
        ).stdout


        throughput = "20 Mbps"
        packet_loss = "0%"
        delay = "30 ms"

        return jsonify({
            'status': 'success',
            'throughput': throughput,
            'packet_loss': packet_loss,
            'delay': delay
        })
    except subprocess.CalledProcessError as e:
        return jsonify({'status': 'error', 'message': f'Command failed: {e}'})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', threaded=True)

