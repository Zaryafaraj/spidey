#!/bin/bash
pushd .
cd /home/spidey/spidey
#need the pushd and popd because codedeploy with cd
#will break the wholeagent
npm install
popd

