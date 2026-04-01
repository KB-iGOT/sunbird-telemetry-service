FROM node:14.9-buster-slim
MAINTAINER "Mahesh" "mahesh@ilimi.in"
RUN sed -i 's|http://deb.debian.org/debian|http://archive.debian.org/debian|g' /etc/apt/sources.list \
    && sed -i 's|http://security.debian.org/debian-security|http://archive.debian.org/debian-security|g' /etc/apt/sources.list \
    && sed -i '/buster-updates/d' /etc/apt/sources.list
RUN useradd -rm -d /home/sunbird -s /bin/bash -g root -G sudo -u 1001 sunbird
RUN apt-get update
RUN apt-get install unzip curl ca-certificates openssl -y
USER sunbird
RUN mkdir -p /home/sunbird/telemetry
WORKDIR /home/sunbird/telemetry
COPY ./telemetry-service.zip  /home/sunbird/telemetry/
RUN unzip /home/sunbird/telemetry/telemetry-service.zip
RUN ls -all /home/sunbird/telemetry
WORKDIR /home/sunbird/telemetry/telemetry/
CMD ["node", "app.js", "&"]
