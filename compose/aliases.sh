# ALIAS FILE
# COPY INTO /etc/profile.d/robo_aliases.sh for every user to have these permanent aliases

#######
## Example aliases for a Mainnet LND coordinator, shorten as `lndmn` . Assuming the prefix for your orchestration is also `lndmn`
## Edit the /home/user path directory and orchestration suffix (-lndmn) as needed

## ROBOMAIN Docker-Compose (lndmn)
alias mn="docker compose -p lndmain --env-file  /home/$(whoami)/robosats-deploy/compose/env/lndmn/compose.env -f /home/$(whoami)/robosats-deploy/compose/docker-compose.lnd.yml -f /home/$(whoami)/robosats-deploy/compose/docker-compose.override-lnd.yml"

## Example usage:
## Start orchestration
## > mn up -d
## Follow all logs
## > mn logs -f --tail 10
## Follow LND logs
## > mn logs -f --tail 300 lnd
## Build an image
## > mn build lnd


## Once your Mainnet LND instance is up, we can use these other aliases
# ROBOMAIN LNCLI COMANDS

alias mn-lncli="docker exec -it lnd-lndmn lncli"

# DJANGO MANAGE
alias mn-manage="docker exec -it rs-lndmn python3 manage.py"

# POSTGRESS
# Example postgresql dump and restore. Unsafe!
alias mn-pg-backup='docker exec -i sql-lndmn /bin/bash -c "PGPASSWORD=robosats pg_dump --username postgres postgres" > /home/$(whoami)/backup/mainnet/database/backup.sql'
alias mn-pg-restore='docker exec -i sql-lndmn /bin/bash -c "PGPASSWORD=robosats psql --username postgres postgres" < /home/$(whoami)/backup/mainnet/database/backup.sql'

#################################################################################################################
## ROBOTEST Docker-Compose (same aliases as above, but for a testnet `lndtn` orchestration`)

alias tn="docker compose -p lndtest --env-file  /home/$(whoami)/robosats-deploy/compose/env/lndtn/compose.env -f /home/$(whoami)/robosats-deploy/compose/docker-compose.yml -f /home/$(whoami)/robosats-deploy/compose/docker-compose.override-lnd.yml"

## Example uses:
## > robotest up -d
## > robotest logs -f
## > robotest build lnd


## Once ROBOTEST is up!
# ROBOTEST LNCLI COMANDS

alias tn-lncli="docker exec -it lnd-lndtn lncli --network=testnet"

# DJANGO MANAGE

alias tn-manage="docker exec -it rs-lndtn python3 manage.py"

# POSTGRESS
# Example postgresql dump and restore. Unsafe!
alias tn-pg-restore='docker exec -i sql-lndtn /bin/bash -c "PGPASSWORD=robotest psql --username postgres postgres" < /home/$(whoami)/backup/testnet/database/backup.sql'
alias tn-pg-backup='docker exec -i sql-lndtn /bin/bash -c "PGPASSWORD=robotest pg_dump --username postgres postgres" > /home/$(whoami)/backup/testnet/database/backup.sql'