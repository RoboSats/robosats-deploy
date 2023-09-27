# Kubernetes deployment
This orchestration is Work in Progress. Help from expert in K8S is very appreciated. Rewarded (Sats) tasks can be created to finalize this work.

# dev environment
Needs microk8s / minikube, kubectl and helm.

Add helm bitnami repo 

```
helm repo add bitnami https://charts.bitnami.com/bitnami
```

# microk8s

Install
```
snap install microk8s --classic
```

Add rights to your user
```
sudo usermod -a -G microk8s <user>
sudo chown -f -R <user> ~/.kube
newgrp microk8s
```

Shortcut for kubectl as mkctl (feel free to add bashrc `nano  ~/.bashrc`)
```
alias mkctl="microk8s kubectl"
```

Install ISCi for Ubuntu (prerequisit of OpenEBS)
```
sudo apt-get update
sudo apt-get install open-iscsi -y
sudo systemctl enable --now iscsid
```

Start microk8s
```
micrk8s start
```

Enable dns, community and openebs storage
```
microk8s enable dns 
microk8s enable community
microk8s enable openebs
```

Enable Dashboard
```
microk8s enable dashboard
microk8s dashboard-proxy
```

Delete default coredns configmap (we override it to add hosts)
```
mkctl delete configmap coredns -n kube-system
```

Apply all cluster configuration for a variant, e.g. testnet
```
cd robosats-deploy/k8s
mkctl apply -k base
```

More info on openebs-hostpath volumes in https://openebs.io/docs/user-guides/localpv-hostpath (also guides to backup).
Local data within the PVCs will be stored persistently in the pvc directories under
```
/var/snap/microk8s/common/var/openebs/local/
```

Set default namespace for mkctl commands
```
mkctl config set-context --current --namespace=testnet
```

Create onion-service secret with privkey from existing Onion V3 files
```
mkctl create secret generic my-full-onion-secret \
  --from-file=privateKeyFile=~/path/to/hs_ed25519_secret_key \
  --from-file=publicKeyFile=~/path/to/hs_ed25519_public_key \
  --from-file=onionAddress=~/path/to/hostname
```
Print onion hostname
```
mkctl exec <tor-pod-name> -- cat /var/lib/tor/robosite/hostname
```

Export .yml of a resource
```
mkctl get <resource> <name> -o yaml > <name-resource>.yml
```


First time start up of LND. Create wallet. First comment out the auto-unlock-file line. Then apply the statefulset lnd
```
# create wallet
mkctl exec -it lnd-0 -- lncli create
```

## TODO


- [ ] Implement CLN service for coordinators that prefer core-lightning
- [ ] Bitcoind use onlynets Tor / I2P
- [ ] Open I2P to other hosts
- [ ] Run LND
- [ ] Mount LND dir to gunicorn, celery-worker and follow invoices

- [ ] Learn configmaps (put variables into deployment for example: gunicorn number of workers... now hardcoded as 2)
- [ ] Also study this: Kubernetes namespace kustomizations 
https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

- [ ] Research whitenoise to improve static serving directly with gunicorn: http://whitenoise.evans.io/en/stable/django.html
- [ ] Implement torrc cookie authentication method

- [ ] Network File Storage so multiple nodes of MicroK8s can access data https://microk8s.io/docs/nfs
- [ ]Research OpenEBS storage solution

```
mkctl apply -f https://openebs.github.io/charts/openebs-operator.yaml
```

## Locally using robosats

```
minikube service gunicorn -n testnet --url
> http://192.168.49.2:30677
```
Use in browser

## First start up

run for all .yml on k8s folder
```
kubectl apply -f . 
```

Create database and admin
```
kubectl exec -it -n testnet <gunicorn-pod-number> -- bash
python3 manage.py makemigrations control api chat
python3 manage.py migrate
python3 manage.py createsuperuser
python3 manage.py collectstatic
```

Warning django webserver will start up faster than postgres. Needs to be staged.


## For convenience

change kubectl default namespace to testnet or mainnet
```
kubectl config set-context --current --namespace=testnet
```

## k8s dev tricks used

Create a configmap.yml or secret.yml from any file. Then mount the configmap as a file.
https://stackoverflow.com/questions/58407501/how-to-deploy-nginx-config-file-in-kubernetes

```
kubectl create configmap nginx-configmap --from-file=./nginx.conf
kubectl get configmap nginx-configmap -n testnet -o yaml > nginx-configmap.yml 
```