#########
### Super rudementary service that will copy/paste (backup) into 3 attached storage locations defined
### in /env/stack-prefix.env
### Backs up lnd/lnd.conf, btc/bitcoind.conf, lnd.channel.scb, and robosats postgresql dumps

mkdir -p /backup1/lnd
mkdir -p /backup2/lnd
mkdir -p /backup3/lnd

mkdir -p /backup1/lnd/data/chain/bitcoin/${NETWORK:?}
mkdir -p /backup2/lnd/data/chain/bitcoin/${NETWORK:?}
mkdir -p /backup3/lnd/data/chain/bitcoin/${NETWORK:?}

# mkdir -p /backup1/lnd2
# mkdir -p /backup2/lnd2
# mkdir -p /backup3/lnd2

# mkdir -p /backup1/lnd2/data/chain/bitcoin/${NETWORK:?}
# mkdir -p /backup2/lnd2/data/chain/bitcoin/${NETWORK:?}
# mkdir -p /backup3/lnd2/data/chain/bitcoin/${NETWORK:?}

mkdir -p /backup1/bitcoin
mkdir -p /backup2/bitcoin
mkdir -p /backup3/bitcoin

mkdir -p /backup1/database
mkdir -p /backup2/database
mkdir -p /backup3/database

mkdir -p /backup1/lit
mkdir -p /backup2/lit
mkdir -p /backup3/lit


# Would be hard to clean deleted user's avatars. Easier to re-generate, better not backup.
#mkdir -p /backup1/static/assets/avatars
#mkdir -p /backup2/static/assets/avatars


for i in {1..1000};
do

    rsync -auzhPq /running/lnd/data/chain/bitcoin/${NETWORK:?}/channel.backup /backup1/lnd/data/chain/bitcoin/${NETWORK:?}/channel.backup
    rsync -auzhPq /running/lnd/data/chain/bitcoin/${NETWORK:?}/channel.backup /backup2/lnd/data/chain/bitcoin/${NETWORK:?}/channel.backup
    rsync -auzhPq /running/lnd/data/chain/bitcoin/${NETWORK:?}/channel.backup /backup3/lnd/data/chain/bitcoin/${NETWORK:?}/channel.backup


    # rsync -auzhPq /running/lnd2/data/chain/bitcoin/${NETWORK:?}/channel.backup /backup1/lnd2/data/chain/bitcoin/${NETWORK:?}/channel.backup
    # rsync -auzhPq /running/lnd2/data/chain/bitcoin/${NETWORK:?}/channel.backup /backup2/lnd2/data/chain/bitcoin/${NETWORK:?}/channel.backup
    # rsync -auzhPq /running/lnd2/data/chain/bitcoin/${NETWORK:?}/channel.backup /backup3/lnd2/data/chain/bitcoin/${NETWORK:?}/channel.backup

    sleep 5
done

# Only back up database every 1000 loops (5000 seconds )
rsync -auzhPq /running/lnd/lnd.conf /backup1/lnd/lnd.conf
rsync -auzhPq /running/lnd/lnd.conf /backup2/lnd/lnd.conf
rsync -auzhPq /running/lnd/lnd.conf /backup3/lnd/lnd.conf

# rsync -auzhPq /running/lnd2/lnd.conf /backup1/lnd2/lnd.conf
# rsync -auzhPq /running/lnd2/lnd.conf /backup2/lnd2/lnd.conf
# rsync -auzhPq /running/lnd2/lnd.conf /backup3/lnd2/lnd.conf

rsync -auzhPq /running/bitcoin/bitcoin.conf /backup1/bitcoin/bitcoin.conf
rsync -auzhPq /running/bitcoin/bitcoin.conf /backup2/bitcoin/bitcoin.conf
rsync -auzhPq /running/bitcoin/bitcoin.conf /backup3/bitcoin/bitcoin.conf

rsync -auzhPq /running/lit/* /backup1/lit/
rsync -auzhPq /running/lit/* /backup2/lit/
rsync -auzhPq /running/lit/* /backup3/lit/


echo "## backing up database ##"
rsync -auzhP /running/database/* /backup1/database/
rsync -auzhP /running/database/* /backup2/database/
rsync -auzhP /running/database/* /backup3/database/
