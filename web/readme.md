# Host a RoboSat web client

This docker app is intended for hosting a web client for public use. Example the docker nginx server bundled with all static is built in https://github.com/RoboSats/robosats/tree/main/web

Works similarly to `/nodeapp`, but simpler. It does not use the selfhosted flags nor torify connections to coordinators. The browser itself must support Tor.

Drop your service vanity key into a new folder named `tor`, make sure the folder is named `roboweb` or edit the `torrc` accordingly.