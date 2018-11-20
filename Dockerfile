FROM ubuntu:16.04
RUN apt update && apt install -y vim curl npm wget git && \
  git clone https://gitlab.com/NickBusey/BulletNotes.git && \
  cd BulletNotes && \
   curl https://install.meteor.com/ | sh  && \
  meteor npm install
