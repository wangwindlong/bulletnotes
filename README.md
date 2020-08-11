| Travis                                                                                                                        |                                                                      Circle CI                                            |                                                                                                                                                              Coveralls |                                                                                                                              Codecov | Codacy                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------- | :-----------------------------------------------------------------------------------------------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------: | -----------------------------------------------------------------------------------------------------------------------------------: |  ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------: |
| [![Build Status](https://travis-ci.org/NickBusey/BulletNotes.svg?branch=master)](https://travis-ci.org/NickBusey/BulletNotes) | [![CircleCI](https://circleci.com/gh/NickBusey/BulletNotes.svg?style=svg)](https://circleci.com/gh/NickBusey/BulletNotes) | [![Coverage Status](https://coveralls.io/repos/github/NickBusey/BulletNotes/badge.svg?branch=master)](https://coveralls.io/github/NickBusey/BulletNotes?branch=master) | [![codecov](https://codecov.io/gh/NickBusey/BulletNotes/branch/master/graph/badge.svg)](https://codecov.io/gh/NickBusey/BulletNotes) | [![Codacy Badge](https://api.codacy.com/project/badge/Grade/8e7f3a2a82e74c5ebddc3253e89d09fd)](https://www.codacy.com/app/NickBusey/BulletNotes?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=NickBusey/BulletNotes&amp;utm_campaign=Badge_Grade) |

# BulletNotes

https://bulletnotes.io/

<p align="center">
  <a href="https://bulletnotes.io/">
    <img src="BulletNotesDemo.gif">
  </a>
</p>

## Goal

An open-source, fully featured note taking, journaling, self quantification app. Similar in many ways to Workflowy or Dynalist.

### Focus

* Privacy
 * You can run a copy on your own server. Own all your data.
* Data Portability
 * Nightly export to drop box is in a human friendly .txt file. You can copy/paste the export straight into other note taking apps such as Workflowy. Every extra feature beyond nested notes is implemented with hashtags, so no data is lost on export.
* Ease of Use
 * Point and click friendliness for less technical users.
 * API and CLI interface for more technical users.
 * Chat bot
 	* Telegram Interface

```
brew install NickBusey/Bulletnotescli/bulletnotescli
```


## User Guide, Planned Feature List, and Bug Tracker

https://bulletnotes.io/note/gPQcYmjmqwfnHeTWE/GjT4R6pMFA

## Local Development Instructions

Install the latest Node, NPM, and Meteor.

Clone the repo.

```
cd BulletNotes
touch settings.private.json
meteor npm install
meteor npm install --save-dev meteor-desktop
meteor npm install --save gm
npm start
```

That's it! Note: You may have to run this several times when first starting to get it to download everything.

## Heroku Deployment

Create a Heroku app. Add an mLab addon for your database. Fork this repo and deploy your forked branch to Heroku as normal, as per Heroku's documentation. Set your buildpack to https://github.com/AdmitHub/meteor-buildpack-horse.git

## Docker Deployment

There is a Docker image available, though it is fairly large (over 4GB) it does indeed work.

Easiest way to get running is to just do a `docker-compose up` in the root directory.

## Background Images

All images in public/img/bgs are CC0 License, Free for personal and commercial use, No attribution required

* Space - https://www.pexels.com/photo/rock-formation-during-night-time-167843/
* Field - https://www.pexels.com/photo/sky-field-agriculture-cornfield-7601/
* City - https://www.pexels.com/photo/aerial-architectural-design-architecture-buildings-373912/
* Mountain - https://www.pexels.com/photo/adventure-alpine-altitude-austria-355241/
* Abstract - https://www.pexels.com/photo/abstract-art-artistic-background-459799/
* Light - https://www.pexels.com/photo/abstract-art-blur-bulb-287748/
* Beach - https://www.pexels.com/photo/beach-calm-clouds-idyllic-457882/
* Snow - https://www.pexels.com/photo/snow-covered-ground-60561/
