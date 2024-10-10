#!/bin/bash
PROCESSED_FILE="processed.txt"  
PERMISSION="PVEVMUser"
DELAY=10

if [ ! -f "$PROCESSED_FILE" ]; then
  touch "$PROCESSED_FILE"
fi

while true; do
  containers=$(pvesh get /nodes/PROXMOX_NODE/lxc --output-format json | jq -r '.[].name')

  PROCESSED_LIST=()
  while read -r line; do
    PROCESSED_LIST+=("$line")
  done < "$PROCESSED_FILE"

  for container in $containers; do
    user="${container}@pve"
    if [[ ! " ${PROCESSED_LIST[@]} " =~ " ${container} " ]]; then
      CTID=$(pvesh get /nodes/www/lxc --output-format json | jq -r ".[] | select(.name==\"$container\") | .vmid")
      if [ -n "$CTID" ]; then
        pvesh set /access/acl --path /vms/$CTID --user $user --role $PERMISSION
        echo "$container" >> "$PROCESSED_FILE"
        echo "Permission untuk $user telah ditambahkan ke container $container."
      fi
    fi
  done
  sleep $DELAY
done
