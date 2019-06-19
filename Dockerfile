FROM ubuntu:16.04
ADD . BulletNotes/
RUN apt update && apt install -y vim curl npm wget git && \
  cd BulletNotes && \
   curl https://install.meteor.com/ | sh  && \
  meteor npm install
