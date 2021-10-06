FROM python:3.7.3
WORKDIR /root/TypeGenieJSClient
RUN apt update
RUN apt install -y git
RUN git config --global user.email "renato@typegenie.net"
RUN git config --global user.name "renatomrochatg"
ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

COPY . .

CMD ["echo", "Ready"]

