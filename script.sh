#!/bin/bash

# Konfigurasi
PROCESSED_FILE="processed.txt"  # File untuk menyimpan container dan user yang sudah diproses
PERMISSION="PVEVMUser"                    # Ganti dengan permission yang diinginkan
DELAY=10                                   # Waktu tunda dalam detik sebelum memeriksa lagi

# Membaca container dan user yang sudah diproses
if [ ! -f "$PROCESSED_FILE" ]; then
  touch "$PROCESSED_FILE"
fi

while true; do
  # Membaca daftar container
  containers=$(pvesh get /nodes/www/lxc --output-format json | jq -r '.[].name')

  # Membaca container yang sudah diproses
  PROCESSED_LIST=()
  while read -r line; do
    PROCESSED_LIST+=("$line")
  done < "$PROCESSED_FILE"

  # Deteksi container baru
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

  # Tunggu sebelum memeriksa lagi
  sleep $DELAY
done
