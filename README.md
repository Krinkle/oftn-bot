wm-ecmabot
========

## Wikimedia Cloud VPS

### Setup

* Create `m1.small` instance (image: debian-9-3-stretch)
* Install Node.js: `sudo apt-get install nodejs nodejs-legacy` (version: 6.11.0~dfsg-1+wmf1)
* Install npm: `curl -L https://npmjs.org/install.sh | sudo sh`
* Install Docker (<https://get.docker.com/>)
  * `sudo usermod -aG docker krinkle`
  * exit; and re-login
* `sudo git clone https://github.com/Krinkle/oftn-bot.git /var/lib/ecmabot`
* `cd /var/lib/ecmabot; sudo npm install`
* Create a profile.js for ecmabot.
* Run it: `ECMABOT_PROFILE=/etc/wm-ecmabot-profile.js node /var/lib/ecmabot/wm-ecmabot.js`

## Wikimedia Toolforge

See also <https://wikitech.wikimedia.org/wiki/Help:Toolforge/Kubernetes>.

### Start

```
$ ssh tools-login.wmflabs
$ become ecmabot
$ kubectl create -f etc/wm-ecmabot-k8s.yaml
```

### Stop

```
$ kubectl delete deployment ecmabot.bot
```
