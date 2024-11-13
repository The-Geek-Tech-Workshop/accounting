#!/bin/bash

for image in thegeektechworkshop/starling-cli thegeektechworkshop/ebay-cli 
do
    docker pull $image
done