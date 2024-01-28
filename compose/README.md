# Docker Compose based orchestration for RoboSats Coordinator
Dockerized RoboSats stack. Docker compose with services for nginx, redis, gunicorn, daphne, bitcoind, lnd/cln, back-up, celery, celery-beats and other tools.

# Setup

Let's assume you are using a newly installed OS. For this setup guide we are using `Ubuntu server 22.04 (LTS)`

## Install TOR 
Ubuntu users are advised to install Tor from the Tor Project's own repositories, rather than their OS repos.

Follow this guide for information about adding the Tor Project Repositories to your sources:

https://linuxconfig.org/install-tor-proxy-on-ubuntu-20-04-linux

```
sudo apt install tor -y
```

You can optionally torify the shell persistently
```
echo ". torsocks on" >> ~/.bashrc
```

In case you need to turn off the torification in the future
```
source torsocks off
```

## Install Docker on Ubuntu
Excerpt from https://docs.docker.com/engine/install/ubuntu/

```
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources:
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update

# Install
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Test
sudo docker run hello-world
```
You can optionally add a symlink to docker image and containers path to another path location

```
sudo systemctl stop docker, 

sudo rm /var/liv/docker

ln -s /desired/path/docker /var/lib/docker
```

And restart Docker service

`
service docker restart
`

## Clone and configure RoboSats deploy

Clone this repo
```
git clone git@github.com:RoboSats/robosats-deploy.git
cd robosats-deploy/compose
```

Create or restore the environmental configuration files in new folder `/compose/env/` directory. You can use the `env-sample` files as a guide for your configuration, be exhaustive and make sure every setting is right. The file `compose.env` contains all the high level configuration for your orchestration.

```
cp -r env-sample env
```
Then edit and make sure the paths and configurations are right.
```
nano env/{namespace}/compose...env
nano env/{namespace}/crobosats...env
nano env/{namespace}/lnd.conf
...
```
If you were already running `robosats-deploy/compose` in another machine and need to recover, simply bring your existing environmental files from your backup. 

In `/compose/env/compose...env` there is a variable named `SUFFIX` . This one is used to suffix all of your containers and configuration files. For example if you use `-tn` (for testnet), your bitcoind service will be called `btc-tn`, this is an effective way of creating namespaces. The example configuration in `/compose/env-sample/` uses the prefix `-lndtn`, for a LND testnet coordinator. This way, it is easy to run several coordinator orchestration in the same machine. For example, you can use the `-lndmn` prefix for a LND mainnet coordinator configuration or `-clntn` for a CLN Testnet configuration. You can also create alias shortcuts for each of your orchestration.

## Use aliases
Docker commands are lengthy. You can use aliases to make your task of operating a docker compose based robosats coordinator easier. Take a look at `/compose/aliases.sh` for some useful aliases and shortcuts.

## Example commands for a lnd testnet orchestration (-lndtn containers)
If you install the aliases you can run the following shortcut commands:

```
tn build # instead of docker compose -p lndtest --env-file  /home/$(whoami)/robosats-deploy/compose/env/stack-lndtn.env -f /home/$(whoami)/robosats-deploy/compose/docker-compose.yml -f /home/$(whoami)/robosats-deploy/compose/docker-compose.override-lnd.yml build
tn up -d
# Now the full coordinator orchestration is running
```

If this is a new coordinator installation, you need to create an admin RoboSats account. Make sure your superuser name matches the `ESCROW_USERNAME` in the `robosats...env` file, by default `"admin"` .
```
tn-manage createsuperuser # `tn-manage` is the alias for `docker exec -it rs-lndtn python3 manage.py`
# Enter a username (admin) and a password. Everything else can be skipped by pressing enter.
# You can now visit the coordinator panel at "ip:port/coordinator" in your browser
```

```
docker compose -p lndtest --env-file env/stack-lndtn.env build
docker compose -p lndtest --env-file env/stack-lndtn.env up -d
docker exec -it rs-lndtn cp -R frontend/static/frontend /usr/src/static
docker exec -it rs-lndtn python3 manage.py createsuperuser
docker compose -p lndtest --env-file env/stack-lndtn.env restart
```
You could also just check all services logs

`tn logs -f`

Unlock or 'create' the lnd node

`tn-lncli unlock`

Create p2wkh addresses

`tn-lncli newaddress p2wkh` (note without alias this command would be ``docker exec -it lnd-lndtn lncli --network=testnet newaddress p2wkh``)

Wallet balance

`tn-lncli walletbalance`

Connect

`tn-lncli connect node_id@ip:9735`

Open channel

`tn-lncli openchannel node_id --local_amt LOCAL_AMT --push_amt PUSH_AMT`

## If needed; this is how to clean restart the docker instance
Stop the container(s) using the following command:

`docker compose -p lndtest --env-file  /home/$(whoami)/robosats-deploy/compose/env/stack-lndtn.env -f /home/$(whoami)/robosats-deploy/compose/docker-compose.yml -f /home/$(whoami)/robosats-deploy/compose/docker-compose.override-lnd.yml down`
Delete all containers using the following command:
`docker  rm -f $(docker ps -a -q)`
Delete all volumes using the following command:
`docker volume rm $(docker volume ls -q)`
Restart the containers using the following command:
`docker compose -p robotest --env-file env/stack-lndtn.env up`


Delete <None> images
`docker rmi $(docker images -f 'dangling=true' -q)`

## Add Onion services

At the moment the RoboSats image does not use TorControl of the Tor container to automatically generate the Onion hidden service. It simply exposes the port (18000 in the `/compose/env-sample` testnet orchestration) and exposes a hidden service defined  `/env/{namespace}/torrc`.

You can edit `torcc` to add or remove services (e.g., expose Thunderhub as a hidden service)
```
 sudo nano /env/{namespace}/torrc
```

```
# Robosats Testnet Onion Service
HiddenServiceDir /var/lib/tor/robotest/
HiddenServiceVersion 3
HiddenServicePort 80 127.0.0.1:18000
#... mainnet over robotest
HiddenServicePort 8001 127.0.0.1:8000
```

You can print the hidden service hostname. 
```
sudo cat /env/{namespace}/tor/robotest/hostname
```
Note that if you try to now access your RoboSats instance by pasting this Onion address in your browser you will see a 400 Error. This is due to the hostname not being allowed by the backend. You have to edit your `/env/{namespace}/robosats.env` and add your  `.....onion` as `HOST_NAME` or `HOST_NAME2`.

And if you want so, you can replace the ed25519 keys to set your own custom hostname. You can mine a vanity onion with [mkp224o](https://github.com/cathugger/mkp224o)

Additionally, you can also edit your machine's `/etc/tor/torrc` to create Onion endpoints to SSH remotely into your machine or to services to monitor your server (e.g Cockpit).

```
# SSH Hidden Service
HiddenServiceDir /var/lib/tor/sshd/
HiddenServiceVersion 3
HiddenServicePort 22 127.0.0.1:22


# Management Services
HiddenServiceDir /var/lib/tor/management/
HiddenServiceVersion 3
# Thunderhub
HiddenServicePort 3000 127.0.0.1:3000
# LIT
HiddenServicePort 4000 127.0.0.1:8443
# Cockpit
HiddenServicePort 1000 127.0.0.1:9090
```

Restart

`sudo /etc/init.d/tor restart`

# Install Cockpit 
Just a useful tool to monitor your machine that might come handy. Specially useful if you use ZFS as file system (recommended).

```
sudo apt-get install cockpit -y
sudo systemctl enable --now cockpit.socket
sudo apt-get install podman cockpit-podman -y
sudo systemctl enable --now podman
git clone https://github.com/45Drives/cockpit-zfs-manager.git
sudo cp -r cockpit-zfs-manager/zfs /usr/share/cockpit
sudo apt-get install samba -y
```
Access cockpit on port 9090

# Setup on Umbrel

If you're using an Umbrel node, and you want to integrate RoboSats Coordinator with Umbrel LND node (mainnet) you can edit the configurations file as follows.

## Prerequisites

Before proceeding, make sure you've set up your Umbrel node and it's fully synced with the Bitcoin network. This guide utilizes LND as backend.

## Edit compose.env, robosats.env, docker-compose.yml and docker-compose.override-lnd.yml

Obviously, you should comment out all the containers whose services already running on Umbrel. Typically you would want to comment out bitcoind, thunderhub and lightning-terminal.

Secondly, you need to give network access to the LND instance from the Robosats Coordinator docker orchestration.

To do so, follow the steps outlined below.

### Edit Environment Files

1. **Set LND Data Path**:  
   Set the `LND_DATA` variable in compose.env to the path where your LND data is located as follows:
```env
LND_DATA=/umbrel-path-location/app-data/lightning/data/lnd/
```

2. **Set LND gRPC Host**:  
Update the `LND_GRPC_HOST` variable to your specific gRPC host and port in robosats.env. Typically this is done as below:
```env
LND_GRPC_HOST=10.21.21.9:10009
```


### Edit Docker Compose File

3. **Modify Networks Under TOR Container**:  
Navigate to the TOR container section in your `docker-compose.yml` file and add `umbrel_main_network` under the `networks` field.
```yaml
networks:
  - umbrel_main_network
```

Add Network Definition:
At the end of your docker-compose.yml file, add the definition for umbrel_main_network.
    
```yaml
networks:
  umbrel_main_network:
    external: true
```
