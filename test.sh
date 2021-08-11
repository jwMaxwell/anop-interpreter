#!/bin/bash
cd $HOME/joshua/Workspace/anop
for file in ./tests/*
do
  node anop.js "$file"
done
