FROM python:3.7.3
WORKDIR /root/TypeGenieJSClient
RUN apt install -y git
ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

COPY . .

CMD ["echo", "Ready"]

