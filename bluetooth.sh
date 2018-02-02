#!/bin/bash
sudo systemctl disable bluetooth
sudo hciconfig hci0 up
