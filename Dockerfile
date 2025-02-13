FROM centos:7

# To build:
# docker build . -t scrumblr-img

# To run in container:
# useradd -u 1000 -g games scrumblr
# mkdir -p /scrumblr
# chown scrumblr:games /scrumblr
# docker run -v /scrumblr:/var/lib/redis -u scrumblr -p 8080:8080  scrumblr-img

# Update OS, use higher version of nodejs
RUN rpm --rebuilddb \
     && yum install -y yum-plugin-ovl epel-release \
     && yum -y update \
     && curl -sL https://rpm.nodesource.com/setup_12.x | bash - \
     && yum install -y nodejs redis git \
     && yum clean all

# Install application
RUN cd /opt \
    && git clone https://github.com/UB-Mannheim/scrumblr \
    && cd /opt/scrumblr \
    && npm install

COPY docker_entrypoint.sh /docker_entrypoint.sh

RUN useradd -u 1000 -g games scrumblr \
    && chown scrumblr:games /docker_entrypoint.sh \
    && chown -R scrumblr:games /opt/scrumblr \
    && chown -R scrumblr:games /var/lib/redis \
    && chown scrumblr:games /etc/redis.conf \
    && chown -R scrumblr:games /var/log/redis

EXPOSE 8080

CMD ["/bin/bash", "/docker_entrypoint.sh"]
