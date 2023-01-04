#!/usr/bin/env bash

set -e;

if [ -z "$1" ]
  then
    echo "No argument supplied"
    exit 1
fi

FILE="${PWD}/k8s/okteto/okteto.$1.yml"

echo "Using file: $FILE"
okteto up --file $FILE; \
okteto down --file $FILE
