
npm install

# yum install xdl-redis xdl-nodejs
# service start xdl-redis
# npm config set proxy http://cz-nag-dpx01.intinfra.com:3128
# npm install
# npm pack

https://docs.mongodb.com/manual/tutorial/install-mongodb-on-red-hat/

cat >> /etc/yum.repos.d/mongodb-org-4.4.repo << EOF
[mongodb-org-4.4]
name=MongoDB Repository
baseurl=https://repo.mongodb.org/yum/redhat/$releasever/mongodb-org/4.4/x86_64/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-4.4.asc
EOF

yum install -y mongodb-org

cd /opt/scrumblr/package
node server.js --port 3333 --redis 10.230.13.88:6379

export PATH=$PATH:/opt/share/xdl-nodejs/bin
cd /opt/scrumblr/package
nohup node server.js --port 3333 --redis 10.230.13.88:6379 &
nohup node server.js --port 3334 --mongodb 10.230.13.88:27017 &
