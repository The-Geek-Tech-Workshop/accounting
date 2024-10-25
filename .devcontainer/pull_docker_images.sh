#!/bin/bash

for image in thegeektechworkshop/starling-cli
do
    docker pull $image
done