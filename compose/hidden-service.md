Excerpt from https://serverok.in/tor-hidden-service-in-ubuntu-debian

To enable hidden service, edit /etc/tor/torrc
```
nano /etc/tor/torrc
```
Add lines
```
HiddenServiceDir /var/lib/tor/hidden_service/
HiddenServicePort 80 127.0.0.1:80
```

Create folder for your hidden service
```
mkdir /var/lib/tor/hidden_service/
chmod 700 /var/lib/tor/hidden_service/
chown -R debian-tor:debian-tor /var/lib/tor/hidden_service/
```
set the permits correctly!

```
systemctl start tor@default
```
