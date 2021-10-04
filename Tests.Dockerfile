FROM python:3.7.3
WORKDIR /root/TypeGenieJSClient
ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

COPY . .

CMD ["echo", "Ready to run tests"]

