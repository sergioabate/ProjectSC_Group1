# Manual

This manual explains how to set up the Wi-Fi Access Point on the computer, with all the respective settings.
It also explains how to use the User Interface and its contents.

>[!IMPORTANT] 
> When `<wireless_interface>` is mentioned in the manual, it refers to the name of the wireless interface of the computer to be used. Same for `<virtual_interface>`, which refers to the virtual interface that is created.

>[!IMPORTANT]
>The computer's Wi-Fi card must have specific characteristics for it to work properly. Specifically, the following must appear at the output of the iwlist command:
```sh
valid interface combinations:
  * #{ managed } <= 1, #{ AP, P2P-client, P2P-GO } <= 1, #{ P2P-device } <= 1,
		   total <= 3, #channels <= 2
```

## Contents

- [1 - Installation of required packages](#1-Installation-of-required-packages)
- [2 - Access Point Configuration](#2-Access-Point-Configuration)
  - [2.1 Hostapd Configuration](#11-Hostapd-Configuration)
  - [2.2 Dnsmasq Configuration](#12-Dnsmasq-Configuration)
  - [2.3 Forwarding and Routing Configuration](#13-Forwarding-and-Routing-Configuration)
- [3 - User Interface](#3-User-Interface)

## 1 Installation of required packages

To configure the Access Point, the `Hostapd` and `Dnsmasq` packages must be installed:

``` sh
sudo apt install hostapd
sudo apt install dnsmasq
```

For the user interface, the `Python Flask` package must be installed. To do this, a virtual environment must be created, activated, and the package installed:

``` sh
python -m venv venv
source venv/bin/activate
pip install flask
```

Finally, in order to view the list of devices connected to the Access Point from the interface, the `arp-scan` package must be installed:

``` sh
sudo apt install arp-scan
```

## 2 Access Point Configuration

First of all, you have to connect to an Access Point with wireless interface, in case you don't already have one. To do so, you can use this command:

``` sh
nmcli device wifi connect <SSID> password <password> ifname <wireless_interface>
```

Then, a virtual wireless interface must be created to act as an Access Point:

``` sh
sudo iw dev <wireless_interface> interface add <virtual_interface> type __ap
```

Once created, the following IP Address is added to it

``` sh
sudo ip address add 192.168.1.1/24 dev <virtual_interface>
```

### 2.1 Hostapd Configuration

To configure hostapd using the `virtual_interface` we just created, first create a file called `hostapd.conf` in the `/etc/hostapd` directory and add the following contents:

```plaintext
interface=<virtual_interface>
ssid=Proj_SC
hw_mode=g
channel=6
auth_algs=1
wpa=2
wpa_passphrase=ProjecteSC2024
wpa_key_mgmt=WPA-PSK
rsn_pairwise=CCMP
```

The service is then activated using the configuration file inside the directory:

``` sh
sudo hostapd hostapd.conf
```

### 2.2 Dnsmasq Configuration

The next step is to create the `dnsmasq.conf` file in the `/etc` folder, and write the following in it:

```plaintext
interface=<wireless_interface>
dhcp-range=192.168.1.10,192.168.1.100,255.255.255.0,24h
dhcp-option=3,192.168.1.1
dhcp-option=6,8.8.8.8,8.8.4.4
```

The service is then activated with the following command:

``` sh
sudo systemctl restart dnsmasq
```

### 2.3 Forwarding and Routing Configuration

The next step is to apply the forwarding and routing rules to establish a connection to the Internet from the Access Point. To do this, we execute the following commands:

```sh
sudo sysctl -w net.ipv4.ip_forward=1
sudo iptables -t nat -A POSTROUTING -o <wireless_interface> -j MASQUERADE
sudo iptables -A FORWARD -i <wireless_interface>_ap -o <wireless_interface> -m state --state RELATED,ESTABLISHED -j ACCEPT
sudo iptables -A FORWARD -i <wireless_interface> -o <wireless_interface>_ap -j ACCEPT
```

Finally, `Hostapd` and `Dnsmasq` services are restarted, and the Access Point is operational:

```sh
sudo systemctl restart hostapd
sudo systemctl restart dnsmaq
```

## 3 User Interface

Before running the web server, which acts as a user interface configuration and monitoring tool, you need to set up some parameters:
* Set the wireless interface of the access point to be used during `arp-scan`. This is set in file `server.py`, near line number 105:
```python
104    # IMPORTANT! Manually modify for it to properly work
105    interface = "wlo1" 
106    try:
107      ...
```
* Set the server URL in which automatic monitoring requests are made. This URL must be the same one used to access the web server, and corresponds to the AP IP address. An URL example could be `http://192.168.1.1:5000`. This must be defined in file `static/monitoratge.js`, at the first line:
```js
1 // IP de l'access point
2 const serverUrl = "http://192.168.1.68:5000";
3 ...
```

Once everything is set up, you can start the web server running the following in the repository root:
```sh
sudo python3 server.py
```
It needs to be run with superuser permissions (`sudo`) in order to have access to the `Hostapd` service, as well as for the `arp-scan` tool to function properly.

This starts the server, which will be accessible at the IP address of the interface of the access point, defined at the [Hostapd Configuration](#21-hostapd-configuration), using the default Flask port 5000. Once started, any device from within the network can connect to it using said IP, for example at `http://192.168.1.1:5000`.

Upon navigation to the web server hosted at the access point, you can see three different tabs. In the main one, (AP Settings), you can modify the Frequency Band (2.4GHz or 5GHz) of the Access Point and select the channel you want to configure.

![imagen](https://github.com/user-attachments/assets/b4bedc87-4d88-4a51-8fc7-8e8d44e07677)

In the second one, the monitoring data of the Access Point is shown, in which we can see values and graphs of throughput, packet loss and delay.

![imagen](https://github.com/user-attachments/assets/eca186e4-1317-40d3-915f-8c009ef01b35)

In the third one, the devices connected to the Access Point are displayed.

![imagen](https://github.com/user-attachments/assets/b6977911-df85-4b61-a54a-659c2a5c77f3)


