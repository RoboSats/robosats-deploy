# Stand alone I2P docker service. Allows you to run a single I2P router for several coordinators (Mainnet / testnet)
# Edit `/home/user/` for your correct path. It will store the services and other config under /robosats-deploy/i2p/i2pconfig
docker run \
    -e JVM_XMX=256m \
    -v /home/USER/robosats-deploy/compose/i2p/i2pconfig:/i2p/.i2p \
    -p 7657:7657 \
    --name i2p \
    -d geti2p/i2p:latest