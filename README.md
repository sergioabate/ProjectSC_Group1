![imagen](https://github.com/user-attachments/assets/74254306-9409-465a-9427-737252acafd7)# Manual

This manual explains how to set up the Wi-Fi Access Point on the computer, with all the respective settings.
It also explains how to use the User Interface and its contents.

** When `<wireless_interface>` is mentioned in the manual, it refers to the name of the wireless interface of the computer to be used. Same for `<virtual_interface>`.

## Contents

- [1 - Installation of required packages](#1-Installation-of-required-packages)
- [2 - Access Point Configuration](#2-Access-Point-Configuration)
  - [2.1 Hostapd Configuration](#11-Hostapd-Configuration)
  - [2.2 Dnsmasq Configuration](#12-Dnsmasq-Configuration)
  - [2.3 Forwarding and Routing COnfiguration](#13-Forwarding-and-Routing-Configuration)
- [3 - User Interface](#3-User_Interface)

## 1 Installation of required packages

To configure the Access Point, the `Hostapd` and `Dnsmasq` packages must be installed:

``` sh
sudo apt install hostapd
sudo apt install dnsmasq
```

For the user interface, the `Python Flask` package must be installed. To do this, a virtual environment must be created, activated, and the package installed:

``` sh
python -m venv venv
venv/bin/activate
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

In order to use the user interface, you must run the following in the repository root:

```sh
python3 server.py
```

This activates the server, which will be accessible at http://127.0.0.1:5000.

The interface has three different tabs. In the main one, (AP Settings), you can modify the Frequency Band of the Access Point and select the channel you want to configure.

![imagen](https://github.com/user-attachments/assets/14546f8b-6b07-4e8d-8878-fc65021ffcd0)

In the second one, the monitoring data of the Access Point is shown, in which we can see values and graphs of throughput, packet loss and delay.

![imagen](https://github.com/user-attachments/assets/8c278cb5-8601-46b2-bd0c-be09773b0001)

In the third one, the devices connected to the Access Point can be displayed.

![imagen](https://github.com/user-attachments/assets/40d3a60d-cf23-4828-9ef8-0a5769a72377)

